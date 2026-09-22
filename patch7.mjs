import fs from 'fs';
let code = fs.readFileSync('lib/actions/retail.ts', 'utf8');

code = code.replace(
  /const \{ membership \} = await requireMembership\(input\.organizationId, \['OWNER', 'ADMIN', 'MANAGER', 'CASHIER'\]\);\n      const existing = await db\.orm\.public\.RetailShift\.where\(\{ registerId: input\.registerId, status: 'OPEN' \}\)\.all\(\);/,
  `const { membership } = await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'CASHIER']);
      const register = await db.orm.public.RetailRegister.where({ id: input.registerId }).all().first();
      if (!register || register.organizationId !== input.organizationId) {
        return { error: 'Register not found or does not belong to this organization.' };
      }
      const existing = await db.orm.public.RetailShift.where({ registerId: input.registerId, status: 'OPEN' }).all();`
);

fs.writeFileSync('lib/actions/retail.ts', code);
console.log('Fixed openShift cross-tenant register vulnerability');
