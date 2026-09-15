import re

def main():
    with open('lib/actions/school.ts', 'r', encoding='utf-8') as f:
        content = f.read()

    # getClassReportCards
    get_class_rc = """export async function getClassReportCards(organizationId: string, classSectionId: string, termId: string) {
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
}"""
    content = re.sub(r'export async function getClassReportCards\(organizationId: string, classSectionId: string, termId: string\) \{[\s\S]*?return \{ classSize: 0, results: \[\], gradingScale: null \};\n  \}\n\}', lambda m: get_class_rc, content)

    # getStudentReportCard
    get_student_rc = """export async function getStudentReportCard(
  organizationId: string,
  studentId: string,
  termId: string,
  options?: { requirePublished?: boolean }
) {
  try {
    const sd = await db.orm.public.StudentData.where({ id: studentId }).all().first();
    if (!sd) return null;
    const rel = await db.orm.public.Relationship.where({ id: sd.relationshipId }).all().first();
    if (!rel) return null;
    const person = await db.orm.public.Person.where({ id: rel.personId }).all().first();
    const student = { ...sd, firstName: person?.firstName, lastName: person?.lastName };

    const term = await db.orm.public.Term.where({ id: termId }).all().first();
    if (!term) return null;
    const academicYear = await db.orm.public.AcademicYear.where({ id: term.academicYearId }).all().first();
    const reportCard = await db.orm.public.ReportCard.where({ studentDataId: studentId, termId }).all().first();

    if (options?.requirePublished && !reportCard?.published) {
      return JSON.parse(JSON.stringify({ student, term, academicYear, reportCard: null, notPublished: true }));
    }

    let result: any = { student, subjects: [], overallPercentage: null, overallGradeLabel: null, overallGradeRemark: null, position: null };
    let classSize = 0;
    const sectionForTerm = await resolveStudentSectionForYear(student, term.academicYearId);
    if (sectionForTerm) {
      const computed = await computeClassSectionResults(organizationId, sectionForTerm, termId);
      classSize = computed.classSize;
      result = computed.results.find((r: any) => r.student.id === studentId) ?? result;
    }
    const gradingScale = await getDefaultGradingScale(organizationId);

    const attendanceRows = await db.orm.public.Attendance.where({ studentDataId: studentId, termId }).all();
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
}"""
    content = re.sub(r'export async function getStudentReportCard\([\s\S]*?return null;\n  \}\n\}', lambda m: get_student_rc, content)

    # upsertReportCardRemarks
    upsert_remarks = """export async function upsertReportCardRemarks(organizationId: string, studentId: string, termId: string, input: {
  comments?: string;
  teacherNotes?: string;
  principalNotes?: string;
}) {
  try {
    await requireMembership(organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'TEACHER']);
    const existing = await db.orm.public.ReportCard.where({ studentDataId: studentId, termId }).all().first();
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
        organizationId, studentDataId: studentId, termId, academicYear,
        comments: input.comments, teacherNotes: input.teacherNotes, principalNotes: input.principalNotes,
        published: false,
      });
    }
    return { success: true };
  } catch (error) {
    console.error('Error saving report card remarks:', error);
    return { error: 'Failed to save remarks.' };
  }
}"""
    content = re.sub(r'export async function upsertReportCardRemarks\([\s\S]*?return \{ error: \'Failed to save remarks\.\' \};\n  \}\n\}', lambda m: upsert_remarks, content)

    # publishReportCard
    publish_rc = """export async function publishReportCard(organizationId: string, studentId: string, termId: string) {
  try {
    await requireMembership(organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'TEACHER', 'REGISTRAR']);
    const existing = await db.orm.public.ReportCard.where({ studentDataId: studentId, termId }).all().first();
    if (existing) {
      await db.orm.public.ReportCard.where({ id: existing.id }).update({ published: true, issuedAt: toInstant(new Date()) });
    } else {
      const term = await db.orm.public.Term.where({ id: termId }).all().first();
      const academicYear = term ? (await db.orm.public.AcademicYear.where({ id: term.academicYearId }).all().first())?.year ?? 0 : 0;
      await db.orm.public.ReportCard.create({
        organizationId, studentDataId: studentId, termId, academicYear, published: true, issuedAt: toInstant(new Date()),
      });
    }
    return { success: true };
  } catch (error) {
    console.error('Error publishing report card:', error);
    return { error: 'Failed to publish report card.' };
  }
}"""
    content = re.sub(r'export async function publishReportCard\(organizationId: string, studentId: string, termId: string\) \{[\s\S]*?return \{ error: \'Failed to publish report card\.\' \};\n  \}\n\}', lambda m: publish_rc, content)

    # unpublishReportCard
    unpublish_rc = """export async function unpublishReportCard(studentId: string, termId: string) {
  try {
    const existing = await db.orm.public.ReportCard.where({ studentDataId: studentId, termId }).all().first();
    if (!existing) return { error: 'No report card found to unpublish.' };
    await requireMembership(existing.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'TEACHER', 'REGISTRAR']);
    await db.orm.public.ReportCard.where({ id: existing.id }).update({ published: false });
    return { success: true };
  } catch (error) {
    console.error('Error unpublishing report card:', error);
    return { error: 'Failed to unpublish report card.' };
  }
}"""
    content = re.sub(r'export async function unpublishReportCard\(studentId: string, termId: string\) \{[\s\S]*?return \{ error: \'Failed to unpublish report card\.\' \};\n  \}\n\}', lambda m: unpublish_rc, content)


    with open('lib/actions/school.ts', 'w', encoding='utf-8') as f:
        f.write(content)
        
    print("Replaced gradebook functions part 3")

if __name__ == "__main__":
    main()
