'use server'

import { requireMembership, requireAuthenticatedAccount, findStudentRelationship } from "@/lib/actions/tenant";

import '@js-temporal/polyfill'
import { db } from '@/src/prisma/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

function toInstant(date: Date) {
  return (globalThis as any).Temporal.Instant.fromEpochMilliseconds(date.getTime());
}

function epochMs(instant: unknown) {
  return (instant as { epochMilliseconds: number }).epochMilliseconds;
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Resolves the org's "current" term
async function getCurrentTerm(organizationId: string) {
  const years = await db.orm.public.AcademicYear.where({ organizationId }).all();
  const activeYear = years.find((y) => y.active) ?? years[0];
  if (!activeYear) return null;

  const terms = await db.orm.public.Term.where({ academicYearId: activeYear.id }).all();
  if (terms.length === 0) return null;

  const now = Date.now();
  const current = terms.find((t) => epochMs(t.startDate) <= now && now <= epochMs(t.endDate));
  return current ?? terms[0];
}

async function fetchHydratedStudents(organizationId: string) {
  const rels = await db.orm.public.Relationship.where({ organizationId, type: 'STUDENT' }).all();
  const students: any[] = [];
  for (const rel of rels) {
    const sd = await db.orm.public.StudentData.where({ relationshipId: rel.id }).all().first();
    const person = await db.orm.public.Person.where({ id: rel.personId }).all().first();
    if (sd && person) {
      students.push({ ...sd, firstName: person.firstName, lastName: person.lastName, organizationId });
    }
  }
  return students;
}

async function fetchHydratedStaff(organizationId: string) {
  const memberships = await db.orm.public.Membership.where({ organizationId }).all();
  const staff: any[] = [];
  for (const m of memberships) {
    const sd = await db.orm.public.StaffData.where({ membershipId: m.id }).all().first();
    const person = await db.orm.public.Person.where({ id: m.personId }).all().first();
    if (person) {
      staff.push({ 
        ...m, 
        user: person, 
        staffProfile: sd ? { ...sd, memberId: m.id } : null 
      });
    }
  }
  return staff;
}


// ---------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------

export async function getSchoolAdminData(organizationId: string) {
  try {
    if (!organizationId) return null;
    await requireMembership(organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'REGISTRAR', 'FINANCE']);
    const school = await db.orm.public.Organization.where({ id: organizationId, type: 'SCHOOL' }).all().first();
    if (!school) return null;

    const students = (await fetchHydratedStudents(school.id)).sort((a, b) => a.lastName.localeCompare(b.lastName));

    const rawClasses = await db.orm.public.SchoolClass.where({ organizationId: school.id }).all();
    const allClassTeachers: any[] = [];
    for (const cls of rawClasses) {
      const rows = await db.orm.public.ClassTeacher.where({ classId: cls.id }).all();
      allClassTeachers.push(...rows);
    }
    const classes = rawClasses.map((cls) => ({
      ...cls,
      classTeachers: allClassTeachers.filter((ct) => ct.classId === cls.id),
    }));

    const studentIds = students.map((s) => s.id);
    const enrollments: any[] = [];
    for (const cls of classes) {
      const rows = await db.orm.public.ClassEnrolment.where({ classId: cls.id }).all();
      enrollments.push(...rows);
    }

    const startOfToday = startOfDay(new Date());
    const attendanceRecords: any[] = [];
    for (const studentDataId of studentIds) {
      const rows = await db.orm.public.Attendance.where({ studentDataId: studentDataId }).all();
      attendanceRecords.push(...rows.filter((r) => epochMs(r.date) >= startOfToday.getTime()));
    }

    const staff = await fetchHydratedStaff(school.id);

    const academicYears = await db.orm.public.AcademicYear.where({ organizationId: school.id }).all();
    const activeYear = academicYears.find((y) => y.active) ?? academicYears[0] ?? null;
    let behaviorIncidents: any[] = [];
    try {
      const rows = await db.orm.public.BehaviourIncident.where({ organizationId: school.id }).all();
      behaviorIncidents = rows.sort((a, b) => epochMs(b.date) - epochMs(a.date));
    } catch {
      behaviorIncidents = [];
    }

    const settings = await db.orm.public.SchoolSettings.where({ organizationId: school.id }).all().first();

    const feeInvoices = await db.orm.public.FeeInvoice.where({ organizationId: school.id }).all()
      .then(async (invoices) => {
        // Also fetch items and payments for them, but for now we just return the base invoices
        // We'll leave relational fetches for dedicated actions if needed, or just return them flat.
        return invoices;
      });

    const feeTypes = await db.orm.public.FeeType.where({ organizationId: school.id }).all();
    const parents = await getParents(school.id);
    const events = await db.orm.public.SchoolEvent.where({ organizationId: school.id }).all();

    return JSON.parse(JSON.stringify({
      school,
      settings,
      students,
      courses: classes,
      courseEnrollments: enrollments,
      staff,
      parents,
      attendanceRecords,
      behaviorLogs: behaviorIncidents,
      academicYears,
      activeYear,
      feeInvoices,
      feeTypes,
      events: events.sort((a, b) => epochMs(a.startDate) - epochMs(b.startDate))
    }));
  } catch (error) {
    console.error('Error fetching school data:', error);
    return null;
  }
}

// Resolves which OrganizationMember row the signed-in user is, within the
// school org — needed to scope "my courses" for the Teacher Portal.
export async function getMyMembership(userId: string, organizationId: string) {
  try {
    const member = await db.orm.public.Membership.where({ personId: userId, organizationId }).all().first();
    return JSON.parse(JSON.stringify(member ?? null));
  } catch (error) {
    console.error('Error resolving membership:', error);
    return null;
  }
}

// `organizationMemberId` (an OrganizationMember.id) scopes to classes taught
// by that member, resolved via StaffProfile -> ClassTeacher. When the
// signed-in user isn't actually a TEACHER member (e.g. the OWNER exploring
// the portal), pass `organizationId` instead to preview every class school-wide.
export async function getTeacherPortalData(organizationMemberId?: string, organizationId?: string) {
  try {
    let classes: any[] = [];
    let mySchedule: any[] = [];
    let formSections: any[] = [];
    if (organizationMemberId) {
      const staffProfile = await db.orm.public.StaffData.where({ membershipId: organizationMemberId }).all().first();
      if (staffProfile) {
        const classTeachers = await db.orm.public.ClassTeacher.where({ membershipId: organizationMemberId }).all();
        const taughtClassIds = new Set(classTeachers.map((ct) => ct.classId));
        const allClasses = organizationId ? await db.orm.public.SchoolClass.where({ organizationId }).all() : [];
        classes = allClasses.filter((c) => taughtClassIds.has(c.id));

        const slots = await db.orm.public.TimetableSlot.where({ membershipId: organizationMemberId }).all();
        const rooms = organizationId ? await db.orm.public.Room.where({ organizationId }).all() : [];
        mySchedule = slots
          .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.period - b.period)
          .map((slot) => ({
            ...slot,
            className: allClasses.find((c) => c.id === slot.classId)?.name ?? 'Unknown Class',
            roomName: rooms.find((r) => r.id === slot.roomId)?.name ?? null,
          }));

        // Sections where this teacher is the form/class teacher — this is
        // what unlocks the Promotion tab in the Teacher portal.
        const rawFormSections = await db.orm.public.ClassSection.where({ formMembershipId: organizationMemberId }).all();
        if (rawFormSections.length > 0) {
          const allGrades = organizationId ? await db.orm.public.SchoolGrade.where({ organizationId }).all() : [];
          const allYears = organizationId ? await db.orm.public.AcademicYear.where({ organizationId }).all() : [];
          formSections = rawFormSections.map((s) => ({
            ...s,
            gradeName: allGrades.find((g) => g.id === s.gradeId)?.name ?? null,
            academicYearLabel: allYears.find((y) => y.id === s.academicYearId)?.year ?? null,
          }));
        }
      }
    } else if (organizationId) {
      classes = await db.orm.public.SchoolClass.where({ organizationId }).all();
    }

    let events: any[] = [];
    if (organizationId) {
      const orgEvents = await db.orm.public.SchoolEvent.where({ organizationId }).all();
      events = orgEvents
        .filter((e) => eventMatchesAudience(e, 'TEACHER', null))
        .sort((a, b) => epochMs(a.startDate) - epochMs(b.startDate));
    }

    const classIds = classes.map((c) => c.id);

    const enrollments: any[] = [];
    for (const classId of classIds) {
      const rows = await db.orm.public.ClassEnrolment.where({ classId }).all();
      enrollments.push(...rows);
    }

    const studentIds = [...new Set(enrollments.map((e) => e.studentDataId))];
    const allStudents = organizationId ? await fetchHydratedStudents(organizationId) : [];
    const students = allStudents.filter((s) => studentIds.includes(s.id));

    const assignments: any[] = [];
    for (const classId of classIds) {
      const rows = await db.orm.public.Gradebook.where({ classId }).all();
      assignments.push(...rows);
    }

    const assignmentIds = assignments.map((a) => a.id);
    const grades: any[] = [];
    for (const assignmentId of assignmentIds) {
      const rows = await db.orm.public.Grade.where({ gradebookId: assignmentId }).all();
      grades.push(...rows);
    }

    const startOfToday = startOfDay(new Date());
    const todayAttendance: any[] = [];
    for (const studentDataId of studentIds) {
      const rows = await db.orm.public.Attendance.where({ studentDataId: studentDataId }).all();
      todayAttendance.push(...rows.filter((r) => epochMs(r.date) >= startOfToday.getTime()));
    }

    return JSON.parse(JSON.stringify({ courses: classes, enrollments, students, assignments, grades, todayAttendance, mySchedule, events, formSections }));
  } catch (error) {
    console.error('Error fetching teacher portal data:', error);
    return null;
  }
}

export async function getCourseGradebook(classId: string) {
  try {
    const schoolClass = await db.orm.public.SchoolClass.where({ id: classId }).all().first();
    if (!schoolClass) return null;
    await requireMembership(schoolClass.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'TEACHER', 'REGISTRAR']);

    const enrollments = await db.orm.public.ClassEnrolment.where({ classId }).all();
    const enrolledStudentDataIds = new Set(enrollments.map((e) => e.studentDataId));

    const relationships = await db.orm.public.Relationship.where({ organizationId: schoolClass.organizationId, type: 'STUDENT' }).all();
    const students = [];
    for (const rel of relationships) {
        const sd = await db.orm.public.StudentData.where({ relationshipId: rel.id }).all().first();
        if (sd && enrolledStudentDataIds.has(sd.id)) {
            const person = await db.orm.public.Person.where({ id: rel.personId }).all().first();
            if (person) students.push({ ...sd, firstName: person.firstName, lastName: person.lastName });
        }
    }

    const assignments = await db.orm.public.Gradebook.where({ classId }).all();

    const grades: any[] = [];
    for (const assignment of assignments) {
      const rows = await db.orm.public.Grade.where({ gradebookId: assignment.id }).all();
      grades.push(...rows);
    }

    return JSON.parse(JSON.stringify({ course: schoolClass, students, assignments, grades, enrollments }));
  } catch (error) {
    console.error('Error fetching gradebook:', error);
    return null;
  }
}

// ---------------------------------------------------------------------
// Students
// ---------------------------------------------------------------------

export async function createStudent(input: {
  organizationId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  studentDataId?: string;
  yearLevel?: number;
  classSectionId?: string;
  gender?: string;
  dateOfBirth?: Date;
}) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'REGISTRAR']);

    if (!input.firstName.trim() || !input.lastName.trim()) return { error: 'First and last name are required.' };

    const existingRels = await db.orm.public.Relationship.where({ organizationId: input.organizationId, type: 'STUDENT' }).all();
    const count = existingRels.length;
    const generatedId = `STU-${String(count + 1).padStart(4, '0')}`;

    const person = await db.orm.public.Person.create({
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      // middleName and gender are dropped from global V1 schema.
      // @ts-ignore Prisma 8 Composer DateTime handling
      dateOfBirth: input.dateOfBirth ? (globalThis as any).Temporal.Instant.fromEpochMilliseconds(input.dateOfBirth.getTime()) : undefined,
    });

    const relationship = await db.orm.public.Relationship.create({
      organizationId: input.organizationId,
      personId: person.id,
      type: 'STUDENT',
    });

    const studentData = await db.orm.public.StudentData.create({
      relationshipId: relationship.id,
      admissionNo: input.studentDataId?.trim() || generatedId,
      yearLevel: input.yearLevel ? Number(input.yearLevel) : 1,
      classSectionId: input.classSectionId || null,
    });

    return { success: true, student: JSON.parse(JSON.stringify({ ...studentData, person })) };
  } catch (error) {
    console.error('Error creating student:', error);
    return { error: 'Failed to create student.' };
  }
}

export async function updateStudent(id: string, input: {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  yearLevel?: number;
  classSectionId?: string;
  gender?: string;
  dateOfBirth?: Date;
}) {
  try {
    const studentData = await db.orm.public.StudentData.where({ id }).all().first();
    if (!studentData) return { error: 'Student not found.' };

    const relationship = await db.orm.public.Relationship.where({ id: studentData.relationshipId }).all().first();
    if (!relationship) return { error: 'Student relationship broken.' };

    await requireMembership(relationship.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'REGISTRAR']);

    const sData: Record<string, unknown> = {};
    if (input.yearLevel !== undefined) sData.yearLevel = input.yearLevel;
    if (input.classSectionId !== undefined) sData.classSectionId = input.classSectionId;

    if (Object.keys(sData).length > 0) {
      await db.orm.public.StudentData.where({ id }).update(sData);
    }

    const pData: Record<string, unknown> = {};
    if (input.firstName !== undefined) pData.firstName = input.firstName.trim();
    if (input.lastName !== undefined) pData.lastName = input.lastName.trim();
    if (input.dateOfBirth !== undefined) {
      // @ts-ignore Prisma 8 Composer DateTime handling
      pData.dateOfBirth = input.dateOfBirth ? (globalThis as any).Temporal.Instant.fromEpochMilliseconds(input.dateOfBirth.getTime()) : null;
    }

    if (Object.keys(pData).length > 0) {
      await db.orm.public.Person.where({ id: relationship.personId }).update(pData);
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating student:', error);
    return { error: 'Failed to update student.' };
  }
}

export async function deleteStudent(studentDataId: string) {
  try {
    const studentData = await db.orm.public.StudentData.where({ id: studentDataId }).all().first();
    if (!studentData) return { error: 'Student not found.' };

    const relationship = await db.orm.public.Relationship.where({ id: studentData.relationshipId }).all().first();
    if (!relationship) return { error: 'Student relationship broken.' };

    await requireMembership(relationship.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'REGISTRAR']);

    // Deleting the Relationship will cascade to StudentData
    await db.orm.public.Relationship.where({ id: relationship.id }).delete();
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting student:', error);
    return { error: 'Failed to remove student.' };
  }
}

// ---------------------------------------------------------------------
// Classes (formerly Courses)
// ---------------------------------------------------------------------

export async function createCourse(input: {
  organizationId: string;
  name: string;
  subject?: string;
  subjectId?: string;
  classSectionId?: string;
  teacherStaffId?: string;
  yearLevel?: number;
  academicYearId?: string;
}) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'REGISTRAR']);

    if (!input.name.trim()) return { error: 'Class name is required.' };

    let academicYearId = input.academicYearId;
    if (!academicYearId) {
      const years = await db.orm.public.AcademicYear.where({ organizationId: input.organizationId }).all();
      const activeYear = years.find((y) => y.active) ?? years[0];
      if (!activeYear) return { error: 'No academic year is set up yet - create one first.' };
      academicYearId = activeYear.id;
    }

    const code = `${input.name.trim().substring(0, 6).toUpperCase().replace(/\s+/g, '-')}-${Math.floor(Math.random() * 900 + 100)}`;

    const created = await db.orm.public.SchoolClass.create({
      organizationId: input.organizationId,
      name: input.name.trim(),
      code,
      subject: input.subject?.trim() || 'General',
      subjectId: input.subjectId || undefined,
      classSectionId: input.classSectionId || undefined,
      yearLevel: input.yearLevel ?? 1,
      academicYearId,
    });

    if (input.teacherStaffId) {
      await db.orm.public.ClassTeacher.create({
        classId: created.id,
        membershipId: input.teacherStaffId,
        isPrimary: true,
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error creating class:', error);
    return { error: 'Failed to create class.' };
  }
}

export async function updateCourse(
  classId: string,
  input: { name?: string; subject?: string; subjectId?: string | null; classSectionId?: string | null; yearLevel?: number }
) {
  try {
    const cls = await db.orm.public.SchoolClass.where({ id: classId }).all().first();
    if (!cls) return { error: 'Class not found.' };

    await requireMembership(cls.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'REGISTRAR']);

    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name.trim();
    if (input.subject !== undefined) data.subject = input.subject.trim();
    if (input.subjectId !== undefined) data.subjectId = input.subjectId || null;
    if (input.classSectionId !== undefined) data.classSectionId = input.classSectionId || null;
    if (input.yearLevel !== undefined) data.yearLevel = input.yearLevel;

    await db.orm.public.SchoolClass.where({ id: classId }).update(data);
    return { success: true };
  } catch (error) {
    console.error('Error updating class:', error);
    return { error: 'Failed to update class.' };
  }
}

export async function assignTeacherToClass(classId: string, membershipId: string, isPrimary = true) {
  try {
    const cls = await db.orm.public.SchoolClass.where({ id: classId }).all().first();
    if (!cls) return { error: 'Class not found.' };

    await requireMembership(cls.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'REGISTRAR']);

    const existing = await db.orm.public.ClassTeacher.where({ classId, membershipId: membershipId }).all().first();
    if (existing) return { error: 'This teacher is already assigned to this class.' };

    await db.orm.public.ClassTeacher.create({ classId, membershipId: membershipId, isPrimary });
    return { success: true };
  } catch (error) {
    console.error('Error assigning teacher to class:', error);
    return { error: 'Failed to assign teacher.' };
  }
}

export async function removeTeacherFromClass(classTeacherId: string) {
  try {
    const link = await db.orm.public.ClassTeacher.where({ id: classTeacherId }).all().first();
    if (link) {
      const cls = await db.orm.public.SchoolClass.where({ id: link.classId }).all().first();
      if (cls) {
         await requireMembership(cls.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'REGISTRAR']);
      }
      await db.orm.public.ClassTeacher.where({ id: classTeacherId }).delete();
    }
    return { success: true };
  } catch (error) {
    console.error('Error removing teacher from class:', error);
    return { error: 'Failed to remove teacher.' };
  }
}

export async function deleteCourse(classId: string) {
  try {
    const item = await db.orm.public.SchoolClass.where({ id: classId }).all().first();
    if (!item) return { error: 'Not found' };
    await requireMembership(item.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'REGISTRAR']);
    await db.orm.public.SchoolClass.where({ id: classId }).delete();
    return { success: true };
  } catch (error) {
    console.error('Error deleting class:', error);
    return { error: 'Failed to remove class.' };
  }
}

// ---------------------------------------------------------------------
// Subjects (admin-managed list) + which teachers are assigned to each
// ---------------------------------------------------------------------

export async function getSubjects(organizationId: string) {
  try {
    const subjects = await db.orm.public.Subject.where({ organizationId }).all();
    const links = await db.orm.public.TeacherSubject.all();
    const staff = await fetchHydratedStaff(organizationId);
    
    const enriched = subjects
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((subject) => {
        const teacherLinks = links.filter((l) => l.subjectId === subject.id);
        const teachers = teacherLinks.map((l) => {
          const s = staff.find((s) => s.id === l.membershipId);
          return { linkId: l.id, membershipId: l.membershipId, name: s?.user?.firstName ? s.user.firstName + ' ' + s.user.lastName : 'Unknown' };
        });

        return { ...subject, teachers };
      });

    return JSON.parse(JSON.stringify(enriched));
  } catch (error) {
    console.error('Error fetching subjects:', error);
    return [];
  }
}

export async function createSubject(organizationId: string, name: string, code?: string) {
  try {
    await requireMembership(organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'REGISTRAR']);

    if (!name.trim()) return { error: 'Subject name is required.' };
    await db.orm.public.Subject.create({ organizationId, name: name.trim(), code: code?.trim() || undefined });
    return { success: true };
  } catch (error) {
    console.error('Error creating subject:', error);
    return { error: 'A subject with this name may already exist.' };
  }
}

export async function updateSubject(subjectId: string, input: { name?: string; code?: string }) {
  try {
    const subj = await db.orm.public.Subject.where({ id: subjectId }).all().first();
    if (!subj) return { error: 'Subject not found.' };

    await requireMembership(subj.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'REGISTRAR']);

    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name.trim();
    if (input.code !== undefined) data.code = input.code.trim();

    await db.orm.public.Subject.where({ id: subjectId }).update(data);
    return { success: true };
  } catch (error) {
    console.error('Error updating subject:', error);
    return { error: 'Failed to update subject.' };
  }
}

export async function deleteSubject(subjectId: string) {
  try {
    const item = await db.orm.public.Subject.where({ id: subjectId }).all().first();
    if (!item) return { error: 'Not found' };
    await requireMembership(item.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'REGISTRAR']);
    await db.orm.public.Subject.where({ id: subjectId }).delete();
    return { success: true };
  } catch (error) {
    console.error('Error deleting subject:', error);
    return { error: 'This subject is still linked to one or more classes — reassign or remove those first.' };
  }
}

export async function assignTeacherToSubject(membershipId: string, subjectId: string) {
  try {
    const subj = await db.orm.public.Subject.where({ id: subjectId }).all().first();
    if (!subj) return { error: 'Subject not found.' };

    await requireMembership(subj.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'REGISTRAR']);

    const existing = await db.orm.public.TeacherSubject.where({ membershipId: membershipId, subjectId }).all().first();
    if (existing) return { error: 'This teacher is already assigned to this subject.' };

    await db.orm.public.TeacherSubject.create({ membershipId: membershipId, subjectId });
    return { success: true };
  } catch (error) {
    console.error('Error assigning teacher to subject:', error);
    return { error: 'Failed to assign teacher.' };
  }
}

export async function removeTeacherFromSubject(linkId: string) {
  try {
    const link = await db.orm.public.TeacherSubject.where({ id: linkId }).all().first();
    if (link) {
       const subj = await db.orm.public.Subject.where({ id: link.subjectId }).all().first();
       if (subj) {
           await requireMembership(subj.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'REGISTRAR']);
       }
       await db.orm.public.TeacherSubject.where({ id: linkId }).delete();
    }
    return { success: true };
  } catch (error) {
    console.error('Error removing teacher from subject:', error);
    return { error: 'Failed to remove teacher.' };
  }
}

// ---------------------------------------------------------------------
// Academic Years & Terms (fully admin-manageable — any number of terms)
// ---------------------------------------------------------------------

export async function getTerms(organizationId: string) {
  try {
    const years = await db.orm.public.AcademicYear.where({ organizationId }).all();
    const terms = await db.orm.public.Term.where({ organizationId }).all();
    const enriched = terms
      .sort((a, b) => epochMs(b.startDate) - epochMs(a.startDate))
      .map((t) => ({ ...t, academicYearLabel: years.find((y) => y.id === t.academicYearId)?.year ?? null }));
    return JSON.parse(JSON.stringify(enriched));
  } catch (error) {
    console.error('Error fetching terms:', error);
    return [];
  }
}

export async function createAcademicYear(input: {
  organizationId: string;
  year: number;
  startDate: string;
  endDate: string;
  active?: boolean;
}) {
  try {
    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate <= startDate) {
      return { error: 'Invalid date range.' };
    }

    if (input.active) {
      const existing = await db.orm.public.AcademicYear.where({ organizationId: input.organizationId }).all();
      for (const y of existing) {
        if (y.active) await db.orm.public.AcademicYear.where({ id: y.id }).update({ active: false });
      }
    }

    await db.orm.public.AcademicYear.create({
      organizationId: input.organizationId,
      year: input.year,
      startDate: toInstant(startDate),
      endDate: toInstant(endDate),
      active: input.active ?? false,
    });

    return { success: true };
  } catch (error) {
    console.error('Error creating academic year:', error);
    return { error: 'An academic year for this year number may already exist.' };
  }
}

export async function setActiveAcademicYear(academicYearId: string, organizationId: string) {
  try {
    const years = await db.orm.public.AcademicYear.where({ organizationId }).all();
    for (const y of years) {
      await db.orm.public.AcademicYear.where({ id: y.id }).update({ active: y.id === academicYearId });
    }
    return { success: true };
  } catch (error) {
    console.error('Error setting active academic year:', error);
    return { error: 'Failed to update active year.' };
  }
}

export async function createTerm(input: {
  organizationId: string;
  academicYearId: string;
  termNumber: number;
  name: string;
  startDate: string;
  endDate: string;
}) {
  try {
    if (!input.name.trim()) return { error: 'Term name is required.' };
    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate <= startDate) {
      return { error: 'Invalid date range.' };
    }

    await db.orm.public.Term.create({
      organizationId: input.organizationId,
      academicYearId: input.academicYearId,
      termNumber: input.termNumber,
      name: input.name.trim(),
      startDate: toInstant(startDate),
      endDate: toInstant(endDate),
    });

    return { success: true };
  } catch (error) {
    console.error('Error creating term:', error);
    return { error: 'A term with this number may already exist for this academic year.' };
  }
}

export async function updateTerm(
  termId: string,
  input: { name?: string; startDate?: string; endDate?: string }
) {
  try {
    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name.trim();
    if (input.startDate !== undefined) data.startDate = toInstant(new Date(input.startDate));
    if (input.endDate !== undefined) data.endDate = toInstant(new Date(input.endDate));

    await db.orm.public.Term.where({ id: termId }).update(data);
    return { success: true };
  } catch (error) {
    console.error('Error updating term:', error);
    return { error: 'Failed to update term.' };
  }
}

export async function deleteTerm(termId: string) {
  try {
    const item = await db.orm.public.Term.where({ id: termId }).all().first();
    if (!item) return { error: 'Not found' };
    await requireMembership(item.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'REGISTRAR']);
    await db.orm.public.Term.where({ id: termId }).delete();
    return { success: true };
  } catch (error) {
    console.error('Error deleting term:', error);
    return { error: 'This term still has attendance or gradebook records linked to it.' };
  }
}

// ---------------------------------------------------------------------
// Classes (grade levels, e.g. "JSS1", "Grade 10") — each Class can have
// any number of Class Sections underneath it.
// ---------------------------------------------------------------------

export async function getSchoolGrades(organizationId: string) {
  try {
    const grades = await db.orm.public.SchoolGrade.where({ organizationId }).all();
    const sections = await db.orm.public.ClassSection.where({ organizationId }).all();

    const enriched = grades
      .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))
      .map((grade) => ({
        ...grade,
        sectionCount: sections.filter((s) => s.gradeId === grade.id).length,
      }));

    return JSON.parse(JSON.stringify(enriched));
  } catch (error) {
    console.error('Error fetching classes:', error);
    return [];
  }
}

export async function createSchoolGrade(organizationId: string, name: string, level: number) {
  try {
    if (!name.trim()) return { error: 'Class name is required.' };
    await db.orm.public.SchoolGrade.create({ organizationId, name: name.trim(), level });
    return { success: true };
  } catch (error) {
    console.error('Error creating class:', error);
    return { error: 'A class with this name may already exist.' };
  }
}

export async function updateSchoolGrade(gradeId: string, input: { name?: string; level?: number }) {
  try {
    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name.trim();
    if (input.level !== undefined) data.level = input.level;

    await db.orm.public.SchoolGrade.where({ id: gradeId }).update(data);
    return { success: true };
  } catch (error) {
    console.error('Error updating class:', error);
    return { error: 'Failed to update class.' };
  }
}

export async function deleteSchoolGrade(gradeId: string) {
  try {
    const item = await db.orm.public.SchoolGrade.where({ id: gradeId }).all().first();
    if (!item) return { error: 'Not found' };
    await requireMembership(item.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'REGISTRAR']);
    const sections = await db.orm.public.ClassSection.where({ gradeId }).all();
    if (sections.length > 0) {
      return { error: 'Remove this class\'s sections before deleting it.' };
    }
    await db.orm.public.SchoolGrade.where({ id: gradeId }).delete();
    return { success: true };
  } catch (error) {
    console.error('Error deleting class:', error);
    return { error: 'Failed to remove class.' };
  }
}

// ---------------------------------------------------------------------
// Class Sections (e.g. "A", "B", "Gold") — each belongs to one Class
// (SchoolGrade), so a section is always "Class X, Section Y".
// ---------------------------------------------------------------------

export async function getClassSections(organizationId: string) {
  try {
    const sections = await db.orm.public.ClassSection.where({ organizationId }).all();
    const grades = await db.orm.public.SchoolGrade.where({ organizationId }).all();
    const students = await fetchHydratedStudents(organizationId);
    const staff = await fetchHydratedStaff(organizationId);

    const enriched = sections
      .sort((a, b) => {
        const gradeA = grades.find((g) => g.id === a.gradeId);
        const gradeB = grades.find((g) => g.id === b.gradeId);
        return (gradeA?.level ?? 0) - (gradeB?.level ?? 0) || a.name.localeCompare(b.name);
      })
      .map((section) => {
        const grade = grades.find((g) => g.id === section.gradeId);
        const formTeacher = staff.find((s) => s.id === section.formMembershipId);
        const sectionStudents = students.filter((s) => s.classSectionId === section.id);

        return {
          ...section,
          gradeName: grade?.name ?? 'Unassigned',
          gradeLevel: grade?.level ?? 0,
          formTeacherName: formTeacher?.user?.firstName ? formTeacher.user.firstName + ' ' + formTeacher.user.lastName : 'None',
          studentCount: sectionStudents.length,
        };
      });

    return JSON.parse(JSON.stringify(enriched));
  } catch (error) {
    console.error('Error fetching class sections:', error);
    return [];
  }
}

export async function createClassSection(input: {
  organizationId: string;
  academicYearId?: string;
  gradeId: string;
  name: string;
  formMembershipId?: string;
}) {
  try {
    if (!input.name.trim()) return { error: 'Section name is required.' };
    if (!input.gradeId) return { error: 'Select a class for this section.' };

    let academicYearId = input.academicYearId;
    if (!academicYearId) {
      const years = await db.orm.public.AcademicYear.where({ organizationId: input.organizationId }).all();
      const activeYear = years.find((y) => y.active) ?? years[0];
      if (!activeYear) return { error: 'No academic year is set up yet — create one first.' };
      academicYearId = activeYear.id;
    }

    await db.orm.public.ClassSection.create({
      organizationId: input.organizationId,
      academicYearId,
      gradeId: input.gradeId,
      name: input.name.trim(),
      formMembershipId: input.formMembershipId || undefined,
    });

    return { success: true };
  } catch (error) {
    console.error('Error creating class section:', error);
    return { error: 'Failed to create section. A "Class + Name" combo must be unique per year.' };
  }
}

export async function updateClassSection(
  sectionId: string,
  input: { name?: string; gradeId?: string; formMembershipId?: string | null }
) {
  try {
    const sec = await db.orm.public.ClassSection.where({ id: sectionId }).all().first();
    if (!sec) return { error: 'Section not found.' };

    await requireMembership(sec.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'REGISTRAR']);

    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name.trim();
    if (input.gradeId !== undefined) data.gradeId = input.gradeId;
    if (input.formMembershipId !== undefined) data.formMembershipId = input.formMembershipId || null;

    await db.orm.public.ClassSection.where({ id: sectionId }).update(data);
    return { success: true };
  } catch (error) {
    console.error('Error updating class section:', error);
    return { error: 'Failed to update section.' };
  }
}

export async function deleteClassSection(sectionId: string) {
  try {
    const sec = await db.orm.public.ClassSection.where({ id: sectionId }).all().first();
    if (!sec) return { error: 'Section not found.' };

    await requireMembership(sec.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'REGISTRAR']);

    const students = await db.orm.public.StudentData.where({ classSectionId: sectionId }).all();
    if (students.length > 0) {
      return { error: 'Move students out of this section before removing it.' };
    }
    await db.orm.public.ClassSection.where({ id: sectionId }).delete();
    return { success: true };
  } catch (error) {
    console.error('Error deleting class section:', error);
    return { error: 'Failed to remove section.' };
  }
}

export async function assignStudentToSection(studentDataId: string, classSectionId: string | null) {
  try {
    await db.orm.public.StudentData.where({ id: studentDataId }).update({ classSectionId });
    return { success: true };
  } catch (error) {
    console.error('Error assigning student to section:', error);
    return { error: 'Failed to assign student.' };
  }
}

// ---------------------------------------------------------------------
// Syllabus (topics planned/taught per class, per term)
// ---------------------------------------------------------------------

export async function getSyllabus(classId: string) {
  try {
    const topics = await db.orm.public.SyllabusTopic.where({ classId }).all();
    return JSON.parse(JSON.stringify(
      topics.sort((a, b) => (a.order - b.order) || ((a.week ?? 0) - (b.week ?? 0)))
    ));
  } catch (error) {
    console.error('Error fetching syllabus:', error);
    return [];
  }
}

export async function createSyllabusTopic(input: {
  classId: string;
  title: string;
  description?: string;
  week?: number;
}) {
  try {
    if (!input.title.trim()) return { error: 'Topic title is required.' };

    const cls = await db.orm.public.SchoolClass.where({ id: input.classId }).all().first();
    if (!cls) return { error: 'Class not found.' };

    const terms = await db.orm.public.Term.where({ academicYearId: cls.academicYearId }).all();
    if (terms.length === 0) return { error: "This class's academic year has no term set up yet." };
    const now = Date.now();
    const currentTerm = terms.find((t) => epochMs(t.startDate) <= now && now <= epochMs(t.endDate)) ?? terms[0];

    const existing = await db.orm.public.SyllabusTopic.where({ classId: input.classId }).all();

    await db.orm.public.SyllabusTopic.create({
      classId: input.classId,
      termId: currentTerm.id,
      title: input.title.trim(),
      description: input.description?.trim() || undefined,
      week: input.week,
      order: existing.length,
    });

    return { success: true };
  } catch (error) {
    console.error('Error creating syllabus topic:', error);
    return { error: 'Failed to create topic.' };
  }
}

export async function updateSyllabusTopic(
  topicId: string,
  input: { title?: string; description?: string; week?: number; status?: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' }
) {
  try {
    const data: Record<string, unknown> = {};
    if (input.title !== undefined) data.title = input.title.trim();
    if (input.description !== undefined) data.description = input.description.trim();
    if (input.week !== undefined) data.week = input.week;
    if (input.status !== undefined) data.status = input.status;

    await db.orm.public.SyllabusTopic.where({ id: topicId }).update(data);
    return { success: true };
  } catch (error) {
    console.error('Error updating syllabus topic:', error);
    return { error: 'Failed to update topic.' };
  }
}

export async function deleteSyllabusTopic(topicId: string) {
  try {
    const item = await db.orm.public.SyllabusTopic.where({ id: topicId }).all().first();
    if (!item) return { error: 'Not found' };
    const course = await db.orm.public.SchoolClass.where({ id: item.classId }).all().first();
    if (course) await requireMembership(course.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'REGISTRAR', 'TEACHER']);
    await db.orm.public.SyllabusTopic.where({ id: topicId }).delete();
    return { success: true };
  } catch (error) {
    console.error('Error deleting syllabus topic:', error);
    return { error: 'Failed to remove topic.' };
  }
}

// ---------------------------------------------------------------------
// Daily Attendance (admin-wide view across all students for one date —
// distinct from the Teacher Portal's per-class roster view)
// ---------------------------------------------------------------------

export async function getDailyAttendance(organizationId: string, dateStr?: string) {
  try {
    await requireMembership(organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'TEACHER', 'REGISTRAR']);

    const day = startOfDay(dateStr ? new Date(dateStr) : new Date());
    const dayMs = day.getTime();

    const sections = await db.orm.public.ClassSection.where({ organizationId }).all();
    const relationships = await db.orm.public.Relationship.where({ organizationId, type: 'STUDENT' }).all();

    const records: any[] = [];
    for (const rel of relationships) {
      const studentData = await db.orm.public.StudentData.where({ relationshipId: rel.id }).all().first();
      const person = await db.orm.public.Person.where({ id: rel.personId }).all().first();
      if (!studentData || !person) continue;

      const rows = await db.orm.public.Attendance.where({ studentDataId: studentData.id }).all();
      const todayRecord = rows.find((r) => epochMs(r.date) === dayMs);
      
      records.push({
        studentDataId: studentData.id,
        studentName: `${person.firstName} ${person.lastName}`,
        classSectionName: sections.find((s) => s.id === studentData.classSectionId)?.name ?? null,
        yearLevel: studentData.yearLevel,
        status: todayRecord?.status ?? null,
      });
    }
    
    records.sort((a, b) => a.studentName.localeCompare(b.studentName));

    return JSON.parse(JSON.stringify({ date: day.toISOString(), records }));
  } catch (error) {
    console.error('Error fetching daily attendance:', error);
    return { date: new Date().toISOString(), records: [] };
  }
}

// ---------------------------------------------------------------------
// Staff / Teachers
// ---------------------------------------------------------------------

export async function createStaff(input: {
  organizationId: string;
  name: string;
  email: string;
  role: 'TEACHER' | 'ADMIN' | 'FINANCE' | 'REGISTRAR' | 'COUNSELOR' | 'LIBRARIAN';
  employeeId?: string;
  department?: string;
}) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);

    if (!input.name.trim() || !input.email.trim()) return { error: 'Name and email are required.' };

    const emailLower = input.email.toLowerCase();
    let identifier = await db.orm.public.PersonIdentifier.where({ type: "EMAIL", normalizedValue: emailLower }).all().first();
    let person;

    if (!identifier) {
      const firstName = input.name.split(' ')[0] || 'Unknown';
      const lastName = input.name.split(' ').slice(1).join(' ') || 'Staff';
      person = await db.orm.public.Person.create({ firstName, lastName });
      await db.orm.public.PersonIdentifier.create({
        personId: person.id,
        type: "EMAIL",
        normalizedValue: emailLower,
        isVerified: true
      });
    } else {
      person = await db.orm.public.Person.where({ id: identifier.personId }).all().first();
    }
    
    if (!person) return { error: 'Failed to resolve person.' };

    let membership = await db.orm.public.Membership.where({ personId: person.id, organizationId: input.organizationId }).all().first();
    if (!membership) {
      membership = await db.orm.public.Membership.create({
        personId: person.id,
        organizationId: input.organizationId,
      });
    }

    const roles = await db.orm.public.MembershipRole.where({ membershipId: membership.id }).all();
    if (!roles.some(r => r.role === input.role)) {
      await db.orm.public.MembershipRole.create({ membershipId: membership.id, role: input.role });
    }

    let staffData = await db.orm.public.StaffData.where({ membershipId: membership.id }).all().first();
    if (!staffData) {
      await db.orm.public.StaffData.create({
        membershipId: membership.id,
        employeeId: input.employeeId || `EMP-${Math.floor(Math.random() * 10000)}`,
              });
    }

    return { success: true };
  } catch (error) {
    console.error('Error creating staff:', error);
    return { error: 'Failed to create staff member.' };
  }
}

export async function updateStaff(
  memberId: string,
  input: { name?: string; email?: string; role?: 'TEACHER' | 'ADMIN' | 'FINANCE' | 'REGISTRAR' | 'COUNSELOR' | 'LIBRARIAN' }
) {
  try {
    const membership = await db.orm.public.Membership.where({ id: memberId }).all().first();
    if (!membership) return { error: 'Staff membership not found.' };

    await requireMembership(membership.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);

    if (input.name !== undefined || input.email !== undefined) {
      // In a real system, you might not want an admin updating a global Person's name/email freely, 
      // but for V1 we keep the UX parity.
      const personData: any = {};
      if (input.name !== undefined) {
        personData.firstName = input.name.split(' ')[0] || 'Unknown';
        personData.lastName = input.name.split(' ').slice(1).join(' ') || 'Staff';
      }
      await db.orm.public.Person.where({ id: membership.personId }).update(personData);
      
      if (input.email !== undefined) {
        const emailLower = input.email.toLowerCase();
        const existingIdent = await db.orm.public.PersonIdentifier.where({ personId: membership.personId, type: "EMAIL" }).all().first();
        if (existingIdent) {
           await db.orm.public.PersonIdentifier.where({ id: existingIdent.id }).update({ normalizedValue: emailLower });
        }
      }
    }

    if (input.role) {
       const roles = await db.orm.public.MembershipRole.where({ membershipId: membership.id }).all();
       // Simplistic role replacement for V1 EduOS assuming 1 primary role per staff
       for (const r of roles) {
           await db.orm.public.MembershipRole.where({ id: r.id }).delete();
       }
       await db.orm.public.MembershipRole.create({ membershipId: membership.id, role: input.role });
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating staff:', error);
    return { error: 'Failed to update staff member.' };
  }
}

export async function deleteStaff(memberId: string) {
  try {
    const membership = await db.orm.public.Membership.where({ id: memberId }).all().first();
    if (!membership) return { error: 'Staff membership not found.' };

    await requireMembership(membership.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);

    // Since StaffData, MembershipRole, etc Cascade on Membership deletion in Prisma,
    // we only need to delete the membership.
    await db.orm.public.Membership.where({ id: memberId }).delete();
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting staff:', error);
    return { error: 'Failed to remove staff member.' };
  }
}

// ---------------------------------------------------------------------
// Parents / Guardians (StudentParent links, not OrganizationMember —
// parents aren't school staff)
// ---------------------------------------------------------------------

export async function getParents(organizationId: string) {
  try {
    const auths = await db.orm.public.GuardianAuthorization.where({ organizationId }).all();
    const guardianIds = [...new Set(auths.map((a) => a.guardianPersonId))];

    const parents = [];
    for (const guardianId of guardianIds) {
      const guardian = await db.orm.public.Person.where({ id: guardianId }).all().first();
      const identifier = await db.orm.public.PersonIdentifier.where({ personId: guardianId, type: 'EMAIL' }).all().first();
      
      const children = [];
      const parentAuths = auths.filter((a) => a.guardianPersonId === guardianId);
      
      for (const a of parentAuths) {
        const studentRel = await db.orm.public.Relationship.where({ id: a.wardRelationshipId }).all().first();
        if (!studentRel) continue;
        
        const studentData = await db.orm.public.StudentData.where({ relationshipId: studentRel.id }).all().first();
        if (!studentData) continue;

        const studentPerson = await db.orm.public.Person.where({ id: studentRel.personId }).all().first();
        
        children.push({
          linkId: a.id,
          studentDataId: studentData.id,
          studentName: studentPerson ? `${studentPerson.firstName} ${studentPerson.lastName}` : 'Unknown student',
          relationship: a.permissions || 'Guardian',
          isPrimary: a.permissions === 'PRIMARY',
        });
      }
      
      parents.push({ 
        id: guardianId, 
        name: guardian ? `${guardian.firstName} ${guardian.lastName}` : null, 
        email: identifier ? identifier.normalizedValue : null, 
        children 
      });
    }

    return JSON.parse(JSON.stringify(parents));
  } catch (error) {
    console.error('Error fetching parents:', error);
    return [];
  }
}

export async function createParentLink(input: {
  organizationId: string;
  studentDataId: string;
  name: string;
  email: string;
  relationship?: string;
  isPrimary?: boolean;
}) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'REGISTRAR']);

    if (!input.name.trim() || !input.email.trim()) return { error: 'Name and email are required.' };
    if (!input.studentDataId) return { error: 'Please select a student.' };

    const studentData = await db.orm.public.StudentData.where({ id: input.studentDataId }).all().first();
    const studentRel = studentData ? await db.orm.public.Relationship.where({ id: studentData.relationshipId }).all().first() : null;
    if (!studentData || !studentRel) return { error: 'Student not found.' };

    const emailLower = input.email.trim().toLowerCase();
    let identifier = await db.orm.public.PersonIdentifier.where({ type: "EMAIL", normalizedValue: emailLower }).all().first();
    let guardianPerson;

    if (!identifier) {
      const firstName = input.name.split(' ')[0] || 'Unknown';
      const lastName = input.name.split(' ').slice(1).join(' ') || 'Guardian';
      guardianPerson = await db.orm.public.Person.create({ firstName, lastName });
      await db.orm.public.PersonIdentifier.create({
        personId: guardianPerson.id,
        type: "EMAIL",
        normalizedValue: emailLower,
        isVerified: true
      });
    } else {
      guardianPerson = await db.orm.public.Person.where({ id: identifier.personId }).all().first();
    }
    
    if (!guardianPerson) return { error: 'Failed to resolve guardian person' };

    // Ensure FamilyLink exists globally
    let familyLink = await db.orm.public.FamilyLink.where({ 
      guardianPersonId: guardianPerson.id, 
      wardPersonId: studentRel.personId 
    }).all().first();

    if (!familyLink) {
      familyLink = await db.orm.public.FamilyLink.create({
        guardianPersonId: guardianPerson.id,
        wardPersonId: studentRel.personId,
        type: input.relationship?.trim() || 'GUARDIAN'
      });
    }

    // Ensure explicit GuardianAuthorization at this specific organization
    const existingAuth = await db.orm.public.GuardianAuthorization
      .where({ organizationId: input.organizationId, guardianPersonId: guardianPerson.id, wardRelationshipId: studentRel.id })
      .all()
      .first();
      
    if (existingAuth) return { error: 'This parent is already linked to this student.' };

    const permissions = input.isPrimary ? 'PRIMARY' : (input.relationship?.trim() || 'GUARDIAN');
    await db.orm.public.GuardianAuthorization.create({
      organizationId: input.organizationId,
      guardianPersonId: guardianPerson.id,
      wardRelationshipId: studentRel.id,
      permissions: permissions
    });

    return { success: true };
  } catch (error) {
    console.error('Error linking parent:', error);
    return { error: 'Failed to link parent.' };
  }
}

export async function updateParentLink(linkId: string, input: { relationship?: string; isPrimary?: boolean }) {
  try {
    const auth = await db.orm.public.GuardianAuthorization.where({ id: linkId }).all().first();
    if (!auth) return { error: 'Link not found.' };

    await requireMembership(auth.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'REGISTRAR']);

    const permissions = input.isPrimary ? 'PRIMARY' : (input.relationship?.trim() || 'GUARDIAN');
    await db.orm.public.GuardianAuthorization.where({ id: linkId }).update({ permissions });

    return { success: true };
  } catch (error) {
    console.error('Error updating parent link:', error);
    return { error: 'Failed to update parent link.' };
  }
}

export async function deleteParentLink(linkId: string) {
  try {
    const auth = await db.orm.public.GuardianAuthorization.where({ id: linkId }).all().first();
    if (!auth) return { error: 'Link not found.' };

    await requireMembership(auth.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'REGISTRAR']);

    // We only delete the explicit authorization for this organization, NOT the global FamilyLink
    await db.orm.public.GuardianAuthorization.where({ id: linkId }).delete();
    
    return { success: true };
  } catch (error) {
    console.error('Error removing parent link:', error);
    return { error: 'Failed to remove parent link.' };
  }
}

export async function enrollStudent(studentDataId: string, classId: string) {
  try {
    const { studentData, relationship } = await findStudentRelationship('', studentDataId).catch(async () => {
        // Since findStudentRelationship needs orgId, we fetch it here
        const sd = await db.orm.public.StudentData.where({ id: studentDataId }).all().first();
        if (!sd) throw new Error('Not found');
        const rel = await db.orm.public.Relationship.where({ id: sd.relationshipId }).all().first();
        if (!rel) throw new Error('Not found');
        return { studentData: sd, relationship: rel };
    });

    await requireMembership(relationship.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'REGISTRAR']);

    const existing = await db.orm.public.ClassEnrolment.where({ studentDataId: studentDataId, classId }).all().first();
    if (existing) return { error: 'Student is already in this class.' };

    await db.orm.public.ClassEnrolment.create({ studentDataId: studentDataId, classId });
    return { success: true };
  } catch (error) {
    console.error('Error enrolling student:', error);
    return { error: 'Failed to enroll student.' };
  }
}

export async function unenrollStudent(enrollmentId: string) {
  try {
    const enrollment = await db.orm.public.ClassEnrolment.where({ id: enrollmentId }).all().first();
    if (!enrollment) return { error: 'Enrollment not found' };

    const studentData = await db.orm.public.StudentData.where({ id: enrollment.studentDataId }).all().first();
    if (studentData) {
        const rel = await db.orm.public.Relationship.where({ id: studentData.relationshipId }).all().first();
        if (rel) {
            await requireMembership(rel.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'REGISTRAR']);
        }
    }

    await db.orm.public.ClassEnrolment.where({ id: enrollmentId }).delete();
    return { success: true };
  } catch (error) {
    console.error('Error unenrolling student:', error);
    return { error: 'Failed to unenroll student.' };
  }
}

// ---------------------------------------------------------------------
// Attendance
// ---------------------------------------------------------------------

export async function markAttendance(
  studentDataId: string, // maps to StudentData.id
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED',
  date?: string,
  markedById?: string // maps to Membership.id
) {
  try {
    const sd = await db.orm.public.StudentData.where({ id: studentDataId }).all().first();
    if (!sd) return { error: 'Student not found.' };

    const rel = await db.orm.public.Relationship.where({ id: sd.relationshipId }).all().first();
    if (!rel) return { error: 'Student relation not found.' };

    const { membership } = await requireMembership(rel.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'TEACHER', 'REGISTRAR']);

    const term = await getCurrentTerm(rel.organizationId);
    if (!term) return { error: 'No term is set up for this school year yet.' };

    const day = startOfDay(date ? new Date(date) : new Date());
    const dayInstant = toInstant(day);

    const existing = await db.orm.public.Attendance.where({ studentDataId: studentDataId, date: dayInstant }).all().first();
    if (existing) {
      await db.orm.public.Attendance.where({ id: existing.id }).update({
        status,
        markedById: markedById ?? membership.id,
      });
    } else {
      await db.orm.public.Attendance.create({
        organizationId: rel.organizationId,
        studentDataId: studentDataId,
        termId: term.id,
        date: dayInstant,
        status,
        markedById: markedById ?? membership.id,
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error marking attendance:', error);
    return { error: 'Failed to mark attendance.' };
  }
}

export async function bulkMarkAttendance(
  studentIds: string[],
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED',
  markedById?: string
) {
  try {
    for (const studentDataId of studentIds) {
      const result = await markAttendance(studentDataId, status, undefined, markedById);
      if (result?.error) return result;
    }
    return { success: true };
  } catch (error) {
    console.error('Error bulk marking attendance:', error);
    return { error: 'Failed to mark attendance.' };
  }
}

// ---------------------------------------------------------------------
// Gradebook / Grades
// ---------------------------------------------------------------------

export async function createAssignment(input: {
  courseId: string;
  title: string;
  category: string;
  weight: number;
  maxScore: number;
}) {
  try {
    const cls = await db.orm.public.SchoolClass.where({ id: input.courseId }).all().first();
    if (!cls) return { error: 'Class not found' };

    await requireMembership(cls.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'TEACHER', 'REGISTRAR']);

    const terms = await db.orm.public.Term.where({ academicYearId: cls.academicYearId }).all();
    if (terms.length === 0) {
      return { error: "This class's academic year has no term set up yet - create one first." };
    }
    const now = Date.now();
    const currentTerm = terms.find((t) => epochMs(t.startDate) <= now && now <= epochMs(t.endDate)) ?? terms[0];

    await db.orm.public.Gradebook.create({
      organizationId: cls.organizationId,
      classId: input.courseId,
      termId: currentTerm.id,
      name: input.title,
      type: input.category,
      weight: input.weight,
      maxScore: input.maxScore,
    });
    return { success: true };
  } catch (error) {
    console.error('Error creating assignment (gradebook):', error);
    return { error: 'Failed to create assignment.' };
  }
}

export async function recordGrade(input: { assignmentId: string; studentDataId: string; courseId: string; score: number }) {
  try {
    if (input.score < 0) return { error: 'Score cannot be negative.' };
    
    const cls = await db.orm.public.SchoolClass.where({ id: input.courseId }).all().first();
    if (!cls) return { error: 'Class not found' };
    await requireMembership(cls.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'TEACHER', 'REGISTRAR']);

    const existing = await db.orm.public.Grade.where({ 
      gradebookId: input.assignmentId, 
      studentDataId: input.studentDataId 
    }).all().first().catch(() => null);

    if (existing) {
      await db.orm.public.Grade.where({ id: existing.id }).update({ score: input.score });
    } else {
      await db.orm.public.Grade.create({
        organizationId: cls.organizationId,
        gradebookId: input.assignmentId,
        studentDataId: input.studentDataId,
        score: input.score,
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error recording grade:', error);
    return { error: 'Failed to record grade.' };
  }
}

// ---------------------------------------------------------------------
// Behavior / Incidents
// ---------------------------------------------------------------------

export async function createBehaviorLog(input: {
  organizationId: string;
  studentDataId: string;
  reportedById: string;
  type: 'DEMERIT' | 'COMMENDATION' | 'REFERRAL';
  note: string;
}) {
  try {
    if (!input.note.trim()) return { error: 'A short note is required.' };

    // BehaviourIncident's `severity` field is free-text, not a real enum —
    // COMMENDATION gets its own value rather than collapsing into MINOR so a
    // positive note isn't indistinguishable from actual misconduct later.
    const severityMap: Record<string, string> = {
      DEMERIT: 'MINOR',
      REFERRAL: 'MAJOR',
      COMMENDATION: 'COMMENDATION',
    };

    await db.orm.public.BehaviourIncident.create({
      organizationId: input.organizationId,
      studentDataId: input.studentDataId,
      reportedById: input.reportedById,
      description: input.note.trim(),
      severity: severityMap[input.type] ?? 'MINOR',
      date: toInstant(new Date()),
    });

    return { success: true };
  } catch (error) {
    console.error('Error creating behavior log:', error);
    return { error: 'Failed to log behavior.' };
  }
}

// ---------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------

export async function updateSchoolSettings(organizationId: string, input: {
  name?: string;
  shortName?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo?: string;
  timezone?: string;
  currencyCode?: string;
  currentTerm?: number;
  schoolType?: string;
}) {
  try {
    await requireMembership(organizationId, ['OWNER', 'ADMIN']);
    const existing = await db.orm.public.SchoolSettings.where({ organizationId }).all().first();

    if (!existing) {
      const org = await db.orm.public.Organization.where({ id: organizationId }).all().first();
      await db.orm.public.SchoolSettings.create({
        organizationId,
        name: input.name ?? org?.name ?? 'School',
        shortName: input.shortName,
        address: input.address,
        phone: input.phone,
        email: input.email,
        website: input.website,
        logo: input.logo,
        timezone: input.timezone,
        currencyCode: input.currencyCode,
        currentTerm: input.currentTerm ?? 1,
        currentYear: new Date().getFullYear(),
        schoolType: input.schoolType,
      });
      return { success: true };
    }

    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.shortName !== undefined) data.shortName = input.shortName;
    if (input.address !== undefined) data.address = input.address;
    if (input.phone !== undefined) data.phone = input.phone;
    if (input.email !== undefined) data.email = input.email;
    if (input.website !== undefined) data.website = input.website;
    if (input.logo !== undefined) data.logo = input.logo;
    if (input.timezone !== undefined) data.timezone = input.timezone;
    if (input.currencyCode !== undefined) data.currencyCode = input.currencyCode;
    if (input.currentTerm !== undefined) data.currentTerm = input.currentTerm;
    if (input.schoolType !== undefined) data.schoolType = input.schoolType;

    await db.orm.public.SchoolSettings.where({ organizationId }).update(data);
    return { success: true };
  } catch (error) {
    console.error('Error updating school settings:', error);
    return { error: 'Failed to update settings.' };
  }
}

// ---------------------------------------------------------------------
// Fees
// ---------------------------------------------------------------------

export async function createFeeType(organizationId: string, input: {
  name: string;
  description?: string;
  amount: number;
  frequency: string;
  yearLevel?: number;
  active?: boolean;
}) {
  try {
    await requireMembership(organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'FINANCE']);

    if (!input.name.trim()) return { error: 'Fee type name is required.' };
    await db.orm.public.FeeType.create({
      organizationId,
      name: input.name.trim(),
      description: input.description,
      amount: input.amount,
      frequency: input.frequency,
      yearLevel: input.yearLevel,
      active: input.active ?? true,
    });
    return { success: true };
  } catch (error) {
    console.error('Error creating fee type:', error);
    return { error: 'Failed to create fee type.' };
  }
}

export async function updateFeeType(feeTypeId: string, input: {
  name?: string;
  description?: string;
  amount?: number;
  frequency?: string;
  yearLevel?: number | null;
  active?: boolean;
}) {
  try {
    const feeType = await db.orm.public.FeeType.where({ id: feeTypeId }).all().first();
    if (!feeType) return { error: 'Fee type not found.' };

    await requireMembership(feeType.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'FINANCE']);

    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name.trim();
    if (input.description !== undefined) data.description = input.description;
    if (input.amount !== undefined) data.amount = input.amount;
    if (input.frequency !== undefined) data.frequency = input.frequency;
    if (input.yearLevel !== undefined) data.yearLevel = input.yearLevel;
    if (input.active !== undefined) data.active = input.active;

    await db.orm.public.FeeType.where({ id: feeTypeId }).update(data);
    return { success: true };
  } catch (error) {
    console.error('Error updating fee type:', error);
    return { error: 'Failed to update fee type.' };
  }
}

export async function deleteFeeType(feeTypeId: string) {
  try {
    const item = await db.orm.public.FeeType.where({ id: feeTypeId }).all().first();
    if (!item) return { error: 'Not found' };
    await requireMembership(item.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'FINANCE']);
    await db.orm.public.FeeType.where({ id: feeTypeId }).delete();
    return { success: true };
  } catch (error) {
    console.error('Error deleting fee type:', error);
    return { error: 'This fee type is used on existing invoices — remove those line items first.' };
  }
}

export async function createFeeInvoice(input: {
  organizationId: string;
  studentDataId: string; // Maps to StudentData.id
  dueDate: string;
  notes?: string;
  items: { feeTypeId?: string; description: string; amount: number }[];
}) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'FINANCE', 'REGISTRAR']);

    if (input.items.length === 0) return { error: 'Add at least one line item.' };
    const dueDate = new Date(input.dueDate);
    if (isNaN(dueDate.getTime())) return { error: 'Invalid due date.' };

    const totalAmount = input.items.reduce((sum, item) => sum + item.amount, 0);

    const invoice = await db.orm.public.FeeInvoice.create({
      organizationId: input.organizationId,
      studentDataId: input.studentDataId,
      issueDate: toInstant(new Date()),
      dueDate: toInstant(dueDate),
      notes: input.notes,
      totalAmount,
      paidAmount: 0,
      status: 'unpaid',
    });

    for (const item of input.items) {
      await db.orm.public.FeeInvoiceItem.create({
        invoiceId: invoice.id,
        feeTypeId: item.feeTypeId,
        description: item.description,
        amount: item.amount,
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error creating fee invoice:', error);
    return { error: 'Failed to create invoice.' };
  }
}

export async function updateFeeInvoice(invoiceId: string, input: { dueDate?: string; notes?: string; status?: string }) {
  try {
    const invoice = await db.orm.public.FeeInvoice.where({ id: invoiceId }).all().first();
    if (!invoice) return { error: 'Invoice not found.' };

    await requireMembership(invoice.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'FINANCE']);

    const data: Record<string, unknown> = {};
    if (input.dueDate !== undefined) data.dueDate = toInstant(new Date(input.dueDate));
    if (input.notes !== undefined) data.notes = input.notes;
    if (input.status !== undefined) data.status = input.status;

    await db.orm.public.FeeInvoice.where({ id: invoiceId }).update(data);
    return { success: true };
  } catch (error) {
    console.error('Error updating fee invoice:', error);
    return { error: 'Failed to update invoice.' };
  }
}

export async function deleteFeeInvoice(invoiceId: string) {
  try {
    const invoice = await db.orm.public.FeeInvoice.where({ id: invoiceId }).all().first();
    if (!invoice) return { error: 'Invoice not found.' };

    await requireMembership(invoice.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'FINANCE']);

    if (invoice.paidAmount > 0) return { error: 'Cannot delete an invoice with recorded payments.' };

    await db.orm.public.FeeInvoice.where({ id: invoiceId }).delete();
    return { success: true };
  } catch (error) {
    console.error('Error deleting fee invoice:', error);
    return { error: 'Failed to delete invoice.' };
  }
}

export async function recordFeePayment(input: {
  invoiceId: string;
  amount: number;
  method?: string;
  reference?: string;
  notes?: string;
  recordedBy?: string;
}) {
  try {
    if (input.amount <= 0) return { error: 'Payment amount must be greater than zero.' };

    const invoiceInitial = await db.orm.public.FeeInvoice.where({ id: input.invoiceId }).all().first();
    if (!invoiceInitial) return { error: 'Invoice not found.' };

    const { membership } = await requireMembership(invoiceInitial.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'FINANCE', 'REGISTRAR']);

    await db.transaction(async (tx: any) => {
      const lockedInvoiceRows = await tx.sql`
        SELECT "id", "totalAmount", "paidAmount"
        FROM "FeeInvoice"
        WHERE "id" = ${input.invoiceId}
        FOR UPDATE
      `;
      if (!lockedInvoiceRows || lockedInvoiceRows.length === 0) {
        throw new Error('Invoice not found or could not be locked.');
      }
      const lockedInvoice = lockedInvoiceRows[0];

      if (lockedInvoice.paidAmount + input.amount > lockedInvoice.totalAmount) {
         throw new Error(`Cannot overpay invoice. Remaining balance is ${lockedInvoice.totalAmount - lockedInvoice.paidAmount}.`);
      }

      const wallet = await tx.orm.public.Wallet.where({ organizationId: invoiceInitial.organizationId }).all().first();
      let transactionId = null;

      if (wallet) {
         const t = await tx.orm.public.Transaction.create({
            status: 'COMPLETED',
            reference: `MANUAL-FEE-${Date.now()}-${input.invoiceId.slice(0,8)}`,
            description: `Manual Fee Payment: ${input.notes ?? 'Invoice ' + input.invoiceId.slice(0,8)}`,
         });
         transactionId = t.id;

         await tx.orm.public.LedgerEntry.create({
            walletId: wallet.id,
            transactionId: t.id,
            amount: input.amount,
            currency: wallet.currency
         });

         await tx.orm.public.Wallet.where({ id: wallet.id }).update({
            balance: wallet.balance + input.amount
         });
      }

      const paymentRef = input.reference || `MANUAL-${Date.now()}`;
      await tx.orm.public.Payment.create({
         amount: input.amount,
         currency: wallet?.currency || 'USD',
         method: (input.method || 'CASH').toUpperCase(),
         status: 'COMPLETED',
         reference: paymentRef,
         transactionId: transactionId
      });

      await tx.orm.public.FeePayment.create({
        invoiceId: input.invoiceId,
        amount: input.amount,
        method: input.method || 'cash',
        reference: paymentRef,
        notes: input.notes,
        recordedBy: input.recordedBy ?? membership.id,
        paidAt: (globalThis as any).Temporal.Instant.fromEpochMilliseconds(Date.now()),
      });

      const newPaidAmount = lockedInvoice.paidAmount + input.amount;
      const status = newPaidAmount >= lockedInvoice.totalAmount ? 'paid' : newPaidAmount > 0 ? 'partial' : 'unpaid';

      await tx.orm.public.FeeInvoice.where({ id: input.invoiceId }).update({
        paidAmount: newPaidAmount,
        status,
      });
    });

    return { success: true };
  } catch (error) {
    console.error('Error recording fee payment:', error);
    return { error: error instanceof Error ? error.message : 'Failed to record payment.' };
  }
}

export async function getFinancePortalData(organizationId: string) {
  try {
    const feeTypes = await db.orm.public.FeeType.where({ organizationId }).all();
    const feeInvoices = await db.orm.public.FeeInvoice.where({ organizationId }).all();

    const feeInvoiceItems: any[] = [];
    const feePayments: any[] = [];
    for (const invoice of feeInvoices) {
      const items = await db.orm.public.FeeInvoiceItem.where({ invoiceId: invoice.id }).all();
      feeInvoiceItems.push(...items);
      const payments = await db.orm.public.FeePayment.where({ invoiceId: invoice.id }).all();
      feePayments.push(...payments);
    }

    const students = await fetchHydratedStudents(organizationId);
    const staffAttendance = await db.orm.public.StaffAttendance.where({ organizationId }).all();
    const leaveRequests = await db.orm.public.LeaveRequest.where({ organizationId }).all();

    const staff = await fetchHydratedStaff(organizationId);

    return JSON.parse(JSON.stringify({
      feeTypes, feeInvoices, feeInvoiceItems, feePayments, students, staffAttendance, leaveRequests, staff,
    }));
  } catch (error) {
    console.error('Error fetching finance portal data:', error);
    return null;
  }
}

export async function markStaffAttendance(input: { organizationId: string; membershipId: string; date: string; status: string; notes?: string }) {
  try {
    const date = new Date(input.date);
    if (isNaN(date.getTime())) return { error: 'Invalid date.' };
    const dateInstant = toInstant(date);

    const existing = await db.orm.public.StaffAttendance.where({ membershipId: input.membershipId, date: dateInstant }).all().first();
    if (existing) {
      await db.orm.public.StaffAttendance.where({ id: existing.id }).update({ status: input.status, notes: input.notes });
    } else {
      await db.orm.public.StaffAttendance.create({
        organizationId: input.organizationId,
        membershipId: input.membershipId,
        date: dateInstant,
        status: input.status,
        notes: input.notes,
      });
    }
    return { success: true };
  } catch (error) {
    console.error('Error marking staff attendance:', error);
    return { error: 'Failed to mark attendance.' };
  }
}

export async function createLeaveRequest(input: {
  organizationId: string;
  membershipId: string;
  type: string;
  startDate: string;
  endDate: string;
  reason?: string;
}) {
  try {
    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate < startDate) {
      return { error: 'Invalid date range.' };
    }
    await db.orm.public.LeaveRequest.create({
      organizationId: input.organizationId,
      membershipId: input.membershipId,
      type: input.type,
      startDate: toInstant(startDate),
      endDate: toInstant(endDate),
      reason: input.reason,
      status: 'pending',
    });
    return { success: true };
  } catch (error) {
    console.error('Error creating leave request:', error);
    return { error: 'Failed to create leave request.' };
  }
}

export async function updateLeaveRequestStatus(leaveRequestId: string, input: { status: 'approved' | 'rejected'; approvedBy?: string; notes?: string }) {
  try {
    await db.orm.public.LeaveRequest.where({ id: leaveRequestId }).update({
      status: input.status,
      approvedBy: input.approvedBy,
      notes: input.notes,
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating leave request:', error);
    return { error: 'Failed to update leave request.' };
  }
}

// ---------------------------------------------------------------------
// Registrar: Enrolment Requests, Documents, Exits, Transfers In
// ---------------------------------------------------------------------

export async function getRegistrarPortalData(organizationId: string) {
  try {
    await requireMembership(organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'REGISTRAR']);

    const enrolmentRequests = await db.orm.public.EnrolmentRequest.where({ organizationId }).all();
    const documents = await db.orm.public.Document.where({ organizationId }).all();
    const studentExits = await db.orm.public.StudentExit.where({ organizationId }).all();
    const studentTransfersIn = await db.orm.public.StudentTransferIn.where({ organizationId }).all();
    
    const relationships = await db.orm.public.Relationship.where({ organizationId, type: 'STUDENT' }).all();
    const students = [];
    for (const rel of relationships) {
       const sd = await db.orm.public.StudentData.where({ relationshipId: rel.id }).all().first();
       const person = await db.orm.public.Person.where({ id: rel.personId }).all().first();
       if (sd && person) {
           students.push({ ...sd, firstName: person.firstName, lastName: person.lastName });
       }
    }
    
    const classes = await db.orm.public.SchoolClass.where({ organizationId }).all();

    return JSON.parse(JSON.stringify({ enrolmentRequests, documents, studentExits, studentTransfersIn, students, classes }));
  } catch (error) {
    console.error('Error fetching registrar portal data:', error);
    return null;
  }
}

export async function createEnrolmentRequest(input: {
  organizationId: string;
  classId: string;
  studentDataId: string; // This is StudentData.id
  requestedById: string; // We map this conceptually to Person.id
  message?: string;
}) {
  try {
    // The requester must be the student's guardian (or the student).
    // In a real system, we'd look up if they have authorization.
    // For now, we trust the Person id if they are logged in.
    const { person } = await requireAuthenticatedAccount();

    const existing = await db.orm.public.EnrolmentRequest.where({ classId: input.classId, studentDataId: input.studentDataId }).all().first();
    if (existing) return { error: 'A request for this student and class already exists.' };

    await db.orm.public.EnrolmentRequest.create({
      organizationId: input.organizationId,
      classId: input.classId,
      studentDataId: input.studentDataId,
      requestedByPersonId: person.id,
      message: input.message,
      status: 'pending',
    });
    return { success: true };
  } catch (error) {
    console.error('Error creating enrolment request:', error);
    return { error: 'Failed to create enrolment request.' };
  }
}

export async function updateEnrolmentRequestStatus(requestId: string, input: {
  status: 'approved' | 'rejected';
  rejectionReason?: string;
}) {
  try {
    const request = await db.orm.public.EnrolmentRequest.where({ id: requestId }).all().first();
    if (!request) return { error: 'Request not found.' };

    const { membership } = await requireMembership(request.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'REGISTRAR']);

    if (input.status === 'approved') {
      await enrollStudent(request.studentDataId, request.classId);
    }

    // @ts-ignore Prisma 8 Composer DateTime handling
    const reviewedAt = (globalThis as any).Temporal.Instant.fromEpochMilliseconds(Date.now());

    await db.orm.public.EnrolmentRequest.where({ id: requestId }).update({
      status: input.status,
      reviewedByMembershipId: membership.id,
      reviewedAt,
      rejectionReason: input.status === 'rejected' ? input.rejectionReason : null,
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating enrolment request:', error);
    return { error: 'Failed to update enrolment request.' };
  }
}

export async function deleteEnrolmentRequest(requestId: string) {
  try {
    const request = await db.orm.public.EnrolmentRequest.where({ id: requestId }).all().first();
    if (request) {
        await requireMembership(request.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'REGISTRAR']);
        await db.orm.public.EnrolmentRequest.where({ id: requestId }).delete();
    }
    return { success: true };
  } catch (error) {
    console.error('Error deleting enrolment request:', error);
    return { error: 'Failed to delete enrolment request.' };
  }
}

export async function createStudentDocument(input: { organizationId: string; studentDataId: string; name: string; type: string; filePath: string }) {
  try {
    if (!input.name.trim()) return { error: 'Document name is required.' };
    await db.orm.public.Document.create({
      organizationId: input.organizationId,
      studentDataId: input.studentDataId,
      name: input.name.trim(),
      type: input.type,
      filePath: input.filePath,
    });
    return { success: true };
  } catch (error) {
    console.error('Error creating student document:', error);
    return { error: 'Failed to add document.' };
  }
}

export async function deleteStudentDocument(documentId: string) {
  try {
    const item = await db.orm.public.Document.where({ id: documentId }).all().first();
    if (!item) return { error: 'Not found' };
    await requireMembership(item.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'REGISTRAR']);
    await db.orm.public.Document.where({ id: documentId }).delete();
    return { success: true };
  } catch (error) {
    console.error('Error deleting student document:', error);
    return { error: 'Failed to delete document.' };
  }
}

export async function createStudentExit(input: {
  organizationId: string;
  studentDataId: string;
  exitType: string;
  exitDate: string;
  reason?: string;
  destinationSchool?: string;
  authorisedBy?: string;
  notes?: string;
  documentsIssued?: boolean;
}) {
  try {
    const existing = await db.orm.public.StudentExit.where({ studentDataId: input.studentDataId }).all().first();
    if (existing) return { error: 'This student already has an exit record — edit the existing one instead.' };

    const exitDate = new Date(input.exitDate);
    if (isNaN(exitDate.getTime())) return { error: 'Invalid exit date.' };

    await db.orm.public.StudentExit.create({
      organizationId: input.organizationId,
      studentDataId: input.studentDataId,
      exitType: input.exitType,
      exitDate: toInstant(exitDate),
      reason: input.reason,
      destinationSchool: input.destinationSchool,
      authorisedBy: input.authorisedBy,
      notes: input.notes,
      documentsIssued: input.documentsIssued ?? false,
    });
    return { success: true };
  } catch (error) {
    console.error('Error creating student exit record:', error);
    return { error: 'Failed to create exit record.' };
  }
}

export async function updateStudentExit(studentDataId: string, input: {
  exitType?: string;
  exitDate?: string;
  reason?: string;
  destinationSchool?: string;
  notes?: string;
  documentsIssued?: boolean;
}) {
  try {
    const data: Record<string, unknown> = {};
    if (input.exitType !== undefined) data.exitType = input.exitType;
    if (input.exitDate !== undefined) data.exitDate = toInstant(new Date(input.exitDate));
    if (input.reason !== undefined) data.reason = input.reason;
    if (input.destinationSchool !== undefined) data.destinationSchool = input.destinationSchool;
    if (input.notes !== undefined) data.notes = input.notes;
    if (input.documentsIssued !== undefined) data.documentsIssued = input.documentsIssued;

    await db.orm.public.StudentExit.where({ studentDataId }).update(data);
    return { success: true };
  } catch (error) {
    console.error('Error updating student exit record:', error);
    return { error: 'Failed to update exit record.' };
  }
}

export async function createStudentTransferIn(input: {
  organizationId: string;
  studentDataId: string;
  previousSchool: string;
  previousYearLevel?: number;
  transferDate: string;
  reason?: string;
  documentsReceived?: boolean;
  academicRecordsNotes?: string;
  notes?: string;
  processedBy?: string;
}) {
  try {
    const existing = await db.orm.public.StudentTransferIn.where({ studentDataId: input.studentDataId }).all().first();
    if (existing) return { error: 'This student already has a transfer-in record — edit the existing one instead.' };
    if (!input.previousSchool.trim()) return { error: 'Previous school is required.' };

    const transferDate = new Date(input.transferDate);
    if (isNaN(transferDate.getTime())) return { error: 'Invalid transfer date.' };

    await db.orm.public.StudentTransferIn.create({
      organizationId: input.organizationId,
      studentDataId: input.studentDataId,
      previousSchool: input.previousSchool.trim(),
      previousYearLevel: input.previousYearLevel,
      transferDate: toInstant(transferDate),
      reason: input.reason,
      documentsReceived: input.documentsReceived ?? false,
      academicRecordsNotes: input.academicRecordsNotes,
      notes: input.notes,
      processedBy: input.processedBy,
    });
    return { success: true };
  } catch (error) {
    console.error('Error creating student transfer-in record:', error);
    return { error: 'Failed to create transfer record.' };
  }
}

// ---------------------------------------------------------------------
// Counselor: Wellness Notes, Suspensions, Truancy
// ---------------------------------------------------------------------

export async function getCounselorPortalData(organizationId: string) {
  try {
    const studentNotes = await db.orm.public.StudentNote.where({ organizationId }).all();
    const behaviourIncidents = await db.orm.public.BehaviourIncident.where({ organizationId }).all();
    const suspensions = await db.orm.public.Suspension.where({ organizationId }).all();
    const truancyAlerts = await db.orm.public.TruancyAlert.where({ organizationId }).all();
    const students = await fetchHydratedStudents(organizationId);

    return JSON.parse(JSON.stringify({ studentNotes, behaviourIncidents, suspensions, truancyAlerts, students }));
  } catch (error) {
    console.error('Error fetching counselor portal data:', error);
    return null;
  }
}

export async function createStudentNote(input: {
  organizationId: string;
  studentDataId: string; // Maps to StudentData.id
  authorId?: string; // Maps to Membership.id
  content: string;
  type?: 'general' | 'academic' | 'medical' | 'behaviour' | 'pastoral';
  private?: boolean;
}) {
  try {
    const { membership } = await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'TEACHER', 'REGISTRAR', 'COUNSELOR']);

    if (!input.content.trim()) return { error: 'Note content is required.' };
    await db.orm.public.StudentNote.create({
      organizationId: input.organizationId,
      studentDataId: input.studentDataId,
      authorMembershipId: input.authorId ?? membership.id,
      content: input.content.trim(),
      type: input.type ?? 'general',
      private: input.private ?? false,
    });
    return { success: true };
  } catch (error) {
    console.error('Error creating student note:', error);
    return { error: 'Failed to create note.' };
  }
}

export async function updateStudentNote(noteId: string, input: { content?: string; type?: string; private?: boolean }) {
  try {
    const note = await db.orm.public.StudentNote.where({ id: noteId }).all().first();
    if (!note) return { error: 'Note not found.' };

    await requireMembership(note.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'TEACHER', 'REGISTRAR', 'COUNSELOR']);

    const data: Record<string, unknown> = {};
    if (input.content !== undefined) data.content = input.content.trim();
    if (input.type !== undefined) data.type = input.type;
    if (input.private !== undefined) data.private = input.private;

    await db.orm.public.StudentNote.where({ id: noteId }).update(data);
    return { success: true };
  } catch (error) {
    console.error('Error updating student note:', error);
    return { error: 'Failed to update note.' };
  }
}

export async function deleteStudentNote(noteId: string) {
  try {
    const note = await db.orm.public.StudentNote.where({ id: noteId }).all().first();
    if (!note) return { error: 'Note not found.' };

    await requireMembership(note.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'TEACHER', 'REGISTRAR', 'COUNSELOR']);

    await db.orm.public.StudentNote.where({ id: noteId }).delete();
    return { success: true };
  } catch (error) {
    console.error('Error deleting student note:', error);
    return { error: 'Failed to delete note.' };
  }
}

export async function createSuspension(input: {
  organizationId: string;
  studentDataId: string;
  incidentId?: string;
  type?: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  returnConditions?: string;
  authorisedBy?: string;
  parentNotified?: boolean;
  parentMeetingDate?: string;
}) {
  try {
    if (!input.reason.trim()) return { error: 'A reason is required.' };
    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate < startDate) {
      return { error: 'Invalid date range.' };
    }

    await db.orm.public.Suspension.create({
      organizationId: input.organizationId,
      studentDataId: input.studentDataId,
      incidentId: input.incidentId,
      type: input.type ?? 'out-of-school',
      startDate: toInstant(startDate),
      endDate: toInstant(endDate),
      totalDays: input.totalDays,
      reason: input.reason.trim(),
      returnConditions: input.returnConditions,
      authorisedBy: input.authorisedBy,
      parentNotified: input.parentNotified ?? false,
      parentMeetingDate: input.parentMeetingDate ? toInstant(new Date(input.parentMeetingDate)) : undefined,
    });
    return { success: true };
  } catch (error) {
    console.error('Error creating suspension:', error);
    return { error: 'Failed to create suspension record.' };
  }
}

export async function updateSuspension(suspensionId: string, input: { returnDate?: string; notes?: string; parentNotified?: boolean }) {
  try {
    const data: Record<string, unknown> = {};
    if (input.returnDate !== undefined) data.returnDate = toInstant(new Date(input.returnDate));
    if (input.notes !== undefined) data.notes = input.notes;
    if (input.parentNotified !== undefined) data.parentNotified = input.parentNotified;

    await db.orm.public.Suspension.where({ id: suspensionId }).update(data);
    return { success: true };
  } catch (error) {
    console.error('Error updating suspension:', error);
    return { error: 'Failed to update suspension.' };
  }
}

export async function resolveTruancyAlert(alertId: string, input: { resolvedBy: string; notes?: string }) {
  try {
    await db.orm.public.TruancyAlert.where({ id: alertId }).update({
      resolvedAt: toInstant(new Date()),
      resolvedBy: input.resolvedBy,
      notes: input.notes,
    });
    return { success: true };
  } catch (error) {
    console.error('Error resolving truancy alert:', error);
    return { error: 'Failed to resolve truancy alert.' };
  }
}

export async function updateStudentTransferIn(studentDataId: string, input: {
  previousSchool?: string;
  previousYearLevel?: number;
  transferDate?: string;
  reason?: string;
  documentsReceived?: boolean;
  academicRecordsNotes?: string;
  notes?: string;
}) {
  try {
    const data: Record<string, unknown> = {};
    if (input.previousSchool !== undefined) data.previousSchool = input.previousSchool;
    if (input.previousYearLevel !== undefined) data.previousYearLevel = input.previousYearLevel;
    if (input.transferDate !== undefined) data.transferDate = toInstant(new Date(input.transferDate));
    if (input.reason !== undefined) data.reason = input.reason;
    if (input.documentsReceived !== undefined) data.documentsReceived = input.documentsReceived;
    if (input.academicRecordsNotes !== undefined) data.academicRecordsNotes = input.academicRecordsNotes;
    if (input.notes !== undefined) data.notes = input.notes;

    await db.orm.public.StudentTransferIn.where({ studentDataId }).update(data);
    return { success: true };
  } catch (error) {
    console.error('Error updating student transfer-in record:', error);
    return { error: 'Failed to update transfer record.' };
  }
}

// ---------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------

export async function getRooms(organizationId: string) {
  try {
    await requireMembership(organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'STAFF', 'TEACHER', 'COUNSELOR', 'REGISTRAR']);
    const rooms = await db.orm.public.Room.where({ organizationId }).all();
    return JSON.parse(JSON.stringify(rooms.sort((a, b) => a.name.localeCompare(b.name))));
  } catch (error) {
    console.error('Error fetching rooms:', error);
    return [];
  }
}

export async function createRoom(input: {
  organizationId: string;
  name: string;
  code: string;
  capacity?: number;
  type?: string;
  building?: string;
  floor?: string;
}) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'REGISTRAR']);
    if (!input.name.trim() || !input.code.trim()) return { error: 'Room name and code are required.' };
    await db.orm.public.Room.create({
      organizationId: input.organizationId,
      name: input.name.trim(),
      code: input.code.trim(),
      capacity: input.capacity,
      type: input.type,
      building: input.building,
      floor: input.floor,
    });
    return { success: true };
  } catch (error) {
    console.error('Error creating room:', error);
    return { error: 'A room with this name or code already exists.' };
  }
}

export async function updateRoom(roomId: string, input: {
  name?: string;
  code?: string;
  capacity?: number | null;
  type?: string | null;
  building?: string | null;
  floor?: string | null;
}) {
  try {
    // Look up room's organization for auth
    const room = await db.orm.public.Room.where({ id: roomId }).all().first();
    if (!room) return { error: 'Room not found' };
    await requireMembership(room.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'REGISTRAR']);
    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name.trim();
    if (input.code !== undefined) data.code = input.code.trim();
    if (input.capacity !== undefined) data.capacity = input.capacity;
    if (input.type !== undefined) data.type = input.type;
    if (input.building !== undefined) data.building = input.building;
    if (input.floor !== undefined) data.floor = input.floor;

    await db.orm.public.Room.where({ id: roomId }).update(data);
    return { success: true };
  } catch (error) {
    console.error('Error updating room:', error);
    return { error: 'Failed to update room.' };
  }
}

export async function deleteRoom(roomId: string) {
  try {
    const room = await db.orm.public.Room.where({ id: roomId }).all().first();
    if (!room) return { error: 'Room not found' };
    await requireMembership(room.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'REGISTRAR']);
    const classesUsingRoom = await db.orm.public.SchoolClass.where({ roomId }).all();
    if (classesUsingRoom.length > 0) {
      return { error: 'Unassign this room from classes before removing it.' };
    }
    const slotsUsingRoom = await db.orm.public.TimetableSlot.where({ roomId }).all();
    if (slotsUsingRoom.length > 0) {
      return { error: 'Unassign this room from timetable slots before removing it.' };
    }
    await db.orm.public.Room.where({ id: roomId }).delete();
    return { success: true };
  } catch (error) {
    console.error('Error deleting room:', error);
    return { error: 'Failed to remove room.' };
  }
}

// ---------------------------------------------------------------------
// Timetable
// ---------------------------------------------------------------------

const TIME_FORMAT = /^([01]\d|2[0-3]):[0-5]\d$/;

async function checkTimetableConflicts(
  effective: { classId: string; membershipId?: string; roomId?: string; dayOfWeek: number; period: number },
  excludeSlotId?: string
): Promise<{ error: string } | null> {
  const classSlots = await db.orm.public.TimetableSlot.where({ classId: effective.classId }).all();
  if (classSlots.some((s) => s.id !== excludeSlotId && s.dayOfWeek === effective.dayOfWeek && s.period === effective.period)) {
    return { error: 'This class already has a slot at this day and period.' };
  }

  if (effective.membershipId) {
    const staffSlots = await db.orm.public.TimetableSlot.where({ membershipId: effective.membershipId }).all();
    const conflict = staffSlots.find((s) => s.id !== excludeSlotId && s.dayOfWeek === effective.dayOfWeek && s.period === effective.period);
    if (conflict) {
      const conflictingClass = await db.orm.public.SchoolClass.where({ id: conflict.classId }).all().first();
      return { error: `This teacher already teaches ${conflictingClass?.name ?? 'another class'} at this day/period.` };
    }
  }

  if (effective.roomId) {
    const roomSlots = await db.orm.public.TimetableSlot.where({ roomId: effective.roomId }).all();
    const conflict = roomSlots.find((s) => s.id !== excludeSlotId && s.dayOfWeek === effective.dayOfWeek && s.period === effective.period);
    if (conflict) {
      const conflictingClass = await db.orm.public.SchoolClass.where({ id: conflict.classId }).all().first();
      return { error: `Room is already booked for ${conflictingClass?.name ?? 'another class'} at this day/period.` };
    }
  }

  return null;
}

export async function getTimetableForClass(classId: string) {
  try {
    const cls = await db.orm.public.SchoolClass.where({ id: classId }).all().first();
    if (!cls) return [];

    await requireMembership(cls.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'REGISTRAR', 'TEACHER']);

    const slots = await db.orm.public.TimetableSlot.where({ classId }).all();
    const rooms = await db.orm.public.Room.where({ organizationId: cls.organizationId }).all();

    const enriched = [];
    for (const slot of slots) {
      const room = rooms.find((r) => r.id === slot.roomId);
      let staffName = null;
      if (slot.membershipId) {
          const membership = await db.orm.public.Membership.where({ id: slot.membershipId }).all().first();
          if (membership) {
              const person = await db.orm.public.Person.where({ id: membership.personId }).all().first();
              if (person) staffName = `${person.firstName} ${person.lastName}`;
          }
      }
      enriched.push({
        ...slot,
        roomName: room?.name ?? null,
        staffName,
      });
    }

    enriched.sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.period - b.period);
    return JSON.parse(JSON.stringify(enriched));
  } catch (error) {
    console.error('Error fetching timetable for class:', error);
    return [];
  }
}

export async function getTimetableForSection(sectionId: string) {
  try {
    const section = await db.orm.public.ClassSection.where({ id: sectionId }).all().first();
    if (!section) return [];

    await requireMembership(section.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'REGISTRAR', 'TEACHER']);

    const courses = await db.orm.public.SchoolClass.where({ classSectionId: sectionId }).all();
    const courseIds = courses.map((c) => c.id);
    if (courseIds.length === 0) return [];

    const allSlots = await db.orm.public.TimetableSlot.all();
    const slots = allSlots.filter((s) => courseIds.includes(s.classId));
    
    const rooms = await db.orm.public.Room.where({ organizationId: section.organizationId }).all();

    const enriched = [];
    for (const slot of slots) {
      const course = courses.find((c) => c.id === slot.classId);
      const room = rooms.find((r) => r.id === slot.roomId);
      let staffName = null;
      if (slot.membershipId) {
          const membership = await db.orm.public.Membership.where({ id: slot.membershipId }).all().first();
          if (membership) {
              const person = await db.orm.public.Person.where({ id: membership.personId }).all().first();
              if (person) staffName = `${person.firstName} ${person.lastName}`;
          }
      }
      enriched.push({
        ...slot,
        courseName: course?.name ?? null,
        roomName: room?.name ?? null,
        staffName,
      });
    }

    enriched.sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.period - b.period);
    return JSON.parse(JSON.stringify(enriched));
  } catch (error) {
    console.error('Error fetching timetable for section:', error);
    return [];
  }
}

export async function createTimetableSlot(input: {
  classId: string;
  dayOfWeek: number;
  period: number;
  startTime: string;
  endTime: string;
  roomId?: string;
  membershipId?: string;
  notes?: string;
}): Promise<{ success: true } | { error: string }> {
  try {
    const cls = await db.orm.public.SchoolClass.where({ id: input.classId }).all().first();
    if (!cls) return { error: 'Class not found.' };

    await requireMembership(cls.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'REGISTRAR']);

    if (input.dayOfWeek < 1 || input.dayOfWeek > 7) return { error: 'Invalid day of week.' };
    if (!Number.isInteger(input.period) || input.period < 1) return { error: 'Invalid period.' };
    const TIME_FORMAT_LOCAL = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!TIME_FORMAT_LOCAL.test(input.startTime) || !TIME_FORMAT_LOCAL.test(input.endTime)) return { error: 'Times must be in HH:MM format.' };
    if (input.startTime >= input.endTime) return { error: 'Start time must be before end time.' };

    let membershipId = input.membershipId;
    if (!membershipId) {
      const classTeachers = await db.orm.public.ClassTeacher.where({ classId: input.classId }).all();
      const primary = classTeachers.find((ct) => ct.isPrimary) ?? classTeachers[0];
      membershipId = primary?.membershipId;
    }

    const conflict = await checkTimetableConflicts({
      classId: input.classId, membershipId, roomId: input.roomId, dayOfWeek: input.dayOfWeek, period: input.period,
    });
    if (conflict) return conflict;

    await db.orm.public.TimetableSlot.create({
      classId: input.classId,
      membershipId: membershipId || undefined,
      roomId: input.roomId || undefined,
      dayOfWeek: input.dayOfWeek,
      period: input.period,
      startTime: input.startTime,
      endTime: input.endTime,
      notes: input.notes,
    });

    return { success: true };
  } catch (error) {
    console.error('Error creating timetable slot:', error);
    return { error: 'Failed to create timetable slot.' };
  }
}

export async function updateTimetableSlot(slotId: string, input: {
  dayOfWeek?: number;
  period?: number;
  startTime?: string;
  endTime?: string;
  roomId?: string | null;
  membershipId?: string | null;
  notes?: string | null;
}): Promise<{ success: true } | { error: string }> {
  try {
    const existing = await db.orm.public.TimetableSlot.where({ id: slotId }).all().first();
    if (!existing) return { error: 'Slot not found.' };

    const cls = await db.orm.public.SchoolClass.where({ id: existing.classId }).all().first();
    if (cls) await requireMembership(cls.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'REGISTRAR']);

    const effective = {
      classId: existing.classId,
      membershipId: (input.membershipId !== undefined ? input.membershipId : existing.membershipId) ?? undefined,
      roomId: (input.roomId !== undefined ? input.roomId : existing.roomId) ?? undefined,
      dayOfWeek: input.dayOfWeek ?? existing.dayOfWeek,
      period: input.period ?? existing.period,
    };

    const TIME_FORMAT_LOCAL = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (input.startTime !== undefined && !TIME_FORMAT_LOCAL.test(input.startTime)) return { error: 'Start time must be in HH:MM format.' };
    if (input.endTime !== undefined && !TIME_FORMAT_LOCAL.test(input.endTime)) return { error: 'End time must be in HH:MM format.' };
    const effectiveStart = input.startTime ?? existing.startTime;
    const effectiveEnd = input.endTime ?? existing.endTime;
    if (effectiveStart >= effectiveEnd) return { error: 'Start time must be before end time.' };

    const conflict = await checkTimetableConflicts(effective, slotId);
    if (conflict) return conflict;

    const data: Record<string, unknown> = {};
    if (input.dayOfWeek !== undefined) data.dayOfWeek = input.dayOfWeek;
    if (input.period !== undefined) data.period = input.period;
    if (input.startTime !== undefined) data.startTime = input.startTime;
    if (input.endTime !== undefined) data.endTime = input.endTime;
    if (input.roomId !== undefined) data.roomId = input.roomId;
    if (input.membershipId !== undefined) data.membershipId = input.membershipId;
    if (input.notes !== undefined) data.notes = input.notes;

    await db.orm.public.TimetableSlot.where({ id: slotId }).update(data);
    return { success: true };
  } catch (error) {
    console.error('Error updating timetable slot:', error);
    return { error: 'Failed to update timetable slot.' };
  }
}

export async function deleteTimetableSlot(slotId: string) {
  try {
    const existing = await db.orm.public.TimetableSlot.where({ id: slotId }).all().first();
    if (existing) {
        const cls = await db.orm.public.SchoolClass.where({ id: existing.classId }).all().first();
        if (cls) await requireMembership(cls.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'REGISTRAR']);
        await db.orm.public.TimetableSlot.where({ id: slotId }).delete();
    }
    return { success: true };
  } catch (error) {
    console.error('Error deleting timetable slot:', error);
    return { error: 'Failed to remove timetable slot.' };
  }
}

// ---------------------------------------------------------------------
// Calendar (School Events)
// ---------------------------------------------------------------------

// `targetRoles`/`targetYears` are plain strings in the schema: either the
// literal "all", or a JSON-stringified array. `targetRoles` uses an
// app-defined 4-value audience set (ADMIN/TEACHER/STUDENT/PARENT) rather
// than OrgRole, since Student/Parent aren't OrganizationMembers.
type AudienceRole = 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT';

function parseAudienceField(raw: string): 'all' | string[] {
  if (raw === 'all') return 'all';
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : 'all';
  } catch {
    // Malformed data fails open to "all" — an unreadable audience field
    // should never silently hide an event.
    return 'all';
  }
}

function encodeAudienceField(value: string[] | 'all' | undefined): string {
  if (!value || value === 'all') return 'all';
  return JSON.stringify(value.map(String));
}

function eventMatchesAudience(event: { targetRoles: string; targetYears: string }, role: AudienceRole, yearLevel: number | null): boolean {
  const roles = parseAudienceField(event.targetRoles);
  const years = parseAudienceField(event.targetYears);
  const roleOk = roles === 'all' || roles.includes(role);
  const yearOk = years === 'all' || yearLevel === null || years.includes(String(yearLevel));
  return roleOk && yearOk;
}

export async function getSchoolEvents(organizationId: string) {
  try {
    await requireMembership(organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'TEACHER', 'REGISTRAR', 'COUNSELOR', 'FINANCE', 'LIBRARIAN', 'STUDENT', 'PARENT']);
    const events = await db.orm.public.SchoolEvent.where({ organizationId }).all();
    return JSON.parse(JSON.stringify(events.sort((a, b) => epochMs(a.startDate) - epochMs(b.startDate))));
  } catch (error) {
    console.error('Error fetching school events:', error);
    return [];
  }
}

export async function createSchoolEvent(input: {
  organizationId: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  allDay?: boolean;
  category?: string;
  targetRoles?: AudienceRole[] | 'all';
  targetYears?: (string | number)[] | 'all';
  createdById?: string; // Maps to Membership.id; keeping param name for backwards compatibility
}) {
  try {
    const { membership } = await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'TEACHER', 'REGISTRAR', 'COUNSELOR', 'FINANCE', 'LIBRARIAN']);

    if (!input.title.trim()) return { error: 'Event title is required.' };
    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate < startDate) {
      return { error: 'Invalid date range.' };
    }

    await db.orm.public.SchoolEvent.create({
      organizationId: input.organizationId,
      title: input.title.trim(),
      description: input.description,
      startDate: toInstant(startDate),
      endDate: toInstant(endDate),
      allDay: input.allDay ?? true,
      category: input.category ?? 'academic',
      targetRoles: encodeAudienceField(input.targetRoles),
      targetYears: encodeAudienceField(input.targetYears as string[] | 'all' | undefined),
      createdByMembershipId: input.createdById ?? membership.id,
    });

    return { success: true };
  } catch (error) {
    console.error('Error creating school event:', error);
    return { error: 'Failed to create event.' };
  }
}

export async function updateSchoolEvent(eventId: string, input: {
  title?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  allDay?: boolean;
  category?: string;
  targetRoles?: AudienceRole[] | 'all';
  targetYears?: (string | number)[] | 'all';
}) {
  try {
    const event = await db.orm.public.SchoolEvent.where({ id: eventId }).all().first();
    if (!event) return { error: 'Event not found.' };

    await requireMembership(event.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'TEACHER', 'REGISTRAR', 'COUNSELOR', 'FINANCE', 'LIBRARIAN']);

    const data: Record<string, unknown> = {};
    if (input.title !== undefined) data.title = input.title.trim();
    if (input.description !== undefined) data.description = input.description;
    if (input.startDate !== undefined) data.startDate = toInstant(new Date(input.startDate));
    if (input.endDate !== undefined) data.endDate = toInstant(new Date(input.endDate));
    if (input.allDay !== undefined) data.allDay = input.allDay;
    if (input.category !== undefined) data.category = input.category;
    if (input.targetRoles !== undefined) data.targetRoles = encodeAudienceField(input.targetRoles);
    if (input.targetYears !== undefined) data.targetYears = encodeAudienceField(input.targetYears as string[] | 'all');

    await db.orm.public.SchoolEvent.where({ id: eventId }).update(data);
    return { success: true };
  } catch (error) {
    console.error('Error updating school event:', error);
    return { error: 'Failed to update event.' };
  }
}

export async function deleteSchoolEvent(eventId: string) {
  try {
    const item = await db.orm.public.SchoolEvent.where({ id: eventId }).all().first();
    if (!item) return { error: 'Not found' };
    await requireMembership(item.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'REGISTRAR']);
    await db.orm.public.SchoolEvent.where({ id: eventId }).delete();
    return { success: true };
  } catch (error) {
    console.error('Error deleting school event:', error);
    return { error: 'Failed to remove event.' };
  }
}

// ---------------------------------------------------------------------
// Examination: Grading Scales
// ---------------------------------------------------------------------

export async function getGradingScales(organizationId: string) {
  try {
    const scales = await db.orm.public.GradingScale.where({ organizationId }).all();
    const enriched: any[] = [];
    for (const s of scales) {
      const boundaries = await db.orm.public.GradeBoundary.where({ gradingScaleId: s.id }).all();
      enriched.push({ ...s, boundaries: boundaries.sort((a, b) => b.minPercent - a.minPercent) });
    }
    return JSON.parse(JSON.stringify(enriched));
  } catch (error) {
    console.error('Error fetching grading scales:', error);
    return [];
  }
}

async function getDefaultGradingScale(organizationId: string) {
  const scales = await db.orm.public.GradingScale.where({ organizationId }).all();
  const scale = scales.find((s) => s.isDefault) ?? scales[0];
  if (!scale) return null;
  const boundaries = await db.orm.public.GradeBoundary.where({ gradingScaleId: scale.id }).all();
  return { ...scale, boundaries: boundaries.sort((a, b) => b.minPercent - a.minPercent) };
}

export async function createGradingScale(organizationId: string, name: string, isDefault?: boolean) {
  try {
    if (!name.trim()) return { error: 'Grading scale name is required.' };
    if (isDefault) {
      const existing = await db.orm.public.GradingScale.where({ organizationId }).all();
      for (const s of existing) {
        if (s.isDefault) await db.orm.public.GradingScale.where({ id: s.id }).update({ isDefault: false });
      }
    }
    await db.orm.public.GradingScale.create({ organizationId, name: name.trim(), isDefault: isDefault ?? false });
    return { success: true };
  } catch (error) {
    console.error('Error creating grading scale:', error);
    return { error: 'A grading scale with this name may already exist.' };
  }
}

export async function updateGradingScale(scaleId: string, input: { name?: string; isDefault?: boolean }) {
  try {
    if (input.isDefault) {
      const scale = await db.orm.public.GradingScale.where({ id: scaleId }).all().first();
      if (scale) {
        const siblings = await db.orm.public.GradingScale.where({ organizationId: scale.organizationId }).all();
        for (const s of siblings) {
          if (s.id !== scaleId && s.isDefault) await db.orm.public.GradingScale.where({ id: s.id }).update({ isDefault: false });
        }
      }
    }
    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name.trim();
    if (input.isDefault !== undefined) data.isDefault = input.isDefault;
    await db.orm.public.GradingScale.where({ id: scaleId }).update(data);
    return { success: true };
  } catch (error) {
    console.error('Error updating grading scale:', error);
    return { error: 'Failed to update grading scale.' };
  }
}

export async function deleteGradingScale(scaleId: string) {
  try {
    const item = await db.orm.public.GradingScale.where({ id: scaleId }).all().first();
    if (!item) return { error: 'Not found' };
    await requireMembership(item.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'REGISTRAR']);
    await db.orm.public.GradingScale.where({ id: scaleId }).delete();
    return { success: true };
  } catch (error) {
    console.error('Error deleting grading scale:', error);
    return { error: 'Failed to remove grading scale.' };
  }
}

export async function createGradeBoundary(input: {
  gradingScaleId: string;
  minPercent: number;
  maxPercent: number;
  label: string;
  remark?: string;
  order?: number;
}) {
  try {
    if (!input.label.trim()) return { error: 'Grade label is required.' };
    if (input.minPercent > input.maxPercent) return { error: 'Minimum percent must be less than or equal to maximum percent.' };
    await db.orm.public.GradeBoundary.create({
      gradingScaleId: input.gradingScaleId,
      minPercent: input.minPercent,
      maxPercent: input.maxPercent,
      label: input.label.trim(),
      remark: input.remark,
      order: input.order ?? 0,
    });
    return { success: true };
  } catch (error) {
    console.error('Error creating grade boundary:', error);
    return { error: 'Failed to create grade boundary.' };
  }
}

export async function updateGradeBoundary(boundaryId: string, input: {
  minPercent?: number;
  maxPercent?: number;
  label?: string;
  remark?: string | null;
  order?: number;
}) {
  try {
    const data: Record<string, unknown> = {};
    if (input.minPercent !== undefined) data.minPercent = input.minPercent;
    if (input.maxPercent !== undefined) data.maxPercent = input.maxPercent;
    if (input.label !== undefined) data.label = input.label.trim();
    if (input.remark !== undefined) data.remark = input.remark;
    if (input.order !== undefined) data.order = input.order;
    await db.orm.public.GradeBoundary.where({ id: boundaryId }).update(data);
    return { success: true };
  } catch (error) {
    console.error('Error updating grade boundary:', error);
    return { error: 'Failed to update grade boundary.' };
  }
}

export async function deleteGradeBoundary(boundaryId: string) {
  try {
    const item = await db.orm.public.GradeBoundary.where({ id: boundaryId }).all().first();
    if (!item) return { error: 'Not found' };
    const scale = await db.orm.public.GradingScale.where({ id: item.gradingScaleId }).all().first();
    if (scale) await requireMembership(scale.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'REGISTRAR']);
    await db.orm.public.GradeBoundary.where({ id: boundaryId }).delete();
    return { success: true };
  } catch (error) {
    console.error('Error deleting grade boundary:', error);
    return { error: 'Failed to remove grade boundary.' };
  }
}

// ---------------------------------------------------------------------
// Examination: result computation (weighted per-subject scores, class
// ranking) and report cards
// ---------------------------------------------------------------------

// One student's result in one subject (SchoolClass) for one term: every
// Gradebook entry (CA1, CA2, Exam, ...) for that class+term is normalized
// to a percentage of its own maxScore, then combined via a weighted
// average using each entry's `weight` — this is what lets the same
// formula express both a Nigerian-style "CA 30% + Exam 70%" split and a
// Western-style category-weighted scheme, just with different weights.
async function computeSubjectResult(studentDataId: string, classId: string, termId: string) {
  const assignments = await db.orm.public.Gradebook.where({ classId, termId }).all();
  const breakdown: any[] = [];
  let weightedSum = 0;
  let weightTotal = 0;

  for (const a of assignments) {
    const grade = await db.orm.public.Grade.where({ gradebookId: a.id, studentDataId: studentDataId }).all().first();
    if (!grade || grade.score == null || !a.maxScore || a.maxScore <= 0) continue;
    const percentage = (grade.score / a.maxScore) * 100;
    const weight = a.weight ?? 1;
    weightedSum += percentage * weight;
    weightTotal += weight;
    breakdown.push({ gradebookId: a.id, name: a.name, type: a.type, score: grade.score, maxScore: a.maxScore, percentage, weight });
  }

  const percentage = weightTotal > 0 ? weightedSum / weightTotal : null;
  return { classId, percentage, breakdown };
}

function getGradeLabel(
  percentage: number | null,
  scale: { boundaries: { minPercent: number; maxPercent: number; label: string; remark?: string | null }[] } | null
) {
  if (percentage === null || !scale) return null;
  const boundary = scale.boundaries.find((b) => percentage >= b.minPercent && percentage <= b.maxPercent);
  return boundary ? { label: boundary.label, remark: boundary.remark ?? null } : null;
}

// The roster of a class section for report-card purposes. Deliberately
// does NOT trust Student.classSectionId alone — after a promotion that FK
// points at the student's *current* section, so a past section's roster
// would otherwise silently go empty once everyone in it has moved on.
// Instead this unions: (a) students with historical subject-enrollment in
// this section, via ClassEnrolment -> SchoolClass.classSectionId — correct
// even for a section from a prior academic year — with (b) students whose
// *live* classSectionId points here, which catches a student who hasn't
// been subject-enrolled yet this year. A promoted-away student's live FK
// no longer points at their old section, so (b) can never resurrect them
// into a section they've left.
async function getStudentsInSection(classSectionId: string) {
  const studentDataIds = new Set<string>();

  const classesInSection = await db.orm.public.SchoolClass.where({ classSectionId }).all();
  for (const cls of classesInSection) {
    const enrolments = await db.orm.public.ClassEnrolment.where({ classId: cls.id }).all();
    enrolments.forEach((e) => studentDataIds.add(e.studentDataId));
  }

  const liveStudents = await db.orm.public.StudentData.where({ classSectionId }).all();
  liveStudents.forEach((s) => studentDataIds.add(s.id));

  const students: any[] = [];
  for (const id of studentDataIds) {
    const sd = await db.orm.public.StudentData.where({ id }).all().first();
    if (sd) {
       const rel = await db.orm.public.Relationship.where({ id: sd.relationshipId }).all().first();
       if (rel) {
           const person = await db.orm.public.Person.where({ id: rel.personId }).all().first();
           if (person) students.push({ ...sd, firstName: person.firstName, lastName: person.lastName });
       }
    }
  }
  return students;
}

// Which class section a student belonged to during a given academic year —
// resolved from their ClassEnrolment history rather than their *current*
// classSectionId, which may have moved on to a later year since. Falls
// back to the live classSectionId only when that section itself belongs to
// the requested year (covers a student not yet subject-enrolled).
async function resolveStudentSectionForYear(student: any, academicYearId: string): Promise<string | null> {
  const enrolments = await db.orm.public.ClassEnrolment.where({ studentDataId: student.id }).all();
  for (const enr of enrolments) {
    const cls = await db.orm.public.SchoolClass.where({ id: enr.classId }).all().first();
    if (cls?.classSectionId && cls.academicYearId === academicYearId) return cls.classSectionId;
  }
  if (student.classSectionId) {
    const liveSection = await db.orm.public.ClassSection.where({ id: student.classSectionId }).all().first();
    if (liveSection?.academicYearId === academicYearId) return student.classSectionId;
  }
  return null;
}

// Every student in one Class Section, with their per-subject results,
// overall average, and class position for one term. Shared by the admin
// bulk report-card view and the single-student report card.
async function computeClassSectionResults(organizationId: string, classSectionId: string, termId: string) {
  const term = await db.orm.public.Term.where({ id: termId }).all().first();
  if (!term) return { classSize: 0, results: [] as any[], gradingScale: null as any };

  const students = await getStudentsInSection(classSectionId);
  const gradingScale = await getDefaultGradingScale(organizationId);

  const results: any[] = [];
  for (const student of students) {
    const enrolments = await db.orm.public.ClassEnrolment.where({ studentDataId: student.id }).all();
    const subjects: any[] = [];
    for (const enr of enrolments) {
      const cls = await db.orm.public.SchoolClass.where({ id: enr.classId }).all().first();
      if (!cls || cls.academicYearId !== term.academicYearId) continue;
      const subjectResult = await computeSubjectResult(student.id, cls.id, termId);
      const gradeInfo = getGradeLabel(subjectResult.percentage, gradingScale);
      subjects.push({
        classId: cls.id,
        subjectName: cls.name,
        percentage: subjectResult.percentage,
        breakdown: subjectResult.breakdown,
        gradeLabel: gradeInfo?.label ?? null,
        gradeRemark: gradeInfo?.remark ?? null,
      });
    }

    const validPct = subjects.map((s) => s.percentage).filter((p): p is number => p !== null);
    const overallPercentage = validPct.length > 0 ? validPct.reduce((a, b) => a + b, 0) / validPct.length : null;
    const overallGradeInfo = getGradeLabel(overallPercentage, gradingScale);

    results.push({
      student,
      subjects,
      overallPercentage,
      overallGradeLabel: overallGradeInfo?.label ?? null,
      overallGradeRemark: overallGradeInfo?.remark ?? null,
      position: null as number | null,
    });
  }

  const ranked = results
    .filter((r) => r.overallPercentage !== null)
    .sort((a, b) => (b.overallPercentage as number) - (a.overallPercentage as number));
  let lastScore: number | null = null;
  let lastPosition = 0;
  ranked.forEach((r, idx) => {
    if (r.overallPercentage !== lastScore) {
      lastPosition = idx + 1;
      lastScore = r.overallPercentage;
    }
    r.position = lastPosition;
  });

  return { classSize: students.length, results, gradingScale };
}

export async function getClassReportCards(organizationId: string, classSectionId: string, termId: string) {
  try {
    await requireMembership(organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'TEACHER', 'REGISTRAR']);
    const { classSize, results, gradingScale } = await computeClassSectionResults(organizationId, classSectionId, termId);
    const reportCards = await db.orm.public.ReportCard.where({ termId }).all();
    const enriched = results.map((r) => ({
      ...r,
      reportCard: reportCards.find((rc) => rc.studentDataId === r.student.id) ?? null,
    }));
    return JSON.parse(JSON.stringify({ classSize, results: enriched, gradingScale }));
  } catch (error) {
    console.error('Error fetching class report cards:', error);
    return { classSize: 0, results: [], gradingScale: null };
  }
}

// `requirePublished` is the safeguard for resident-facing (Student/Parent)
// callers: without it, this would let any caller who knows a studentDataId
// see a still-draft report card the same way an Admin reviewing it can —
// Student/Parent call sites must always pass `requirePublished: true`.
export async function getStudentReportCard(
  organizationId: string,
  studentDataId: string,
  termId: string,
  options?: { requirePublished?: boolean }
) {
  try {
    const sd = await db.orm.public.StudentData.where({ id: studentDataId }).all().first();
    if (!sd) return null;
    const rel = await db.orm.public.Relationship.where({ id: sd.relationshipId }).all().first();
    if (!rel) return null;
    const person = await db.orm.public.Person.where({ id: rel.personId }).all().first();
    const student = { ...sd, firstName: person?.firstName, lastName: person?.lastName };

    const term = await db.orm.public.Term.where({ id: termId }).all().first();
    if (!term) return null;
    const academicYear = await db.orm.public.AcademicYear.where({ id: term.academicYearId }).all().first();
    const reportCard = await db.orm.public.ReportCard.where({ studentDataId: studentDataId, termId }).all().first();

    if (options?.requirePublished && !reportCard?.published) {
      return JSON.parse(JSON.stringify({ student, term, academicYear, reportCard: null, notPublished: true }));
    }

    let result: any = { student, subjects: [], overallPercentage: null, overallGradeLabel: null, overallGradeRemark: null, position: null };
    let classSize = 0;
    const sectionForTerm = await resolveStudentSectionForYear(student, term.academicYearId);
    if (sectionForTerm) {
      const computed = await computeClassSectionResults(organizationId, sectionForTerm, termId);
      classSize = computed.classSize;
      result = computed.results.find((r: any) => r.student.id === studentDataId) ?? result;
    }
    const gradingScale = await getDefaultGradingScale(organizationId);

    const attendanceRows = await db.orm.public.Attendance.where({ studentDataId: studentDataId, termId }).all();
    const attendance = {
      present: attendanceRows.filter((a) => a.status === 'PRESENT').length,
      absent: attendanceRows.filter((a) => a.status === 'ABSENT').length,
      late: attendanceRows.filter((a) => a.status === 'LATE').length,
      excused: attendanceRows.filter((a) => a.status === 'EXCUSED').length,
      total: attendanceRows.length,
    };

    return JSON.parse(JSON.stringify({
      student: result.student,
      subjects: result.subjects,
      overallPercentage: result.overallPercentage,
      overallGradeLabel: result.overallGradeLabel,
      overallGradeRemark: result.overallGradeRemark,
      position: result.position,
      classSize,
      term,
      academicYear,
      attendance,
      reportCard: reportCard ?? null,
      gradingScale,
    }));
  } catch (error) {
    console.error('Error fetching student report card:', error);
    return null;
  }
}

export async function upsertReportCardRemarks(organizationId: string, studentDataId: string, termId: string, input: {
  comments?: string;
  teacherNotes?: string;
  principalNotes?: string;
}) {
  try {
    await requireMembership(organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'TEACHER']);
    const existing = await db.orm.public.ReportCard.where({ studentDataId: studentDataId, termId }).all().first();
    if (existing) {
      const data: Record<string, unknown> = {};
      if (input.comments !== undefined) data.comments = input.comments;
      if (input.teacherNotes !== undefined) data.teacherNotes = input.teacherNotes;
      if (input.principalNotes !== undefined) data.principalNotes = input.principalNotes;
      await db.orm.public.ReportCard.where({ id: existing.id }).update(data);
    } else {
      const term = await db.orm.public.Term.where({ id: termId }).all().first();
      const academicYear = term ? (await db.orm.public.AcademicYear.where({ id: term.academicYearId }).all().first())?.year ?? 0 : 0;
      await db.orm.public.ReportCard.create({
        organizationId, studentDataId: studentDataId, termId, academicYear,
        comments: input.comments, teacherNotes: input.teacherNotes, principalNotes: input.principalNotes,
        published: false,
      });
    }
    return { success: true };
  } catch (error) {
    console.error('Error saving report card remarks:', error);
    return { error: 'Failed to save remarks.' };
  }
}

export async function publishReportCard(organizationId: string, studentDataId: string, termId: string) {
  try {
    await requireMembership(organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'TEACHER', 'REGISTRAR']);
    const existing = await db.orm.public.ReportCard.where({ studentDataId: studentDataId, termId }).all().first();
    if (existing) {
      await db.orm.public.ReportCard.where({ id: existing.id }).update({ published: true, issuedAt: toInstant(new Date()) });
    } else {
      const term = await db.orm.public.Term.where({ id: termId }).all().first();
      const academicYear = term ? (await db.orm.public.AcademicYear.where({ id: term.academicYearId }).all().first())?.year ?? 0 : 0;
      await db.orm.public.ReportCard.create({
        organizationId, studentDataId: studentDataId, termId, academicYear, published: true, issuedAt: toInstant(new Date()),
      });
    }
    return { success: true };
  } catch (error) {
    console.error('Error publishing report card:', error);
    return { error: 'Failed to publish report card.' };
  }
}

export async function unpublishReportCard(studentDataId: string, termId: string) {
  try {
    const existing = await db.orm.public.ReportCard.where({ studentDataId: studentDataId, termId }).all().first();
    if (!existing) return { error: 'No report card found to unpublish.' };
    await requireMembership(existing.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'TEACHER', 'REGISTRAR']);
    await db.orm.public.ReportCard.where({ id: existing.id }).update({ published: false });
    return { success: true };
  } catch (error) {
    console.error('Error unpublishing report card:', error);
    return { error: 'Failed to unpublish report card.' };
  }
}

export async function publishClassReportCards(organizationId: string, classSectionId: string, termId: string) {
  try {
    const students = await getStudentsInSection(classSectionId);
    for (const student of students) {
      await publishReportCard(organizationId, student.id, termId);
    }
    return { success: true };
  } catch (error) {
    console.error('Error publishing class report cards:', error);
    return { error: 'Failed to publish report cards for this class.' };
  }
}

// ---------------------------------------------------------------------
// Student Promotion — moving a class section's roster to the next grade
// (or graduating them out) at the end of an academic year. Available to
// both Admin and a section's form/class teacher (ClassSection.formTeacherId
// — the UI scopes what a teacher can reach; this action itself trusts the
// caller the same way every other admin/teacher action in this file does).
// ---------------------------------------------------------------------

// Everything one promotion screen needs for a source class section: its
// current active roster, a suggested target section per student (same
// section name, one grade level up, in the next academic year — purely a
// convenience default), and every other section to choose from manually.
export async function getPromotionCandidates(organizationId: string, classSectionId: string) {
  try {
    const section = await db.orm.public.ClassSection.where({ id: classSectionId }).all().first();
    if (!section) return { error: 'Class section not found.' };

    const allStudents = await getStudentsInSection(classSectionId);
    const students = allStudents.filter((s) => s.enrollmentStatus === 'active');

    const grades = await db.orm.public.SchoolGrade.where({ organizationId }).all();
    const years = await db.orm.public.AcademicYear.where({ organizationId }).all();
    const allSections = await db.orm.public.ClassSection.where({ organizationId }).all();

    const grade = grades.find((g) => g.id === section.gradeId) ?? null;
    const sourceYear = years.find((y) => y.id === section.academicYearId) ?? null;
    const nextGrade = grade ? grades.find((g) => g.level === grade.level + 1) ?? null : null;
    const nextYear = sourceYear
      ? years.filter((y) => y.year > sourceYear.year).sort((a, b) => a.year - b.year)[0] ?? null
      : null;

    const suggestion = nextGrade && nextYear
      ? allSections.find((s) => s.gradeId === nextGrade.id && s.academicYearId === nextYear.id && s.name === section.name)
      : null;

    const candidateSections = allSections
      .filter((s) => s.id !== classSectionId)
      .map((s) => ({
        ...s,
        gradeName: grades.find((g) => g.id === s.gradeId)?.name ?? null,
        academicYearLabel: years.find((y) => y.id === s.academicYearId)?.year ?? null,
      }));

    return JSON.parse(JSON.stringify({
      section: { ...section, gradeName: grade?.name ?? null },
      students,
      suggestedTargetId: suggestion?.id ?? null,
      candidateSections,
    }));
  } catch (error) {
    console.error('Error fetching promotion candidates:', error);
    return { error: 'Failed to load promotion data.' };
  }
}

// Applies a batch of promotion decisions. `target` is either another
// section's id — moves the student there and updates yearLevel to match
// that section's grade (this also covers "retain": just pick a target at
// the same grade level, in a later academic year) — or the literal
// 'GRADUATE', which marks the student enrollmentStatus 'graduated', clears
// their section, and records a StudentExit if one doesn't already exist.
export async function promoteStudents(
  organizationId: string,
  decisions: { studentDataId: string; target: string }[]
) {
  try {
    const grades = await db.orm.public.SchoolGrade.where({ organizationId }).all();
    const sections = await db.orm.public.ClassSection.where({ organizationId }).all();

    let promoted = 0;
    let graduated = 0;
    for (const d of decisions) {
      if (d.target === 'GRADUATE') {
        await db.orm.public.StudentData.where({ id: d.studentDataId }).update({ classSectionId: null });
        const existingExit = await db.orm.public.StudentExit.where({ studentDataId: d.studentDataId }).all().first();
        if (!existingExit) {
          await db.orm.public.StudentExit.create({
            organizationId,
            studentDataId: d.studentDataId,
            exitType: 'graduated',
            exitDate: toInstant(new Date()),
          });
        }
        graduated++;
      } else {
        const targetSection = sections.find((s) => s.id === d.target);
        if (!targetSection) continue;
        const targetGrade = grades.find((g) => g.id === targetSection.gradeId);
        await db.orm.public.StudentData.where({ id: d.studentDataId }).update({
          classSectionId: targetSection.id,
          yearLevel: targetGrade?.level ?? undefined,
        });
        promoted++;
      }
    }
    return { success: true, promoted, graduated };
  } catch (error) {
    console.error('Error promoting students:', error);
    return { error: 'Failed to promote students.' };
  }
}

// ---------------------------------------------------------------------
// Parent & Student self-service portals (resident-facing, session-gated
// here rather than via requireOrgRole — parents/students aren't
// OrganizationMembers, so there's no OrgRole to check).
// ---------------------------------------------------------------------

// Shared "what does this one student's academic record look like" join,
// reused by both the Parent Portal (per linked child) and the Student
// Portal (for the signed-in student themself). `viewerRole` lets an event
// be targeted at students but not their parents, or vice versa.
async function getStudentAcademicSnapshot(
  student: { id: string; organizationId: string; yearLevel: number | null },
  viewerRole: 'STUDENT' | 'PARENT'
) {
  const studentDataId = student.id;
  const enrolments = await db.orm.public.ClassEnrolment.where({ studentDataId }).all();
  const classIds = [...new Set(enrolments.map((e) => e.classId))];

  const classes: any[] = [];
  const assignments: any[] = [];
  const timetable: any[] = [];
  for (const classId of classIds) {
    const cls = await db.orm.public.SchoolClass.where({ id: classId }).all().first();
    if (cls) classes.push(cls);
    const rows = await db.orm.public.Gradebook.where({ classId }).all();
    assignments.push(...rows);
    const slots = await db.orm.public.TimetableSlot.where({ classId }).all();
    timetable.push(...slots);
  }
  timetable.sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.period - b.period);

  const roomIds = [...new Set(timetable.map((s) => s.roomId).filter(Boolean))];
  const rooms: any[] = [];
  for (const roomId of roomIds) {
    const room = await db.orm.public.Room.where({ id: roomId }).all().first();
    if (room) rooms.push(room);
  }

  const grades = await db.orm.public.Grade.where({ studentDataId }).all();
  const attendance = await db.orm.public.Attendance.where({ studentDataId }).all();

  const orgEvents = await db.orm.public.SchoolEvent.where({ organizationId: student.organizationId }).all();
  const events = orgEvents
    .filter((e) => eventMatchesAudience(e, viewerRole, student.yearLevel))
    .sort((a, b) => epochMs(a.startDate) - epochMs(b.startDate));

  // Lightweight list of which terms have a *published* report card — just
  // enough for the portal to show a picker; the full breakdown is fetched
  // on demand via getStudentReportCard(..., { requirePublished: true }).
  const allReportCards = await db.orm.public.ReportCard.where({ studentDataId }).all();
  const publishedReportCards = allReportCards.filter((rc) => rc.published);
  const reportCards: any[] = [];
  for (const rc of publishedReportCards) {
    const term = await db.orm.public.Term.where({ id: rc.termId }).all().first();
    reportCards.push({ termId: rc.termId, termName: term?.name ?? 'Term', academicYear: rc.academicYear, issuedAt: rc.issuedAt });
  }
  reportCards.sort((a, b) => (b.academicYear - a.academicYear));

  return { classes, assignments, grades, attendance, timetable, rooms, events, reportCards };
}

export async function getParentPortalData() {
  try {
    const { person } = await requireAuthenticatedAccount();

    const auths = await db.orm.public.GuardianAuthorization.where({ guardianPersonId: person.id }).all();
    if (auths.length === 0) return { user: JSON.parse(JSON.stringify(person)), children: [] };

    const children: any[] = [];
    for (const auth of auths) {
      const studentRel = await db.orm.public.Relationship.where({ id: auth.wardRelationshipId }).all().first();
      if (!studentRel) continue;

      const studentData = await db.orm.public.StudentData.where({ relationshipId: studentRel.id }).all().first();
      if (!studentData) continue;

      const studentPerson = await db.orm.public.Person.where({ id: studentRel.personId }).all().first();
      const organization = await db.orm.public.Organization.where({ id: studentRel.organizationId }).all().first();
      
      const feeInvoices = await db.orm.public.FeeInvoice.where({ studentDataId: studentData.id }).all();
      
      const mockStudentObj = {
         id: studentData.id,
         organizationId: studentRel.organizationId,
         yearLevel: studentData.yearLevel,
         firstName: studentPerson?.firstName,
         lastName: studentPerson?.lastName,
      };
      
      const snapshot = await getStudentAcademicSnapshot(mockStudentObj, 'PARENT');

      children.push({ student: mockStudentObj, organization, feeInvoices, ...snapshot });
    }

    return JSON.parse(JSON.stringify({ user: person, children }));
  } catch (error) {
    console.error('Error fetching parent portal data:', error);
    return null;
  }
}

export async function getStudentPortalData() {
  try {
    const { person } = await requireAuthenticatedAccount();

    const relationship = await db.orm.public.Relationship.where({ personId: person.id, type: 'STUDENT' }).all().first();
    if (!relationship) return { user: JSON.parse(JSON.stringify(person)), student: null };

    const studentData = await db.orm.public.StudentData.where({ relationshipId: relationship.id }).all().first();
    if (!studentData) return { user: JSON.parse(JSON.stringify(person)), student: null };

    const organization = await db.orm.public.Organization.where({ id: relationship.organizationId }).all().first();
    
    const mockStudentObj = {
       id: studentData.id,
       organizationId: relationship.organizationId,
       yearLevel: studentData.yearLevel,
       firstName: person.firstName,
       lastName: person.lastName,
    };
    
    const snapshot = await getStudentAcademicSnapshot(mockStudentObj, 'STUDENT');

    return JSON.parse(JSON.stringify({ user: person, student: mockStudentObj, organization, ...snapshot }));
  } catch (error) {
    console.error('Error fetching student portal data:', error);
    return null;
  }
}

