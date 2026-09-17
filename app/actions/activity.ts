'use server';

import { db } from '@/src/prisma/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function fetchResidentActivity() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.personId) return [];

  const personId = session.user.personId;

  const activities = [];

  // 1. Service Jobs & Retail Orders (via Relationship -> CustomerData)
  const relationships = await db.orm.public.Relationship.where({ personId }).all();
  for (const rel of relationships) {
    const cust = await db.orm.public.CustomerData.where({ relationshipId: rel.id }).first();
    if (!cust) continue;

    const jobs = await db.orm.public.ServiceJob.where({ customerDataId: cust.id }).include('organization', o => o.select('name')).all();
    for (const job of jobs) {
      activities.push({
        id: job.id,
        kind: 'service_booked',
        title: `Service Booked: ${job.description || 'Service'}`,
        desc: `with ${job.organization?.name || 'Organization'}`,
        date: typeof job.createdAt === 'string' ? new Date(job.createdAt).toISOString() : job.createdAt.toString(),
        href: `/services/${job.id}`,
      });
    }

    const retailOrders = await db.orm.public.RetailOrder.where({ customerDataId: cust.id }).include('organization', o => o.select('name')).all();
    for (const order of retailOrders) {
      activities.push({
        id: order.id,
        kind: 'shop_order',
        title: `Order Placed`,
        desc: `from ${order.organization?.name || 'Organization'}`,
        date: typeof order.createdAt === 'string' ? new Date(order.createdAt).toISOString() : order.createdAt.toString(),
        href: `/cart/orders/${order.id}`,
      });
    }
  }

  // 3. Jobs Applied
  const jobApps = await db.orm.public.JobApplication.where({ personId }).include('job', j => j.select('title', 'organizationId')).all();
  for (const app of jobApps) {
    activities.push({
      id: app.id,
      kind: 'job_apply',
      title: `Applied for ${app.job?.title || 'Job'}`,
      desc: `Status: ${app.status}`,
      date: typeof app.createdAt === 'string' ? new Date(app.createdAt).toISOString() : app.createdAt.toString(),
      href: `/jobs/${app.jobId}`,
    });
  }

  // 4. Events Registered
  const eventRegs = await db.orm.public.EventRegistration.where({ personId }).include('event', e => e.select('title')).all();
  for (const reg of eventRegs) {
    activities.push({
      id: reg.id,
      kind: 'event_rsvp',
      title: `Registered for ${reg.event?.title || 'Event'}`,
      desc: `Status: ${reg.status}`,
      date: typeof reg.createdAt === 'string' ? new Date(reg.createdAt).toISOString() : reg.createdAt.toString(),
      href: `/events/${reg.eventId}`,
    });
  }

  
  // 5. Saved Items
  const savedItems = await db.orm.public.SavedItem.where({ personId }).all();
  for (const saved of savedItems) {
    let title = 'Saved Item';
    let href = '#';
    if (saved.entityType === 'biz') href = `/org/${saved.entityId}`;
    if (saved.entityType === 'job') href = `/jobs/${saved.entityId}`;
    if (saved.entityType === 'event') href = `/events/${saved.entityId}`;
    if (saved.entityType === 'product') href = `/product/${saved.entityId}`;
    if (saved.entityType === 'place') href = `/map`;

    activities.push({
      id: saved.id,
      kind: 'saved_item',
      title: `Saved a ${saved.entityType}`,
      desc: `Saved to your profile`,
      date: typeof saved.createdAt === 'string' ? new Date(saved.createdAt).toISOString() : saved.createdAt.toString(),
      href,
    });
  }

  // Sort by date desc

  activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return activities;
}
