import { db } from './src/prisma/db';
async function test() {
  const cityId = 'c497e1f5-4dc7-4340-b007-0a1e9e765b90';
  const locs = await db.orm.public.Location.where({ cityId }).all();
  console.log(`Locs in city ${cityId}:`, locs.length);
  const orgIdsInCity = Array.from(new Set(locs.map(l => l.organizationId)));
  console.log('Org IDs in city:', orgIdsInCity);
  
  const allOrgs = await db.orm.public.Organization.all();
  const orgs = allOrgs.filter((o: any) => o.type === 'RETAIL' && orgIdsInCity.includes(o.id));
  const retailOrgIds = orgs.map(o => o.id);
  console.log('Retail Org IDs in city:', retailOrgIds);
  
  const allProducts = await db.orm.public.RetailProduct.all();
  const products = allProducts.filter((p: any) => retailOrgIds.includes(p.organizationId));
  console.log('Products for city:', products.length);
}
test();
