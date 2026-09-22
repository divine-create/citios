import fs from 'fs';

let content = fs.readFileSync('lib/actions/retail.ts', 'utf8');

// Patch getProducts
const startGetProducts = content.indexOf('export async function getProducts(');
const endGetProducts = content.indexOf('export async function createProduct(', startGetProducts);

const newGetProducts = `export async function getProducts(organizationId: string, locationId?: string | null) {
  try {
    await requireMembership(organizationId);
    await ensureDefaultCategories(organizationId);
    const products = await db.orm.public.RetailProduct.where({ organizationId }).all();
    const categories = await db.orm.public.RetailCategory.where({ organizationId }).all();
    
    // Phase 2A: Override stockQuantity with location-specific stock if locationId is provided
    let locStocks: any[] = [];
    if (locationId) {
      locStocks = await db.orm.public.RetailLocationStock.where({ organizationId, locationId }).all();
    }
    const locStockMap = new Map(locStocks.map(s => [s.productId, s]));

    const enriched = products.map((p) => {
      const locStock = locStockMap.get(p.id);
      return { 
        ...p, 
        categoryName: categories.find((c) => c.id === p.categoryId)?.name ?? null,
        stockQuantity: locStock ? locStock.stockQuantity : p.stockQuantity 
      };
    });
    return JSON.parse(JSON.stringify(enriched));
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

`;

content = content.substring(0, startGetProducts) + newGetProducts + content.substring(endGetProducts);

fs.writeFileSync('lib/actions/retail.ts', content);
console.log('Patched getProducts');
