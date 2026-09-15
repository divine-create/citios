import re

def main():
    with open('lib/actions/school.ts', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. getStudentAcademicSnapshot doesn't really need change because it accepts an object { id, organizationId, yearLevel }
    # but the queries inside it might be using studentId = StudentData.id, which is correct since StudentData maps to grades.
    # WAIT, `const enrolments = await db.orm.public.ClassEnrolment.where({ studentId }).all();`
    # Does ClassEnrolment point to StudentData.id? Yes.
    
    # 2. getParentPortalData
    parent_portal_new = """export async function getParentPortalData() {
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
      
      const feeInvoices = await db.orm.public.FeeInvoice.where({ studentId: studentData.id }).all();
      
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
}"""
    content = re.sub(r'export async function getParentPortalData\(\) \{.*?return JSON\.parse\(JSON\.stringify\(\{ user, children \}\)\);\n  \} catch \(error\) \{\n    console\.error\(\'Error fetching parent portal data:\', error\);\n    return null;\n  \}\n\}', parent_portal_new, content, flags=re.DOTALL)

    # 3. getStudentPortalData
    student_portal_new = """export async function getStudentPortalData() {
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
}"""
    content = re.sub(r'export async function getStudentPortalData\(\) \{.*?return JSON\.parse\(JSON\.stringify\(\{ user, student, organization, \.\.\.snapshot \}\)\);\n  \} catch \(error\) \{\n    console\.error\(\'Error fetching student portal data:\', error\);\n    return null;\n  \}\n\}', student_portal_new, content, flags=re.DOTALL)

    if 'requireAuthenticatedAccount' not in content:
        content = content.replace(
            "import { requireMembership, findStudentRelationship } from '@/lib/actions/tenant';",
            "import { requireMembership, findStudentRelationship, requireAuthenticatedAccount } from '@/lib/actions/tenant';"
        )


    with open('lib/actions/school.ts', 'w', encoding='utf-8') as f:
        f.write(content)
        
    print("Replaced portal functions")

if __name__ == "__main__":
    main()
