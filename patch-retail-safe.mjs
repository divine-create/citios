import fs from 'fs';

let c = fs.readFileSync('lib/actions/retail.ts', 'utf8');

// Helper function
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

c = c.replace('// Categories', requireLocationContextCode + '\\n// Categories');

// 1. patch openShift signature
c = c.replace(
  'export async function openShift(input: { organizationId: string; registerId: string; openingFloat: number }) {',
  'export async function openShift(input: { organizationId: string; registerId: string; openingFloat: number; locationId?: string | null }) {'
);
c = c.replace(
  "const shift = await db.orm.public.RetailShift.create({",
  "const shift = await db.orm.public.RetailShift.create({\\n      locationId: input.locationId,"
);

// 2. patch createOrder signature
c = c.replace(
  'shiftId?: string;',
  'shiftId?: string; locationId?: string | null;'
);
c = c.replace(
  "shiftId: input.shiftId,",
  "shiftId: input.shiftId,\\n        locationId: input.locationId,"
);

// 3. patch adjustStock signature
c = c.replace(
  'export async function adjustStock(productId: string, delta: number, note?: string, locationId?: string) {',
  'export async function adjustStock(productId: string, delta: number, note?: string, locationId?: string | null) {'
);
c = c.replace(
  'if (locationId) {',
  'const loc = await resolveLocationContext(product.organizationId, locationId).catch(e => { throw e; });\\n    if (loc) {'
);

// 4. patch adjustStock tx
c = c.replace(
  'await tx.orm.public.RetailProduct.where({ id: productId }).update({ stockQuantity: next });',
  `if (loc) {
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
        await tx.orm.public.RetailProduct.where({ id: productId }).update({ stockQuantity: next });`
);
c = c.replace(
  'await txCheckLowStock(current);',
  'await txCheckLowStock(current);\\n      }'
);

// 5. patch createRegister signature
c = c.replace(
  'export async function createRegister(organizationId: string, name: string) {',
  'export async function createRegister(organizationId: string, name: string, locationId?: string | null) {'
);
c = c.replace(
  'const register = await db.orm.public.RetailRegister.create({ organizationId, name, isActive: true });',
  'const loc = await resolveLocationContext(organizationId, locationId).catch(e => { throw e; });\\n    const register = await db.orm.public.RetailRegister.create({ organizationId, locationId: loc ? loc.id : null, name, isActive: true });'
);

// 6. queries
c = c.replace('export async function getProducts(organizationId: string) {', 'export async function getProducts(organizationId: string, locationId?: string | null) {');
c = c.replace('export async function getRegisters(organizationId: string) {', 'export async function getRegisters(organizationId: string, locationId?: string | null) {');
c = c.replace('export async function getOpenShift(organizationId: string) {', 'export async function getOpenShift(organizationId: string, locationId?: string | null) {');
c = c.replace('export async function getShiftHistory(organizationId: string) {', 'export async function getShiftHistory(organizationId: string, locationId?: string | null) {');
c = c.replace('export async function getOrders(organizationId: string) {', 'export async function getOrders(organizationId: string, locationId?: string | null) {');
c = c.replace('export async function getShopDashboardData(organizationId: string) {', 'export async function getShopDashboardData(organizationId: string, locationId?: string | null) {');

fs.writeFileSync('lib/actions/retail.ts', c);
console.log('Patched cleanly');
