import fs from 'fs';

let content = fs.readFileSync('lib/actions/retail.ts', 'utf8');

const oldOpenShift = /export async function openShift\(input: \{ organizationId: string; registerId: string; openingFloat: number \}\) \{\s*try \{\s*const \{ membership \} = await requireMembership\(input\.organizationId, \['OWNER', 'ADMIN', 'MANAGER', 'CASHIER'\]\);\s*const existing = await db\.orm\.public\.RetailShift\.where\(\{ registerId: input\.registerId, status: 'OPEN' \}\)\.all\(\);\s*if \(existing\.length > 0\) return \{ error: 'This register already has an open shift\.' \};\s*const shift = await db\.orm\.public\.RetailShift\.create\(\{[\s\S]+?\}\);\s*return \{ success: true, shift: JSON\.parse\(JSON\.stringify\(shift\)\) \};\s*\} catch \(error\) \{/g;

const newOpenShift = `export async function openShift(input: { organizationId: string; registerId: string; openingFloat: number; locationId?: string | null }) {
  try {
    const { membership } = await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'CASHIER']);
    const loc = await resolveLocationContext(input.organizationId, input.locationId).catch(e => { throw e; });
    
    const register = await db.orm.public.RetailRegister.where({ id: input.registerId }).all().first();
    if (!register || register.organizationId !== input.organizationId) {
      return { error: 'Register not found or does not belong to this organization.' };
    }
    if (loc && register.locationId !== loc.id) {
      return { error: 'This register belongs to a different location.' };
    }

    const existing = await db.orm.public.RetailShift.where({ registerId: input.registerId, status: 'OPEN' }).all();
    if (existing.length > 0) return { error: 'This register already has an open shift.' };
    
    const shift = await db.orm.public.RetailShift.create({
      organizationId: input.organizationId,
      locationId: loc ? loc.id : null,
      registerId: input.registerId,
      openedById: membership.id,
      openingFloat: input.openingFloat,
      status: 'OPEN',
    });
    return { success: true, shift: JSON.parse(JSON.stringify(shift)) };
  } catch (error) {`;

content = content.replace(oldOpenShift, newOpenShift);
fs.writeFileSync('lib/actions/retail.ts', content);
console.log('Patched openShift');
