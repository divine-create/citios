import fs from 'fs';

let retail = fs.readFileSync('lib/actions/retail.ts', 'utf8');

const requireLocationContextCode = `
async function resolveLocationContext(organizationId: string, locationId?: string | null) {
  const locations = await db.orm.public.Location.where({ organizationId }).all();
  if (locations.length > 0) {
    if (!locationId) throw new Error('An active location is required for this operation.');
    const loc = locations.find(l => l.id === locationId);
    if (!loc) throw new Error('Location does not belong to this organization.');
    return loc;
  }
  return null;
}

async function getOrInitLocationStock(tx: any, organizationId: string, locationId: string, productId: string) {
  let stock = await tx.orm.public.RetailLocationStock.where({ locationId, productId }).all().first();
  if (!stock) {
    stock = await tx.orm.public.RetailLocationStock.create({
      organizationId,
      locationId,
      productId,
      stockQuantity: 0,
      lowStockLevel: null
    });
  }
  return stock;
}
`;

retail = retail.replace('// Categories', requireLocationContextCode + '\n// Categories');

// openShift signature
retail = retail.replace(
  'export async function openShift(input: { organizationId: string; registerId: string; openingFloat: number }) {',
  'export async function openShift(input: { organizationId: string; registerId: string; openingFloat: number; locationId?: string | null }) {'
);
retail = retail.replace(
  'const shift = await db.orm.public.RetailShift.create({',
  'const shift = await db.orm.public.RetailShift.create({\n      locationId: input.locationId,'
);

// createOrder signature
retail = retail.replace(
  'shiftId?: string;',
  'shiftId?: string;\n  locationId?: string | null;'
);
retail = retail.replace(
  'shiftId: input.shiftId,',
  'shiftId: input.shiftId,\n        locationId: input.locationId,'
);

// adjustStock signature and logic
retail = retail.replace(
  'export async function adjustStock(productId: string, delta: number, note?: string) {',
  'export async function adjustStock(productId: string, delta: number, note?: string, locationId?: string | null) {'
);
retail = retail.replace(
  'await tx.orm.public.RetailProduct.where({ id: productId }).update({ stockQuantity: next });',
  `const loc = await resolveLocationContext(product.organizationId, locationId).catch(e => { throw e; });
      if (loc) {
        const stock = await getOrInitLocationStock(tx, product.organizationId, loc.id, productId);
        const next = stock.stockQuantity + delta;
        if (next < 0) throw new Error('Stock cannot go below zero.');
        await tx.orm.public.RetailLocationStock.where({ id: stock.id }).update({ stockQuantity: next });
        await tx.orm.public.RetailStockMovement.create({
          organizationId: current.organizationId,
          locationId: loc.id,
          productId,
          delta,
          beforeQty: stock.stockQuantity,
          afterQty: next,
          reason: 'ADJUSTMENT',
          note: note ?? null,
          recordedById: membership.id,
        });
      } else {
        await tx.orm.public.RetailProduct.where({ id: productId }).update({ stockQuantity: next });
      }`
);

// createRegister
retail = retail.replace(
  'export async function createRegister(organizationId: string, name: string) {',
  'export async function createRegister(organizationId: string, name: string, locationId?: string | null) {'
);
retail = retail.replace(
  'const register = await db.orm.public.RetailRegister.create({ organizationId, name, isActive: true });',
  'const loc = await resolveLocationContext(organizationId, locationId).catch(e => { throw e; });\n    const register = await db.orm.public.RetailRegister.create({ organizationId, locationId: loc ? loc.id : null, name, isActive: true });'
);

// getProducts
retail = retail.replace('export async function getProducts(organizationId: string) {', 'export async function getProducts(organizationId: string, locationId?: string | null) {');
// getRegisters
retail = retail.replace('export async function getRegisters(organizationId: string) {', 'export async function getRegisters(organizationId: string, locationId?: string | null) {');
// getOpenShift
retail = retail.replace('export async function getOpenShift(organizationId: string) {', 'export async function getOpenShift(organizationId: string, locationId?: string | null) {');
// getShiftHistory
retail = retail.replace('export async function getShiftHistory(organizationId: string) {', 'export async function getShiftHistory(organizationId: string, locationId?: string | null) {');
// getOrders - with options
retail = retail.replace(
  "export async function getOrders(organizationId: string, options?: { limit?: number; status?: 'COMPLETED' | 'REFUNDED'; shiftId?: string }) {",
  "export async function getOrders(organizationId: string, locationId?: string | null, options?: { limit?: number; status?: 'COMPLETED' | 'REFUNDED'; shiftId?: string }) {"
);
// getShopDashboardData
retail = retail.replace('export async function getShopDashboardData(organizationId: string) {', 'export async function getShopDashboardData(organizationId: string, locationId?: string | null) {');

retail = retail.replace(
  'const registers = await db.orm.public.RetailRegister.where({ organizationId }).all();',
  'const registers = await db.orm.public.RetailRegister.where(locationId ? { organizationId, locationId } : { organizationId }).all();'
);
retail = retail.replace(
  'const shifts = await db.orm.public.RetailShift.where({ organizationId }).all();',
  'const shifts = await db.orm.public.RetailShift.where(locationId ? { organizationId, locationId } : { organizationId }).all();'
);
// getOrders query replace
let ordersMatch1 = retail.indexOf('const orders = await db.orm.public.RetailOrder.where(where).all();'); // actually wait, getOrders uses `where` clause?
if (ordersMatch1 === -1) {
    retail = retail.replace(
      'const where: any = { organizationId };',
      'const where: any = { organizationId };\n    if (locationId) where.locationId = locationId;'
    );
}
// getShopDashboardData query replace
let ordersMatch2 = retail.indexOf('const orders = await db.orm.public.RetailOrder.where({ organizationId }).all();');
if (ordersMatch2 > -1) {
  retail = retail.substring(0, ordersMatch2) + 'const orders = await db.orm.public.RetailOrder.where(locationId ? { organizationId, locationId } : { organizationId }).all();' + retail.substring(ordersMatch2 + 79);
}

retail = retail.replace(
  'const registers = await getRegisters(organizationId);',
  'const registers = await getRegisters(organizationId, locationId);'
);

fs.writeFileSync('lib/actions/retail.ts', retail);
console.log('Final patch complete');
