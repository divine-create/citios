'use server';

import { db } from '@/src/prisma/db';
import { getCurrentCity, getCityBySlug } from '@/lib/city';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function getCanonicalOrganization(id: string) {
  let org = await db.orm.public.Organization.where({ id }).first();
  if (!org) return null;
  
  const locations = await db.orm.public.Location.where({ organizationId: org.id }).all();
  const orgCity = org.cityId
    ? await db.orm.public.City.where({ id: org.cityId }).first()
    : null;
  const jobs = await db.orm.public.Job.where({ organizationId: org.id }).all();
  const events = await db.orm.public.Event.where({ organizationId: org.id }).all();
  const services = await db.orm.public.ServiceCatalogItem.where({ organizationId: org.id }).all();
  const products = await db.orm.public.RetailProduct.where({ organizationId: org.id }).all();
  
  return {
    id: org.id,
    name: org.name,
    type: org.type,
    description: org.description,
    cityId: org.cityId,
    citySlug: orgCity?.slug ?? null,
    address: org.address,
    locations,
    capabilities: {
      retail: products.length > 0,
      services: services.length > 0,
      jobs: jobs.length > 0,
      events: events.length > 0,
      school: org.type === 'SCHOOL'
    },
    jobsData: jobs,
    eventsData: events,
    servicesData: services,
    productsData: products,
  };
}

export async function getCityJobs() {
  // City scope: only jobs whose org operates in the current city.
  const city = await getCurrentCity();
  const cityOrgIds = city
    ? new Set((await db.orm.public.Organization.where({ cityId: city.id }).all()).map(o => o.id))
    : null;
  const jobs = await db.orm.public.Job.include('organization', o => o.select('name', 'id')).all();
  return cityOrgIds ? jobs.filter(j => cityOrgIds.has(j.organizationId)) : jobs;
}

export async function getCityEvents() {
  const city = await getCurrentCity();
  const cityOrgIds = city
    ? new Set((await db.orm.public.Organization.where({ cityId: city.id }).all()).map(o => o.id))
    : null;
  const events = await db.orm.public.Event.include('organization', o => o.select('name', 'id')).all();
  return cityOrgIds ? events.filter(e => cityOrgIds.has(e.organizationId)) : events;
}

export async function getCanonicalJob(id: string) {
  const job = await db.orm.public.Job.where({ id }).include('organization', o => o.select('name', 'id')).first();
  return job;
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
    await db.orm.public.JobApplication.create({
      jobId,
      personId: session.user.personId,
    });
    return true;
  }
}

export async function getCanonicalEvent(id: string) {
  const event = await db.orm.public.Event.where({ id }).include('organization', o => o.select('name', 'id')).first();
  return event;
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
    return true;
  }
}

export async function getCityMapEntities(citySlug?: string) {
  const city = citySlug ? await getCityBySlug(citySlug) : await getCurrentCity();
  if (!city) return { entities: [], jobs: [] };

  const orgs = await db.orm.public.Organization.where({ cityId: city.id }).all();
  const orgIds = orgs.map(o => o.id);
  
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
      sub: `${org.type} Â· ${loc.address || city.name}`,
      href: `/org/${org.id}`,
      kind: org.type.toLowerCase(),
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
