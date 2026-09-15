import re

def main():
    with open('lib/actions/school.ts', 'r', encoding='utf-8') as f:
        content = f.read()

    # getStudentsInSection
    get_students = """async function getStudentsInSection(classSectionId: string) {
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
}"""
    content = re.sub(r'async function getStudentsInSection\(classSectionId: string\) \{[\s\S]*?return students;\n\}', lambda m: get_students, content)


    # resolveStudentSectionForYear
    resolve_sec = """async function resolveStudentSectionForYear(student: any, academicYearId: string): Promise<string | null> {
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
}"""
    content = re.sub(r'async function resolveStudentSectionForYear\(student: any, academicYearId: string\): Promise<string \| null> \{[\s\S]*?return null;\n\}', lambda m: resolve_sec, content)


    # computeClassSectionResults
    comp_class = """async function computeClassSectionResults(organizationId: string, classSectionId: string, termId: string) {
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
}"""
    content = re.sub(r'async function computeClassSectionResults\(organizationId: string, classSectionId: string, termId: string\) \{[\s\S]*?return \{ classSize: students\.length, results, gradingScale \};\n\}', lambda m: comp_class, content)

    with open('lib/actions/school.ts', 'w', encoding='utf-8') as f:
        f.write(content)
        
    print("Replaced gradebook functions part 2")

if __name__ == "__main__":
    main()
