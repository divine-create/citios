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
