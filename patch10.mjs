import fs from 'fs';
let code = fs.readFileSync('lib/actions/retail.ts', 'utf8');

const regex = /export async function adjustStock\([^)]+\) \{\s*try \{\s*const product = await db\.orm\.public\.RetailProduct\.where\(\{ id: productId \}\)\.all\(\)\.first\(\);\s*if \(\!product\) return \{ error: 'Product not found\.' \};\s*const \{ membership \} = await requireMembership\(product\.organizationId, \['OWNER', 'ADMIN', 'MANAGER', 'INVENTORY_STAFF'\]\);\s*if \(\!\(Number\.isFinite\(delta\)\)\) return \{ error: 'Enter a valid stock change\.' \};/g;

code = code.replace(regex, `export async function adjustStock(productId: string, delta: number, note?: string, locationId?: string) {
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
    }`);

fs.writeFileSync('lib/actions/retail.ts', code);
console.log('Regex applied');
