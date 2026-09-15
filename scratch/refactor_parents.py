import re

def main():
    with open('lib/actions/school.ts', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. getParents
    get_parents_new = """export async function getParents(organizationId: string) {
  try {
    const auths = await db.orm.public.GuardianAuthorization.where({ organizationId }).all();
    const guardianIds = [...new Set(auths.map((a) => a.guardianPersonId))];

    const parents = [];
    for (const guardianId of guardianIds) {
      const guardian = await db.orm.public.Person.where({ id: guardianId }).all().first();
      const identifier = await db.orm.public.PersonIdentifier.where({ personId: guardianId, type: 'EMAIL' }).all().first();
      
      const children = [];
      const parentAuths = auths.filter((a) => a.guardianPersonId === guardianId);
      
      for (const a of parentAuths) {
        const studentRel = await db.orm.public.Relationship.where({ id: a.wardRelationshipId }).all().first();
        if (!studentRel) continue;
        
        const studentData = await db.orm.public.StudentData.where({ relationshipId: studentRel.id }).all().first();
        if (!studentData) continue;

        const studentPerson = await db.orm.public.Person.where({ id: studentRel.personId }).all().first();
        
        children.push({
          linkId: a.id,
          studentId: studentData.id,
          studentName: studentPerson ? `${studentPerson.firstName} ${studentPerson.lastName}` : 'Unknown student',
          relationship: a.permissions || 'Guardian',
          isPrimary: a.permissions === 'PRIMARY',
        });
      }
      
      parents.push({ 
        id: guardianId, 
        name: guardian ? `${guardian.firstName} ${guardian.lastName}` : null, 
        email: identifier ? identifier.normalizedValue : null, 
        children 
      });
    }

    return JSON.parse(JSON.stringify(parents));
  } catch (error) {
    console.error('Error fetching parents:', error);
    return [];
  }
}"""
    content = re.sub(r'export async function getParents\(organizationId: string\) \{.*?return JSON\.parse\(JSON\.stringify\(parents\)\);\n  \} catch \(error\) \{\n    console\.error\(\'Error fetching parents:\', error\);\n    return \[\];\n  \}\n\}', get_parents_new, content, flags=re.DOTALL)


    # 2. createParentLink
    create_parent_new = """export async function createParentLink(input: {
  organizationId: string;
  studentId: string;
  name: string;
  email: string;
  relationship?: string;
  isPrimary?: boolean;
}) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'REGISTRAR']);

    if (!input.name.trim() || !input.email.trim()) return { error: 'Name and email are required.' };
    if (!input.studentId) return { error: 'Please select a student.' };

    const { studentData, relationship: studentRel } = await findStudentRelationship(input.organizationId, input.studentId);

    const emailLower = input.email.trim().toLowerCase();
    let identifier = await db.orm.public.PersonIdentifier.where({ type: "EMAIL", normalizedValue: emailLower }).all().first();
    let guardianPerson;

    if (!identifier) {
      const firstName = input.name.split(' ')[0] || 'Unknown';
      const lastName = input.name.split(' ').slice(1).join(' ') || 'Guardian';
      guardianPerson = await db.orm.public.Person.create({ firstName, lastName });
      await db.orm.public.PersonIdentifier.create({
        personId: guardianPerson.id,
        type: "EMAIL",
        normalizedValue: emailLower,
        isVerified: true
      });
    } else {
      guardianPerson = await db.orm.public.Person.where({ id: identifier.personId }).all().first();
    }
    
    if (!guardianPerson) return { error: 'Failed to resolve guardian person' };

    // Ensure FamilyLink exists globally
    let familyLink = await db.orm.public.FamilyLink.where({ 
      guardianPersonId: guardianPerson.id, 
      wardPersonId: studentRel.personId 
    }).all().first();

    if (!familyLink) {
      familyLink = await db.orm.public.FamilyLink.create({
        guardianPersonId: guardianPerson.id,
        wardPersonId: studentRel.personId,
        type: input.relationship?.trim() || 'GUARDIAN'
      });
    }

    // Ensure explicit GuardianAuthorization at this specific organization
    const existingAuth = await db.orm.public.GuardianAuthorization
      .where({ organizationId: input.organizationId, guardianPersonId: guardianPerson.id, wardRelationshipId: studentRel.id })
      .all()
      .first();
      
    if (existingAuth) return { error: 'This parent is already linked to this student.' };

    const permissions = input.isPrimary ? 'PRIMARY' : (input.relationship?.trim() || 'GUARDIAN');
    await db.orm.public.GuardianAuthorization.create({
      organizationId: input.organizationId,
      guardianPersonId: guardianPerson.id,
      wardRelationshipId: studentRel.id,
      permissions: permissions
    });

    return { success: true };
  } catch (error) {
    console.error('Error linking parent:', error);
    return { error: 'Failed to link parent.' };
  }
}"""
    content = re.sub(r'export async function createParentLink\(input: \{.*?return \{ success: true \};\n  \} catch \(error\) \{\n    console\.error\(\'Error linking parent:\', error\);\n    return \{ error: \'Failed to link parent\.\' \};\n  \}\n\}', create_parent_new, content, flags=re.DOTALL)


    # 3. updateParentLink
    update_parent_new = """export async function updateParentLink(linkId: string, input: { relationship?: string; isPrimary?: boolean }) {
  try {
    const auth = await db.orm.public.GuardianAuthorization.where({ id: linkId }).all().first();
    if (!auth) return { error: 'Link not found.' };

    await requireMembership(auth.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'REGISTRAR']);

    const permissions = input.isPrimary ? 'PRIMARY' : (input.relationship?.trim() || 'GUARDIAN');
    await db.orm.public.GuardianAuthorization.where({ id: linkId }).update({ permissions });

    return { success: true };
  } catch (error) {
    console.error('Error updating parent link:', error);
    return { error: 'Failed to update parent link.' };
  }
}"""
    content = re.sub(r'export async function updateParentLink\(linkId: string, input: \{ relationship\?: string; isPrimary\?: boolean \}\) \{.*?return \{ success: true \};\n  \} catch \(error\) \{\n    console\.error\(\'Error updating parent link:\', error\);\n    return \{ error: \'Failed to update parent link\.\' \};\n  \}\n\}', update_parent_new, content, flags=re.DOTALL)


    # 4. deleteParentLink
    delete_parent_new = """export async function deleteParentLink(linkId: string) {
  try {
    const auth = await db.orm.public.GuardianAuthorization.where({ id: linkId }).all().first();
    if (!auth) return { error: 'Link not found.' };

    await requireMembership(auth.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'REGISTRAR']);

    // We only delete the explicit authorization for this organization, NOT the global FamilyLink
    await db.orm.public.GuardianAuthorization.where({ id: linkId }).delete();
    
    return { success: true };
  } catch (error) {
    console.error('Error removing parent link:', error);
    return { error: 'Failed to remove parent link.' };
  }
}"""
    content = re.sub(r'export async function deleteParentLink\(linkId: string\) \{.*?return \{ success: true \};\n  \} catch \(error\) \{\n    console\.error\(\'Error removing parent link:\', error\);\n    return \{ error: \'Failed to remove parent link\.\' \};\n  \}\n\}', delete_parent_new, content, flags=re.DOTALL)


    with open('lib/actions/school.ts', 'w', encoding='utf-8') as f:
        f.write(content)
        
    print("Replaced parent functions")

if __name__ == "__main__":
    main()
