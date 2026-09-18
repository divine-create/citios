// Data-level verification of the multi-city seed. Read-only.
import { db } from '../src/prisma/db.js';

async function verify() {
  const cities = await db.orm.public.City.all();
  const persons = await db.orm.public.Person.all();
  for (const c of cities) {
    console.log(`CITY: ${c.name} slug=${c.slug} currency=${c.currency} tz=${c.timezone} active=${c.isActive}`);
    console.log(`  COORDS: ${c.latitude ?? 'null'}, ${c.longitude ?? 'null'}`);
    console.log(`  RESIDENTS (homeCityId): ${persons.filter((p) => p.homeCityId === c.id).length}`);
    const orgs = await db.orm.public.Organization.where({ cityId: c.id }).all();
    for (const o of orgs) {
      console.log(`  ORG: ${o.name} type=${o.type}`);
    }
  }
  const unhomed = persons.filter((p) => !p.homeCityId).length;
  console.log(`PERSONS WITHOUT HOME CITY: ${unhomed} / ${persons.length}`);

  // Cross-city leak check for the commerce surface:
  const lagos = cities.find((c) => c.slug === 'lagos');
  if (lagos) {
    const lagosOrgIds = new Set(
      (await db.orm.public.Organization.where({ cityId: lagos.id }).all()).map((o) => o.id),
    );
    const allProducts = await db.orm.public.RetailProduct.all();
    const lagosProducts = allProducts.filter((p) => lagosOrgIds.has(p.organizationId));
    console.log(`LAGOS RETAIL PRODUCTS: ${lagosProducts.map((p) => p.name).join(' | ')}`);
    const allMenus = await db.orm.public.MenuItem.all();
    const lagosMenu = allMenus.filter((m) => lagosOrgIds.has(m.organizationId));
    console.log(`LAGOS MENU ITEMS: ${lagosMenu.map((m) => m.name).join(' | ')}`);
  }

  console.log('VERIFY DONE');
  process.exit(0);
}

verify().catch((e) => { console.error(e); process.exit(1); });
