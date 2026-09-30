import { db } from './src/prisma/db';
async function test() {
  try {
    const locs = await db.orm.public.Location.all();
    const orgs = await db.orm.public.Organization.all();
    const products = await db.orm.public.RetailProduct.all();
    
    console.log(`Total Locs: ${locs.length}, Total Orgs: ${orgs.length}, Total Products: ${products.length}`);
    const retailOrgs = orgs.filter(o => o.type === 'RETAIL');
    console.log(`Retail Orgs: ${retailOrgs.length}`);
    if (retailOrgs.length > 0) {
      console.log('Retail Org IDs:', retailOrgs.map(o => o.id));
      const locsForRetail = locs.filter(l => retailOrgs.map(ro => ro.id).includes(l.organizationId));
      console.log('Locs for retail orgs:', locsForRetail.length);
    }
    
    const menuItems = await db.orm.public.MenuItem.all();
    console.log(`Total MenuItems: ${menuItems.length}`);
  } catch(e) {
    console.error(e);
  }
}
test();
