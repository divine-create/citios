
'use server'

import { db } from '@/src/prisma/db'

export async function getEventsAdminData() {
  try {
    const org = await db.orm.public.Organization.where({ type: 'EVENT_ORGANIZER' }).all().first();

    if (!org) return null;

    const events = await db.orm.public.Event.where({ organizationId: org.id }).all();
    const tickets = await db.orm.public.Ticket.all(); // Assuming all tickets for now
    const rentals = await db.orm.public.RentalResource.where({ organizationId: org.id }).all();
    const bookings = await db.orm.public.Booking.all(); // Assuming all bookings

    // Stitch
    const eventsWithTickets = events.map(e => ({
        ...e,
        tickets: tickets.filter(t => t.eventId === e.id)
    }));

    const rentalsWithBookings = rentals.map(r => ({
        ...r,
        bookings: bookings.filter(b => b.resourceId === r.id)
    }));

    return JSON.parse(JSON.stringify({
      organization: org,
      events: eventsWithTickets,
      rentals: rentalsWithBookings
    }));
  } catch (error) {
    console.error('Error fetching events data:', error);
    return null;
  }
}

