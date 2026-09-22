import fs from 'fs';
let code = fs.readFileSync('lib/actions/retail.ts', 'utf8');

const targetStr = `export async function adjustStock(productId: string, delta: number, note?: string, locationId?: string) {
  try {
    const product = await db.orm.public.RetailProduct.where({ id: productId }).all().first();
    if (!product) return { error: 'Product not found.' };
    const { membership } = await requireMembership(product.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'INVENTORY_STAFF']);
    if (!(Number.isFinite(delta))) return { error: 'Enter a valid stock change.' };`;

const replacement = `export async function adjustStock(productId: string, delta: number, note?: string, locationId?: string) {
  try {
    const product = await db.orm.public.RetailProduct.where({ id: productId }).all().first();
    if (!product) return { error: 'Product not found.' };
    const { membership } = await requireMembership(product.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'INVENTORY_STAFF']);
    if (!(Number.isFinite(delta))) return { error: 'Enter a valid stock change.' };

    if (locationId) {
      const loc = await db.orm.public.Location.where({ id: locationId }).all().first();
      if (!loc || loc.organizationId !== product.organizationId) {
        return { error: 'Location does not belong to this organization.' };
      }
    }`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replacement);
  fs.writeFileSync('lib/actions/retail.ts', code);
  console.log('Successfully patched adjustStock');
} else {
  console.log('Failed to find target string in adjustStock');
}
