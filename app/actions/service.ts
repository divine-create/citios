'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/src/prisma/db';
import { revalidatePath } from 'next/cache';
import { ActivityItem } from '@/lib/activity';
import { notifyPerson, personIdForCustomerData } from '@/lib/notify';
import { resolveResidentCustomerIds } from '@/lib/resident-activity/compose';
import { formatWhatsAppNumber } from '@/lib/whatsapp';
import {
  getOrganizationReviews as libGetReviews,
  submitOrganizationReview as libSubmitReview,
  toggleOrganizationLike as libToggleLike,
  getOrganizationSocialData as libGetSocialData,
} from '@/lib/actions/service';

export async function getOrganizationReviews(organizationId: string) {
  return libGetReviews(organizationId);
}

export async function submitOrganizationReview(input: {
  organizationId: string;
  rating: number;
  body?: string;
}) {
  return libSubmitReview(input);
}

export async function toggleOrganizationLike(organizationId: string) {
  return libToggleLike(organizationId);
}

export async function getOrganizationSocialData(organizationId: string) {
  return libGetSocialData(organizationId);
}

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

  // Real event → resident notification (fire-and-forget, never blocks the request).
  await notifyPerson(personId, {
    type: 'SERVICE_REQUESTED',
    title: 'Service request sent',
    body: `Your request for "${service.name}" was received.`,
    href: '/tasks',
  });

  try {
    revalidatePath('/workspaces/serviceos');
  } catch {}
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
    appointment = await db.orm.public.ServiceAppointment.where({ id: appointment.id }).update({
      startTime: input.startTime,
      endTime: input.endTime,
      price: input.price,
    });
  }

  await db.orm.public.ServiceJob.where({ id: job.id }).update({
    status: 'SCHEDULED',
    scheduledDate: input.startTime
  });

  try {
    revalidatePath('/workspaces/serviceos');
  } catch {}
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
    await tx.orm.public.ServiceJob.where({ id: job.id }).update({ status: input.status });

    const appointment = await tx.orm.public.ServiceAppointment.where({ jobId: job.id }).all().first();
    if (appointment) {
      const apptStatus = input.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : input.status === 'COMPLETED' ? 'COMPLETED' : 'CANCELLED';
      await tx.orm.public.ServiceAppointment.where({ id: appointment.id }).update({ status: apptStatus });
    }
  });

  // Notify resident of status transition
  try {
    const residentPersonId = await personIdForCustomerData(job.customerDataId);
    if (residentPersonId) {
      const statusTitle =
        input.status === 'COMPLETED'
          ? 'Service Completed'
          : input.status === 'IN_PROGRESS'
          ? 'Technician In Progress'
          : 'Service Status Updated';
      const statusBody =
        input.status === 'COMPLETED'
          ? `Your service "${job.description || 'Service'}" has been marked completed by the provider.`
          : input.status === 'IN_PROGRESS'
          ? `Technician is currently working on your service "${job.description || 'Service'}".`
          : `Your service status was updated to ${input.status.toLowerCase()}.`;

      await notifyPerson(residentPersonId, {
        type: 'SERVICE_STATUS',
        title: statusTitle,
        body: statusBody,
        href: `/tasks/${job.id}`,
      });
    }
  } catch (err) {
    console.error('Error notifying resident on service status update:', err);
  }

  try {
    revalidatePath('/workspaces/serviceos');
    revalidatePath('/tasks');
    revalidatePath(`/tasks/${job.id}`);
  } catch {}
  return { success: true };
}



export async function getCityServiceItem(id: string) {
  const item = await db.orm.public.ServiceCatalogItem
    .where({ id, isActive: true })
    .include('organization', o => o.select('name'))
    .first();
  if (!item) return null;

  const orgId = item.organizationId;
  const contacts = await db.orm.public.OrganizationContactPoint.where({ organizationId: orgId }).all();
  let phone: string | null = null;
  let whatsapp: string | null = null;
  for (const cp of contacts) {
    if (cp.type === 'WHATSAPP' && cp.value) {
      whatsapp = formatWhatsAppNumber(cp.value);
    } else if (cp.type === 'PHONE' && cp.value) {
      phone = cp.value;
      if (!whatsapp) whatsapp = formatWhatsAppNumber(cp.value);
    }
  }

  const [reviews, likes, loc] = await Promise.all([
    db.orm.public.Review.where({ organizationId: orgId }).all(),
    db.orm.public.SavedItem.where({ entityType: 'service_org', entityId: orgId }).all(),
    db.orm.public.Location.where({ organizationId: orgId }).all().first(),
  ]);

  let currentPersonId: string | null = null;
  try {
    const session = await getServerSession(authOptions);
    currentPersonId = session?.user?.personId ?? null;
  } catch {}

  const totalReviews = reviews.length;
  const sumRatings = reviews.reduce((acc, r) => acc + r.rating, 0);
  const averageRating = totalReviews > 0 ? Number((sumRatings / totalReviews).toFixed(1)) : null;
  const userHasLiked = currentPersonId ? likes.some((l) => l.personId === currentPersonId) : false;

  return {
    ...item,
    phone,
    whatsapp,
    address: loc?.address || null,
    rating: averageRating,
    reviewCount: totalReviews,
    likesCount: likes.length,
    userHasLiked,
  };
}

export async function bookResidentService(input: {
  serviceId: string;
  date: string; // "YYYY-MM-DD"
  timeSlot: string; // "09:00", "11:00", etc.
  address?: string;
  notes?: string;
}) {
  if (!input.serviceId || !input.date || !input.timeSlot) {
    return {
      success: false,
      error: 'Service, date, and time slot are required.',
      message: 'Service, date, and time slot are required.',
    };
  }

  let session: any = null;
  try {
    session = await getServerSession(authOptions);
  } catch {
    session = null;
  }

  if (!session || !session.user || !session.user.personId) {
    return {
      success: false,
      requiresAuth: true,
      error: 'Please sign in to book an appointment.',
      message: 'Please sign in to book an appointment.',
    };
  }

  const personId = session.user.personId as string;

  const service = await db.orm.public.ServiceCatalogItem
    .where({ id: input.serviceId, isActive: true })
    .all()
    .first();

  if (!service) {
    return { success: false, error: 'NOT_FOUND', message: 'Service not found or inactive.' };
  }

  const orgId = service.organizationId;

  // Resolve customer relationship for this person & org
  let relationship = await db.orm.public.Relationship
    .where({ personId, organizationId: orgId, type: 'CUSTOMER' })
    .all()
    .first();

  if (!relationship) {
    relationship = await db.orm.public.Relationship.create({
      personId,
      organizationId: orgId,
      type: 'CUSTOMER',
    });
  }

  let customer = await db.orm.public.CustomerData
    .where({ relationshipId: relationship.id })
    .all()
    .first();

  if (!customer) {
    customer = await db.orm.public.CustomerData.create({
      relationshipId: relationship.id,
      loyaltyPoints: 0,
    });
  }

  // Construct start and end time
  const timeStr = input.timeSlot || '09:00';
  const startTime = new Date(`${input.date}T${timeStr}:00`);
  if (isNaN(startTime.getTime())) {
    return { success: false, error: 'INVALID_DATE', message: 'Please provide a valid booking date and time.' };
  }

  const durationMs = (service.durationMinutes || 60) * 60 * 1000;
  const endTime = new Date(startTime.getTime() + durationMs);

  function toInstant(date: Date) {
    if ((globalThis as any).Temporal?.Instant?.fromEpochMilliseconds) {
      return (globalThis as any).Temporal.Instant.fromEpochMilliseconds(date.getTime());
    }
    return date;
  }

  const result = await db.transaction(async (tx) => {
    const job = await tx.orm.public.ServiceJob.create({
      organizationId: orgId,
      customerDataId: customer.id,
      serviceId: service.id,
      description: service.name,
      address: input.address || null,
      scheduledDate: toInstant(startTime) as any,
      status: 'SCHEDULED',
      priority: 'NORMAL',
      notes: input.notes || null,
    });

    const appointment = await tx.orm.public.ServiceAppointment.create({
      organizationId: orgId,
      customerDataId: customer.id,
      serviceId: service.id,
      jobId: job.id,
      startTime: toInstant(startTime) as any,
      endTime: toInstant(endTime) as any,
      status: 'REQUESTED',
      price: service.price,
      notes: input.notes || null,
    });

    return { job, appointment };
  });

  // Notify resident (fire-and-forget)
  await notifyPerson(personId, {
    type: 'SERVICE_REQUESTED',
    title: 'Service Appointment Requested',
    body: `Your appointment for "${service.name}" on ${input.date} at ${input.timeSlot} was submitted to the provider.`,
    href: `/tasks/${result.job.id}`,
  });

  try {
    revalidatePath('/tasks');
    revalidatePath('/services');
    revalidatePath('/workspaces/serviceos');
  } catch {}

  return {
    success: true,
    jobId: result.job.id,
    appointmentId: result.appointment.id,
  };
}

function toSafeIsoString(val: any): string | null {
  if (!val) return null;
  if (typeof val === 'string') return val;
  if (typeof val.epochMilliseconds === 'number') {
    return new Date(val.epochMilliseconds).toISOString();
  }
  if (typeof val.getTime === 'function') {
    return val.toISOString();
  }
  return String(val);
}

export async function fetchMyResidentTasks() {
  let session: any = null;
  try {
    session = await getServerSession(authOptions);
  } catch {
    session = null;
  }

  if (!session || !session.user || !session.user.personId) {
    return { success: false, requiresAuth: true, tasks: [] };
  }

  const personId = session.user.personId as string;
  const customerIds = await resolveResidentCustomerIds(personId);
  if (customerIds.length === 0) {
    return { success: true, tasks: [] };
  }

  // Fetch jobs for resident
  const jobs = await db.orm.public.ServiceJob
    .where((j) => j.customerDataId.in(customerIds))
    .all();

  // Fetch appointments for resident
  const appointments = await db.orm.public.ServiceAppointment
    .where((a) => a.customerDataId.in(customerIds))
    .all();

  const appointmentByJobId = new Map(
    appointments.filter((a) => a.jobId).map((a) => [a.jobId as string, a])
  );

  // Resolve unique organization IDs
  const orgIds = Array.from(new Set([
    ...jobs.map((j) => j.organizationId),
    ...appointments.map((a) => a.organizationId),
  ]));
  const orgMap = new Map<string, any>();
  for (const oid of orgIds) {
    const org = await db.orm.public.Organization.where({ id: oid }).all().first();
    if (org) orgMap.set(oid, org);
  }

  // Resolve unique service IDs
  const serviceIds = Array.from(new Set([
    ...jobs.map((j) => j.serviceId).filter(Boolean) as string[],
    ...appointments.map((a) => a.serviceId).filter(Boolean) as string[],
  ]));
  const serviceMap = new Map<string, any>();
  for (const sid of serviceIds) {
    const s = await db.orm.public.ServiceCatalogItem.where({ id: sid }).all().first();
    if (s) serviceMap.set(sid, s);
  }

  const tasks = jobs.map((job) => {
    const appt = appointmentByJobId.get(job.id);
    const org = orgMap.get(job.organizationId);
    const srv = job.serviceId
      ? serviceMap.get(job.serviceId)
      : (appt?.serviceId ? serviceMap.get(appt.serviceId) : null);

    return {
      id: job.id,
      jobId: job.id,
      appointmentId: appt?.id || null,
      title: srv?.name || job.description || 'Service Task',
      status: appt?.status || job.status || 'SCHEDULED',
      jobStatus: job.status,
      appointmentStatus: appt?.status || 'REQUESTED',
      scheduledDate: toSafeIsoString(job.scheduledDate || appt?.startTime),
      startTime: toSafeIsoString(appt?.startTime || job.scheduledDate),
      endTime: toSafeIsoString(appt?.endTime),
      address: job.address || null,
      notes: job.notes || appt?.notes || null,
      price: appt?.price || srv?.price || 0,
      createdAt: toSafeIsoString(job.createdAt) || new Date().toISOString(),
      organization: org ? {
        id: org.id,
        name: org.name,
        slug: (org as any).slug || org.id,
        phone: (org as any).phone || null,
      } : null,
      service: srv ? {
        id: srv.id,
        name: srv.name,
        description: srv.description,
        price: srv.price,
        durationMinutes: srv.durationMinutes,
      } : null,
    };
  });

  // Sort by createdAt descending
  tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return { success: true, tasks };
}

export async function fetchResidentTaskDetail(id: string) {
  let session: any = null;
  try {
    session = await getServerSession(authOptions);
  } catch {
    session = null;
  }

  if (!session || !session.user || !session.user.personId) {
    return { success: false, requiresAuth: true, task: null, error: 'Unauthorized' };
  }

  const personId = session.user.personId as string;
  const customerIds = await resolveResidentCustomerIds(personId);

  // Look for job matching id
  let job = await db.orm.public.ServiceJob.where({ id }).all().first();
  let appointment = null;

  if (job) {
    appointment = await db.orm.public.ServiceAppointment.where({ jobId: job.id }).all().first();
  } else {
    // Maybe id was an appointment id
    appointment = await db.orm.public.ServiceAppointment.where({ id }).all().first();
    if (appointment?.jobId) {
      job = await db.orm.public.ServiceJob.where({ id: appointment.jobId }).all().first();
    }
  }

  if (!job && !appointment) {
    return { success: false, task: null, error: 'Task not found' };
  }

  // Security check: Must belong to one of customerIds
  const recordCustId = job?.customerDataId || appointment?.customerDataId;
  if (!recordCustId || !customerIds.includes(recordCustId)) {
    return { success: false, task: null, error: 'Access denied: not your task' };
  }

  const orgId = job?.organizationId || appointment?.organizationId;
  const org = orgId ? await db.orm.public.Organization.where({ id: orgId }).all().first() : null;

  const srvId = job?.serviceId || appointment?.serviceId;
  const srv = srvId ? await db.orm.public.ServiceCatalogItem.where({ id: srvId }).all().first() : null;

  const task = {
    id: job?.id || appointment?.id,
    jobId: job?.id || null,
    appointmentId: appointment?.id || null,
    title: srv?.name || job?.description || 'Service Task',
    status: appointment?.status || job?.status || 'SCHEDULED',
    jobStatus: job?.status || 'SCHEDULED',
    appointmentStatus: appointment?.status || 'REQUESTED',
    scheduledDate: toSafeIsoString(job?.scheduledDate || appointment?.startTime),
    startTime: toSafeIsoString(appointment?.startTime || job?.scheduledDate),
    endTime: toSafeIsoString(appointment?.endTime),
    address: job?.address || null,
    notes: job?.notes || appointment?.notes || null,
    price: appointment?.price || srv?.price || 0,
    createdAt: toSafeIsoString(job?.createdAt || appointment?.createdAt) || new Date().toISOString(),
    organization: org ? {
      id: org.id,
      name: org.name,
      slug: (org as any).slug || org.id,
      phone: (org as any).phone || null,
    } : null,
    service: srv ? {
      id: srv.id,
      name: srv.name,
      description: srv.description,
      price: srv.price,
      durationMinutes: srv.durationMinutes,
    } : null,
  };

  return { success: true, task };
}

export async function cancelResidentTask(id: string, reason?: string) {
  let session: any = null;
  try {
    session = await getServerSession(authOptions);
  } catch {
    session = null;
  }

  if (!session || !session.user || !session.user.personId) {
    return { success: false, requiresAuth: true, error: 'Unauthorized' };
  }

  const personId = session.user.personId as string;
  const customerIds = await resolveResidentCustomerIds(personId);

  let job = await db.orm.public.ServiceJob.where({ id }).all().first();
  let appointment = null;

  if (job) {
    appointment = await db.orm.public.ServiceAppointment.where({ jobId: job.id }).all().first();
  } else {
    appointment = await db.orm.public.ServiceAppointment.where({ id }).all().first();
    if (appointment?.jobId) {
      job = await db.orm.public.ServiceJob.where({ id: appointment.jobId }).all().first();
    }
  }

  if (!job && !appointment) {
    return { success: false, error: 'Task not found' };
  }

  const recordCustId = job?.customerDataId || appointment?.customerDataId;
  if (!recordCustId || !customerIds.includes(recordCustId)) {
    return { success: false, error: 'Access denied' };
  }

  const currentStatus = appointment?.status || job?.status;
  if (currentStatus === 'COMPLETED' || currentStatus === 'CANCELLED') {
    return { success: false, error: `Cannot cancel task with status: ${currentStatus}` };
  }

  await db.transaction(async (tx) => {
    if (job) {
      await tx.orm.public.ServiceJob.where({ id: job.id }).update({
        status: 'CANCELLED',
        notes: reason ? `${job.notes ? job.notes + ' | ' : ''}Cancelled by resident: ${reason}` : job.notes,
      });
    }
    if (appointment) {
      await tx.orm.public.ServiceAppointment.where({ id: appointment.id }).update({
        status: 'CANCELLED',
      });
    }
  });

  try {
    revalidatePath('/tasks');
    if (job) revalidatePath(`/tasks/${job.id}`);
    if (appointment) revalidatePath(`/tasks/${appointment.id}`);
  } catch {}

  return { success: true };
}



