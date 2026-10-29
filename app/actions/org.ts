'use server';

import { db } from '@/src/prisma/db';
import { getCurrentCity, getCityBySlug } from '@/lib/city';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { notifyPerson } from '@/lib/notify';
import { classifyRetailProduct } from '@/lib/taxonomy/retail-categorizer';
import { isTestOrDemoProduct } from '@/lib/storefront-filter';
import { isSavedEntityType, savedKey } from '@/lib/saved-items';

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
  const rawOrgPosts = await db.orm.public.Post.where({ organizationId: org.id, status: 'PUBLISHED' }).all();
  const recentOrgPosts = JSON.parse(JSON.stringify(rawOrgPosts)).filter((p: any) => p.linkedEntityType !== 'REVIEW' && p.category !== 'Review').sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).slice(0, 6);
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
    locations: JSON.parse(JSON.stringify(locations)),
    isClaimed,
    isVerified: Boolean(meta.isVerified),
    contactPoints: JSON.parse(JSON.stringify(contactPoints)),
    capabilities: {
      retail: products.length > 0 || org.type === 'RETAIL',
      restaurant: menuItems.length > 0,
      services: services.length > 0,
      jobs: jobs.length > 0,
      events: events.length > 0,
      school: false
    },
    jobsData: JSON.parse(JSON.stringify(jobs)),
    eventsData: JSON.parse(JSON.stringify(events)),
    servicesData: JSON.parse(JSON.stringify(services)),
    productsData: JSON.parse(JSON.stringify(products)),
    menuData: JSON.parse(JSON.stringify(menuItems)),
    postsData: recentOrgPosts,
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
  const [tiers, allRegs, allTickets] = await Promise.all([
    db.orm.public.EventTicketTier.where({ eventId: id }).all(),
    db.orm.public.EventRegistration.where({ eventId: id }).all(),
    db.orm.public.Ticket.where({ eventId: id }).all(),
  ]);
  const regCount = allRegs.filter((r: any) => r.status === 'REGISTERED' || r.status === 'CHECKED_IN').length;
  const ticketCount = allTickets.filter((t: any) => t.status === 'VALID' || t.status === 'SCANNED').length;

  let userRegistration: any = null;
  let userTicket: any = null;
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.personId) {
      userRegistration = await db.orm.public.EventRegistration.where({ eventId: id, personId: session.user.personId }).first();
      const userTickets = await db.orm.public.Ticket.where({ eventId: id, personId: session.user.personId }).all();
      userTicket = userTickets.find((t: any) => t.status !== 'REFUNDED') || null;
    }
  } catch {}

  return JSON.parse(JSON.stringify({
    ...event,
    date: event.date ? event.date.toString() : new Date().toISOString(),
    createdAt: event.createdAt ? event.createdAt.toString() : null,
    ticketTiers: tiers,
    soldCount: regCount + ticketCount,
    userRegistration,
    userTicket,
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
  if (!isSavedEntityType(entityType) || !entityId) {
    throw new Error(`Unsupported saved item type: ${entityType}`);
  }
  const personId = session.user.personId;

  const existing = await db.orm.public.SavedItem.where({
    personId,
    entityType,
    entityId
  }).first();

  if (existing) {
    await db.orm.public.SavedItem.where({ id: existing.id }).delete();
    return false;
  }

  try {
    await db.orm.public.SavedItem.create({ personId, entityType, entityId });
  } catch (err) {
    // Unique (personId, entityType, entityId): a concurrent request already saved it.
    const raced = await db.orm.public.SavedItem.where({ personId, entityType, entityId }).first();
    if (!raced) throw err;
  }
  return true;
}

/** Keys (`type:id`) of everything the signed-in resident has saved. Empty for guests. */
export async function getMySavedKeys(): Promise<string[]> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.personId) return [];
  const saved = await db.orm.public.SavedItem.where({ personId: session.user.personId }).all();
  return saved
    .filter((s) => isSavedEntityType(s.entityType))
    .map((s) => savedKey(s.entityType, s.entityId));
}

export async function getResolvedSavedItems() {
  const empty = { orgs: [], products: [], jobs: [], events: [], places: [], stays: [] };
  const session = await getServerSession(authOptions);
  if (!session?.user?.personId) return empty;

  const saved = await db.orm.public.SavedItem.where({ personId: session.user.personId }).all();
  const idsOf = (type: string) => saved.filter((s) => s.entityType === type).map((s) => s.entityId);

  const bizIds = idsOf('biz');
  const orgs = bizIds.length > 0 ? await db.orm.public.Organization.where((r: any) => r.id.in(bizIds)).all() : [];

  const productIds = idsOf('product');
  const products = productIds.length > 0 ? await db.orm.public.RetailProduct.where((r: any) => r.id.in(productIds)).all() : [];

  const jobIds = idsOf('job');
  const jobs = jobIds.length > 0 ? await db.orm.public.Job.where((r: any) => r.id.in(jobIds)).all() : [];

  const eventIds = idsOf('event');
  const events = eventIds.length > 0 ? await db.orm.public.Event.where((r: any) => r.id.in(eventIds)).all() : [];

  const placeIds = idsOf('place');
  const places = placeIds.length > 0 ? await db.orm.public.Location.where((r: any) => r.id.in(placeIds)).all() : [];

  const stayIds = idsOf('stay');
  const stays = stayIds.length > 0 ? await db.orm.public.DiscoveryListing.where((r: any) => r.id.in(stayIds)).all() : [];

  return { orgs, products, jobs, events, places, stays };
}

export async function getResidentOrganization(rawIdentifier: string) {
  let session = null;
  try {
    session = await getServerSession(authOptions);
  } catch {
    session = null;
  }
  const personId = session?.user?.personId;

  let identifier = rawIdentifier;
  try {
    identifier = decodeURIComponent(rawIdentifier).trim();
  } catch {}

  let listing = await db.orm.public.DiscoveryListing.where({ slug: identifier }).first();
  if (!listing && identifier !== rawIdentifier) {
    listing = await db.orm.public.DiscoveryListing.where({ slug: rawIdentifier }).first();
  }
  let orgId = listing?.organizationId;

  if (!orgId) {
    listing = await db.orm.public.DiscoveryListing.where({ organizationId: identifier }).first();
    if (listing) {
      orgId = listing.organizationId;
    } else {
      const org = await db.orm.public.Organization.where({ id: identifier }).first();
      if (org) {
        orgId = org.id;
      } else {
        const site = await db.orm.public.Microsite.where({ slug: identifier }).first();
        if (site) {
          orgId = site.organizationId;
        }
      }
    }
  }

  if (!orgId) return null;

  const org = await db.orm.public.Organization.where({ id: orgId }).first();
  if (!org) return null;

  if (!listing) {
    listing = await db.orm.public.DiscoveryListing.where({ organizationId: orgId }).first();
  }

  let isManager = false;
  if (personId) {
    const membership = await db.orm.public.Membership.where({
      organizationId: orgId,
      personId: personId,
    }).all().first();
    if (membership) isManager = true;
  }

  // Suspended organizations are invisible to non-managers
  if (org.status === 'SUSPENDED' && !isManager) {
    return null;
  }

  // If a DiscoveryListing exists and has been explicitly unpublished or deactivated, hide from non-managers
  if (listing && !listing.isActive && !isManager) {
    return null;
  }

  return { orgId, isManager, listing: listing ? JSON.parse(JSON.stringify(listing)) : null };
}
