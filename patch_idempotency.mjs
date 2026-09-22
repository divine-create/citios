import fs from 'fs';
let code = fs.readFileSync('lib/actions/retail.ts', 'utf8');

code = code.replace(
  /const existing = await db\.orm\.public\.RetailOrder\.where\(\{ idempotencyKey: input\.idempotencyKey \}\)\.all\(\)\.first\(\);/,
  `const existing = await db.orm.public.RetailOrder.where({ idempotencyKey: input.idempotencyKey, organizationId: input.organizationId }).all().first();`
);

fs.writeFileSync('lib/actions/retail.ts', code);
console.log('Fixed idempotency check scoping');
