import re

def main():
    with open('lib/actions/school.ts', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. getCourseGradebook
    get_course = """export async function getCourseGradebook(classId: string) {
  try {
    const schoolClass = await db.orm.public.SchoolClass.where({ id: classId }).all().first();
    if (!schoolClass) return null;

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
}"""
    content = re.sub(r'export async function getCourseGradebook\(classId: string\) \{.*?return JSON\.parse\(JSON\.stringify\(\{ course: schoolClass, students, assignments, grades, enrollments \}\)\);\n  \} catch \(error\) \{\n    console\.error\(\'Error fetching gradebook:\', error\);\n    return null;\n  \}\n\}', lambda m: get_course, content, flags=re.DOTALL)


    # 2. createAssignment
    create_assignment = """export async function createAssignment(input: {
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
}"""
    content = re.sub(r'export async function createAssignment\(input: \{.*?return \{ success: true \};\n  \} catch \(error\) \{\n    console\.error\(\'Error creating assignment \(gradebook\):\', error\);\n    return \{ error: \'Failed to create assignment\.\' \};\n  \}\n\}', lambda m: create_assignment, content, flags=re.DOTALL)


    # 3. recordGrade
    record_grade = """export async function recordGrade(input: { assignmentId: string; studentId: string; courseId: string; score: number }) {
  try {
    if (input.score < 0) return { error: 'Score cannot be negative.' };
    
    const cls = await db.orm.public.SchoolClass.where({ id: input.courseId }).all().first();
    if (cls) {
        await requireMembership(cls.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'TEACHER', 'REGISTRAR']);
    }

    const existing = await db.orm.public.Grade.where({ 
      gradebookId: input.assignmentId, 
      studentDataId: input.studentId 
    }).all().first().catch(() => null);

    if (existing) {
      await db.orm.public.Grade.where({ id: existing.id }).update({ score: input.score });
    } else {
      await db.orm.public.Grade.create({
        gradebookId: input.assignmentId,
        studentDataId: input.studentId,
        score: input.score,
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error recording grade:', error);
    return { error: 'Failed to record grade.' };
  }
}"""
    content = re.sub(r'export async function recordGrade\(input: \{ assignmentId: string; studentId: string; courseId: string; score: number \}\) \{.*?return \{ success: true \};\n  \} catch \(error\) \{\n    console\.error\(\'Error recording grade:\', error\);\n    return \{ error: \'Failed to record grade\.\' \};\n  \}\n\}', lambda m: record_grade, content, flags=re.DOTALL)


    # 4. computeSubjectResult
    comp_subj = """async function computeSubjectResult(studentId: string, classId: string, termId: string) {
  const assignments = await db.orm.public.Gradebook.where({ classId, termId }).all();
  const breakdown: any[] = [];
  let weightedSum = 0;
  let weightTotal = 0;

  for (const a of assignments) {
    const grade = await db.orm.public.Grade.where({ gradebookId: a.id, studentDataId: studentId }).all().first();
    if (!grade || grade.score == null || !a.maxScore || a.maxScore <= 0) continue;
    const percentage = (grade.score / a.maxScore) * 100;
    const weight = a.weight ?? 1;
    weightedSum += percentage * weight;
    weightTotal += weight;
    breakdown.push({ gradebookId: a.id, name: a.name, type: a.type, score: grade.score, maxScore: a.maxScore, percentage, weight });
  }

  const percentage = weightTotal > 0 ? weightedSum / weightTotal : null;
  return { classId, percentage, breakdown };
}"""
    content = re.sub(r'async function computeSubjectResult\(studentId: string, classId: string, termId: string\) \{[\s\S]*?return \{ classId, percentage, breakdown \};\n\}', lambda m: comp_subj, content)

    with open('lib/actions/school.ts', 'w', encoding='utf-8') as f:
        f.write(content)
        
    print("Replaced gradebook functions part 1")

if __name__ == "__main__":
    main()
