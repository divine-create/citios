import { db } from './src/prisma/db';

async function checkConfig() {
  const products = await db.orm.public.RetailProduct.all();
  const orgs = await db.orm.public.Organization.all();
  const locs = await db.orm.public.Location.all();
  const menus = await db.orm.public.MenuItem.all();

  console.log('--- Retail Products ---');
  console.log(`Total Products: ${products.length}`);
  const noOrg = products.filter(p => !orgs.find(o => o.id === p.organizationId));
  console.log(`Products without valid Organization: ${noOrg.length}`);
  
  const noPrice = products.filter(p => typeof p.price !== 'number' || p.price < 0);
  console.log(`Products with invalid price: ${noPrice.length}`);

  const orgIdsWithLocs = new Set(locs.map(l => l.organizationId));
  const noLocProducts = products.filter(p => !orgIdsWithLocs.has(p.organizationId));
  console.log(`Products in Organizations with NO locations (Undiscoverable): ${noLocProducts.length}`);

  console.log('\n--- Menu Items ---');
  console.log(`Total Menu Items: ${menus.length}`);
  const noOrgMenu = menus.filter(m => !orgs.find(o => o.id === m.organizationId));
  console.log(`Menu Items without valid Organization: ${noOrgMenu.length}`);
  
  const noLocMenu = menus.filter(m => !orgIdsWithLocs.has(m.organizationId));
  console.log(`Menu Items in Organizations with NO locations: ${noLocMenu.length}`);

  const outOfStockProducts = products.filter(p => (p.stockQuantity || 0) <= 0);
  console.log(`\nProducts Out of Stock: ${outOfStockProducts.length}`);
}

checkConfig().catch(console.error);
