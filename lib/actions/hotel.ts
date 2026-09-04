'use server'

import { db } from '@/src/prisma/db'

export async function getHotelAdminData() {
  try {
    // Find the hotel organization (we only have one right now for mock purposes)
    const hotel = await db.orm.public.Organization.where({ type: 'HOTEL' }).all().first();

    if (!hotel) return null;

    // In Prisma v8 we sort manually since orderBy is not on the find object in the same way
    const allRooms = await db.orm.public.HotelRoom.where({ organizationId: hotel.id }).all();
    const rooms = allRooms.sort((a, b) => a.roomNumber.localeCompare(b.roomNumber));

    const reservations = await db.orm.public.Reservation.where({ organizationId: hotel.id }).all();

    return JSON.parse(JSON.stringify({
      hotel,
      rooms,
      reservations
    }));
  } catch (error) {
    console.error('Error fetching hotel data:', error);
    return null;
  }
}
