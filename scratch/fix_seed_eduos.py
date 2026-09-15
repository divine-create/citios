"""
Fix remaining EduOS legacy field names in scripts/seed.ts:
  Student.*       -> Relationship(STUDENT) + StudentData
  StudentParent   -> FamilyLink
  formTeacherId   -> formMembershipId  (ClassSection)
  staffId         -> membershipId      (ClassTeacher)
  studentId       -> studentDataId     (ClassEnrolment, Attendance, Grade, ReportCard, FeeInvoice, BehaviourIncident)
  ClassTeacher    -> uses membershipId not staffId
"""

with open('scripts/seed.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# ---- 1. formTeacherId -> formMembershipId everywhere ----
content = content.replace('formTeacherId: staffProfile.id', 'formMembershipId: teacherMember.id')
content = content.replace('.formTeacherId', '.formMembershipId')
content = content.replace('{ formTeacherId: staffProfile.id }', '{ formMembershipId: teacherMember.id }')
content = content.replace('{ formTeacherId: staffProfile.id }', '{ formMembershipId: teacherMember.id }')

# ---- 2. ClassTeacher staffId -> membershipId ----
content = content.replace(
    '.where({ classId: mathClass.id, staffId: staffProfile.id })',
    '.where({ classId: mathClass.id, membershipId: teacherMember.id })'
)
content = content.replace(
    'await db.orm.public.ClassTeacher.create({ classId: mathClass.id, staffId: staffProfile.id, isPrimary: true });',
    'await db.orm.public.ClassTeacher.create({ classId: mathClass.id, membershipId: teacherMember.id, isPrimary: true });'
)

# ---- 3. Student model -> findOrCreateStudentData helper ----
STUDENT_HELPER = """
/** Find or create the Relationship+StudentData pair for a student in a school. */
async function findOrCreateStudentData(
  organizationId: string,
  admissionNo: string,
  firstName: string,
  lastName: string,
  yearLevel: number,
  classSectionId?: string
): Promise<typeof import('../src/prisma/db.js').db.orm.public.StudentData extends { where: (...a: any[]) => infer R } ? Awaited<ReturnType<Awaited<R>['first']>> : any> {
  // Look up by admissionNo via existing StudentData rows
  const existing = await db.orm.public.StudentData.where({ admissionNo }).all().first();
  if (existing) return existing as any;

  // Create the Person + Relationship + StudentData
  const person = await db.orm.public.Person.create({ firstName, lastName });
  const rel = await db.orm.public.Relationship.create({ personId: person.id, organizationId, type: 'STUDENT' });
  const sd = await db.orm.public.StudentData.create({ relationshipId: rel.id, admissionNo, yearLevel, classSectionId });
  return sd as any;
}
"""

# Insert helper before main()
content = content.replace(
    '\nasync function main() {',
    STUDENT_HELPER + '\nasync function main() {'
)

# ---- 4. Rewrite Student.create blocks -> findOrCreateStudentData calls ----

# student4
content = content.replace(
    "  const existingStudent4 = await db.orm.public.Student.where({ organizationId: school.id, studentId: 'STU-004' }).all().first();\n"
    "  if (!existingStudent4) {\n"
    "    await db.orm.public.Student.create({\n"
    "      organizationId: school.id,\n"
    "      studentId: 'STU-004',\n"
    "      firstName: 'Grace',\n"
    "      lastName: 'Adeyemi',\n"
    "      yearLevel: 11,\n"
    "      classSectionId: grade11SectionA.id,\n"
    "    });\n"
    "  }",
    "  await findOrCreateStudentData(school.id, 'STU-004', 'Grace', 'Adeyemi', 11, grade11SectionA!.id);"
)

# student1 and student2 block
old_students12 = (
    "  const existingStudents = await db.orm.public.Student.where({ organizationId: school.id }).all();\n"
    "  let student1 = existingStudents.find((s) => s.studentId === 'STU-001');\n"
    "  if (!student1) {\n"
    "    student1 = await db.orm.public.Student.create({\n"
    "      organizationId: school.id,\n"
    "      studentId: 'STU-001',\n"
    "      firstName: 'Alex',\n"
    "      lastName: 'Johnson',\n"
    "      yearLevel: 12,\n"
    "      classSectionId: grade12SectionA.id,\n"
    "    });\n"
    "  } else if (!student1.classSectionId) {\n"
    "    await db.orm.public.Student.where({ id: student1.id }).update({ classSectionId: grade12SectionA.id });\n"
    "    student1 = { ...student1, classSectionId: grade12SectionA.id };\n"
    "  }\n"
    "  let student2 = existingStudents.find((s) => s.studentId === 'STU-002');\n"
    "  if (!student2) {\n"
    "    student2 = await db.orm.public.Student.create({\n"
    "      organizationId: school.id,\n"
    "      studentId: 'STU-002',\n"
    "      firstName: 'Zoe',\n"
    "      lastName: 'Smith',\n"
    "      yearLevel: 12,\n"
    "      classSectionId: grade12SectionA.id,\n"
    "    });\n"
    "  } else if (!student2.classSectionId) {\n"
    "    await db.orm.public.Student.where({ id: student2.id }).update({ classSectionId: grade12SectionA.id });\n"
    "    student2 = { ...student2, classSectionId: grade12SectionA.id };\n"
    "  }"
)
new_students12 = (
    "  const student1 = await findOrCreateStudentData(school.id, 'STU-001', 'Alex', 'Johnson', 12, grade12SectionA!.id);\n"
    "  const student2 = await findOrCreateStudentData(school.id, 'STU-002', 'Zoe', 'Smith', 12, grade12SectionA!.id);"
)
content = content.replace(old_students12, new_students12)

# student3
content = content.replace(
    "  let student3 = existingStudents.find((s) => s.studentId === 'STU-003');\n"
    "  if (!student3) {\n"
    "    student3 = await db.orm.public.Student.create({\n"
    "      organizationId: school.id,\n"
    "      studentId: 'STU-003',\n"
    "      firstName: 'Marcus',\n"
    "      lastName: 'Lee',\n"
    "      yearLevel: 12,\n"
    "    });\n"
    "  }",
    "  const student3 = await findOrCreateStudentData(school.id, 'STU-003', 'Marcus', 'Lee', 12);"
)

# ---- 5. ClassEnrolment studentId -> studentDataId ----
content = content.replace(
    "    const existingEnrolment = await db.orm.public.ClassEnrolment\n"
    "      .where({ classId: mathClass.id, studentId: student.id })\n"
    "      .all()\n"
    "      .first();\n"
    "    if (!existingEnrolment) {\n"
    "      await db.orm.public.ClassEnrolment.create({ classId: mathClass.id, studentId: student.id });\n"
    "    }",
    "    const existingEnrolment = await db.orm.public.ClassEnrolment\n"
    "      .where({ classId: mathClass.id, studentDataId: student.id })\n"
    "      .all()\n"
    "      .first();\n"
    "    if (!existingEnrolment) {\n"
    "      await db.orm.public.ClassEnrolment.create({ classId: mathClass.id, studentDataId: student.id });\n"
    "    }"
)

# ---- 6. Attendance studentId -> studentDataId ----
content = content.replace(
    "    const existingAttendance = await db.orm.public.Attendance\n"
    "      .where({ studentId: student.id, date: toInstant(todayStart.getTime()) })\n"
    "      .all()\n"
    "      .first();\n"
    "    if (!existingAttendance) {\n"
    "      await db.orm.public.Attendance.create({\n"
    "        studentId: student.id,",
    "    const existingAttendance = await db.orm.public.Attendance\n"
    "      .where({ studentDataId: student.id, date: toInstant(todayStart.getTime()) })\n"
    "      .all()\n"
    "      .first();\n"
    "    if (!existingAttendance) {\n"
    "      await db.orm.public.Attendance.create({\n"
    "        studentDataId: student.id,"
)

# ---- 7. Grade studentId -> studentDataId ----
content = content.replace(
    ".where({ gradebookId: midtermAssignment.id, studentId: student1.id })",
    ".where({ gradebookId: midtermAssignment.id, studentDataId: student1.id })"
)
content = content.replace(
    "await db.orm.public.Grade.create({ gradebookId: midtermAssignment.id, studentId: student1.id, score: 91 });",
    "await db.orm.public.Grade.create({ gradebookId: midtermAssignment.id, studentDataId: student1.id, score: 91 });"
)
# Grade in exam loop
content = content.replace(
    "      const existing = await db.orm.public.Grade.where({ gradebookId: assignment.id, studentId: student.id }).all().first();\n"
    "      if (!existing) {\n"
    "        await db.orm.public.Grade.create({ gradebookId: assignment.id, studentId: student.id, score });\n"
    "      }",
    "      const existing = await db.orm.public.Grade.where({ gradebookId: assignment.id, studentDataId: student.id }).all().first();\n"
    "      if (!existing) {\n"
    "        await db.orm.public.Grade.create({ gradebookId: assignment.id, studentDataId: student.id, score });\n"
    "      }"
)

# ---- 8. ReportCard studentId -> studentDataId ----
content = content.replace(
    "  const existingReportCard1 = await db.orm.public.ReportCard.where({ studentId: student1.id, termId: term.id }).all().first();\n"
    "  if (!existingReportCard1) {\n"
    "    await db.orm.public.ReportCard.create({\n"
    "      organizationId: school.id, studentId: student1.id,",
    "  const existingReportCard1 = await db.orm.public.ReportCard.where({ studentDataId: student1.id, termId: term.id }).all().first();\n"
    "  if (!existingReportCard1) {\n"
    "    await db.orm.public.ReportCard.create({\n"
    "      organizationId: school.id, studentDataId: student1.id,"
)
content = content.replace(
    "  const existingReportCard2 = await db.orm.public.ReportCard.where({ studentId: student2.id, termId: term.id }).all().first();\n"
    "  if (!existingReportCard2) {\n"
    "    await db.orm.public.ReportCard.create({\n"
    "      organizationId: school.id, studentId: student2.id,",
    "  const existingReportCard2 = await db.orm.public.ReportCard.where({ studentDataId: student2.id, termId: term.id }).all().first();\n"
    "  if (!existingReportCard2) {\n"
    "    await db.orm.public.ReportCard.create({\n"
    "      organizationId: school.id, studentDataId: student2.id,"
)

# ---- 9. BehaviourIncident studentId -> studentDataId ----
content = content.replace(
    "      studentId: student1.id,\n"
    "      reportedById: teacherMember.id,",
    "      studentDataId: student1.id,\n"
    "      reportedById: teacherMember.id,"
)

# ---- 10. FeeInvoice studentId -> studentDataId ----
content = content.replace(
    "  const existingInvoice = await db.orm.public.FeeInvoice.where({ organizationId: school.id, studentId: student1.id }).all().first();\n"
    "  if (!existingInvoice) {\n"
    "    const invoice = await db.orm.public.FeeInvoice.create({\n"
    "      organizationId: school.id,\n"
    "      studentId: student1.id,",
    "  const existingInvoice = await db.orm.public.FeeInvoice.where({ organizationId: school.id, studentDataId: student1.id }).all().first();\n"
    "  if (!existingInvoice) {\n"
    "    const invoice = await db.orm.public.FeeInvoice.create({\n"
    "      organizationId: school.id,\n"
    "      studentDataId: student1.id,"
)
content = content.replace(
    "  const existingInvoice2 = await db.orm.public.FeeInvoice.where({ organizationId: school.id, studentId: student2.id }).all().first();\n"
    "  if (!existingInvoice2) {\n"
    "    const invoice2 = await db.orm.public.FeeInvoice.create({\n"
    "      organizationId: school.id,\n"
    "      studentId: student2.id,",
    "  const existingInvoice2 = await db.orm.public.FeeInvoice.where({ organizationId: school.id, studentDataId: student2.id }).all().first();\n"
    "  if (!existingInvoice2) {\n"
    "    const invoice2 = await db.orm.public.FeeInvoice.create({\n"
    "      organizationId: school.id,\n"
    "      studentDataId: student2.id,"
)

# ---- 11. StudentParent -> FamilyLink ----
content = content.replace(
    "    const existingLink = await db.orm.public.StudentParent\n"
    "      .where({ studentId: parentSeed.student.id, parentId: parentUser.id })\n"
    "      .all()\n"
    "      .first();\n"
    "    if (!existingLink) {\n"
    "      await db.orm.public.StudentParent.create({\n"
    "        organizationId: school.id,\n"
    "        studentId: parentSeed.student.id,\n"
    "        parentId: parentUser.id,\n"
    "        isPrimary: true,\n"
    "        relationship: 'Parent',\n"
    "      });\n"
    "    }",
    "    // FamilyLink: guardian=parent, ward=student (need ward's personId via StudentData->Relationship)\n"
    "    const studentRel = await db.orm.public.Relationship.where({ id: parentSeed.student.relationshipId }).all().first();\n"
    "    if (studentRel) {\n"
    "      const existingLink = await db.orm.public.FamilyLink.where({ guardianPersonId: parentUser.id, wardPersonId: studentRel.personId }).all().first();\n"
    "      if (!existingLink) {\n"
    "        await db.orm.public.FamilyLink.create({ guardianPersonId: parentUser.id, wardPersonId: studentRel.personId, type: 'Parent' });\n"
    "      }\n"
    "    }"
)

with open('scripts/seed.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done — EduOS fields fixed in seed.ts")
