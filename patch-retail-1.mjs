import fs from 'fs';

let content = fs.readFileSync('lib/actions/retail.ts', 'utf8');

// 1. Helper function
const requireLocationContextCode = `
// Phase 2A: Enforce active location if the organization has locations
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

// Fetch or create location stock
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

if (!content.includes('resolveLocationContext')) {
  content = content.replace('// Categories', requireLocationContextCode + '\n// Categories');
}

// 2. Patch adjustStock
const oldAdjustStock = /export async function adjustStock[\s\S]+?revalidatePath\(`\/product\/\$\{productId\}`\);\s+return \{ success: true \};\s+\} catch \([^\)]+\) \{/;
const newAdjustStock = `export async function adjustStock(productId: string, delta: number, note?: string, locationId?: string) {
  try {
    const product = await db.orm.public.RetailProduct.where({ id: productId }).all().first();
    if (!product) return { error: 'Product not found.' };
    const { membership } = await requireMembership(product.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'INVENTORY_STAFF']);
    if (!(Number.isFinite(delta))) return { error: 'Enter a valid stock change.' };

    const loc = await resolveLocationContext(product.organizationId, locationId).catch(e => { throw e; });

    await db.transaction(async (tx) => {
      if (loc) {
        const stock = await getOrInitLocationStock(tx, product.organizationId, loc.id, productId);
        const next = stock.stockQuantity + delta;
        if (next < 0) throw new Error('Stock cannot go below zero at this location.');
        await tx.orm.public.RetailLocationStock.where({ id: stock.id }).update({ stockQuantity: next });
        
        await tx.orm.public.RetailStockMovement.create({
          organizationId: product.organizationId,
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
        const current = await tx.orm.public.RetailProduct.where({ id: productId }).all().first();
        if (!current) throw new Error('Product not found.');
        const next = current.stockQuantity + delta;
        if (next < 0) throw new Error('Stock cannot go below zero.');
        await tx.orm.public.RetailProduct.where({ id: productId }).update({ stockQuantity: next });
        
        await tx.orm.public.RetailStockMovement.create({
          organizationId: current.organizationId,
          productId,
          delta,
          beforeQty: current.stockQuantity,
          afterQty: next,
          reason: 'ADJUSTMENT',
          note: note ?? null,
          recordedById: membership.id,
        });
        
        if (delta < 0 && current.lowStockLevel != null && next <= current.lowStockLevel) {
          await txCheckLowStock(current);
        }
      }
    });

    revalidatePath('/market');
    revalidatePath('/workspaces/shopos');
    revalidatePath(\`/product/\${productId}\`);
    return { success: true };
  } catch (error) {`;
content = content.replace(oldAdjustStock, newAdjustStock);

fs.writeFileSync('lib/actions/retail.ts', content);
console.log('Patched adjustStock');
