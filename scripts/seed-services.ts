import { db } from '../src/prisma/db.js';
import { DEMO_TASKS } from '../lib/demo/cityos.js';
import { taskOrgId, orgIdForSlug } from '../lib/demo/app/seed.js';

async function seedServices() {
  console.log("Seeding ServiceOS...");
  
  const city = await db.orm.public.City.where({ slug: "calabar" }).all().first();
  if (!city) throw new Error("Run seed.ts first");

  // Create Organizations for the tasks
  for (const t of DEMO_TASKS) {
    let orgId = taskOrgId(t.name);
    // If not mapped in taskOrgId, use a default fallback
    if (!orgId) {
       orgId = orgIdForSlug(t.pro.split(' ')[0].toLowerCase() + '-services');
    }

    let org = await db.orm.public.Organization.where({ id: orgId }).all().first();
    if (!org) {
      org = await db.orm.public.Organization.create({
        id: orgId,
        name: `${t.pro.split(' ')[0]}'s Services`,
        type: "SERVICES",
        description: "Local service provider",
        cityId: city.id,
      });
    }

    let cat = await db.orm.public.ServiceCategory.where({ organizationId: org.id, name: t.category }).all().first();
    if (!cat) {
      cat = await db.orm.public.ServiceCategory.create({
        organizationId: org.id,
        name: t.category,
      });
    }

    let service = await db.orm.public.ServiceCatalogItem.where({ id: t.id }).all().first();
    if (!service) {
      await db.orm.public.ServiceCatalogItem.create({
        id: t.id,
        organizationId: org.id,
        categoryId: cat.id,
        name: t.name,
        description: t.desc,
        price: t.from,
        durationMinutes: 120, // default 2 hrs
        isActive: true
      });
    }
  }

  // Create Admin for Mikes AC
  const acOrgId = orgIdForSlug('mikes-ac-services');
  const adminEmail = "admin@mikesac.local";
  let adminIdent = await db.orm.public.PersonIdentifier.where({ type: "EMAIL", normalizedValue: adminEmail }).all().first();
  if (!adminIdent) {
    const admin = await db.orm.public.Person.create({
      firstName: "Mike",
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
      organizationId: acOrgId
    });
    await db.orm.public.MembershipRole.create({
      membershipId: membership.id,
      role: "OWNER"
    });
  }

  console.log("ServiceOS Seeding complete.");
}

seedServices().catch(console.error);
