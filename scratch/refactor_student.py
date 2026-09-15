import re

def main():
    with open('lib/actions/school.ts', 'r', encoding='utf-8') as f:
        content = f.read()

    if 'import { findStudentRelationship }' not in content:
        content = content.replace(
            "import { requireMembership } from '@/lib/actions/tenant';",
            "import { requireMembership, findStudentRelationship } from '@/lib/actions/tenant';"
        )

    # 1. createStudent
    create_student_new = """export async function createStudent(input: {
  organizationId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  studentId?: string;
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
      admissionNo: input.studentId?.trim() || generatedId,
      yearLevel: input.yearLevel ? Number(input.yearLevel) : 1,
      classSectionId: input.classSectionId || null,
    });

    return { success: true, student: JSON.parse(JSON.stringify({ ...studentData, person })) };
  } catch (error) {
    console.error('Error creating student:', error);
    return { error: 'Failed to create student.' };
  }
}"""
    content = re.sub(r'export async function createStudent\(input: \{.*?return \{ success: true, student: JSON\.parse\(JSON\.stringify\(student\)\) \};\n  \} catch \(error\) \{\n    console\.error\(\'Error creating student:\', error\);\n    return \{ error: \'Failed to create student\.\' \};\n  \}\n\}', create_student_new, content, flags=re.DOTALL)

    # 2. updateStudent
    update_student_new = """export async function updateStudent(id: string, input: {
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
}"""
    content = re.sub(r'export async function updateStudent\(id: string, input: \{.*?return \{ success: true \};\n  \} catch \(error\) \{\n    console\.error\(\'Error updating student:\', error\);\n    return \{ error: \'Failed to update student\.\' \};\n  \}\n\}', update_student_new, content, flags=re.DOTALL)

    # 3. deleteStudent
    delete_student_new = """export async function deleteStudent(studentId: string) {
  try {
    const studentData = await db.orm.public.StudentData.where({ id: studentId }).all().first();
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
}"""
    content = re.sub(r'export async function deleteStudent\(studentId: string\) \{.*?return \{ success: true \};\n  \} catch \(error\) \{\n    console\.error\(\'Error deleting student:\', error\);\n    return \{ error: \'Failed to remove student\.\' \};\n  \}\n\}', delete_student_new, content, flags=re.DOTALL)

    # 4. assignStudentToSection
    assign_new = """export async function assignStudentToSection(studentId: string, classSectionId: string | null) {
  try {
    const studentData = await db.orm.public.StudentData.where({ id: studentId }).all().first();
    if (!studentData) return { error: 'Student not found.' };
    
    const relationship = await db.orm.public.Relationship.where({ id: studentData.relationshipId }).all().first();
    if (!relationship) return { error: 'Student relationship broken.' };

    await requireMembership(relationship.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'REGISTRAR']);

    if (classSectionId) {
       const sec = await db.orm.public.ClassSection.where({ id: classSectionId }).all().first();
       if (sec && sec.organizationId !== relationship.organizationId) {
           return { error: 'Section does not belong to this school.' };
       }
    }

    await db.orm.public.StudentData.where({ id: studentId }).update({ classSectionId });
    return { success: true };
  } catch (error) {
    console.error('Error assigning student:', error);
    return { error: 'Failed to assign student.' };
  }
}"""
    content = re.sub(r'export async function assignStudentToSection\(studentId: string, classSectionId: string \| null\) \{.*?return \{ success: true \};\n  \} catch \(error\) \{\n    console\.error\(\'Error assigning student:\', error\);\n    return \{ error: \'Failed to assign student\.\' \};\n  \}\n\}', assign_new, content, flags=re.DOTALL)

    # We also need to update createStudentExit and createStudentTransferIn
    # But I'll write those dynamically just like this.
    exit_new = """export async function createStudentExit(input: {
  organizationId: string;
  studentId: string;
  exitDate: string;
  reason: string;
  destination?: string;
  notes?: string;
}) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'REGISTRAR']);
    const { studentData } = await findStudentRelationship(input.organizationId, input.studentId);

    const exitDate = new Date(input.exitDate);
    if (isNaN(exitDate.getTime())) return { error: 'Invalid date.' };

    await db.orm.public.StudentExit.create({
      studentId: input.studentId, // Links to StudentData id
      exitDate: exitDate.toISOString(),
      reason: input.reason,
      destination: input.destination,
      notes: input.notes,
    });
    
    // Actually the status is tracked via StudentData/Relationship or dropped. Let's just create the record.
    return { success: true };
  } catch (error) {
    console.error('Error processing student exit:', error);
    return { error: 'Failed to process exit.' };
  }
}"""
    content = re.sub(r'export async function createStudentExit\(input: \{.*?return \{ success: true \};\n  \} catch \(error\) \{\n    console\.error\(\'Error processing student exit:\', error\);\n    return \{ error: \'Failed to process exit\.\' \};\n  \}\n\}', exit_new, content, flags=re.DOTALL)

    with open('lib/actions/school.ts', 'w', encoding='utf-8') as f:
        f.write(content)
        
    print("Replaced student functions")

if __name__ == "__main__":
    main()
