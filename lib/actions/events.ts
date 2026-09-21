
'use server'

import { db } from '@/src/prisma/db'

export async function getEventsAdminData() {
  try {
    const org = await db.orm.public.Organization.where({ type: 'EVENT_ORGANIZER' }).all().first();

    if (!org) return null;

    const events = await db.orm.public.Event.where({ organizationId: org.id }).all();
    const eventIds = events.map(e => e.id);
    
    const tickets = await db.orm.public.Ticket.all(); // Need to filter by eventIds manually since 'in' might not be fully mapped
    const eventTickets = tickets.filter(t => eventIds.includes(t.eventId));
    
    // @ts-ignore
    const ticketTiers = await db.orm.public.EventTicketTier.all();
    const eventTiers = ticketTiers.filter(t => eventIds.includes(t.eventId));

    const persons = await db.orm.public.Person.all(); 
    
    const rentals = await db.orm.public.RentalResource.where({ organizationId: org.id }).all();
    const bookings = await db.orm.public.Booking.all(); 

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
    const tier = await db.orm.public.EventTicketTier.create(input);
    return JSON.parse(JSON.stringify({ success: true, tier }));
  } catch (error: any) {
    console.error('Error creating ticket tier:', error);
    return { error: error.message };
  }
}

export async function updateTicketStatus(ticketId: string, status: 'VALID' | 'SCANNED' | 'REFUNDED') {
  try {
    await db.orm.public.Ticket.where({ id: ticketId }).update({ status });
    return { success: true };
  } catch (error: any) {
    console.error('Error updating ticket status:', error);
    return { error: error.message };
  }
}

