import fs from 'fs';

let retail = fs.readFileSync('lib/actions/retail.ts', 'utf8');

const dashStart = retail.indexOf('export async function getShopDashboardData');
if (dashStart > -1) {
  const dashEnd = retail.indexOf('export async function enrichCustomers', dashStart);
  let dashSection = retail.substring(dashStart, dashEnd > -1 ? dashEnd : undefined);
  dashSection = dashSection.replace(
    'const orders = await db.orm.public.RetailOrder.where({ organizationId }).all();',
    'const orders = await db.orm.public.RetailOrder.where(locationId ? { organizationId, locationId } : { organizationId }).all();'
  );
  retail = retail.substring(0, dashStart) + dashSection + (dashEnd > -1 ? retail.substring(dashEnd) : '');
}
fs.writeFileSync('lib/actions/retail.ts', retail);
console.log('Fixed getShopDashboardData queries');
