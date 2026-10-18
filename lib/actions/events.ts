'use server'

import { db } from '@/src/prisma/db';
import { requireMembership } from '@/lib/actions/tenant';

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

export async function createOrgEvent(input: {
  organizationId: string;
  title: string;
  description?: string;
  location: string;
  date: string;
  capacity?: number;
  price?: number;
  imageUrl?: string;
  eventUrl?: string;
}) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    const title = (input.title || '').trim();
    const location = (input.location || '').trim();
    if (!title || !location || !input.date) {
      return { error: 'Title, location, and date are required.' };
    }

    const parsedDate = new Date(input.date);
    if (isNaN(parsedDate.getTime())) {
      return { error: 'Invalid event date.' };
    }

    let fullDescription = (input.description || '').trim();
    if (input.eventUrl?.trim()) {
      fullDescription += `\nEVENT_URL: ${input.eventUrl.trim()}`;
    }
    if (input.imageUrl?.trim()) {
      fullDescription += `\nIMAGE_URL: ${input.imageUrl.trim()}`;
    }

    const temporalDate = (globalThis as any).Temporal.Instant.fromEpochMilliseconds(parsedDate.getTime());

    const created = await db.orm.public.Event.create({
      organizationId: input.organizationId,
      title,
      description: fullDescription.trim() || null,
      location,
      date: temporalDate,
      capacity: Math.max(1, Number(input.capacity) || 100),
      price: Math.max(0, Number(input.price) || 0),
    });

    try {
      const { revalidatePath } = await import('next/cache');
      revalidatePath('/events');
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
    console.error('Error creating event:', error);
    return { error: error?.message || 'Failed to create event.' };
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
