import re

def main():
    with open('lib/actions/school.ts', 'r', encoding='utf-8') as f:
        content = f.read()

    # createCourse
    create_course_new = """export async function createCourse(input: {
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
}"""
    content = re.sub(r'export async function createCourse\(input: \{.*?return \{ success: true \};\n  \} catch \(error\) \{\n    console\.error\(\'Error creating class:\', error\);\n    return \{ error: \'Failed to create class\.\' \};\n  \}\n\}', lambda m: create_course_new, content, flags=re.DOTALL)


    # updateCourse
    update_course_new = """export async function updateCourse(
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
}"""
    content = re.sub(r'export async function updateCourse\(\n  classId: string,\n  input: \{ name\?: string; subject\?: string; subjectId\?: string \| null; classSectionId\?: string \| null; yearLevel\?: number \}\n\) \{.*?return \{ success: true \};\n  \} catch \(error\) \{\n    console\.error\(\'Error updating class:\', error\);\n    return \{ error: \'Failed to update class\.\' \};\n  \}\n\}', lambda m: update_course_new, content, flags=re.DOTALL)


    # deleteCourse
    delete_course_new = """export async function deleteCourse(classId: string) {
  try {
    const cls = await db.orm.public.SchoolClass.where({ id: classId }).all().first();
    if (!cls) return { error: 'Class not found.' };

    await requireMembership(cls.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'REGISTRAR']);

    await db.orm.public.SchoolClass.where({ id: classId }).delete();
    return { success: true };
  } catch (error) {
    console.error('Error deleting class:', error);
    return { error: 'Failed to delete class.' };
  }
}"""
    content = re.sub(r'export async function deleteCourse\(classId: string\) \{.*?return \{ success: true \};\n  \} catch \(error\) \{\n    console\.error\(\'Error deleting class:\', error\);\n    return \{ error: \'Failed to delete class\.\' \};\n  \}\n\}', lambda m: delete_course_new, content, flags=re.DOTALL)


    # assignTeacherToClass
    assign_teacher_to_class_new = """export async function assignTeacherToClass(classId: string, staffId: string, isPrimary = true) {
  try {
    const cls = await db.orm.public.SchoolClass.where({ id: classId }).all().first();
    if (!cls) return { error: 'Class not found.' };

    await requireMembership(cls.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'REGISTRAR']);

    const existing = await db.orm.public.ClassTeacher.where({ classId, membershipId: staffId }).all().first();
    if (existing) return { error: 'This teacher is already assigned to this class.' };

    await db.orm.public.ClassTeacher.create({ classId, membershipId: staffId, isPrimary });
    return { success: true };
  } catch (error) {
    console.error('Error assigning teacher to class:', error);
    return { error: 'Failed to assign teacher.' };
  }
}"""
    content = re.sub(r'export async function assignTeacherToClass\(classId: string, staffId: string, isPrimary = true\) \{.*?return \{ success: true \};\n  \} catch \(error\) \{\n    console\.error\(\'Error assigning teacher to class:\', error\);\n    return \{ error: \'Failed to assign teacher\.\' \};\n  \}\n\}', lambda m: assign_teacher_to_class_new, content, flags=re.DOTALL)


    # createSubject
    create_subject_new = """export async function createSubject(organizationId: string, name: string, code?: string) {
  try {
    await requireMembership(organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'REGISTRAR']);

    if (!name.trim()) return { error: 'Subject name is required.' };
    await db.orm.public.Subject.create({ organizationId, name: name.trim(), code: code?.trim() || undefined });
    return { success: true };
  } catch (error) {
    console.error('Error creating subject:', error);
    return { error: 'A subject with this name may already exist.' };
  }
}"""
    content = re.sub(r'export async function createSubject\(organizationId: string, name: string, code\?: string\) \{.*?return \{ success: true \};\n  \} catch \(error\) \{\n    console\.error\(\'Error creating subject:\', error\);\n    return \{ error: \'A subject with this name may already exist\.\' \};\n  \}\n\}', lambda m: create_subject_new, content, flags=re.DOTALL)


    # updateSubject
    update_subject_new = """export async function updateSubject(subjectId: string, input: { name?: string; code?: string }) {
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
}"""
    content = re.sub(r'export async function updateSubject\(subjectId: string, input: \{ name\?: string; code\?: string \}\) \{.*?return \{ success: true \};\n  \} catch \(error\) \{\n    console\.error\(\'Error updating subject:\', error\);\n    return \{ error: \'Failed to update subject\.\' \};\n  \}\n\}', lambda m: update_subject_new, content, flags=re.DOTALL)


    # deleteSubject
    delete_subject_new = """export async function deleteSubject(subjectId: string) {
  try {
    const subj = await db.orm.public.Subject.where({ id: subjectId }).all().first();
    if (!subj) return { error: 'Subject not found.' };

    await requireMembership(subj.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'REGISTRAR']);

    await db.orm.public.Subject.where({ id: subjectId }).delete();
    return { success: true };
  } catch (error) {
    console.error('Error deleting subject:', error);
    return { error: 'This subject is still linked to one or more classes - reassign or remove those first.' };
  }
}"""
    content = re.sub(r'export async function deleteSubject\(subjectId: string\) \{.*?return \{ success: true \};\n  \} catch \(error\) \{\n    console\.error\(\'Error deleting subject:\', error\);\n    return \{ error: \'This subject is still linked to one or more classes - reassign or remove those first\.\' \};\n  \}\n\}', lambda m: delete_subject_new, content, flags=re.DOTALL)


    # assignTeacherToSubject
    assign_teacher_subj_new = """export async function assignTeacherToSubject(staffId: string, subjectId: string) {
  try {
    const subj = await db.orm.public.Subject.where({ id: subjectId }).all().first();
    if (!subj) return { error: 'Subject not found.' };

    await requireMembership(subj.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'REGISTRAR']);

    const existing = await db.orm.public.TeacherSubject.where({ membershipId: staffId, subjectId }).all().first();
    if (existing) return { error: 'This teacher is already assigned to this subject.' };

    await db.orm.public.TeacherSubject.create({ membershipId: staffId, subjectId });
    return { success: true };
  } catch (error) {
    console.error('Error assigning teacher to subject:', error);
    return { error: 'Failed to assign teacher.' };
  }
}"""
    content = re.sub(r'export async function assignTeacherToSubject\(staffId: string, subjectId: string\) \{.*?return \{ success: true \};\n  \} catch \(error\) \{\n    console\.error\(\'Error assigning teacher to subject:\', error\);\n    return \{ error: \'Failed to assign teacher\.\' \};\n  \}\n\}', lambda m: assign_teacher_subj_new, content, flags=re.DOTALL)


    # createClassSection
    create_sec_new = """export async function createClassSection(input: {
  organizationId: string;
  academicYearId?: string;
  gradeId: string;
  name: string;
  formTeacherId?: string;
}) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'REGISTRAR']);

    if (!input.name.trim()) return { error: 'Section name is required.' };
    if (!input.gradeId) return { error: 'Select a class for this section.' };

    let academicYearId = input.academicYearId;
    if (!academicYearId) {
      const years = await db.orm.public.AcademicYear.where({ organizationId: input.organizationId }).all();
      const activeYear = years.find((y) => y.active) ?? years[0];
      if (!activeYear) return { error: 'No academic year is set up yet - create one first.' };
      academicYearId = activeYear.id;
    }

    await db.orm.public.ClassSection.create({
      organizationId: input.organizationId,
      academicYearId,
      gradeId: input.gradeId,
      name: input.name.trim(),
      formMembershipId: input.formTeacherId || undefined,
    });
    return { success: true };
  } catch (error) {
    console.error('Error creating class section:', error);
    return { error: 'Failed to create class section.' };
  }
}"""
    content = re.sub(r'export async function createClassSection\(input: \{.*?return \{ success: true \};\n  \} catch \(error\) \{\n    console\.error\(\'Error creating class section:\', error\);\n    return \{ error: \'Failed to create class section\.\' \};\n  \}\n\}', lambda m: create_sec_new, content, flags=re.DOTALL)


    # updateClassSection
    update_sec_new = """export async function updateClassSection(
  sectionId: string,
  input: { name?: string; gradeId?: string; formTeacherId?: string | null }
) {
  try {
    const sec = await db.orm.public.ClassSection.where({ id: sectionId }).all().first();
    if (!sec) return { error: 'Section not found.' };

    await requireMembership(sec.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'REGISTRAR']);

    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name.trim();
    if (input.gradeId !== undefined) data.gradeId = input.gradeId;
    if (input.formTeacherId !== undefined) data.formMembershipId = input.formTeacherId || null;

    await db.orm.public.ClassSection.where({ id: sectionId }).update(data);
    return { success: true };
  } catch (error) {
    console.error('Error updating class section:', error);
    return { error: 'Failed to update section.' };
  }
}"""
    content = re.sub(r'export async function updateClassSection\(\n  sectionId: string,\n  input: \{ name\?: string; gradeId\?: string; formTeacherId\?: string \| null \}\n\) \{.*?return \{ success: true \};\n  \} catch \(error\) \{\n    console\.error\(\'Error updating class section:\', error\);\n    return \{ error: \'Failed to update section\.\' \};\n  \}\n\}', lambda m: update_sec_new, content, flags=re.DOTALL)


    # deleteClassSection
    delete_sec_new = """export async function deleteClassSection(sectionId: string) {
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
}"""
    content = re.sub(r'export async function deleteClassSection\(sectionId: string\) \{.*?return \{ success: true \};\n  \} catch \(error\) \{\n    console\.error\(\'Error deleting class section:\', error\);\n    return \{ error: \'Failed to remove section\.\' \};\n  \}\n\}', lambda m: delete_sec_new, content, flags=re.DOTALL)


    with open('lib/actions/school.ts', 'w', encoding='utf-8') as f:
        f.write(content)
        
    print("Replaced Class/Subject/Teacher functions")

if __name__ == "__main__":
    main()
