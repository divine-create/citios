import sys

with open('lib/actions/resident.ts', 'r', encoding='utf-8') as f:
    c = f.read()

good = '''export async function getParentDashboard() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.personId) return [];
    
    const personId = session.user.personId;
    const auths = await db.orm.public.GuardianAuthorization.where({ guardianPersonId: personId }).all();
    if (auths.length === 0) return [];
    
    const wardRelIds = auths.map((a: any) => a.wardRelationshipId);
    
    // Fetch students linked to those relationships
    const students = await db.orm.public.StudentData.where({ relationshipId: { in: wardRelIds } }).all();
    
    return JSON.parse(JSON.stringify(students));
  } catch (e) {
    console.error(e);
    return [];
  }
}'''
import re
c = re.sub(r'export async function getParentDashboard\(\) \{.*?\n\}', good, c, flags=re.DOTALL)

with open('lib/actions/resident.ts', 'w', encoding='utf-8') as f:
    f.write(c)
