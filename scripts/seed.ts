import '@js-temporal/polyfill';
import { db } from '../src/prisma/db.js';

type OrgType = Awaited<ReturnType<typeof db.orm.public.Organization.all>>[number]['type'];

// Idempotent: one Organization per OrgType. Re-running this script must never
// create duplicates (it used to, before this guard existed, and that made a
// mess of the "one org per vertical" assumption every lib/actions/*.ts file
// relies on). Child data (rooms, courses, menu items, ...) is only created
// the first time an org is created, so re-runs are a safe no-op per vertical.
async function findOrCreateOrg(type: OrgType, data: { name: string; description?: string }) {
  const existing = await db.orm.public.Organization.where({ type }).all().first();
  if (existing) return { org: existing, created: false as const };

  const org = await db.orm.public.Organization.create({ type, ...data });
  return { org, created: true as const };
}

// ---- V1 Identity helpers (used throughout this seed file) ----

/** Find a Person by email via PersonIdentifier, or create one. */
async function findOrCreatePerson(name: string, email: string) {
  const emailId = await db.orm.public.PersonIdentifier.where({ type: 'EMAIL', normalizedValue: email.toLowerCase() }).all().first();
  if (emailId) {
    const p = await db.orm.public.Person.where({ id: emailId.personId }).all().first();
    if (p) return p;
  }
  const [firstName, ...lastNames] = name.split(' ');
  const person = await db.orm.public.Person.create({
    firstName: firstName || name,
    lastName: lastNames.join(' ') || '',
  });
  await db.orm.public.PersonIdentifier.create({ personId: person.id, type: 'EMAIL', normalizedValue: email.toLowerCase() });
  return person;
}

/** Find or create a Membership for a Person in an Org. */
async function findOrCreateMembership(personId: string, organizationId: string) {
  const existing = await db.orm.public.Membership.where({ personId, organizationId }).all().first();
  if (existing) return existing;
  return db.orm.public.Membership.create({ personId, organizationId });
}

/** Add a role to a Membership if it doesn't already have it. */
async function ensureMembershipRole(membershipId: string, role: string) {
  const existing = await db.orm.public.MembershipRole.where({ membershipId, role }).all().first();
  if (!existing) await db.orm.public.MembershipRole.create({ membershipId, role });
}

/** Find or create the Relationship+StudentData pair for a student in a school. */
async function findOrCreateStudentData(
  organizationId: string,
  admissionNo: string,
  firstName: string,
  lastName: string,
  yearLevel: number,
  classSectionId?: string
): Promise<any> {
  // Look up by admissionNo via existing StudentData rows
  const existing = await db.orm.public.StudentData.where({ admissionNo }).all().first();
  if (existing) return existing as any;

  // Create the Person + Relationship + StudentData
  const person = await db.orm.public.Person.create({ firstName, lastName });
  const rel = await db.orm.public.Relationship.create({ personId: person.id, organizationId, type: 'STUDENT' });
  const sd = await db.orm.public.StudentData.create({ relationshipId: rel.id, admissionNo, yearLevel, classSectionId });
  return sd as any;
}

async function main() {
  console.log('Seeding database...');

  const adminUser = await findOrCreatePerson('City Planner', 'admin@cityconnect.local');

  // ---------------------------------------------------------------------
  // Hotel
  // ---------------------------------------------------------------------
  const { org: hotel, created: hotelCreated } = await findOrCreateOrg('HOTEL', {
    name: 'The Grand City Hotel',
    description: 'Luxury accommodations in the heart of the city.',
  });

  // Child data is keyed off "does this org already have rooms", not off
  // whether the org itself was just created — an org can pre-exist (from an
  // earlier partial run) with zero rooms, and gating on `hotelCreated` would
  // silently leave it empty forever.
  const existingRooms = await db.orm.public.HotelRoom.where({ organizationId: hotel.id }).all();
  if (existingRooms.length === 0) {
    const room101 = await db.orm.public.HotelRoom.create({
      roomNumber: '101',
      type: 'King',
      status: 'CLEAN',
      baseRate: 149,
      organizationId: hotel.id,
    });

    await db.orm.public.HotelRoom.create({
      roomNumber: '102',
      type: 'King',
      status: 'DIRTY',
      baseRate: 149,
      organizationId: hotel.id,
    });

    await db.orm.public.HotelRoom.create({
      roomNumber: '103',
      type: 'Double',
      status: 'INSPECTING',
      baseRate: 119,
      organizationId: hotel.id,
    });

    await db.orm.public.HotelRoom.create({
      roomNumber: '104',
      type: 'Suite',
      status: 'OUT_OF_ORDER',
      baseRate: 249,
      organizationId: hotel.id,
    });

    await db.orm.public.Reservation.create({
      guestName: 'John Doe',
      roomId: room101.id,
      status: 'CHECKED_IN',
      checkInDate: (globalThis as any).Temporal.Instant.fromEpochMilliseconds(Date.now() - 86400000), // Yesterday
      checkOutDate: (globalThis as any).Temporal.Instant.fromEpochMilliseconds(Date.now() + 86400000), // Tomorrow
      totalPrice: 149 * 2,
      paymentStatus: 'PAID',
      organizationId: hotel.id,
    });
  }

  // Backfill baseRate/totalPrice on rows created by an older run of this
  // script (before those columns existed) — same "gate on missing data, not
  // on whether the row is new" principle as the room-seeding guard above.
  const seedRoomRates: Record<string, number> = { '101': 149, '102': 149, '103': 119, '104': 249 };
  for (const room of existingRooms) {
    if (room.baseRate === 0 && seedRoomRates[room.roomNumber]) {
      await db.orm.public.HotelRoom.where({ id: room.id }).update({ baseRate: seedRoomRates[room.roomNumber] });
    }
  }
  const johnDoeReservation = await db.orm.public.Reservation.where({ guestName: 'John Doe', organizationId: hotel.id }).all().first();
  if (johnDoeReservation && johnDoeReservation.totalPrice == null) {
    await db.orm.public.Reservation.where({ id: johnDoeReservation.id }).update({ totalPrice: 298, paymentStatus: 'PAID' });
  }

  const existingRateRules = await db.orm.public.RateRule.where({ organizationId: hotel.id }).all();
  if (existingRateRules.length === 0) {
    await db.orm.public.RateRule.create({
      organizationId: hotel.id,
      type: 'WEEKEND_SURGE',
      multiplier: 1.2,
      isActive: true,
    });
    await db.orm.public.RateRule.create({
      organizationId: hotel.id,
      type: 'HOLIDAY_SURGE',
      multiplier: 1.5,
      isActive: false,
    });
  }

  const existingInventory = await db.orm.public.InventoryItem.where({ organizationId: hotel.id }).all();
  if (existingInventory.length === 0) {
    await db.orm.public.InventoryItem.create({
      organizationId: hotel.id,
      name: 'Bath Towels',
      category: 'HOUSEKEEPING',
      unit: 'units',
      quantityOnHand: 120,
      parLevel: 80,
    });
    await db.orm.public.InventoryItem.create({
      organizationId: hotel.id,
      name: 'Bed Linens (Queen)',
      category: 'HOUSEKEEPING',
      unit: 'sets',
      quantityOnHand: 40,
      parLevel: 50,
    });
    await db.orm.public.InventoryItem.create({
      organizationId: hotel.id,
      name: 'Travel-Size Shampoo',
      category: 'HOUSEKEEPING',
      unit: 'bottles',
      quantityOnHand: 300,
      parLevel: 100,
    });
    await db.orm.public.InventoryItem.create({
      organizationId: hotel.id,
      name: 'House Red Wine',
      category: 'FOOD_AND_BEVERAGE',
      unit: 'bottles',
      quantityOnHand: 18,
      parLevel: 24,
    });
    await db.orm.public.InventoryItem.create({
      organizationId: hotel.id,
      name: 'Coffee Pods',
      category: 'FOOD_AND_BEVERAGE',
      unit: 'boxes',
      quantityOnHand: 60,
      parLevel: 30,
    });
    await db.orm.public.InventoryItem.create({
      organizationId: hotel.id,
      name: 'HVAC Air Filters',
      category: 'MAINTENANCE',
      unit: 'units',
      quantityOnHand: 6,
      parLevel: 10,
    });
  }

  const existingOutlets = await db.orm.public.Outlet.where({ organizationId: hotel.id }).all();
  if (existingOutlets.length === 0) {
    const rooftopBar = await db.orm.public.Outlet.create({
      organizationId: hotel.id,
      name: 'The Rooftop Bar',
      type: 'BAR',
    });
    await db.orm.public.OutletItem.create({ outletId: rooftopBar.id, name: 'House Red Wine', price: 14, category: 'Drinks' });
    await db.orm.public.OutletItem.create({ outletId: rooftopBar.id, name: 'Craft Cocktail', price: 18, category: 'Drinks' });
    await db.orm.public.OutletItem.create({ outletId: rooftopBar.id, name: 'Sparkling Water', price: 6, category: 'Drinks' });
    await db.orm.public.OutletItem.create({ outletId: rooftopBar.id, name: 'Charcuterie Board', price: 24, category: 'Food' });

    const grill = await db.orm.public.Outlet.create({
      organizationId: hotel.id,
      name: 'Lobby Grill',
      type: 'RESTAURANT',
    });
    await db.orm.public.OutletItem.create({ outletId: grill.id, name: 'Club Sandwich', price: 16, category: 'Food' });
    await db.orm.public.OutletItem.create({ outletId: grill.id, name: 'Caesar Salad', price: 13, category: 'Food' });
    await db.orm.public.OutletItem.create({ outletId: grill.id, name: 'Iced Tea', price: 5, category: 'Drinks' });
  }

  // ---------------------------------------------------------------------
  // School (TPT-integration schema). Idempotent throughout: gate each row
  // on "does it already exist", never on org-creation or a blanket delete —
  // deleting the org here used to wipe every student/class/grade/fee on
  // every reseed, which is exactly the trap findOrCreateOrg's own doc
  // comment above warns against.
  // ---------------------------------------------------------------------
  const toInstant = (ms: number) => (globalThis as any).Temporal.Instant.fromEpochMilliseconds(ms);

  const { org: school } = await findOrCreateOrg('SCHOOL', {
    name: 'Lincoln High School',
    description: 'Home of the Lions',
  });

  let schoolSettings = await db.orm.public.SchoolSettings.where({ organizationId: school.id }).all().first();
  if (!schoolSettings) {
    schoolSettings = await db.orm.public.SchoolSettings.create({
      organizationId: school.id,
      name: 'Lincoln High School',
      shortName: 'LHS',
      currentYear: 2026,
      currentTerm: 1,
      setupComplete: true,
    });
  }

  let academicYear = await db.orm.public.AcademicYear.where({ organizationId: school.id, year: 2026 }).all().first();
  if (!academicYear) {
    academicYear = await db.orm.public.AcademicYear.create({
      organizationId: school.id,
      year: 2026,
      startDate: toInstant(Date.now() - 86400000 * 30),
      endDate: toInstant(Date.now() + 86400000 * 330),
      active: true,
    });
  }

  let term = await db.orm.public.Term.where({ academicYearId: academicYear.id, termNumber: 1 }).all().first();
  if (!term) {
    term = await db.orm.public.Term.create({
      organizationId: school.id,
      academicYearId: academicYear.id,
      termNumber: 1,
      name: 'Fall Term',
      startDate: academicYear.startDate,
      endDate: toInstant(Date.now() + 86400000 * 90),
    });
  }

  const teacherMember = await findOrCreateMembership(adminUser.id, school.id);
  await ensureMembershipRole(teacherMember.id, 'TEACHER');

  let staffProfile = await db.orm.public.StaffData.where({ membershipId: teacherMember.id }).all().first();
  if (!staffProfile) {
    staffProfile = await db.orm.public.StaffData.create({
      membershipId: teacherMember.id,
      employeeId: 'EMP-001',
      
    });
  }

  // Classes (grade levels) & Class Sections — "Grade 12" is the Class,
  // "A" is a Section that belongs to it.
  let grade12 = await db.orm.public.SchoolGrade.where({ organizationId: school.id, name: 'Grade 12' }).all().first();
  if (!grade12) {
    grade12 = await db.orm.public.SchoolGrade.create({ organizationId: school.id, name: 'Grade 12', level: 12 });
  }
  let grade12SectionA = await db.orm.public.ClassSection
    .where({ academicYearId: academicYear.id, gradeId: grade12.id, name: 'A' })
    .all()
    .first();
  if (!grade12SectionA) {
    grade12SectionA = await db.orm.public.ClassSection.create({
      organizationId: school.id,
      academicYearId: academicYear.id,
      gradeId: grade12.id,
      name: 'A',
    });
  }
  if (!grade12SectionA.formMembershipId) {
    await db.orm.public.ClassSection.where({ id: grade12SectionA.id }).update({ formMembershipId: teacherMember.id });
    grade12SectionA = { ...grade12SectionA, formMembershipId: teacherMember.id };
  }

  // Promotion demo data — a lower grade (11) in the current academic year,
  // plus a second (later) academic year with a matching Grade 12 section,
  // so there's somewhere real to promote *into*. Grade 12 has no "next"
  // grade, so promoting a Grade 12 student naturally demos graduation
  // instead — both promotion paths are exercised without extra fixtures.
  let grade11 = await db.orm.public.SchoolGrade.where({ organizationId: school.id, name: 'Grade 11' }).all().first();
  if (!grade11) {
    grade11 = await db.orm.public.SchoolGrade.create({ organizationId: school.id, name: 'Grade 11', level: 11 });
  }
  let grade11SectionA = await db.orm.public.ClassSection
    .where({ academicYearId: academicYear.id, gradeId: grade11.id, name: 'A' })
    .all()
    .first();
  if (!grade11SectionA) {
    grade11SectionA = await db.orm.public.ClassSection.create({
      organizationId: school.id,
      academicYearId: academicYear.id,
      gradeId: grade11.id,
      name: 'A',
      formMembershipId: teacherMember.id,
    });
  } else if (!grade11SectionA.formMembershipId) {
    await db.orm.public.ClassSection.where({ id: grade11SectionA.id }).update({ formMembershipId: teacherMember.id });
    grade11SectionA = { ...grade11SectionA, formMembershipId: teacherMember.id };
  }

  let nextAcademicYear = await db.orm.public.AcademicYear.where({ organizationId: school.id, year: academicYear.year + 1 }).all().first();
  if (!nextAcademicYear) {
    nextAcademicYear = await db.orm.public.AcademicYear.create({
      organizationId: school.id,
      year: academicYear.year + 1,
      startDate: toInstant(Date.now() + 86400000 * 300),
      endDate: toInstant(Date.now() + 86400000 * 660),
      active: false,
    });
  }
  let nextGrade12SectionA = await db.orm.public.ClassSection
    .where({ academicYearId: nextAcademicYear.id, gradeId: grade12.id, name: 'A' })
    .all()
    .first();
  if (!nextGrade12SectionA) {
    nextGrade12SectionA = await db.orm.public.ClassSection.create({
      organizationId: school.id,
      academicYearId: nextAcademicYear.id,
      gradeId: grade12.id,
      name: 'A',
    });
  }

  await findOrCreateStudentData(school.id, 'STU-004', 'Grace', 'Adeyemi', 11, grade11SectionA!.id);

  let mathClass = await db.orm.public.SchoolClass.where({ academicYearId: academicYear.id, code: 'MATH-401' }).all().first();
  if (!mathClass) {
    mathClass = await db.orm.public.SchoolClass.create({
      organizationId: school.id,
      academicYearId: academicYear.id,
      name: 'Advanced Calculus',
      code: 'MATH-401',
      subject: 'Mathematics',
      yearLevel: 12,
      classSectionId: grade12SectionA.id,
    });
  }

  const existingClassTeacher = await db.orm.public.ClassTeacher
    .where({ classId: mathClass.id, membershipId: teacherMember.id })
    .all()
    .first();
  if (!existingClassTeacher) {
    await db.orm.public.ClassTeacher.create({ classId: mathClass.id, membershipId: teacherMember.id, isPrimary: true });
  }

  const student1 = await findOrCreateStudentData(school.id, 'STU-001', 'Alex', 'Johnson', 12, grade12SectionA!.id);
  const student2 = await findOrCreateStudentData(school.id, 'STU-002', 'Zoe', 'Smith', 12, grade12SectionA!.id);

  for (const student of [student1, student2]) {
    const existingEnrolment = await db.orm.public.ClassEnrolment
      .where({ classId: mathClass.id, studentDataId: student!.id })
      .all()
      .first();
    if (!existingEnrolment) {
      await db.orm.public.ClassEnrolment.create({ classId: mathClass.id, studentDataId: student!.id });
    }
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const attendanceToday: Array<{ student: typeof student1; status: string }> = [
    { student: student1, status: 'PRESENT' },
    { student: student2, status: 'TARDY' },
  ];
  for (const { student, status } of attendanceToday) {
    const existingAttendance = await db.orm.public.Attendance
      .where({ studentDataId: student!.id, date: toInstant(todayStart.getTime()) })
      .all()
      .first();
    if (!existingAttendance) {
      await db.orm.public.Attendance.create({
        studentDataId: student!.id,
        termId: term.id,
        date: toInstant(todayStart.getTime()),
        status,
        markedById: teacherMember.id,
      });
    }
  }

  let midtermAssignment = await db.orm.public.Gradebook.where({ classId: mathClass.id, name: 'Midterm Exam' }).all().first();
  if (!midtermAssignment) {
    midtermAssignment = await db.orm.public.Gradebook.create({
      classId: mathClass.id,
      termId: term.id,
      name: 'Midterm Exam',
      type: 'exam',
      maxScore: 100,
      weight: 3,
    });
  }
  const existingGrade = await db.orm.public.Grade
    .where({ gradebookId: midtermAssignment.id, studentDataId: student1!.id })
    .all()
    .first();
  if (!existingGrade) {
    await db.orm.public.Grade.create({ gradebookId: midtermAssignment.id, studentDataId: student1!.id, score: 91 });
  }

  // Examination — a default grading scale (Nigerian-style CA/Exam split
  // and percentage bands) plus CA + exam assessments for the existing
  // Advanced Calculus class, so the report card has real data to render.
  let gradingScale = await db.orm.public.GradingScale.where({ organizationId: school.id, name: 'Standard Scale' }).all().first();
  if (!gradingScale) {
    gradingScale = await db.orm.public.GradingScale.create({ organizationId: school.id, name: 'Standard Scale', isDefault: true });
    const boundaries: Array<{ minPercent: number; maxPercent: number; label: string; remark: string; order: number }> = [
      { minPercent: 70, maxPercent: 100, label: 'A', remark: 'Excellent', order: 1 },
      { minPercent: 60, maxPercent: 69.99, label: 'B', remark: 'Very Good', order: 2 },
      { minPercent: 50, maxPercent: 59.99, label: 'C', remark: 'Good', order: 3 },
      { minPercent: 45, maxPercent: 49.99, label: 'D', remark: 'Credit', order: 4 },
      { minPercent: 40, maxPercent: 44.99, label: 'E', remark: 'Pass', order: 5 },
      { minPercent: 0, maxPercent: 39.99, label: 'F', remark: 'Fail', order: 6 },
    ];
    for (const b of boundaries) {
      await db.orm.public.GradeBoundary.create({ gradingScaleId: gradingScale.id, ...b });
    }
  }

  const examSeeds: Array<{ name: string; type: string; maxScore: number; weight: number; scores: { student: typeof student1; score: number }[] }> = [
    { name: '1st CA', type: 'ca', maxScore: 20, weight: 15, scores: [{ student: student1, score: 17 }, { student: student2, score: 14 }] },
    { name: '2nd CA', type: 'ca', maxScore: 20, weight: 15, scores: [{ student: student1, score: 18 }, { student: student2, score: 13 }] },
    { name: 'Final Examination', type: 'exam', maxScore: 100, weight: 70, scores: [{ student: student1, score: 82 }, { student: student2, score: 61 }] },
  ];
  for (const examSeed of examSeeds) {
    let assignment = await db.orm.public.Gradebook.where({ classId: mathClass.id, name: examSeed.name }).all().first();
    if (!assignment) {
      assignment = await db.orm.public.Gradebook.create({
        classId: mathClass.id, termId: term.id, name: examSeed.name, type: examSeed.type,
        maxScore: examSeed.maxScore, weight: examSeed.weight,
      });
    }
    for (const { student, score } of examSeed.scores) {
      const existing = await db.orm.public.Grade.where({ gradebookId: assignment.id, studentDataId: student!.id }).all().first();
      if (!existing) {
        await db.orm.public.Grade.create({ gradebookId: assignment.id, studentDataId: student!.id, score });
      }
    }
  }

  // Publish student1's report card (demoable in Student/Parent portals);
  // leave student2's as an unpublished draft (demoable in Admin's review).
  const existingReportCard1 = await db.orm.public.ReportCard.where({ studentDataId: student1!.id, termId: term.id }).all().first();
  if (!existingReportCard1) {
    await db.orm.public.ReportCard.create({
      organizationId: school.id, studentDataId: student1!.id, termId: term.id, academicYear: academicYear.year,
      comments: 'A consistently strong term — keep up the excellent work.',
      teacherNotes: 'Alex shows great initiative in class discussions.',
      principalNotes: 'Well done this term.',
      published: true, issuedAt: toInstant(Date.now()),
    });
  }
  const existingReportCard2 = await db.orm.public.ReportCard.where({ studentDataId: student2!.id, termId: term.id }).all().first();
  if (!existingReportCard2) {
    await db.orm.public.ReportCard.create({
      organizationId: school.id, studentDataId: student2!.id, termId: term.id, academicYear: academicYear.year,
      comments: 'Solid progress — more practice on exam technique recommended.',
      published: false,
    });
  }

  const existingIncidents = await db.orm.public.BehaviourIncident.where({ organizationId: school.id }).all();
  if (existingIncidents.length === 0) {
    await db.orm.public.BehaviourIncident.create({
      organizationId: school.id,
      studentDataId: student1!.id,
      reportedById: teacherMember.id,
      date: toInstant(Date.now()),
      description: 'Helped a classmate understand derivatives during group work.',
      severity: 'COMMENDATION',
    });
  }

  let tuitionFeeType = await db.orm.public.FeeType.where({ organizationId: school.id, name: 'Tuition' }).all().first();
  if (!tuitionFeeType) {
    tuitionFeeType = await db.orm.public.FeeType.create({
      organizationId: school.id,
      name: 'Tuition',
      amount: 5000,
      frequency: 'annual',
    });
  }
  const existingInvoice = await db.orm.public.FeeInvoice.where({ organizationId: school.id, studentDataId: student1!.id }).all().first();
  if (!existingInvoice) {
    const invoice = await db.orm.public.FeeInvoice.create({
      organizationId: school.id,
      studentDataId: student1!.id,
      dueDate: toInstant(Date.now() + 86400000 * 30),
      totalAmount: 5000,
      paidAmount: 2000,
      status: 'partial',
    });
    await db.orm.public.FeeInvoiceItem.create({ invoiceId: invoice.id, feeTypeId: tuitionFeeType.id, description: 'Annual Tuition', amount: 5000 });
    await db.orm.public.FeePayment.create({ invoiceId: invoice.id, amount: 2000, method: 'bank_transfer' });
  }

  // School staff (Admin, Finance, etc.)
  const schoolStaffSeeds: Array<{ email: string; name: string; role: 'ADMIN' | 'FINANCE' | 'REGISTRAR' | 'COUNSELOR' }> = [
    { email: 'principal@cityconnect.local', name: 'Principal Diane Carter', role: 'ADMIN' },
    { email: 'bursar@cityconnect.local', name: 'Marcus Reed (Bursar)', role: 'FINANCE' },
    { email: 'registrar@cityconnect.local', name: 'Sofia Alvarez (Registrar)', role: 'REGISTRAR' },
    { email: 'counselor@cityconnect.local', name: 'Dr. James Okafor (Counselor)', role: 'COUNSELOR' },
  ];
  
  for (const staffSeed of schoolStaffSeeds) {
    const staffPerson = await findOrCreatePerson(staffSeed.name, staffSeed.email);
    const staffMembership = await findOrCreateMembership(staffPerson.id, school.id);
    await ensureMembershipRole(staffMembership.id, staffSeed.role);
    const existingStaffData = await db.orm.public.StaffData.where({ membershipId: staffMembership.id }).all().first();
    if (!existingStaffData) {
      await db.orm.public.StaffData.create({
        membershipId: staffMembership.id,
        employeeId: 'EMP-' + Math.floor(Math.random() * 10000),
      });
    }
  }

  // Parents — linked to existing students so the Parent Portal has real data
  const parentSeeds: Array<{ email: string; name: string; student: typeof student1 }> = [
    { email: 'parent1@cityconnect.local', name: 'Maria Johnson', student: student1 },
    { email: 'parent2@cityconnect.local', name: 'David Smith', student: student2 },
  ];
  for (const parentSeed of parentSeeds) {
    const parentUser = await findOrCreatePerson(parentSeed.name, parentSeed.email);
    // FamilyLink: guardian=parent, ward=student (need ward's personId via StudentData->Relationship)
    const studentRel = await db.orm.public.Relationship.where({ id: parentSeed.student!.relationshipId }).all().first();
    if (studentRel) {
      const existingLink = await db.orm.public.FamilyLink.where({ guardianPersonId: parentUser.id, wardPersonId: studentRel.personId }).all().first();
      if (!existingLink) {
        await db.orm.public.FamilyLink.create({ guardianPersonId: parentUser.id, wardPersonId: studentRel.personId, type: 'Parent' });
      }
    }
  }

  // Student self-service login — the resident Student Portal resolves
  // "which Student record is this signed-in resident" via `guardianId`
  // (the closest existing fit for self-access, see getStudentPortalData).
  const studentUser = await findOrCreatePerson('Alex Johnson', 'student@cityconnect.local');
  // Note: student self-portal access is via Relationship lookup by personId in V1

  // A third student, not yet enrolled in any class — demo data for the
  // Registrar's enrolment-request workflow.
  const student3 = await findOrCreateStudentData(school.id, 'STU-003', 'Marcus', 'Lee', 12);

  // More fee variety — a second fee type and a second, unpaid invoice.
  let techFeeType = await db.orm.public.FeeType.where({ organizationId: school.id, name: 'Technology Fee' }).all().first();
  if (!techFeeType) {
    techFeeType = await db.orm.public.FeeType.create({
      organizationId: school.id,
      name: 'Technology Fee',
      amount: 250,
      frequency: 'annual',
    });
  }
  const existingInvoice2 = await db.orm.public.FeeInvoice.where({ organizationId: school.id, studentDataId: student2!.id }).all().first();
  if (!existingInvoice2) {
    const invoice2 = await db.orm.public.FeeInvoice.create({
      organizationId: school.id,
      studentDataId: student2!.id,
      dueDate: toInstant(Date.now() + 86400000 * 45),
      totalAmount: 250,
      paidAmount: 0,
      status: 'unpaid',
    });
    await db.orm.public.FeeInvoiceItem.create({ invoiceId: invoice2.id, feeTypeId: techFeeType.id, description: 'Annual Technology Fee', amount: 250 });
  }

  // Registrar + Counselor users are seeded just above (schoolStaffSeeds) —
  // look them up so the rows below can reference real User ids.
  const registrarUser = await db.orm.public.PersonIdentifier.where({ type: 'EMAIL', normalizedValue: 'registrar@cityconnect.local' }).all().first().then(async (id) => id ? db.orm.public.Person.where({ id: id.personId }).all().first() : null);
  const counselorUser = await db.orm.public.PersonIdentifier.where({ type: 'EMAIL', normalizedValue: 'counselor@cityconnect.local' }).all().first().then(async (id) => id ? db.orm.public.Person.where({ id: id.personId }).all().first() : null);
  const counselorMembership = counselorUser ? await findOrCreateMembership(counselorUser.id, school.id) : null;

  if (registrarUser) {
    const existingRequest = await db.orm.public.EnrolmentRequest
      .where({ classId: mathClass.id, studentDataId: student3!.id })
      .all()
      .first();
    if (!existingRequest) {
      await db.orm.public.EnrolmentRequest.create({
        organizationId: school.id,
        classId: mathClass.id,
        studentDataId: student3!.id,
        requestedByPersonId: registrarUser!.id,
        message: 'Transferring in from Westside Academy — requesting placement in Advanced Calculus.',
        status: 'pending',
      });
    }
  }

  if (counselorUser) {
    const existingNotes = await db.orm.public.StudentNote.where({ organizationId: school.id }).all();
    if (existingNotes.length === 0) {
      await db.orm.public.StudentNote.create({
        organizationId: school.id,
        studentDataId: student1!.id,
        authorMembershipId: counselorMembership!.id,
        content: 'Check-in went well; adjusting fine to senior year workload.',
        type: 'pastoral',
      });
      await db.orm.public.StudentNote.create({
        organizationId: school.id,
        studentDataId: student2!.id,
        authorMembershipId: counselorMembership!.id,
        content: 'Parent reported a seasonal allergy — keeps antihistamines in her bag.',
        type: 'medical',
      });
    }

    const existingTruancyAlerts = await db.orm.public.TruancyAlert.where({ organizationId: school.id }).all();
    if (existingTruancyAlerts.length === 0) {
      await db.orm.public.TruancyAlert.create({
        organizationId: school.id,
        studentDataId: student2!.id,
        termId: term.id,
        consecutiveAbsences: 3,
        totalUnexcused: 3,
      });
    }
  }

  // Rooms
  let room101 = await db.orm.public.Room.where({ organizationId: school.id, code: 'RM-101' }).all().first();
  if (!room101) {
    room101 = await db.orm.public.Room.create({
      organizationId: school.id, name: 'Room 101', code: 'RM-101',
      capacity: 30, type: 'classroom', building: 'Main Building', floor: '1',
    });
  }
  let labA = await db.orm.public.Room.where({ organizationId: school.id, code: 'LAB-A' }).all().first();
  if (!labA) {
    labA = await db.orm.public.Room.create({
      organizationId: school.id, name: 'Science Lab A', code: 'LAB-A',
      capacity: 24, type: 'lab', building: 'Science Building', floor: '2',
    });
  }

  // Timetable — a few slots across the week for the existing Advanced Calculus class
  const timetableSeeds: Array<{ dayOfWeek: number; period: number; startTime: string; endTime: string; roomId: string }> = [
    { dayOfWeek: 1, period: 1, startTime: '08:00', endTime: '08:45', roomId: room101.id },
    { dayOfWeek: 3, period: 3, startTime: '10:15', endTime: '11:00', roomId: room101.id },
    { dayOfWeek: 5, period: 2, startTime: '09:00', endTime: '09:45', roomId: labA.id },
  ];
  for (const slotSeed of timetableSeeds) {
    const existingSlots = await db.orm.public.TimetableSlot.where({ classId: mathClass.id }).all();
    const alreadyExists = existingSlots.some((s) => s.dayOfWeek === slotSeed.dayOfWeek && s.period === slotSeed.period);
    if (!alreadyExists) {
      await db.orm.public.TimetableSlot.create({
        classId: mathClass.id,
        membershipId: teacherMember.id,
        roomId: slotSeed.roomId,
        dayOfWeek: slotSeed.dayOfWeek,
        period: slotSeed.period,
        startTime: slotSeed.startTime,
        endTime: slotSeed.endTime,
      });
    }
  }

  // Calendar events — one for each audience-encoding branch, to prove the
  // per-portal filter logic actually discriminates correctly.
  const principalUser = await db.orm.public.PersonIdentifier.where({ type: 'EMAIL', normalizedValue: 'principal@cityconnect.local' }).all().first().then(async (id) => id ? db.orm.public.Person.where({ id: id.personId }).all().first() : null);
  const principalMembership = principalUser ? await findOrCreateMembership(principalUser.id, school.id) : null;
  if (principalUser && principalMembership) {
    const existingFallBreak = await db.orm.public.SchoolEvent.where({ organizationId: school.id, title: 'Fall Break' }).all().first();
    if (!existingFallBreak) {
      await db.orm.public.SchoolEvent.create({
        organizationId: school.id,
        title: 'Fall Break',
        description: 'No classes — school closed for Fall Break.',
        startDate: toInstant(Date.now() + 86400000 * 14),
        endDate: toInstant(Date.now() + 86400000 * 18),
        allDay: true,
        category: 'holiday',
        targetRoles: 'all',
        targetYears: 'all',
        createdByMembershipId: principalMembership!.id,
      });
    }

    const existingPdDay = await db.orm.public.SchoolEvent.where({ organizationId: school.id, title: 'Staff PD Day — No Classes' }).all().first();
    if (!existingPdDay) {
      await db.orm.public.SchoolEvent.create({
        organizationId: school.id,
        title: 'Staff PD Day — No Classes',
        description: 'Professional development day for teaching and administrative staff.',
        startDate: toInstant(Date.now() + 86400000 * 7),
        endDate: toInstant(Date.now() + 86400000 * 7),
        allDay: true,
        category: 'admin',
        targetRoles: JSON.stringify(['TEACHER', 'ADMIN']),
        targetYears: 'all',
        createdByMembershipId: principalMembership!.id,
      });
    }

    const existingBriefing = await db.orm.public.SchoolEvent.where({ organizationId: school.id, title: 'Grade 12 Mock Exam Briefing' }).all().first();
    if (!existingBriefing) {
      await db.orm.public.SchoolEvent.create({
        organizationId: school.id,
        title: 'Grade 12 Mock Exam Briefing',
        description: 'Information session on the upcoming mock exam schedule and expectations.',
        startDate: toInstant(Date.now() + 86400000 * 10),
        endDate: toInstant(Date.now() + 86400000 * 10),
        allDay: true,
        category: 'academic',
        targetRoles: JSON.stringify(['STUDENT', 'PARENT']),
        targetYears: JSON.stringify(['12']),
        createdByMembershipId: principalMembership!.id,
      });
    }
  }

  // ---------------------------------------------------------------------
  // Restaurant
  // ---------------------------------------------------------------------
  const { org: restaurant, created: restaurantCreated } = await findOrCreateOrg('RESTAURANT', {
    name: 'Downtown Burger Bar',
    description: 'Best burgers in the city.',
  });

  if (restaurantCreated) {
    const burger = await db.orm.public.MenuItem.create({
      name: 'Classic Cheeseburger',
      description: '1/4 lb beef patty with cheddar cheese, lettuce, and tomato.',
      price: 12.99,
      category: 'Mains',
      organizationId: restaurant.id,
    });

    const fries = await db.orm.public.MenuItem.create({
      name: 'Truffle Fries',
      description: 'Crispy fries tossed in truffle oil and parmesan.',
      price: 6.99,
      category: 'Sides',
      organizationId: restaurant.id,
    });

    const soda = await db.orm.public.MenuItem.create({
      name: 'Craft Cola',
      price: 3.5,
      category: 'Drinks',
      organizationId: restaurant.id,
    });

    const order = await db.orm.public.RestaurantOrder.create({
      organizationId: restaurant.id,
      
      type: 'DINE_IN',
      tableNumber: 'Table 4',
      status: 'PREPARING',
      totalAmount: 23.48,
    });

    await db.orm.public.OrderItem.create({
      orderId: order.id,
      menuItemId: burger.id,
      quantity: 1,
      notes: 'No pickles',
    });

    await db.orm.public.OrderItem.create({
      orderId: order.id,
      menuItemId: fries.id,
      quantity: 1,
    });

    await db.orm.public.OrderItem.create({
      orderId: order.id,
      menuItemId: soda.id,
      quantity: 1,
    });
  }

  // ---------------------------------------------------------------------
  // Events & Rentals
  // ---------------------------------------------------------------------
  const { org: organizer, created: organizerCreated } = await findOrCreateOrg('EVENT_ORGANIZER', {
    name: 'City Parks & Rec',
    description: 'Managing public spaces and community events.',
  });

  if (organizerCreated) {
    const summerFest = await db.orm.public.Event.create({
      title: 'Summer Music Festival',
      description: 'Live bands, food trucks, and family fun.',
      location: 'Centennial Park',
      date: (globalThis as any).Temporal.Instant.fromEpochMilliseconds(Date.now() + 86400000 * 14), // In 2 weeks
      capacity: 5000,
      price: 15.0,
      organizationId: organizer.id,
    });

    await db.orm.public.Ticket.create({
      eventId: summerFest.id,
      personId: adminUser.id,
      status: 'VALID',
    });

    const pavilion = await db.orm.public.RentalResource.create({
      name: 'Centennial Park Main Pavilion',
      description: 'Large covered area with picnic tables and grills.',
      type: 'VENUE',
      pricePerDay: 150.0,
      organizationId: organizer.id,
    });

    await db.orm.public.Booking.create({
      resourceId: pavilion.id,
      personId: adminUser.id,
      startDate: (globalThis as any).Temporal.Instant.fromEpochMilliseconds(Date.now() + 86400000 * 5),
      endDate: (globalThis as any).Temporal.Instant.fromEpochMilliseconds(Date.now() + 86400000 * 5),
      status: 'CONFIRMED',
      totalPrice: 150.0,
    });
  }

  // ---------------------------------------------------------------------
  // Publisher / News
  // ---------------------------------------------------------------------
  const { org: publisher, created: publisherCreated } = await findOrCreateOrg('PUBLISHER', {
    name: 'The Daily Chronicle',
    description: 'Your trusted source for local news and updates.',
  });

  if (publisherCreated) {
    const post1 = await db.orm.public.Post.create({
      title: 'City Council Approves New Tech Hub',
      content:
        'In a unanimous vote, the city council has approved the construction of a new 50-acre tech hub downtown, expected to bring 5,000 new jobs.',
      category: 'Politics',
      isEmergency: false,
      status: 'PUBLISHED',
      viewCount: 1204,
      organizationId: publisher.id,
    });

    await db.orm.public.Post.create({
      title: 'SEVERE WEATHER ALERT: Flash Flooding',
      content:
        'The National Weather Service has issued a flash flood warning for the downtown and riverfront areas until 8 PM tonight. Please avoid unnecessary travel.',
      category: 'Weather',
      isEmergency: true,
      status: 'PUBLISHED',
      viewCount: 5600,
      organizationId: publisher.id,
    });

    await db.orm.public.Post.create({
      title: 'Local High School Wins State Championship',
      content:
        'The Lincoln High Lions secured a stunning 3-2 victory in overtime to claim their first state soccer championship in two decades.',
      category: 'Sports',
      isEmergency: false,
      status: 'DRAFT',
      viewCount: 0,
      organizationId: publisher.id,
    });

    await db.orm.public.Comment.create({
      content: 'This is amazing news for the local economy! I cannot wait.',
      postId: post1.id,
      personId: adminUser.id,
    });
  }

  // ---------------------------------------------------------------------
  // Healthcare & Pharmacy
  // ---------------------------------------------------------------------
  const { org: clinic, created: clinicCreated } = await findOrCreateOrg('HEALTHCARE', {
    name: 'City General Clinic',
    description: 'Providing excellent care to the community.',
  });

  const { org: pharmacy, created: pharmacyCreated } = await findOrCreateOrg('PHARMACY', {
    name: 'Downtown Pharmacy',
    description: 'Your local trusted pharmacy.',
  });

  if (clinicCreated) {
    const doctorMembership = await findOrCreateMembership(adminUser.id, clinic.id);
    await ensureMembershipRole(doctorMembership.id, 'DOCTOR');

    // Create PatientData for admin so they can be a patient
    const patientRel = await db.orm.public.Relationship.where({ personId: adminUser.id, organizationId: clinic.id, type: 'CUSTOMER' }).all().first()
      || await db.orm.public.Relationship.create({ personId: adminUser.id, organizationId: clinic.id, type: 'CUSTOMER' });
    const patientData = await db.orm.public.PatientData.where({ relationshipId: patientRel.id }).all().first()
      || await db.orm.public.PatientData.create({ relationshipId: patientRel.id });

    await db.orm.public.Appointment.create({
      date: (globalThis as any).Temporal.Instant.fromEpochMilliseconds(Date.now() + 86400000), // Tomorrow
      reason: 'Annual Checkup',
      status: 'SCHEDULED',
      patientDataId: patientData.id,
      staffMembershipId: doctorMembership.id,
      organizationId: clinic.id,
    });

    await db.orm.public.Prescription.create({
      medication: 'Amoxicillin 500mg',
      dosage: 'Take 1 pill every 8 hours',
      instructions: 'Take with food.',
      status: 'ISSUED',
      patientDataId: patientData.id,
      organizationId: clinic.id,
    });
  }

  if (pharmacyCreated) {
    await db.orm.public.PharmacyItem.create({
      name: 'Ibuprofen 400mg',
      description: 'Pain relief and fever reduction',
      price: 8.99,
      category: 'OTC',
      stockLevel: 150,
      requiresPrescription: false,
      organizationId: pharmacy.id,
    });

    await db.orm.public.PharmacyItem.create({
      name: 'Amoxicillin 500mg',
      description: 'Antibiotic',
      price: 15.5,
      category: 'Prescription',
      stockLevel: 50,
      requiresPrescription: true,
      organizationId: pharmacy.id,
    });
  }

  // ---------------------------------------------------------------------
  // Logistics / CityDrive dispatch
  // ---------------------------------------------------------------------
  const { org: logisticsOrg, created: logisticsCreated } = await findOrCreateOrg('LOGISTICS', {
    name: 'CityConnect Fleet Services',
    description: 'Unified dispatch for local services and deliveries.',
  });

  if (logisticsCreated) {
    let adminGigProfile = await db.orm.public.GigWorkerProfile.where({ personId: adminUser.id }).all().first();
    if (!adminGigProfile) {
      adminGigProfile = await db.orm.public.GigWorkerProfile.create({
        personId: adminUser.id,
        vehicleType: 'CAR',
        licensePlate: 'ABC-1234',
        isOnline: true,
        rating: 4.8,
      });
    }

    const task1 = await db.orm.public.Task.create({
      type: 'PACKAGE_DELIVERY',
      status: 'PENDING',
      pickupAddress: 'Downtown Pharmacy',
      dropoffAddress: '123 Main St, Apt 4B',
      price: 12.5,
      requesterPersonId: adminUser.id,
      organizationId: logisticsOrg.id,
    });

    const task2 = await db.orm.public.Task.create({
      type: 'SERVICE_DISPATCH',
      status: 'ACCEPTED',
      pickupAddress: 'Not Applicable',
      dropoffAddress: '456 Oak Lane',
      price: 0.0, // TBD by quote
      requesterPersonId: adminUser.id,
      courierProfileId: adminGigProfile?.id, // Handled by this worker
      organizationId: logisticsOrg.id,
    });
    void task1;

    await db.orm.public.ServiceQuote.create({
      taskId: task2.id,
      providerId: adminUser.id,
      estimatedPrice: 150.0,
      notes: 'Plumbing leak repair. Will take approx 2 hours.',
      status: 'PENDING',
    });
  }

  // ---------------------------------------------------------------------
  // ShopOS: Retail / Grocery (CityMall) — real POS/inventory data layer.
  // ---------------------------------------------------------------------
  const { org: retail } = await findOrCreateOrg('RETAIL', {
    name: 'Corner Market Grocers',
    description: 'Neighborhood grocery store on CityMall.',
  });

  const retailCategoryNames = ['Produce', 'Bakery', 'Meat', 'Drinks'];
  const retailCategories: Record<string, string> = {};
  for (const name of retailCategoryNames) {
    let category = await db.orm.public.RetailCategory.where({ organizationId: retail.id, name }).all().first();
    if (!category) {
      category = await db.orm.public.RetailCategory.create({ organizationId: retail.id, name });
    }
    retailCategories[name] = category.id;
  }

  const retailProductSeeds = [
    { name: 'Organic Bananas', sku: 'PRD-001', barcode: '8472948291', category: 'Produce', price: 0.59, cost: 0.20, stockQuantity: 150, lowStockLevel: 50, isWeighed: true, unit: 'lb' },
    { name: 'Avocado', sku: 'PRD-002', barcode: '8472948292', category: 'Produce', price: 1.20, cost: 0.50, stockQuantity: 45, lowStockLevel: 50 },
    { name: 'Sourdough Loaf', sku: 'BAK-001', barcode: '8472948293', category: 'Bakery', price: 4.50, cost: 1.10, stockQuantity: 12, lowStockLevel: 20 },
    { name: 'Croissant', sku: 'BAK-002', barcode: '8472948294', category: 'Bakery', price: 2.50, cost: 0.75, stockQuantity: 30, lowStockLevel: 15 },
    { name: 'Ground Beef 1lb', sku: 'MEA-001', barcode: '8472948295', category: 'Meat', price: 6.99, cost: 4.00, stockQuantity: 5, lowStockLevel: 10 },
    { name: 'Chicken Breast', sku: 'MEA-002', barcode: '8472948296', category: 'Meat', price: 8.50, cost: 5.20, stockQuantity: 25, lowStockLevel: 10, isWeighed: true, unit: 'lb' },
    { name: 'Orange Juice', sku: 'DRK-001', barcode: '8472948297', category: 'Drinks', price: 3.99, cost: 1.80, stockQuantity: 40, lowStockLevel: 15 },
    { name: 'Sparkling Water', sku: 'DRK-002', barcode: '8472948298', category: 'Drinks', price: 1.99, cost: 0.60, stockQuantity: 80, lowStockLevel: 20 },
  ];
  for (const p of retailProductSeeds) {
    const existing = await db.orm.public.RetailProduct.where({ organizationId: retail.id, sku: p.sku }).all().first();
    if (!existing) {
      await db.orm.public.RetailProduct.create({
        organizationId: retail.id,
        name: p.name,
        sku: p.sku,
        barcode: p.barcode,
        categoryId: retailCategories[p.category],
        price: p.price,
        cost: p.cost,
        stockQuantity: p.stockQuantity,
        lowStockLevel: p.lowStockLevel,
        isWeighed: p.isWeighed ?? false,
        unit: p.unit ?? 'ea',
      });
    }
  }

  let retailRegister = await db.orm.public.RetailRegister.where({ organizationId: retail.id, name: 'Register 1' }).all().first();
  if (!retailRegister) {
    retailRegister = await db.orm.public.RetailRegister.create({ organizationId: retail.id, name: 'Register 1' });
  }

  let retailSupplier = await db.orm.public.RetailSupplier.where({ organizationId: retail.id, name: 'Fresh Foods Distribution' }).all().first();
  if (!retailSupplier) {
    retailSupplier = await db.orm.public.RetailSupplier.create({
      organizationId: retail.id,
      name: 'Fresh Foods Distribution',
      contactName: 'Sam Rivera',
      email: 'orders@freshfoodsdist.example',
      phone: '(555) 040-1200',
      leadTimeDays: 3,
      paymentTerms: 'Net-30',
    });
  }

  // Store settings (one row per org — RetailSettings.organizationId is unique).
  // Onboarding flags deliberately half-complete so the ShopOS onboarding
  // widget has steps to demo (payment + shipping still open).
  let retailSettings = await db.orm.public.RetailSettings.where({ organizationId: retail.id }).all().first();
  if (!retailSettings) {
    retailSettings = await db.orm.public.RetailSettings.create({
      organizationId: retail.id,
      storeName: retail.name,
      storeAddress: '45 CityMall Plaza, Springfield',
      receiptMessage: 'Thank you for shopping at Corner Market!',
      taxRate: 8,
      currencySymbol: '$',
      customUnits: JSON.stringify(['ea', 'kg', 'lb', 'pack', 'box']),
      hasStoreInfo: true,
      hasProducts: true,
    });
  }

  // Physical branch locations for the retail org (V1 Location model is
  // org-level; MembershipLocation can optionally scope staff to them).
  const retailLocationSeeds = [
    { name: 'Corner Market — Main Street', address: '45 CityMall Plaza, Springfield' },
    { name: 'Corner Market — Airport Kiosk', address: 'Terminal B, Springfield International' },
  ];
  for (const locSeed of retailLocationSeeds) {
    const existingLoc = await db.orm.public.Location.where({ organizationId: retail.id, name: locSeed.name }).all().first();
    if (!existingLoc) {
      await db.orm.public.Location.create({ organizationId: retail.id, name: locSeed.name, address: locSeed.address });
    }
  }

  // Per-role demo logins for ShopOS (password '1234' via the same demo
  // Credentials provider as every other seeded account).
  const retailStaffSeeds = [
    { email: 'manager@cityconnect.local', name: 'Marta Manager', role: 'MANAGER' as const },
    { email: 'cashier@cityconnect.local', name: 'Cara Cashier', role: 'CASHIER' as const },
    { email: 'inventory@cityconnect.local', name: 'Ivan Stocker', role: 'INVENTORY_STAFF' as const },
  ];
  let cashierMembershipId = '';
  for (const staffSeed of retailStaffSeeds) {
    const staffPerson = await findOrCreatePerson(staffSeed.name, staffSeed.email);
    const staffMembership = await findOrCreateMembership(staffPerson.id, retail.id);
    await ensureMembershipRole(staffMembership.id, staffSeed.role);
    if (staffSeed.role === 'CASHIER') cashierMembershipId = staffMembership.id;
  }

  // Walk-in customers: Person -> Relationship(type=CUSTOMER) -> CustomerData.
  // Clearly-marked development identities (*.customer@cityconnect.local).
  const retailCustomerSeeds = [
    { name: 'Grace Green', email: 'grace.customer@cityconnect.local', phone: '(555) 201-3301', notes: 'Prefers paper receipts.', loyaltyPoints: 120 },
    { name: 'Hassan Patel', email: 'hassan.customer@cityconnect.local', phone: '(555) 201-3302', notes: 'Bulk buys rice monthly.', loyaltyPoints: 45 },
    { name: 'Lucia Alvarez', email: 'lucia.customer@cityconnect.local', phone: '(555) 201-3303', notes: 'Loyalty signup at register.', loyaltyPoints: 0 },
  ];
  const retailCustomerDataIds: string[] = [];
  for (const c of retailCustomerSeeds) {
    const person = await findOrCreatePerson(c.name, c.email);
    let rel = await db.orm.public.Relationship.where({ organizationId: retail.id, personId: person.id, type: 'CUSTOMER' }).all().first();
    if (!rel) {
      rel = await db.orm.public.Relationship.create({ organizationId: retail.id, personId: person.id, type: 'CUSTOMER' });
    }
    let cd = await db.orm.public.CustomerData.where({ relationshipId: rel.id }).all().first();
    if (!cd) {
      cd = await db.orm.public.CustomerData.create({ relationshipId: rel.id, notes: c.notes, loyaltyPoints: c.loyaltyPoints });
    }
    // Contact details live on PersonIdentifier (V1: no phone/email columns on Person).
    const emailExists = await db.orm.public.PersonIdentifier.where({ type: 'EMAIL', normalizedValue: c.email.toLowerCase() }).all().first();
    if (!emailExists) {
      await db.orm.public.PersonIdentifier.create({ personId: person.id, type: 'EMAIL', normalizedValue: c.email.toLowerCase(), isVerified: false });
    }
    const phoneExists = await db.orm.public.PersonIdentifier.where({ type: 'PHONE', normalizedValue: c.phone }).all().first();
    if (!phoneExists) {
      await db.orm.public.PersonIdentifier.create({ personId: person.id, type: 'PHONE', normalizedValue: c.phone });
    }
    retailCustomerDataIds.push(cd.id);
  }

  // One historical COMPLETED sale so the dashboard, Sales & Returns and the
  // customer 360 have data on first run (idempotent: only if the org has none).
  const existingRetailOrder = await db.orm.public.RetailOrder.where({ organizationId: retail.id }).all().first();
  if (!existingRetailOrder && retailProductSeeds.length >= 2) {
    const seededProducts = await db.orm.public.RetailProduct.where({ organizationId: retail.id }).all();
    const banana = seededProducts.find((p) => p.sku === 'PRD-001');
    const oj = seededProducts.find((p) => p.sku === 'DRK-001');
    if (banana && oj) {
      const line1 = { productId: banana.id, quantity: 2, unitPrice: banana.price, subtotal: banana.price * 2 };
      const line2 = { productId: oj.id, quantity: 1, unitPrice: oj.price, subtotal: oj.price };
      const subtotal = line1.subtotal + line2.subtotal;
      const taxAmount = Math.round(subtotal * 0.08 * 100) / 100;
      const now = new Date();
      const shift = await db.orm.public.RetailShift.create({
        organizationId: retail.id,
        registerId: retailRegister.id,
        openedById: cashierMembershipId,
        closedById: cashierMembershipId,
        openedAt: toInstant(now.getTime() - 3 * 60 * 60 * 1000),
        closedAt: toInstant(now.getTime() - 1 * 60 * 60 * 1000),
        openingFloat: 100,
        expectedCash: 100 + line1.subtotal + line2.subtotal + taxAmount,
        actualCash: 100 + line1.subtotal + line2.subtotal + taxAmount,
        discrepancy: 0,
        status: 'CLOSED',
      });
      const order = await db.orm.public.RetailOrder.create({
        organizationId: retail.id,
        shiftId: shift.id,
        cashierId: cashierMembershipId,
        customerDataId: retailCustomerDataIds[0],
        totalAmount: subtotal + taxAmount,
        taxAmount,
        discountAmount: 0,
        paymentMethod: 'CASH',
        status: 'COMPLETED',
      });
      for (const line of [line1, line2]) {
        await db.orm.public.RetailOrderItem.create({ orderId: order.id, ...line });
      }
    }
  }

  // ---------------------------------------------------------------------
  // Demo login (dev-only Credentials provider, see lib/auth.ts) — one user
  // with OWNER membership in every vertical org plus a GigWorkerProfile, so
  // a single login can reach every admin portal and the courier interface.
  // ---------------------------------------------------------------------
  const demoUser = await findOrCreatePerson('Demo Admin', 'demo@cityconnect.local');

  async function ensureOwnerMembership(organizationId: string) {
    const m = await findOrCreateMembership(demoUser.id, organizationId);
    await ensureMembershipRole(m.id, 'OWNER');
  }

  for (const org of [hotel, school, restaurant, organizer, publisher, clinic, pharmacy, logisticsOrg, retail]) {
    await ensureOwnerMembership(org.id);
  }

  const demoGigProfile = await db.orm.public.GigWorkerProfile.where({ personId: demoUser.id }).all().first();
  if (!demoGigProfile) {
    await db.orm.public.GigWorkerProfile.create({
      personId: demoUser.id,
      vehicleType: 'CAR',
      licensePlate: 'DEMO-001',
      isOnline: true,
      rating: 5.0,
    });
  }

  // Microsite Builder demo — a published single-page website for the
  // school, so the feature has something real to show immediately.
  let schoolMicrosite = await db.orm.public.Microsite.where({ organizationId: school.id }).all().first();
  if (!schoolMicrosite) {
    schoolMicrosite = await db.orm.public.Microsite.create({
      organizationId: school.id,
      slug: 'lincoln-high',
      title: school.name,
      tagline: 'Excellence in Education Since 1985',
      theme: 'editorial',
      status: 'published',
      seoTitle: `${school.name} — Official Website`,
      seoDescription: 'Learn more about our academic programs, admissions, and community.',
      publishedAt: toInstant(Date.now()),
    });

    const micrositeSections: { type: string; content: Record<string, unknown> }[] = [
      {
        type: 'hero',
        content: {
          heading: school.name,
          subheading: 'Preparing tomorrow\'s leaders through academic excellence, character, and community.',
          ctaText: 'Discover Our Campus',
          ctaLink: '#about',
          imageAssetId: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1600&q=80',
        },
      },
      {
        type: 'school-head-welcome',
        content: {
          heading: 'A Welcome from Our Principal',
          body: 'At Lincoln High, we believe that education is about more than just academics. It is about fostering a community of curious, compassionate, and courageous individuals ready to make their mark on the world.',
          signature: 'Dr. Sarah Jenkins',
          imageAssetId: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80',
        },
      },
      {
        type: 'school-curriculum',
        content: {
          heading: 'Academic Excellence',
          items: [
            { phase: 'Junior High (Grades 7-8)', description: 'A foundational program designed to build strong study habits and ignite curiosity.' },
            { phase: 'Senior High (Grades 9-10)', description: 'Core academic subjects paired with expansive elective opportunities.' },
            { phase: 'College Prep (Grades 11-12)', description: 'Advanced Placement (AP) courses and dedicated college counseling.' },
          ],
        },
      },
      {
        type: 'gallery',
        content: {
          heading: 'Campus Life',
          imageAssetIds: [
            'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1519452328956-658ee04207f2?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&w=800&q=80',
          ],
        },
      },
      {
        type: 'school-admissions-timeline',
        content: {
          heading: 'Join Our Community',
          steps: [
            { title: 'Inquire', description: 'Fill out our online inquiry form to receive our admissions packet.' },
            { title: 'Campus Tour', description: 'Schedule a visit to see our facilities and meet our faculty.' },
            { title: 'Application', description: 'Submit your formal application along with transcripts and recommendations.' },
            { title: 'Interview', description: 'A brief meeting with our admissions team to ensure a mutual fit.' },
          ],
        },
      },
      {
        type: 'contact',
        content: {
          heading: 'Visit Us',
          address: '123 Education Way, Springfield',
          phone: '(555) 010-2026',
          email: 'info@lincolnhigh.edu',
        },
      },
      {
        type: 'footer',
        content: {
          tagline: `© ${new Date().getFullYear()} ${school.name}. All rights reserved.`,
          socialLinks: [],
        },
      },
    ];

    for (let i = 0; i < micrositeSections.length; i++) {
      await db.orm.public.MicrositeSection.create({
        micrositeId: schoolMicrosite.id,
        type: micrositeSections[i].type,
        order: i,
        content: JSON.stringify(micrositeSections[i].content),
      });
    }
  }

  // Online store for the retail org — demos the live `retail-products`
  // section, which pulls real ShopOS catalog data rather than static copy.
  let retailMicrosite = await db.orm.public.Microsite.where({ organizationId: retail.id }).all().first();
  if (!retailMicrosite) {
    retailMicrosite = await db.orm.public.Microsite.create({
      organizationId: retail.id,
      slug: 'corner-market',
      title: retail.name,
      tagline: 'Fresh groceries, right on CityMall.',
      theme: 'minimal',
      status: 'published',
      seoTitle: `${retail.name} — Shop Online`,
      seoDescription: 'Browse our fresh produce, bakery, meat, and drinks selection.',
      publishedAt: toInstant(Date.now()),
    });

    const retailMicrositeSections: { type: string; content: Record<string, unknown> }[] = [
      {
        type: 'hero',
        content: {
          heading: retail.name,
          subheading: 'Fresh groceries, everyday essentials, and friendly service — right on CityMall.',
          ctaText: 'Visit Us',
          ctaLink: '#contact',
        },
      },
      {
        type: 'retail-products',
        content: { heading: 'Our Products', categoryId: '' },
      },
      {
        type: 'hours',
        content: {
          heading: 'Store Hours',
          rows: [
            { day: 'Monday - Saturday', hours: '8:00 AM - 9:00 PM' },
            { day: 'Sunday', hours: '9:00 AM - 6:00 PM' },
          ],
        },
      },
      {
        type: 'contact',
        content: {
          heading: 'Visit Us',
          address: '45 CityMall Plaza, Springfield',
          phone: '(555) 040-1100',
          email: 'hello@cornermarket.example',
        },
      },
      {
        type: 'footer',
        content: {
          tagline: `© ${new Date().getFullYear()} ${retail.name}. All rights reserved.`,
          socialLinks: [],
        },
      },
    ];

    // The storefront renderer resolves a page (isHome) before sections, so
    // the retail site needs a Home page the sections hang off — same shape
    // provisionShopOS/createMicrosite produce.
    const retailHomePage = await db.orm.public.MicrositePage.create({
      micrositeId: retailMicrosite.id,
      title: 'Home',
      slug: 'home',
      isHome: true,
      status: 'published',
    });

    for (let i = 0; retailMicrositeSections.length > i; i++) {
      await db.orm.public.MicrositeSection.create({
        micrositeId: retailMicrosite.id,
        pageId: retailHomePage.id,
        type: retailMicrositeSections[i].type,
        order: i,
        content: JSON.stringify(retailMicrositeSections[i].content),
      });
    }
  } else {
    // Self-heal sites created by the pre-fix seed: sections existed without a
    // Home page, which 404s the public /site/<slug> route.
    const retailPages = await db.orm.public.MicrositePage.where({ micrositeId: retailMicrosite.id }).all();
    if (retailPages.length === 0) {
      const homePage = await db.orm.public.MicrositePage.create({
        micrositeId: retailMicrosite.id,
        title: 'Home',
        slug: 'home',
        isHome: true,
        status: 'published',
      });
      const orphanSections = await db.orm.public.MicrositeSection.where({ micrositeId: retailMicrosite.id }).all();
      for (const s of orphanSections) {
        await db.orm.public.MicrositeSection.where({ id: s.id }).update({ pageId: homePage.id });
      }
    }
  }

  console.log('Database seeded successfully!');
  await db.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
