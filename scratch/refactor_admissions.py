import re

def main():
    with open('lib/actions/school.ts', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. getRegistrarPortalData
    reg_portal_new = """export async function getRegistrarPortalData(organizationId: string) {
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
}"""
    content = re.sub(r'export async function getRegistrarPortalData\(organizationId: string\) \{.*?return JSON\.parse\(JSON\.stringify\(\{ enrolmentRequests, documents, studentExits, studentTransfersIn, students, classes \}\)\);\n  \} catch \(error\) \{\n    console\.error\(\'Error fetching registrar portal data:\', error\);\n    return null;\n  \}\n\}', reg_portal_new, content, flags=re.DOTALL)


    # 2. createEnrolmentRequest
    create_enrolment_new = """export async function createEnrolmentRequest(input: {
  organizationId: string;
  classId: string;
  studentId: string; // This is StudentData.id
  requestedById: string; // We map this conceptually to Person.id
  message?: string;
}) {
  try {
    // The requester must be the student's guardian (or the student).
    // In a real system, we'd look up if they have authorization.
    // For now, we trust the Person id if they are logged in.
    const { person } = await requireAuthenticatedAccount();

    const existing = await db.orm.public.EnrolmentRequest.where({ classId: input.classId, studentDataId: input.studentId }).all().first();
    if (existing) return { error: 'A request for this student and class already exists.' };

    await db.orm.public.EnrolmentRequest.create({
      organizationId: input.organizationId,
      classId: input.classId,
      studentDataId: input.studentId,
      requestedByPersonId: person.id,
      message: input.message,
      status: 'pending',
    });
    return { success: true };
  } catch (error) {
    console.error('Error creating enrolment request:', error);
    return { error: 'Failed to create enrolment request.' };
  }
}"""
    content = re.sub(r'export async function createEnrolmentRequest\(input: \{.*?return \{ success: true \};\n  \} catch \(error\) \{\n    console\.error\(\'Error creating enrolment request:\', error\);\n    return \{ error: \'Failed to create enrolment request\.\' \};\n  \}\n\}', create_enrolment_new, content, flags=re.DOTALL)


    # 3. updateEnrolmentRequestStatus
    update_enrolment_new = """export async function updateEnrolmentRequestStatus(requestId: string, input: {
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
}"""
    content = re.sub(r'export async function updateEnrolmentRequestStatus\(requestId: string, input: \{.*?return \{ success: true \};\n  \} catch \(error\) \{\n    console\.error\(\'Error updating enrolment request:\', error\);\n    return \{ error: \'Failed to update enrolment request\.\' \};\n  \}\n\}', update_enrolment_new, content, flags=re.DOTALL)


    # 4. deleteEnrolmentRequest
    delete_enrolment_new = """export async function deleteEnrolmentRequest(requestId: string) {
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
}"""
    content = re.sub(r'export async function deleteEnrolmentRequest\(requestId: string\) \{.*?return \{ success: true \};\n  \} catch \(error\) \{\n    console\.error\(\'Error deleting enrolment request:\', error\);\n    return \{ error: \'Failed to delete enrolment request\.\' \};\n  \}\n\}', delete_enrolment_new, content, flags=re.DOTALL)


    # 5. enrollStudent
    enroll_student_new = """export async function enrollStudent(studentId: string, classId: string) {
  try {
    const { studentData, relationship } = await findStudentRelationship('', studentId).catch(async () => {
        // Since findStudentRelationship needs orgId, we fetch it here
        const sd = await db.orm.public.StudentData.where({ id: studentId }).all().first();
        if (!sd) throw new Error('Not found');
        const rel = await db.orm.public.Relationship.where({ id: sd.relationshipId }).all().first();
        if (!rel) throw new Error('Not found');
        return { studentData: sd, relationship: rel };
    });

    await requireMembership(relationship.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'REGISTRAR']);

    const existing = await db.orm.public.ClassEnrolment.where({ studentDataId: studentId, classId }).all().first();
    if (existing) return { error: 'Student is already in this class.' };

    await db.orm.public.ClassEnrolment.create({ studentDataId: studentId, classId });
    return { success: true };
  } catch (error) {
    console.error('Error enrolling student:', error);
    return { error: 'Failed to enroll student.' };
  }
}"""
    content = re.sub(r'export async function enrollStudent\(studentId: string, classId: string\) \{.*?return \{ success: true \};\n  \} catch \(error\) \{\n    console\.error\(\'Error enrolling student:\', error\);\n    return \{ error: \'Failed to enroll student\.\' \};\n  \}\n\}', enroll_student_new, content, flags=re.DOTALL)


    # 6. unenrollStudent
    unenroll_student_new = """export async function unenrollStudent(enrollmentId: string) {
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
}"""
    content = re.sub(r'export async function unenrollStudent\(enrollmentId: string\) \{.*?return \{ success: true \};\n  \} catch \(error\) \{\n    console\.error\(\'Error unenrolling student:\', error\);\n    return \{ error: \'Failed to unenroll student\.\' \};\n  \}\n\}', unenroll_student_new, content, flags=re.DOTALL)

    # Specific fixes for StudentExit and StudentTransferIn and Document created earlier
    content = re.sub(r'studentId: input\.studentId,(\s*// Links to StudentData id)', r'studentDataId: input.studentId,\1', content)
    content = re.sub(r'await db\.orm\.public\.Document\.create\(\{\s*organizationId: input\.organizationId,\s*studentId: input\.studentId', r'await db.orm.public.Document.create({\n      organizationId: input.organizationId,\n      studentDataId: input.studentId', content)
    content = re.sub(r'await db\.orm\.public\.StudentTransferIn\.create\(\{\s*organizationId: input\.organizationId,\s*studentId: input\.studentId', r'await db.orm.public.StudentTransferIn.create({\n      organizationId: input.organizationId,\n      studentDataId: input.studentId', content)

    with open('lib/actions/school.ts', 'w', encoding='utf-8') as f:
        f.write(content)
        
    print("Replaced admissions functions")

if __name__ == "__main__":
    main()
