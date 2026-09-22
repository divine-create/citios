import fs from 'fs';

let c = fs.readFileSync('lib/actions/retail.ts', 'utf8');

c = c.replace(
  'const registers = await db.orm.public.RetailRegister.where({ organizationId }).all();',
  'const registers = await db.orm.public.RetailRegister.where(locationId ? { organizationId, locationId } : { organizationId }).all();'
);

c = c.replace(
  'const shifts = await db.orm.public.RetailShift.where({ organizationId }).all();',
  'const shifts = await db.orm.public.RetailShift.where(locationId ? { organizationId, locationId } : { organizationId }).all();'
);

c = c.replace(
  'const orders = await db.orm.public.RetailOrder.where({ organizationId }).all();',
  'const orders = await db.orm.public.RetailOrder.where(locationId ? { organizationId, locationId } : { organizationId }).all();'
);

c = c.replace(
  'const orders = await db.orm.public.RetailOrder.where({ organizationId }).all();',
  'const orders = await db.orm.public.RetailOrder.where(locationId ? { organizationId, locationId } : { organizationId }).all();'
);

// getOpenShift iterates over registers which are fetched via getRegisters. Since getRegisters wasn't updated in getOpenShift, let's fix it:
c = c.replace(
  'const registers = await getRegisters(organizationId);',
  'const registers = await getRegisters(organizationId, locationId);'
);

// getShopDashboardData fetches orders directly sometimes. Let's make sure it filters orders too:
c = c.replace(
  'const orders = await db.orm.public.RetailOrder.where({ organizationId }).all();',
  'const orders = await db.orm.public.RetailOrder.where(locationId ? { organizationId, locationId } : { organizationId }).all();'
);

fs.writeFileSync('lib/actions/retail.ts', c);
console.log('Patched query bodies');
