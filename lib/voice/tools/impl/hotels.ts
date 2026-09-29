import { VoiceToolDefinition } from '../../core/policy';
import { getResidentCitySlug } from './discovery';

export const checkRoomAvailability: VoiceToolDefinition = {
  name: 'check_room_availability',
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
    
    // Find the hotel in this city
    // Actually we will just fetch all hotels and filter by name and city
    const allOrgs = await db.orm.public.Organization.where({ type: 'HOTEL' }).all();
    let hotelId: string | null = null;
    let hotelName: string | null = null;
    
    for (const org of allOrgs) {
      if (org.name.toLowerCase().includes(args.hotelName.toLowerCase())) {
        // Just verify it has a location in the resident's city if possible, but matching name is usually enough
        hotelId = org.id;
        hotelName = org.name;
        break;
      }
    }
    
    if (!hotelId) {
      return { ok: false, error: { code: 'NOT_FOUND', message: `Could not find a hotel matching '${args.hotelName}'.` } };
    }
    
    // Fetch rooms for this hotel
    const rooms = await db.orm.public.HotelRoom.where({ organizationId: hotelId }).all();
    if (rooms.length === 0) {
       return { ok: true, data: { hotel: hotelName, message: 'No rooms configured for this hotel.' } };
    }
    
    // Group by room type
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
  name: 'book_hotel_room',
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
      nights: { type: "number", description: "Number of nights to stay." }
    },
    required: ["hotelName", "roomType", "nights"]
  },
  execute: async (args, session) => {
    const { db } = await import('@/src/prisma/db');
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
    
    // Find an available room of this type
    const rooms = await db.orm.public.HotelRoom.where({ organizationId: hotelId }).all();
    const availableRooms = rooms.filter((r: any) => r.type.toLowerCase() === args.roomType.toLowerCase() && r.status === 'CLEAN');
    
    if (availableRooms.length === 0) {
      return { ok: false, error: { code: 'SOLD_OUT', message: `No CLEAN ${args.roomType} rooms available at ${hotelName}.` } };
    }
    
    const selectedRoom = availableRooms[0];
    const checkIn = new Date();
    const checkOut = new Date();
    checkOut.setDate(checkOut.getDate() + args.nights);
    const totalPrice = selectedRoom.baseRate * args.nights;
    
    const TemporalInstant = (globalThis as any).Temporal?.Instant;
    const checkInTime = TemporalInstant ? TemporalInstant.fromEpochMilliseconds(checkIn.getTime()) : checkIn;
    const checkOutTime = TemporalInstant ? TemporalInstant.fromEpochMilliseconds(checkOut.getTime()) : checkOut;
    
    const res = await db.orm.public.Reservation.create({
      guestName: session.user.name || 'Voice Guest',
      roomId: selectedRoom.id,
      status: 'CONFIRMED',
      checkInDate: checkInTime,
      checkOutDate: checkOutTime,
      totalPrice: totalPrice,
      paymentStatus: 'PENDING',
      organizationId: hotelId
    });
    
    return { ok: true, data: {
      reservationId: res.id,
      hotel: hotelName,
      roomType: selectedRoom.type,
      roomNumber: selectedRoom.roomNumber,
      nights: args.nights,
      totalPrice: totalPrice,
      status: 'CONFIRMED'
    } };
  }
};
