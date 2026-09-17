import { db } from '../src/prisma/db.js';
import { RESIDENT_ACCOUNTS, bizOrgId, bizOrgName } from '../lib/demo/app/seed.js';
import { getBusiness, DEMO_PRODUCTS } from '../lib/demo/cityos.js';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
  console.log("Seeding database...");
  
  // Create City
  let city = await db.orm.public.City.where({ slug: "calabar" }).all().first();
  if (!city) {
    city = await db.orm.public.City.create({
      name: "Calabar",
      slug: "calabar",
      country: "Nigeria",
    });
  }

  // Create Organizations
  const freshmartId = bizOrgId("freshmart");
  let freshmart = await db.orm.public.Organization.where({ id: freshmartId }).all().first();
  if (!freshmart) {
    freshmart = await db.orm.public.Organization.create({
      id: freshmartId,
      name: "FreshMart Grocery",
      type: "RETAIL",
      description: "Local grocery store",
      cityId: city.id,
    });
  }

  // Create RetailCategory
  let cat = await db.orm.public.RetailCategory.where({ organizationId: freshmartId }).all().first();
  if (!cat) {
    cat = await db.orm.public.RetailCategory.create({
      name: "General",
      organizationId: freshmartId
    });
  }

  // Create Products
  const freshmartProducts = DEMO_PRODUCTS.filter(p => p.bizSlug === "freshmart");
  for (const p of freshmartProducts) {
    let prod = await db.orm.public.RetailProduct.where({ id: p.id }).all().first();
    if (!prod) {
      await db.orm.public.RetailProduct.create({
        id: p.id,
        organizationId: freshmartId,
        name: p.name,
        price: p.price,
        unit: p.unit,
        categoryId: cat.id,
      });
    }
  }

  // Create Residents
  for (const acc of RESIDENT_ACCOUNTS) {
    const email = `${acc.name.split(' ')[0].toLowerCase()}@cityconnect.local`;
    let ident = await db.orm.public.PersonIdentifier.where({ type: "EMAIL", normalizedValue: email }).all().first();
    let personId;
    if (!ident) {
      const [first, ...rest] = acc.name.split(' ');
      const person = await db.orm.public.Person.create({
        firstName: first,
        lastName: rest.join(' '),
      });
      personId = person.id;
      
      await db.orm.public.PersonIdentifier.create({
        personId: personId,
        type: "EMAIL",
        normalizedValue: email,
        isVerified: true
      });
      
      await db.orm.public.Account.create({
        personId: personId,
        isActive: true
      });
    } else {
      personId = ident.personId;
    }
    
    // We want a stable mapping of demo account ID to person ID so demo can still work
    // We can use a custom PersonIdentifier for the demo ID
    let demoIdent = await db.orm.public.PersonIdentifier.where({ type: "DEMO_ID", normalizedValue: acc.id }).all().first();
    if (!demoIdent) {
      await db.orm.public.PersonIdentifier.create({
        personId: personId,
        type: "DEMO_ID",
        normalizedValue: acc.id,
        isVerified: true
      });
    }
  }

  // Create FreshMart Admin
  const adminEmail = "admin@freshmart.local";
  let adminIdent = await db.orm.public.PersonIdentifier.where({ type: "EMAIL", normalizedValue: adminEmail }).all().first();
  if (!adminIdent) {
    const admin = await db.orm.public.Person.create({
      firstName: "FreshMart",
      lastName: "Admin"
    });
    await db.orm.public.PersonIdentifier.create({
      personId: admin.id,
      type: "EMAIL",
      normalizedValue: adminEmail,
      isVerified: true
    });
    await db.orm.public.Account.create({
      personId: admin.id,
      isActive: true
    });
    const membership = await db.orm.public.Membership.create({
      personId: admin.id,
      organizationId: freshmartId
    });
    await db.orm.public.MembershipRole.create({
      membershipId: membership.id,
      role: "OWNER"
    });
  }
  
  console.log("Seeding complete.");
}

seed().catch(console.error);
