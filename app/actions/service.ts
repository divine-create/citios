'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/src/prisma/db';
import { revalidatePath } from 'next/cache';

export async function requestServiceJob(input: {
  serviceId: string;
  notes?: string;
}) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || !session.user.personId) {
    throw new Error('Unauthorized. Real authentication is required to request a service.');
  }

  const personId = session.user.personId as string;

  // Verify the service exists
  const service = await db.orm.public.ServiceCatalogItem.where({ id: input.serviceId }).all().first();
  if (!service) {
    throw new Error('Service not found');
  }

  const orgId = service.organizationId;

  // Find or create customer relationship
  let relationship = await db.orm.public.Relationship.where({ personId, organizationId: orgId, type: 'CUSTOMER' }).all().first();
  if (!relationship) {
    relationship = await db.orm.public.Relationship.create({
      personId,
      organizationId: orgId,
      type: 'CUSTOMER'
    });
  }

  let customer = await db.orm.public.CustomerData.where({ relationshipId: relationship.id }).all().first();
  if (!customer) {
    customer = await db.orm.public.CustomerData.create({
      relationshipId: relationship.id
    });
  }

  // Create the ServiceJob
  const job = await db.orm.public.ServiceJob.create({
    organizationId: orgId,
    customerDataId: customer.id,
    serviceId: service.id,
    description: service.name,
    notes: input.notes || '',
    status: 'NEW',
    priority: 'NORMAL'
  });

  revalidatePath('/workspaces/serviceos');
  return { success: true, jobId: job.id };
}

export async function fetchServiceJobs(orgId: string) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || !session.user.personId) {
    throw new Error('Unauthorized');
  }

  // Verify membership
  const isMember = session.user.memberships?.some((m: any) => m.organizationId === orgId);
  if (!isMember) {
    throw new Error('Unauthorized: Not a member of this organization');
  }

  const jobs = await db.orm.public.ServiceJob.where({ organizationId: orgId }).all();
  
  return Promise.all(jobs.map(async (j) => {
    let customerName = 'Unknown';
    if (j.customerDataId) {
      const cust = await db.orm.public.CustomerData.where({ id: j.customerDataId }).all().first();
      if (cust) {
        const rel = await db.orm.public.Relationship.where({ id: cust.relationshipId }).all().first();
        if (rel) {
          const person = await db.orm.public.Person.where({ id: rel.personId }).all().first();
          if (person) customerName = `${person.firstName} ${person.lastName}`;
        }
      }
    }

    const service = j.serviceId ? await db.orm.public.ServiceCatalogItem.where({ id: j.serviceId }).all().first() : null;
    
    return {
      id: j.id,
      ref: j.id.split('-')[0].toUpperCase(),
      customer: customerName,
      service: service?.name || j.description || 'Custom Service',
      status: j.status,
      time: j.createdAt.toLocaleTimeString()
    };
  }));
}

export async function fetchMyServiceJobs() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || !session.user.personId) {
    return [];
  }

  const personId = session.user.personId;

  const relationships = await db.orm.public.Relationship.where({ personId, type: 'CUSTOMER' }).all();
  const relIds = relationships.map(r => r.id);
  
  if (relIds.length === 0) return [];

  const customers = await Promise.all(relIds.map(id => db.orm.public.CustomerData.where({ relationshipId: id }).all()));
  const custIds = customers.flat().map(c => c.id);

  if (custIds.length === 0) return [];

  const jobs = await Promise.all(custIds.map(id => db.orm.public.ServiceJob.where({ customerDataId: id }).all()));
  const flatJobs = jobs.flat().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return Promise.all(flatJobs.map(async (j) => {
    const org = await db.orm.public.Organization.where({ id: j.organizationId }).all().first();
    const service = j.serviceId ? await db.orm.public.ServiceCatalogItem.where({ id: j.serviceId }).all().first() : null;
    
    return {
      id: j.id,
      ref: j.id.split('-')[0].toUpperCase(),
      merchant: org?.name || 'CityOS Service Pro',
      service: service?.name || j.description || 'Custom Service',
      status: j.status,
      time: j.createdAt.toLocaleTimeString()
    };
  }));
}
