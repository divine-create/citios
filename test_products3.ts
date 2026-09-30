import { db } from './src/prisma/db';
async function test() {
  try {
    const locs = await db.orm.public.Location.all();
    const cityOrgs = locs.map(l => l.organizationId);
    
    const allProducts = await db.orm.public.RetailProduct.all();
    const productOrgs = allProducts.map(p => p.organizationId);
    console.log('Product orgs in City locs?', productOrgs.every(id => cityOrgs.includes(id)));
    
    const notInCity = productOrgs.filter(id => !cityOrgs.includes(id));
    console.log('Products missing locs:', notInCity.length, [...new Set(notInCity)]);
  } catch(e) {
    console.error(e);
  }
}
test();
