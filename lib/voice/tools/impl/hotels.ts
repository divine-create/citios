import { VoiceToolDefinition } from '../../core/policy';
import { getResidentCitySlug } from './discovery';

export const checkRoomAvailability: VoiceToolDefinition = {
  name: 'hotels.search', aliases: ['check_room_availability'],
  description: 'Check hotel room availability and rates for a specific hotel.',
  domain: 'commerce',
  riskLevel: 'read',
  requiresConfirmation: false,
  requiresAuthentication: false,
  orchestrationEligible: true,
  inputSchema: {
    type: "object",
    properties: {
      hotelName: { type: "string", description: "The name of the hotel to check." }
    },
    required: ["hotelName"]
  },
  execute: async (args, session) => {
    const { db } = await import('@/src/prisma/db');
    const citySlug = await getResidentCitySlug(session);
    
    const allOrgs = await db.orm.public.Organization.where({ type: 'HOTEL' }).all();
    let hotelId: string | null = null;
    let hotelName: string | null = null;
    
    for (const org of allOrgs) {
      if (org.name.toLowerCase().includes(args.hotelName.toLowerCase())) {
        hotelId = org.id;
        hotelName = org.name;
        break;
      }
    }
    
    if (!hotelId) {
      return { ok: false, error: { code: 'NOT_FOUND', message: `Could not find a hotel matching '${args.hotelName}'.` } };
    }
    
    const rooms = await db.orm.public.HotelRoom.where({ organizationId: hotelId }).all();
    if (rooms.length === 0) {
       return { ok: true, data: { hotel: hotelName, message: 'No rooms configured for this hotel.' } };
    }
    
    const roomStats: Record<string, { count: number; available: number; rate: number }> = {};
    for (const r of rooms) {
      if (!roomStats[r.type]) {
        roomStats[r.type] = { count: 0, available: 0, rate: r.baseRate };
      }
      roomStats[r.type].count++;
      if (r.status === 'CLEAN') {
        roomStats[r.type].available++;
      }
    }
    
    const types = Object.keys(roomStats).map(t => ({
      type: t,
      totalRooms: roomStats[t].count,
      availableRooms: roomStats[t].available,
      baseRate: roomStats[t].rate
    }));
    
    return { ok: true, data: { hotel: hotelName, roomTypes: types } };
  }
};

export const bookHotelRoom: VoiceToolDefinition = {
  name: 'hotels.book', aliases: ['book_hotel_room'],
  description: 'Book a hotel room.',
  domain: 'commerce',
  riskLevel: 'irreversible',
  requiresConfirmation: true,
  requiresAuthentication: true,
  orchestrationEligible: true,
  inputSchema: {
    type: "object",
    properties: {
      hotelName: { type: "string", description: "The name of the hotel." },
      roomType: { type: "string", description: "The type of room (e.g., King, Double)." },
      checkInDate: { type: "string", description: "ISO 8601 date string for check-in." },
      nights: { type: "number", description: "Number of nights to stay." }
    },
    required: ["hotelName", "roomType", "checkInDate", "nights"]
  },
  execute: async (args, session) => {
    const { db } = await import('@/src/prisma/db');
    const { createReservation } = await import('@/lib/actions/hotel');
    
    const allOrgs = await db.orm.public.Organization.where({ type: 'HOTEL' }).all();
    let hotelId: string | null = null;
    let hotelName: string | null = null;
    
    for (const org of allOrgs) {
      if (org.name.toLowerCase().includes(args.hotelName.toLowerCase())) {
        hotelId = org.id;
        hotelName = org.name;
        break;
      }
    }
    
    if (!hotelId) {
      return { ok: false, error: { code: 'NOT_FOUND', message: `Could not find a hotel matching '${args.hotelName}'.` } };
    }
    
    const rooms = await db.orm.public.HotelRoom.where({ organizationId: hotelId }).all();
    const availableRooms = rooms.filter((r: any) => r.type.toLowerCase() === args.roomType.toLowerCase() && r.status === 'CLEAN');
    
    if (availableRooms.length === 0) {
      return { ok: false, error: { code: 'SOLD_OUT', message: `No CLEAN ${args.roomType} rooms available at ${hotelName}.` } };
    }
    
    const selectedRoom = availableRooms[0];
    const checkIn = new Date(args.checkInDate);
    const checkOut = new Date(args.checkInDate);
    checkOut.setDate(checkOut.getDate() + args.nights);
    
    const resResult = await createReservation({
      organizationId: hotelId,
      roomId: selectedRoom.id,
      guestName: session.user.name || 'Voice Guest',
      checkInDate: checkIn.toISOString(),
      checkOutDate: checkOut.toISOString(),
      byResident: true
    });
    
    if (resResult.error) {
      return { ok: false, error: { code: 'CONFLICT', message: resResult.error } };
    }
    
    const personId = session.user.personId;
    if (personId && (resResult as any).reservationId) {
      let rel = await db.orm.public.Relationship.where({ personId, organizationId: hotelId }).all().first();
      if (!rel) {
        rel = await db.orm.public.Relationship.create({
          personId,
          organizationId: hotelId,
          type: 'CUSTOMER'
        });
      }
      
      await db.orm.public.Reservation.where({ id: (resResult as any).reservationId }).update({
        guestRelationshipId: rel.id
      });
    }
    
    return { ok: true, data: {
      reservationId: (resResult as any).reservationId || 'unknown',
      hotel: hotelName,
      roomType: selectedRoom.type,
      roomNumber: selectedRoom.roomNumber,
      checkIn: checkIn.toISOString(),
      checkOut: checkOut.toISOString(),
      nights: args.nights,
      status: 'CONFIRMED'
    } };
  }
};
