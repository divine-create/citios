'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/src/prisma/db';
import { revalidatePath } from 'next/cache';
import { ActivityItem } from '@/lib/demo/cityos';

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

export async function fetchMyServiceJobs(): Promise<ActivityItem[]> {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || !session.user.personId) {
    return [];
  }

  const personId = session.user.personId as string;

  const relationships = await db.orm.public.Relationship.where({ personId, type: 'CUSTOMER' }).all();
  const relIds = relationships.map(r => r.id);
  
  if (relIds.length === 0) return [];

  const customers = await Promise.all(relIds.map(id => db.orm.public.CustomerData.where({ relationshipId: id }).all()));
  const custIds = customers.flat().map(c => c.id);

  if (custIds.length === 0) return [];

  const jobs = await Promise.all(custIds.map(id => db.orm.public.ServiceJob.where({ customerDataId: id }).all()));
  const flatJobs = jobs.flat().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const activityItems = await Promise.all(flatJobs.map(async (j) => {
    const org = await db.orm.public.Organization.where({ id: j.organizationId }).all().first();
    const service = j.serviceId ? await db.orm.public.ServiceCatalogItem.where({ id: j.serviceId }).all().first() : null;
    
    const ref = j.id.split('-')[0].toUpperCase();
    const merchant = org?.name || 'CityOS Service Pro';
    const srvName = service?.name || j.description || 'Custom Service';

    return {
      id: j.id,
      kind: 'service' as const,
      title: `Service Request: ${ref}`,
      body: `Requested ${srvName} from ${merchant}. Status: ${j.status}`,
      time: j.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      href: `/tasks/${j.id}`
    };
  }));

  return activityItems;
}

export async function acceptAndScheduleServiceJob(input: {
  jobId: string;
  startTime: Date;
  endTime: Date;
  price: number;
}) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || !session.user.personId) {
    throw new Error('Unauthorized');
  }

  const job = await db.orm.public.ServiceJob.where({ id: input.jobId }).all().first();
  if (!job) throw new Error('Job not found');

  const orgId = job.organizationId;
  const isMember = session.user.memberships?.some((m: any) => m.organizationId === orgId);
  if (!isMember) {
    throw new Error('Unauthorized: Not a member of this organization');
  }

  if (job.status !== 'NEW' && job.status !== 'SCHEDULED') {
    throw new Error('Job is not in a schedulable state');
  }

  let appointment = await db.orm.public.ServiceAppointment.where({ jobId: job.id }).all().first();
  if (!appointment) {
    appointment = await db.orm.public.ServiceAppointment.create({
      organizationId: orgId,
      customerDataId: job.customerDataId,
      serviceId: job.serviceId!,
      jobId: job.id,
      startTime: input.startTime,
      endTime: input.endTime,
      status: 'CONFIRMED',
      price: input.price,
    });
  } else {
    appointment = await db.orm.public.ServiceAppointment.update({
      where: { id: appointment.id },
      data: {
        startTime: input.startTime,
        endTime: input.endTime,
        price: input.price,
      }
    });
  }

  await db.orm.public.ServiceJob.update({
    where: { id: job.id },
    data: {
      status: 'SCHEDULED',
      scheduledDate: input.startTime
    }
  });

  revalidatePath('/workspaces/serviceos');
  return { success: true };
}

export async function updateServiceJobLifecycle(input: {
  jobId: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
}) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || !session.user.personId) {
    throw new Error('Unauthorized');
  }

  const job = await db.orm.public.ServiceJob.where({ id: input.jobId }).all().first();
  if (!job) throw new Error('Job not found');

  const orgId = job.organizationId;
  const isMember = session.user.memberships?.some((m: any) => m.organizationId === orgId);
  if (!isMember) {
    throw new Error('Unauthorized: Not a member of this organization');
  }

  await db.transaction(async (tx) => {
    await tx.orm.public.ServiceJob.update({
      where: { id: job.id },
      data: { status: input.status }
    });

    const appointment = await tx.orm.public.ServiceAppointment.where({ jobId: job.id }).all().first();
    if (appointment) {
      const apptStatus = input.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : input.status === 'COMPLETED' ? 'COMPLETED' : 'CANCELLED';
      await tx.orm.public.ServiceAppointment.update({
        where: { id: appointment.id },
        data: { status: apptStatus }
      });
    }
  });

  revalidatePath('/workspaces/serviceos');
  return { success: true };
}

