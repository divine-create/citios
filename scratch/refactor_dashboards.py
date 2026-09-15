import re

def main():
    with open('lib/actions/school.ts', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Insert helpers
    helpers = """// Resolves the org's "current" term
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
"""
    content = re.sub(r'// Resolves the org\'s "current" term.*?return current \?\? terms\[0\];\n\}', lambda m: helpers, content, flags=re.DOTALL)

    # 2. getSchoolAdminData
    content = re.sub(
        r'const students = \(await db\.orm\.public\.Student\.where\(\{ organizationId: school\.id \}\)\.all\(\)\)\s*\.sort\(\(a, b\) => a\.lastName\.localeCompare\(b\.lastName\)\);',
        lambda m: 'const students = (await fetchHydratedStudents(school.id)).sort((a, b) => a.lastName.localeCompare(b.lastName));',
        content
    )
    content = re.sub(
        r'const rows = await db\.orm\.public\.Attendance\.where\(\{ studentId \}\)\.all\(\);',
        lambda m: 'const rows = await db.orm.public.Attendance.where({ studentDataId: studentId }).all();',
        content
    )
    content = re.sub(
        r'const members = await db\.orm\.public\.OrganizationMember\.where\(\{ organizationId: school\.id \}\)\.all\(\);\s*const allUsers = await db\.orm\.public\.User\.all\(\);\s*const staffProfiles = await db\.orm\.public\.StaffProfile\.where\(\{ organizationId: school\.id \}\)\.all\(\);\s*const staff = members\.map\(\(m\) => \(\{[\s\S]*?\}?\)\);',
        lambda m: 'const staff = await fetchHydratedStaff(school.id);',
        content
    )
    
    # 3. getTeacherPortalData
    content = re.sub(
        r'const member = await db\.orm\.public\.OrganizationMember\.where\(\{ userId, organizationId \}\)\.all\(\)\.first\(\);',
        lambda m: 'const member = await db.orm.public.Membership.where({ personId: userId, organizationId }).all().first();',
        content
    )
    content = re.sub(
        r'const staffProfile = await db\.orm\.public\.StaffProfile\.where\(\{ memberId: organizationMemberId \}\)\.all\(\)\.first\(\);',
        lambda m: 'const staffProfile = await db.orm.public.StaffData.where({ membershipId: organizationMemberId }).all().first();',
        content
    )
    content = re.sub(
        r'const allStudents = organizationId \? await db\.orm\.public\.Student\.where\(\{ organizationId \}\)\.all\(\) : \[\];',
        lambda m: 'const allStudents = organizationId ? await fetchHydratedStudents(organizationId) : [];',
        content
    )

    # 4. getFinancePortalData
    content = re.sub(
        r'const staffProfiles = await db\.orm\.public\.StaffProfile\.where\(\{ organizationId \}\)\.all\(\);\s*const members = await db\.orm\.public\.OrganizationMember\.where\(\{ organizationId \}\)\.all\(\);\s*const allUsers = await db\.orm\.public\.User\.all\(\);\s*const staff = members\.map\(\(m\) => \(\{[\s\S]*?\}?\)\);',
        lambda m: 'const staff = await fetchHydratedStaff(organizationId);',
        content
    )

    # 5. getRegistrarPortalData
    content = re.sub(
        r'const students = await db\.orm\.public\.Student\.where\(\{ organizationId \}\)\.all\(\);',
        lambda m: 'const students = await fetchHydratedStudents(organizationId);',
        content
    )

    # 6. getCounselorPortalData
    content = re.sub(
        r'const students = await db\.orm\.public\.Student\.where\(\{ organizationId \}\)\.all\(\);',
        lambda m: 'const students = await fetchHydratedStudents(organizationId);',
        content
    )
    
    # assignStudentToSection
    assign = """export async function assignStudentToSection(studentId: string, classSectionId: string | null) {
  try {
    await db.orm.public.StudentData.where({ id: studentId }).update({ classSectionId });
    return { success: true };
  } catch (error) {
    console.error('Error assigning student to section:', error);
    return { error: 'Failed to assign student.' };
  }
}"""
    content = re.sub(r'export async function assignStudentToSection\(studentId: string, classSectionId: string \| null\) \{[\s\S]*?return \{ error: \'Failed to assign student\.\' \};\n  \}\n\}', lambda m: assign, content)

    with open('lib/actions/school.ts', 'w', encoding='utf-8') as f:
        f.write(content)
        
    print("Replaced dashboard functions")

if __name__ == "__main__":
    main()
