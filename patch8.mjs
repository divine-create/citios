import fs from 'fs';
let code = fs.readFileSync('lib/actions/retail.ts', 'utf8');

code = code.replace(
  /export async function adjustStock\(productId: string, delta: number, note\?: string, locationId\?: string\) \{\n  try \{\n    const product = await db\.orm\.public\.RetailProduct\.where\(\{ id: productId \}\)\.all\(\)\.first\(\);\n    if \(\!product\) return \{ error: 'Product not found\.' \};\n    const \{ membership \} = await requireMembership\(product\.organizationId, \['OWNER', 'ADMIN', 'MANAGER', 'INVENTORY_STAFF'\]\);\n    if \(\!\(Number\.isFinite\(delta\)\)\) return \{ error: 'Enter a valid stock change\.' \};/,
  `export async function adjustStock(productId: string, delta: number, note?: string, locationId?: string) {
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
    }`
);

fs.writeFileSync('lib/actions/retail.ts', code);
console.log('Fixed locationId isolation in adjustStock');
