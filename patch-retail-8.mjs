import fs from 'fs';

let content = fs.readFileSync('lib/actions/retail.ts', 'utf8');

const oldCreateReg = /export async function createRegister\(organizationId: string, name: string\) \{[\s\S]+?const register = await db\.orm\.public\.RetailRegister\.create\(\{ organizationId, name, isActive: true \}\);\s*return \{ success: true, register: JSON\.parse\(JSON\.stringify\(register\)\) \};\s*\} catch \(error\) \{/g;
const newCreateReg = `export async function createRegister(organizationId: string, name: string, locationId?: string | null) {
  try {
    await requireMembership(organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    if (!name.trim()) return { error: 'Register name is required.' };
    
    const loc = await resolveLocationContext(organizationId, locationId).catch(e => { throw e; });
    const locId = loc ? loc.id : null;

    const register = await db.orm.public.RetailRegister.create({ organizationId, locationId: locId, name, isActive: true });
    return { success: true, register: JSON.parse(JSON.stringify(register)) };
  } catch (error) {`;
content = content.replace(oldCreateReg, newCreateReg);

fs.writeFileSync('lib/actions/retail.ts', content);
console.log('Patched createRegister');
