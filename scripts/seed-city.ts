// Seeds a second active city (Lagos) with demo orgs so multi-city behavior
// can be exercised end-to-end. Also repairs Calabar's locale fields, which
// were seeded with the DB defaults (USD/UTC) before per-city currency and
// timezone mattered. Idempotent: safe to run repeatedly.
import { db } from '../src/prisma/db.js';
import { bizOrgId } from './seed-helpers.js';

async function seedCity() {
  // 1. Repair Calabar's locale
  const calabar = await db.orm.public.City.where({ slug: 'calabar' }).all().first();
  if (calabar && (calabar.currency !== 'NGN' || calabar.timezone !== 'Africa/Lagos')) {
    await db.orm.public.City.where({ id: calabar.id }).update({
      currency: 'NGN',
      timezone: 'Africa/Lagos',
    });
    console.log('Calabar locale repaired (NGN / Africa/Lagos).');
  }

  // 2. City #2 — Lagos
  let lagos = await db.orm.public.City.where({ slug: 'lagos' }).all().first();
  if (!lagos) {
    lagos = await db.orm.public.City.create({
      name: 'Lagos',
      slug: 'lagos',
      country: 'Nigeria',
      timezone: 'Africa/Lagos',
      currency: 'NGN',
    });
    console.log('City created: Lagos');
  }

  // 3. Lagos retail org: Eko Mart
  const ekoMartId = bizOrgId('ekomart');
  let ekoMart = await db.orm.public.Organization.where({ id: ekoMartId }).all().first();
  if (!ekoMart) {
    ekoMart = await db.orm.public.Organization.create({
      id: ekoMartId,
      name: 'Eko Mart',
      type: 'RETAIL',
      description: 'Lagos grocery and household store',
      
    });
    console.log('Organization created: Eko Mart (Lagos)');
  }

  let ekoCat = await db.orm.public.RetailCategory.where({ organizationId: ekoMartId }).all().first();
  if (!ekoCat) {
    ekoCat = await db.orm.public.RetailCategory.create({ name: 'General', organizationId: ekoMartId });
  }

  const ekoProducts = [
    { id: 'ekomart-rice', name: 'Long Grain Rice 5kg', price: 12500, unit: 'pack' },
    { id: 'ekomart-oil', name: 'Groundnut Oil 2L', price: 6800, unit: 'pack' },
    { id: 'ekomart-eggs', name: 'Crate of Eggs', price: 5200, unit: 'pack' },
  ];
  for (const p of ekoProducts) {
    const exists = await db.orm.public.RetailProduct.where({ id: p.id }).all().first();
    if (!exists) {
      await db.orm.public.RetailProduct.create({
        id: p.id,
        organizationId: ekoMartId,
        categoryId: ekoCat.id,
        name: p.name,
        price: p.price,
        unit: p.unit,
      });
      console.log(`RetailProduct created: ${p.name}`);
    }
  }

  // 4. Map pin so Lagos shows on the City Map
  const pinExists = await db.orm.public.Location.where({ organizationId: ekoMartId }).all().first();
  if (!pinExists) {
    await db.orm.public.Location.create({
      organizationId: ekoMartId,
      name: 'Eko Mart Flagship',
      address: '12 Adeola Odeku, Victoria Island',
      latitude: 6.4281,
      longitude: 3.4219,
    });
    console.log('Location created: Eko Mart Flagship');
  }

  // 5. Lagos restaurant: Naija Kitchen + menu items
  const naijaId = bizOrgId('naijakitchen');
  let naija = await db.orm.public.Organization.where({ id: naijaId }).all().first();
  if (!naija) {
    naija = await db.orm.public.Organization.create({
      id: naijaId,
      name: 'Naija Kitchen',
      type: 'RESTAURANT',
      description: 'Swallow, soups and grills — Lagos island',
      
    });
    console.log('Organization created: Naija Kitchen (Lagos)');
  }

  const naijaItems = [
    { id: 'naija-jollof', name: 'Party Jollof + Chicken', price: 4500, category: 'Mains' },
    { id: 'naija-egusi', name: 'Egusi & Pounded Yam', price: 5200, category: 'Mains' },
    { id: 'naija-suya', name: 'Beef Suya Skewers', price: 3000, category: 'Grills' },
  ];
  for (const m of naijaItems) {
    const exists = await db.orm.public.MenuItem.where({ id: m.id }).all().first();
    if (!exists) {
      await db.orm.public.MenuItem.create({
        id: m.id,
        organizationId: naijaId,
        name: m.name,
        price: m.price,
        category: m.category,
      });
      console.log(`MenuItem created: ${m.name}`);
    }
  }

  // 6. Lagos org OWNER for portal testing (login: admin@ekomart.local / 1234)
  const adminEmail = 'admin@ekomart.local';
  const ident = await db.orm.public.PersonIdentifier
    .where({ type: 'EMAIL', normalizedValue: adminEmail })
    .all()
    .first();
  if (!ident) {
    const admin = await db.orm.public.Person.create({ firstName: 'Eko', lastName: 'Admin' });
    await db.orm.public.PersonIdentifier.create({
      personId: admin.id,
      type: 'EMAIL',
      normalizedValue: adminEmail,
      isVerified: true,
    });
    await db.orm.public.Account.create({ personId: admin.id, isActive: true });
    const membership = await db.orm.public.Membership.create({
      personId: admin.id,
      organizationId: ekoMartId,
    });
    await db.orm.public.MembershipRole.create({ membershipId: membership.id, role: 'OWNER' });
    console.log('Eko Mart OWNER created (admin@ekomart.local)');
  }

  console.log('City seeding complete.');
}

seedCity().catch(console.error);

