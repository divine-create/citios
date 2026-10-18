'use server'

import { db } from '@/src/prisma/db';
import { requireMembership } from '@/lib/actions/tenant';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCurrentCity, getCityBySlug } from '@/lib/city';
import { parseEventDescription } from '@/lib/event-utils';

export async function getEventsAdminData(organizationId: string) {
  try {
    await requireMembership(organizationId);
    const org = await db.orm.public.Organization.where({ id: organizationId }).all().first();

    if (!org) return null;

    const events = await db.orm.public.Event.where({ organizationId: org.id }).all();
    const eventIds = events.map(e => e.id);
    
    const tickets = eventIds.length > 0 ? await db.orm.public.Ticket.where(t => t.eventId.in(eventIds)).all() : [];
    const eventTickets = tickets;
    
    const ticketTiers = eventIds.length > 0 ? await db.orm.public.EventTicketTier.where(t => t.eventId.in(eventIds)).all() : [];
    const eventTiers = ticketTiers;

    const ticketPersonIds = tickets.map(t => t.personId).filter(Boolean);
    const persons = ticketPersonIds.length > 0 ? await db.orm.public.Person.where(p => p.id.in(ticketPersonIds)).all() : []; 
    
    const rentals = await db.orm.public.RentalResource.where({ organizationId: org.id }).all();
    const rentalIds = rentals.map(r => r.id);
    const bookings = rentalIds.length > 0 ? await db.orm.public.Booking.where(b => b.resourceId.in(rentalIds)).all() : []; 

    // Stitch
    const eventsWithTickets = events.map(e => ({
        ...e,
        tickets: eventTickets.filter(t => t.eventId === e.id),
        ticketTiers: eventTiers.filter(t => t.eventId === e.id)
    }));

    const rentalsWithBookings = rentals.map(r => ({
        ...r,
        bookings: bookings.filter(b => b.resourceId === r.id)
    }));

    return JSON.parse(JSON.stringify({
      organization: org,
      events: eventsWithTickets,
      rentals: rentalsWithBookings,
      persons
    }));
} catch (error) {
    console.error('Error fetching events data:', error);
    return null;
  }
}

export async function createTicketTier(input: { eventId: string; name: string; price: number; capacity: number }) {
  try {
    const event = await db.orm.public.Event.where({ id: input.eventId }).all().first();
    if (!event) throw new Error('Event not found');
    await requireMembership(event.organizationId);

    const tier = await db.orm.public.EventTicketTier.create(input);
    return JSON.parse(JSON.stringify({ success: true, tier }));
  } catch (error: any) {
    console.error('Error creating ticket tier:', error);
    return { error: error.message };
  }
}

export async function updateTicketStatus(ticketId: string, status: 'VALID' | 'SCANNED' | 'REFUNDED') {
  try {
    const ticket = await db.orm.public.Ticket.where({ id: ticketId }).all().first();
    if (!ticket) throw new Error('Ticket not found');
    const event = await db.orm.public.Event.where({ id: ticket.eventId }).all().first();
    if (!event) throw new Error('Event not found');
    await requireMembership(event.organizationId);

    await db.orm.public.Ticket.where({ id: ticketId }).update({ status });
    return { success: true };
  } catch (error: any) {
    console.error('Error updating ticket status:', error);
    return { error: error.message };
  }
}

export async function createUniversalEvent(input: {
  hostType?: 'PERSONAL' | 'ORGANIZATION';
  organizationId?: string;
  title: string;
  category?: string;
  description?: string;
  location: string;
  date: string;
  capacity?: number;
  price?: number;
  imageUrl?: string;
  eventUrl?: string;
  shareToFeed?: boolean;
  citySlug?: string;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.personId) {
      return { error: 'Please sign in to create an event.' };
    }
    const personId = session.user.personId;

    const title = (input.title || '').trim();
    const location = (input.location || '').trim();
    if (!title || !location || !input.date) {
      return { error: 'Event title, venue location, and date/time are required.' };
    }

    const parsedDate = new Date(input.date);
    if (isNaN(parsedDate.getTime())) {
      return { error: 'Please enter a valid event date and time.' };
    }

    const isBusinessHost = input.hostType === 'ORGANIZATION' || Boolean(input.organizationId);
    let targetOrgId = input.organizationId || '';
    let hostNameForPersonal: string | null = null;

    const targetCity = input.citySlug
      ? (await getCityBySlug(input.citySlug)) || (await getCurrentCity())
      : await getCurrentCity();

    if (isBusinessHost && targetOrgId) {
      await requireMembership(targetOrgId, ['OWNER', 'ADMIN', 'MANAGER']);
      if (targetCity) {
        const existingLocs = await db.orm.public.Location.where({ organizationId: targetOrgId }).all();
        const hasCityLoc = existingLocs.some((l: any) => l.cityId === targetCity.id);
        if (!hasCityLoc) {
          if (existingLocs.length > 0 && !existingLocs[0].cityId) {
            await db.orm.public.Location.where({ id: existingLocs[0].id }).update({ cityId: targetCity.id });
          } else if (existingLocs.length === 0) {
            const orgRow = await db.orm.public.Organization.where({ id: targetOrgId }).first();
            await db.orm.public.Location.create({
              organizationId: targetOrgId,
              name: `${orgRow?.name || 'Main'} - Main Branch`,
              address: orgRow?.address || location,
              cityId: targetCity.id,
            });
          }
        }
      }
    } else {
      // Individual resident hosting an event directly without needing a business page
      const person = await db.orm.public.Person.where({ id: personId }).first();
      hostNameForPersonal = person
        ? `${person.firstName || ''} ${person.lastName || ''}`.trim() || session.user.name || 'Community Resident'
        : session.user.name || 'Community Resident';

      const hubOrgName = targetCity ? `${targetCity.name} Community Events` : 'City Community Events';
      const allEventOrgs = await db.orm.public.Organization.where({ name: hubOrgName }).all();
      let hubOrg = allEventOrgs[0] || null;

      if (!hubOrg) {
        hubOrg = await db.orm.public.Organization.create({
          name: hubOrgName,
          type: 'EVENT_ORGANIZER',
          description: `Community-hosted events in ${targetCity?.name || 'the city'}.`,
          address: targetCity?.name || location,
          status: 'ACTIVE',
        });
      }

      if (targetCity) {
        const hubLocs = await db.orm.public.Location.where({ organizationId: hubOrg.id }).all();
        if (!hubLocs.some((l: any) => l.cityId === targetCity.id)) {
          await db.orm.public.Location.create({
            organizationId: hubOrg.id,
            name: hubOrgName,
            address: targetCity.name,
            cityId: targetCity.id,
          });
        }
      }

      targetOrgId = hubOrg.id;
    }

    const cleanSummary = (input.description || '').trim();
    const metaLines: string[] = [];
    if (input.category?.trim()) {
      metaLines.push(`EVENT_CATEGORY: ${input.category.trim()}`);
    }
    if (!isBusinessHost && hostNameForPersonal) {
      metaLines.push(`HOST_PERSON_ID: ${personId}`);
      metaLines.push(`HOST_NAME: ${hostNameForPersonal}`);
    }
    if (input.eventUrl?.trim()) {
      const normalizedUrl = /^https?:\/\//i.test(input.eventUrl.trim())
        ? input.eventUrl.trim()
        : `https://${input.eventUrl.trim()}`;
      metaLines.push(`EVENT_URL: ${normalizedUrl}`);
    }
    if (input.imageUrl?.trim()) {
      metaLines.push(`IMAGE_URL: ${input.imageUrl.trim()}`);
    }

    const fullDescription = [cleanSummary, ...metaLines].filter(Boolean).join('\n');
    const temporalDate = (globalThis as any).Temporal.Instant.fromEpochMilliseconds(parsedDate.getTime());
    const priceValue = Math.max(0, Number(input.price) || 0);
    const capacityValue = Math.max(1, Number(input.capacity) || 200);

    const created = await db.transaction(async (tx) => {
      const ev = await tx.orm.public.Event.create({
        organizationId: targetOrgId,
        title,
        description: fullDescription || null,
        location,
        date: temporalDate,
        capacity: capacityValue,
        price: priceValue,
      });

      if (input.shareToFeed !== false) {
        const feedContent = cleanSummary
          ? `${cleanSummary}\n\n📍 ${location}`
          : `Join us for ${title} at ${location}!`;

        await tx.orm.public.Post.create({
          title,
          content: feedContent,
          category: 'Event',
          status: 'PUBLISHED',
          isEmergency: false,
          imageUrl: input.imageUrl?.trim() || null,
          eventDate: temporalDate,
          location,
          price: priceValue,
          personId,
          organizationId: isBusinessHost ? targetOrgId : null,
          linkedEntityType: 'EVENT',
          linkedEntityId: ev.id,
        });
      }

      return ev;
    });

    try {
      const { revalidatePath } = await import('next/cache');
      revalidatePath('/events');
      revalidatePath(`/events/${created.id}`);
      revalidatePath('/feed');
      revalidatePath('/create');
      revalidatePath('/admin/events');
    } catch {}

    return JSON.parse(JSON.stringify({
      success: true,
      event: {
        ...created,
        date: created.date ? created.date.toString() : parsedDate.toISOString(),
        tickets: [],
        ticketTiers: [],
      },
    }));
  } catch (error: any) {
    console.error('Error creating universal event:', error);
    return { error: error?.message || 'Failed to create event.' };
  }
}

export async function createOrgEvent(input: {
  organizationId: string;
  title: string;
  category?: string;
  description?: string;
  location: string;
  date: string;
  capacity?: number;
  price?: number;
  imageUrl?: string;
  eventUrl?: string;
  shareToFeed?: boolean;
}) {
  return createUniversalEvent({
    ...input,
    hostType: 'ORGANIZATION',
  });
}

export async function deleteUniversalEvent(eventId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.personId) {
      return { error: 'Unauthorized' };
    }
    const personId = session.user.personId;

    const event = await db.orm.public.Event.where({ id: eventId }).first();
    if (!event) {
      return { error: 'Event not found.' };
    }

    const parsed = parseEventDescription(event.description);
    if (parsed.hostPersonId) {
      if (parsed.hostPersonId !== personId && !(session.user as any).isSystemAdmin) {
        return { error: 'Only the host can delete this event.' };
      }
    } else {
      await requireMembership(event.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    }

    await db.transaction(async (tx) => {
      const linkedPosts = await tx.orm.public.Post.where({
        linkedEntityType: 'EVENT',
        linkedEntityId: eventId,
      }).all();
      for (const p of linkedPosts) {
        await tx.orm.public.Post.where({ id: p.id }).delete();
      }
      await tx.orm.public.Event.where({ id: eventId }).delete();
    });

    try {
      const { revalidatePath } = await import('next/cache');
      revalidatePath('/events');
      revalidatePath('/feed');
      revalidatePath('/create');
    } catch {}

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting event:', error);
    return { error: error?.message || 'Failed to delete event.' };
  }
}

export async function createRentalResource(input: {
  organizationId: string;
  name: string;
  description?: string;
  type: string;
  pricePerDay: number;
}) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    const name = (input.name || '').trim();
    if (!name) {
      return { error: 'Resource name is required.' };
    }

    const resource = await db.orm.public.RentalResource.create({
      organizationId: input.organizationId,
      name,
      description: (input.description || '').trim() || null,
      type: input.type || 'VENUE',
      pricePerDay: Math.max(0, Number(input.pricePerDay) || 0),
    });

    try {
      const { revalidatePath } = await import('next/cache');
      revalidatePath('/admin/events');
    } catch {}

    return JSON.parse(JSON.stringify({
      success: true,
      rental: {
        ...resource,
        bookings: [],
      },
    }));
  } catch (error: any) {
    console.error('Error creating rental resource:', error);
    return { error: error?.message || 'Failed to create rental resource.' };
  }
}

