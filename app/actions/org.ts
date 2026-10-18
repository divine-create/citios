'use server';

import { db } from '@/src/prisma/db';
import { getCurrentCity, getCityBySlug } from '@/lib/city';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { notifyPerson } from '@/lib/notify';
import { classifyRetailProduct } from '@/lib/taxonomy/retail-categorizer';
import { isTestOrDemoProduct } from '@/lib/storefront-filter';

export async function getCanonicalOrganization(id: string) {
  let org = await db.orm.public.Organization.where({ id }).first();
  if (!org) return null;
  
  const locations = await db.orm.public.Location.where({ organizationId: org.id }).all();
  const orgCity = locations[0]?.cityId
    ? await db.orm.public.City.where({ id: locations[0].cityId }).first()
    : null;
  const jobs = await db.orm.public.Job.where({ organizationId: org.id }).all();
  const events = await db.orm.public.Event.where({ organizationId: org.id }).all();
  const services = await db.orm.public.ServiceCatalogItem.where({ organizationId: org.id }).all();
  const rawProducts = await db.orm.public.RetailProduct.where({ organizationId: org.id }).all();
  const retailCategories = await db.orm.public.RetailCategory.where({ organizationId: org.id }).all();
  const categoryNameMap = new Map(retailCategories.map((c: any) => [c.id, c.name]));
  const products = rawProducts
    .filter((p: any) => !p.parentId && !isTestOrDemoProduct(p))
    .map((p: any) => {
      const classified = classifyRetailProduct({
        name: p.name,
        description: p.description,
        price: p.price,
        storeCategory: (org as any).storeCategory,
      });
      const explicitAisle = p.categoryId ? categoryNameMap.get(p.categoryId) : null;
      return {
        ...p,
        storeName: org.name,
        categoryName: explicitAisle || classified.inStoreCategory || p.globalCategory || 'General Goods',
        globalCategory: classified.globalCategory || p.globalCategory || 'General Goods',
        brand: classified.brand,
        specTags: classified.specTags,
      };
    });
  const menuItems = await db.orm.public.MenuItem.where({ organizationId: org.id }).all();
  const memberships = await db.orm.public.Membership.where({ organizationId: org.id }).all();
  const contactPoints = await db.orm.public.OrganizationContactPoint.where({ organizationId: org.id }).all();
  const isClaimed = memberships.length > 0;
  const listing = await db.orm.public.DiscoveryListing.where({ organizationId: org.id }).first();
  let meta: any = {};
  try {
    if (listing?.metadata) meta = JSON.parse(listing.metadata);
  } catch {}
  const cover = org.logoAssetId || listing?.coverAssetId || meta.coverImage || meta.images?.[0] || null;

  return {
    id: org.id,
    name: org.name,
    type: org.type || 'Organization',
    storeCategory: (org as any).storeCategory || null,
    description: org.description,
    
    citySlug: orgCity?.slug ?? null,
    address: org.address,
    logoAssetId: org.logoAssetId,
    coverImage: cover,
    images: meta.images || (cover ? [cover] : []),
    metadata: meta,
    locations,
    isClaimed,
    contactPoints: JSON.parse(JSON.stringify(contactPoints)),
    capabilities: {
      retail: products.length > 0 || org.type === 'RETAIL',
      restaurant: menuItems.length > 0,
      services: services.length > 0,
      jobs: jobs.length > 0,
      events: events.length > 0,
      school: false
    },
    jobsData: jobs,
    eventsData: events,
    servicesData: services,
    productsData: products,
    menuData: menuItems,
  };
}

export async function getCityJobs() {
  // City scope: only jobs whose org operates in the current city.
  const city = await getCurrentCity();
  const [locations, activeListings, jobs] = await Promise.all([
    city ? db.orm.public.Location.where({ cityId: city.id }).all() : Promise.resolve([]),
    db.orm.public.DiscoveryListing.where({ isActive: true }).all(),
    db.orm.public.Job.include('organization', (o) =>
      o.select('name', 'id', 'description', 'address', 'logoAssetId')
    ).all(),
  ]);
  const cityOrgIds = city ? new Set(locations.map((o) => o.organizationId)) : null;
  const profileOrgIds = new Set(activeListings.map((l) => l.organizationId));
  const scoped = cityOrgIds ? jobs.filter((j) => cityOrgIds.has(j.organizationId)) : jobs;
  return scoped.map((j) => ({
    ...j,
    hasCityOSProfile:
      profileOrgIds.has(j.organizationId) &&
      !(j.description && /APPLY_URL:\s*https?:\/\//i.test(j.description)),
  }));
}

export async function getCityEvents() {
  const city = await getCurrentCity();
  const cityOrgIds = city
    ? new Set((await db.orm.public.Location.where({ cityId: city.id }).all()).map(o => o.organizationId))
    : null;
  const events = await db.orm.public.Event.include('organization', o => o.select('name', 'id', 'logoAssetId')).all();
  const filtered = cityOrgIds ? events.filter(e => cityOrgIds.has(e.organizationId)) : events;
  const normalized = filtered.map((e: any) => ({
    ...e,
    date: e.date ? e.date.toString() : new Date().toISOString(),
    createdAt: e.createdAt ? e.createdAt.toString() : null,
  }));
  normalized.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return JSON.parse(JSON.stringify(normalized));
}

export async function getCanonicalJob(id: string) {
  const job = await db.orm.public.Job.where({ id })
    .include('organization', (o) => o.select('name', 'id', 'description', 'address', 'logoAssetId'))
    .first();
  if (!job) return null;
  const activeListing = await db.orm.public.DiscoveryListing.where({
    organizationId: job.organizationId,
    isActive: true,
  }).first();
  const hasExternalUrl = Boolean(
    job.description && /APPLY_URL:\s*https?:\/\//i.test(job.description)
  );
  return {
    ...job,
    hasCityOSProfile: Boolean(activeListing) && !hasExternalUrl,
  };
}

export async function checkJobApplication(jobId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.personId) return null;
  const app = await db.orm.public.JobApplication.where({ jobId, personId: session.user.personId }).first();
  return app;
}

export async function toggleJobApplication(jobId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.personId) throw new Error('Unauthorized');

  const existing = await db.orm.public.JobApplication.where({ jobId, personId: session.user.personId }).first();
  if (existing) {
    await db.orm.public.JobApplication.where({ id: existing.id }).delete();
    return false;
  } else {
    const app = await db.orm.public.JobApplication.create({
      jobId,
      personId: session.user.personId,
    });

    // Real event → resident notification (fire-and-forget).
    const job = await db.orm.public.Job.where({ id: jobId }).all().first();
    await notifyPerson(session.user.personId, {
      type: 'JOB_APPLICATION',
      title: 'Application submitted',
      body: job?.title ? `You applied for "${job.title}".` : undefined,
      href: `/jobs/${jobId}`,
    });

    return true;
  }
}

export async function getCanonicalEvent(id: string) {
  const event = await db.orm.public.Event.where({ id }).include('organization', o => o.select('name', 'id', 'logoAssetId')).first();
  if (!event) return null;
  const tiers = await db.orm.public.EventTicketTier.where({ eventId: id }).all();
  return JSON.parse(JSON.stringify({
    ...event,
    date: event.date ? event.date.toString() : new Date().toISOString(),
    createdAt: event.createdAt ? event.createdAt.toString() : null,
    ticketTiers: tiers,
  }));
}

export async function checkEventRegistration(eventId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.personId) return null;
  const reg = await db.orm.public.EventRegistration.where({ eventId, personId: session.user.personId }).first();
  return reg;
}

export async function toggleEventRegistration(eventId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.personId) throw new Error('Unauthorized');

  const existing = await db.orm.public.EventRegistration.where({ eventId, personId: session.user.personId }).first();
  if (existing) {
    await db.orm.public.EventRegistration.where({ id: existing.id }).delete();
    return false;
  } else {
    await db.orm.public.EventRegistration.create({
      eventId,
      personId: session.user.personId,
    });

    // Real event → resident notification (fire-and-forget).
    const ev = await db.orm.public.Event.where({ id: eventId }).all().first();
    await notifyPerson(session.user.personId, {
      type: 'SYSTEM',
      title: 'Registration confirmed',
      body: ev?.title ? `You're registered for "${ev.title}".` : undefined,
      href: `/events/${eventId}`,
    });

    return true;
  }
}

export async function getCityMapEntities(citySlug?: string) {
  const city = citySlug ? await getCityBySlug(citySlug) : await getCurrentCity();
  if (!city) return { entities: [], jobs: [] };

  const orgs = await db.orm.public.Location.where({ }).all();
  const orgIds = orgs.map(o => o.organizationId);
  
  if (orgIds.length === 0) return { entities: [], jobs: [] };

  // @ts-ignore
  const locs = await db.orm.public.Location.where({ organizationId: { in: orgIds } }).all();
  // @ts-ignore
  const jobs = await db.orm.public.Job.where({ organizationId: { in: orgIds } }).all();
  
  const orgMap = new Map(orgs.map(o => [o.id, o]));
  
  const mapEntities = locs.map(loc => {
    const org = orgMap.get(loc.organizationId);
    if (!org) return null;
    return {
      id: org.id,
      name: org.name,
      sub: `${('Organization')} Â· ${loc.address || city.name}`,
      href: `/org/${org.id}`,
      kind: ('Organization').toLowerCase(),
      address: loc.address || '',
      latitude: loc.latitude,
      longitude: loc.longitude
    };
  }).filter(Boolean);
  
  return { entities: mapEntities, jobs: jobs.map(j => ({ ...j, area: j.area || '' })) };
}

export async function toggleSavedItem(entityType: string, entityId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.personId) return false;
  
  const existing = await db.orm.public.SavedItem.where({
    personId: session.user.personId,
    entityType,
    entityId
  }).first();
  
  if (existing) {
    await db.orm.public.SavedItem.where({ id: existing.id }).delete();
    return false;
  } else {
    await db.orm.public.SavedItem.create({
      personId: session.user.personId,
      entityType,
      entityId
    });
    return true;
  }
}

export async function getResolvedSavedItems() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.personId) return { orgs: [], products: [], jobs: [], events: [], places: [] };
  
  const saved = await db.orm.public.SavedItem.where({ personId: session.user.personId }).all();
  
  const bizIds = saved.filter(s => s.entityType === 'biz').map(s => s.entityId);
  const orgs = bizIds.length > 0 ? await db.orm.public.Organization.all().then(rows => rows.filter(r => bizIds.includes(r.id))) : [];
  
  const productIds = saved.filter(s => s.entityType === 'product').map(s => s.entityId);
  const products = productIds.length > 0 ? await db.orm.public.RetailProduct.all().then(rows => rows.filter(r => productIds.includes(r.id))) : [];
  
  const jobIds = saved.filter(s => s.entityType === 'job').map(s => s.entityId);
  const jobs = jobIds.length > 0 ? await db.orm.public.Job.all().then(rows => rows.filter(r => jobIds.includes(r.id))) : [];
  
  const eventIds = saved.filter(s => s.entityType === 'event').map(s => s.entityId);
  const events = eventIds.length > 0 ? await db.orm.public.Event.all().then(rows => rows.filter(r => eventIds.includes(r.id))) : [];
  
  const placeIds = saved.filter(s => s.entityType === 'place').map(s => s.entityId);
  const places = placeIds.length > 0 ? await db.orm.public.Location.all().then(rows => rows.filter(r => placeIds.includes(r.id))) : [];
  
  return { orgs, products, jobs, events, places };
}

export async function getResidentOrganization(identifier: string) {
  let session = null;
  try {
    session = await getServerSession(authOptions);
  } catch {
    session = null;
  }
  const personId = session?.user?.personId;

  let listing = await db.orm.public.DiscoveryListing.where({ slug: identifier }).first();
  let orgId = listing?.organizationId;

  if (!orgId) {
    listing = await db.orm.public.DiscoveryListing.where({ organizationId: identifier }).first();
    if (listing) {
      orgId = listing.organizationId;
    } else {
      const org = await db.orm.public.Organization.where({ id: identifier }).first();
      if (org) {
        orgId = org.id;
      }
    }
  }

  if (!orgId) return null;

  let isManager = false;
  if (personId) {
    const membership = await db.orm.public.Membership.where({
      organizationId: orgId,
      personId: personId,
    }).first();
    if (membership) isManager = true;
  }

  if ((!listing || !listing.isActive) && !isManager) {
    if (!listing) {
      const hasOpenJob = await db.orm.public.Job.where({ organizationId: orgId }).first();
      if (hasOpenJob) {
        return { orgId, isManager, listing: null };
      }
    }
    return null;
  }

  return { orgId, isManager, listing };
}
