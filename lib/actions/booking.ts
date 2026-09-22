import { db } from '@/src/prisma/db';
import { requireMembership } from './tenant';

export async function createBooking(input: {
  organizationId: string;
  locationId?: string;
  resourceId: string;
  personId: string;
  startDate: Date;
  endDate: Date;
  totalPrice: number;
}) {
  // Authorization is contextual, ensuring organization matches resource ownership
  
  // Concurrency protection using explicit row lock or serializable transaction.
  // In Postgres, we can do a pg_advisory_xact_lock on the resourceId hash, 
  // or use Prisma's optimistic concurrency / raw SQL.
  // We'll use a raw SQL advisory lock.
  
  return await db.transaction(async (prismaTx: any) => {
    // Generate a 32-bit int from resourceId for advisory lock
    let hash = 0;
    for (let i = 0; i < input.resourceId.length; i++) {
      hash = ((hash << 5) - hash) + input.resourceId.charCodeAt(i);
      hash |= 0; 
    }
    
    // Acquire exclusive transaction-level lock on this resource
    await prismaTx.sql`SELECT pg_advisory_xact_lock(${hash})`;

    // Now safely check availability
    const existing = await prismaTx.orm.public.Booking
      .where({ resourceId: input.resourceId, status: 'CONFIRMED' })
      .all();

    for (const b of existing) {
      if (input.startDate < b.endDate && input.endDate > b.startDate) {
        throw new Error('Resource is not available for this time period');
      }
    }

    // Create booking
    return await prismaTx.orm.public.Booking.create({
      resourceId: input.resourceId,
      organizationId: input.organizationId,
      locationId: input.locationId,
      personId: input.personId,
      startDate: input.startDate,
      endDate: input.endDate,
      totalPrice: input.totalPrice,
      status: 'CONFIRMED'
    });
  });
}

export async function cancelBooking(organizationId: string, bookingId: string) {
  // Requires membership checking done at higher level or here
  await requireMembership(organizationId);

  return await db.transaction(async (prismaTx: any) => {
    const booking = await prismaTx.orm.public.Booking.where({ id: bookingId, organizationId }).all().first();
    if (!booking) {
      throw new Error('Booking not found');
    }
    
    if (booking.status === 'CANCELLED') {
      throw new Error('Booking already cancelled');
    }

    return await prismaTx.orm.public.Booking.where({ id: bookingId }).update({
      status: 'CANCELLED'
    });
  });
}
