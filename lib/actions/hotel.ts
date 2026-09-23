'use server'

import '@js-temporal/polyfill'
import { db } from '@/src/prisma/db'
import { requireMembership } from '@/lib/actions/tenant'

function toInstant(date: Date) {
  return (globalThis as any).Temporal.Instant.fromEpochMilliseconds(date.getTime());
}

function epochMs(instant: unknown) {
  return (instant as { epochMilliseconds: number }).epochMilliseconds;
}

export async function getHotelAdminData(organizationId: string) {
  try {
    // Validate authorization boundary
    await requireMembership(organizationId);

    // Find the specific hotel organization
    const hotel = await db.orm.public.Organization.where({ id: organizationId }).all().first();

    if (!hotel) return null;

    // In Prisma v8 we sort manually since orderBy is not on the find object in the same way
    const allRooms = await db.orm.public.HotelRoom.where({ organizationId: hotel.id }).all();
    const rooms = allRooms.sort((a, b) => a.roomNumber.localeCompare(b.roomNumber));

    const reservations = await db.orm.public.Reservation.where({ organizationId: hotel.id }).all();
    const rateRules = await db.orm.public.RateRule.where({ organizationId: hotel.id }).all();
    const allInventory = await db.orm.public.InventoryItem.where({ organizationId: hotel.id }).all();
    const inventoryItems = allInventory.sort((a, b) => a.name.localeCompare(b.name));
    const maintenanceTickets = await db.orm.public.MaintenanceTicket.where({ organizationId: hotel.id }).all();

    const resIds = reservations.map(r => r.id);
    let folioCharges: any[] = [];
    if (resIds.length > 0) {
      // @ts-ignore
      folioCharges = await db.orm.public.FolioCharge.where({ reservationId: { in: resIds } }).all();
    }

    return JSON.parse(JSON.stringify({
      hotel,
      rooms,
      reservations,
      rateRules,
      inventoryItems,
      maintenanceTickets,
      folioCharges,
    }));
  } catch (error) {
    console.error('Error fetching hotel data:', error);
    return null;
  }
}

// Nightly rate for a given calendar day: the room's base rate, surged by the
// org's active WEEKEND_SURGE rule on Saturdays/Sundays. Holiday surge has no
// auto-trigger yet (no holiday calendar is modeled) — it's configurable in
// the Rate Manager but only applies once something flags a date as a holiday.
function nightlyRate(baseRate: number, day: Date, weekendMultiplier: number | null) {
  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
  return isWeekend && weekendMultiplier ? baseRate * weekendMultiplier : baseRate;
}

async function computeStayPrice(organizationId: string, baseRate: number, checkIn: Date, checkOut: Date) {
  const rules = await db.orm.public.RateRule.where({ organizationId, type: 'WEEKEND_SURGE', isActive: true }).all();
  const weekendMultiplier = rules[0]?.multiplier ?? null;

  let total = 0;
  const cursor = new Date(checkIn);
  while (cursor.getTime() < checkOut.getTime()) {
    total += nightlyRate(baseRate, cursor, weekendMultiplier);
    cursor.setDate(cursor.getDate() + 1);
  }
  return total;
}

export async function updateHotelSettings(
  organizationId: string,
  input: { name?: string; description?: string; address?: string }
) {
  try {
    await requireMembership(organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    const data: Record<string, unknown> = {};
    if (input.name !== undefined) {
      if (!input.name.trim()) return { error: 'Hotel name cannot be empty.' };
      data.name = input.name.trim();
    }
    if (input.description !== undefined) data.description = input.description.trim() || undefined;
    if (input.address !== undefined) data.address = input.address.trim() || undefined;

    await db.orm.public.Organization.where({ id: organizationId }).update(data);
    return { success: true };
  } catch (error) {
    console.error('Error updating hotel settings:', error);
    return { error: 'Failed to update settings.' };
  }
}

export async function createReservation(input: {
  organizationId: string;
  roomId: string;
  guestName: string;
  checkInDate: string;
  checkOutDate: string;
  roomBlockId?: string;
}) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'RECEPTIONIST']);
    const guestName = input.guestName.trim();
    if (!guestName) return { error: 'Guest name is required.' };
    if (!input.roomId) return { error: 'Please select a room.' };

    const checkIn = new Date(input.checkInDate);
    const checkOut = new Date(input.checkOutDate);
    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) return { error: 'Invalid dates.' };
    if (checkOut.getTime() <= checkIn.getTime()) return { error: 'Check-out must be after check-in.' };

    return await db.transaction(async (tx: any) => {
      // Acquire a row-level write-lock on the room to prevent concurrent booking races
      const lockPlan = db.raw.sql`SELECT id FROM "hotelRoom" WHERE id = ${input.roomId} AND "organizationId" = ${input.organizationId} FOR UPDATE`
        .affectedCount()
        .build();
      // Execute lock then fetch room via ORM (same transaction connection holds the lock)
      await tx.execute(lockPlan);

      const room = await tx.orm.public.HotelRoom.where({ id: input.roomId, organizationId: input.organizationId }).all().first();
      if (!room) return { error: 'Room not found.' };

      // Check for overlapping reservations inside the transaction (lock acquired above)
      const allReservations = await tx.orm.public.Reservation.where({ roomId: input.roomId }).all();
      const checkInMs = checkIn.getTime();
      const checkOutMs = checkOut.getTime();
      const overlaps = allReservations.filter((r: any) => {
        if (r.status === 'CANCELLED' || r.status === 'CHECKED_OUT') return false;
        const rIn = epochMs(r.checkInDate);
        const rOut = epochMs(r.checkOutDate);
        return rIn < checkOutMs && rOut > checkInMs;
      });
      if (overlaps.length > 0) return { error: 'This room is already booked for part of that date range.' };

      const totalPrice = await computeStayPrice(input.organizationId, room.baseRate, checkIn, checkOut);

      const newReservation = await tx.orm.public.Reservation.create({
        guestName,
        roomId: input.roomId,
        organizationId: input.organizationId,
        locationId: room.locationId ?? undefined,
        status: 'CONFIRMED',
        checkInDate: toInstant(checkIn),
        checkOutDate: toInstant(checkOut),
        totalPrice,
        paymentStatus: 'PENDING',
        roomBlockId: input.roomBlockId ?? undefined,
      });
      return { success: true, reservationId: newReservation.id };
    });
  } catch (error) {
    console.error('Error creating reservation:', error);
    return { error: 'Failed to create reservation.' };
  }
}


export async function updateReservationStatus(
  reservationId: string,
  status: 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED'
) {
  try {
    const res = await db.orm.public.Reservation.where({ id: reservationId }).all().first();
    if (!res) return { error: 'Reservation not found.' } as { success?: boolean; paidViaWallet?: boolean; error?: string };
    await requireMembership(res.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'RECEPTIONIST'], res.locationId ?? undefined);

    await db.orm.public.Reservation.where({ id: reservationId }).update({ status });
    return { success: true };
  } catch (error) {
    console.error('Error updating reservation status:', error);
    return { error: 'Failed to update reservation.' };
  }
}

export async function extendReservationStay(reservationId: string, newCheckOutDate: string) {
  try {
    const res = await db.orm.public.Reservation.where({ id: reservationId }).all().first();
    if (res) await requireMembership(res.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'RECEPTIONIST']);
    const reservation = await db.orm.public.Reservation.where({ id: reservationId }).all().first();
    if (!reservation) return { error: 'Reservation not found.' } as { success?: boolean; paidViaWallet?: boolean; error?: string };

    const newCheckOut = new Date(newCheckOutDate);
    if (isNaN(newCheckOut.getTime())) return { error: 'Invalid date.' };

    const currentCheckOutMs = epochMs(reservation.checkOutDate);
    if (newCheckOut.getTime() <= currentCheckOutMs) {
      return { error: 'New check-out date must be later than the current check-out date.' };
    }

    if (reservation.roomId) {
      const roomReservations = await db.orm.public.Reservation.where({ roomId: reservation.roomId }).all();
      const overlaps = roomReservations.some((r) => {
        if (r.id === reservationId || r.status === 'CANCELLED' || r.status === 'CHECKED_OUT') return false;
        return epochMs(r.checkInDate) < newCheckOut.getTime() && epochMs(r.checkInDate) >= currentCheckOutMs;
      });
      if (overlaps) return { error: 'Cannot extend — the room is booked by another guest during that period.' };
    }

    let addedCost = 0;
    if (reservation.roomId) {
      const room = await db.orm.public.HotelRoom.where({ id: reservation.roomId }).all().first();
      if (room) {
        addedCost = await computeStayPrice(
          reservation.organizationId,
          room.baseRate,
          new Date(currentCheckOutMs),
          newCheckOut
        );
      }
    }

    await db.orm.public.Reservation.where({ id: reservationId }).update({
      checkOutDate: toInstant(newCheckOut),
      totalPrice: (reservation.totalPrice ?? 0) + addedCost || undefined,
    });

    return { success: true };
  } catch (error) {
    console.error('Error extending stay:', error);
    return { error: 'Failed to extend stay.' };
  }
}

// ---------------------------------------------------------------------
// Room Management (General Manager Portal)
// ---------------------------------------------------------------------

export async function createRoom(input: {
  organizationId: string;
  roomNumber: string;
  type: string;
  baseRate: number;
  status?: string;
}) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    const roomNumber = input.roomNumber.trim();
    if (!roomNumber) return { error: 'Room number is required.' };
    if (!input.type.trim()) return { error: 'Room type is required.' };
    if (input.baseRate < 0) return { error: 'Base rate cannot be negative.' };

    const existing = await db.orm.public.HotelRoom.where({ organizationId: input.organizationId }).all();
    if (existing.some((r) => r.roomNumber.toLowerCase() === roomNumber.toLowerCase())) {
      return { error: `Room ${roomNumber} already exists.` };
    }

    await db.orm.public.HotelRoom.create({
      roomNumber,
      type: input.type.trim(),
      baseRate: input.baseRate,
      status: input.status ?? 'CLEAN',
      organizationId: input.organizationId,
    });

    return { success: true };
  } catch (error) {
    console.error('Error creating room:', error);
    return { error: 'Failed to create room.' };
  }
}

export async function updateRoom(
  roomId: string,
  input: { roomNumber?: string; type?: string; baseRate?: number; status?: string }
) {
  try {
    const room = await db.orm.public.HotelRoom.where({ id: roomId }).all().first();
    if (!room) return { error: 'Room not found.' };
    await requireMembership(room.organizationId, ['OWNER', 'ADMIN', 'MANAGER'], room.locationId ?? undefined);

    if (input.baseRate !== undefined && input.baseRate < 0) {
      return { error: 'Base rate cannot be negative.' };
    }
    const data: Record<string, unknown> = {};
    if (input.roomNumber !== undefined) data.roomNumber = input.roomNumber.trim();
    if (input.type !== undefined) data.type = input.type.trim();
    if (input.baseRate !== undefined) data.baseRate = input.baseRate;
    if (input.status !== undefined) data.status = input.status;

    await db.orm.public.HotelRoom.where({ id: roomId }).update(data);
    return { success: true };
  } catch (error) {
    console.error('Error updating room:', error);
    return { error: 'Failed to update room.' };
  }
}

export async function deleteRoom(roomId: string) {
  try {
    const room = await db.orm.public.HotelRoom.where({ id: roomId }).all().first();
    if (room) await requireMembership(room.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    const activeReservations = await db.orm.public.Reservation.where({ roomId }).all();
    const hasActive = activeReservations.some((r) => r.status === 'CONFIRMED' || r.status === 'CHECKED_IN');
    if (hasActive) {
      return { error: 'Cannot remove a room with active or upcoming reservations.' };
    }

    await db.orm.public.HotelRoom.where({ id: roomId }).delete();
    return { success: true };
  } catch (error) {
    console.error('Error deleting room:', error);
    return { error: 'Failed to remove room.' };
  }
}

// ---------------------------------------------------------------------
// Rate Management (General Manager Portal)
// ---------------------------------------------------------------------

export async function upsertRateRule(input: {
  organizationId: string;
  type: 'WEEKEND_SURGE' | 'HOLIDAY_SURGE';
  multiplier: number;
  isActive: boolean;
}) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    if (input.multiplier < 1) return { error: 'Multiplier must be at least 1.0 (no discount surges).' };

    const existing = await db.orm.public.RateRule
      .where({ organizationId: input.organizationId, type: input.type })
      .all()
      .first();

    if (existing) {
      await db.orm.public.RateRule.where({ id: existing.id }).update({
        multiplier: input.multiplier,
        isActive: input.isActive,
      });
    } else {
      await db.orm.public.RateRule.create({
        organizationId: input.organizationId,
        type: input.type,
        multiplier: input.multiplier,
        isActive: input.isActive,
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error saving rate rule:', error);
    return { error: 'Failed to save rate rule.' };
  }
}

// ---------------------------------------------------------------------
// Inventory & Procurement (General Manager Portal)
// ---------------------------------------------------------------------

export async function createInventoryItem(input: {
  organizationId: string;
  name: string;
  category: 'HOUSEKEEPING' | 'FOOD_AND_BEVERAGE' | 'MAINTENANCE';
  unit: string;
  quantityOnHand: number;
  parLevel: number;
}) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    const name = input.name.trim();
    if (!name) return { error: 'Item name is required.' };
    if (input.quantityOnHand < 0 || input.parLevel < 0) return { error: 'Quantities cannot be negative.' };

    await db.orm.public.InventoryItem.create({
      organizationId: input.organizationId,
      name,
      category: input.category,
      unit: input.unit.trim() || 'units',
      quantityOnHand: input.quantityOnHand,
      parLevel: input.parLevel,
    });

    return { success: true };
  } catch (error) {
    console.error('Error creating inventory item:', error);
    return { error: 'Failed to create inventory item.' };
  }
}

export async function updateInventoryItem(
  itemId: string,
  input: { quantityOnHand?: number; parLevel?: number; name?: string; unit?: string }
) {
  try {
    const item = await db.orm.public.InventoryItem.where({ id: itemId }).all().first();
    if (!item) return { error: 'Item not found.' };
    await requireMembership(item.organizationId, ['OWNER', 'ADMIN', 'MANAGER'], item.locationId ?? undefined);

    if (input.quantityOnHand !== undefined && input.quantityOnHand < 0) {
      return { error: 'Quantity cannot be negative.' };
    }
    if (input.parLevel !== undefined && input.parLevel < 0) {
      return { error: 'Par level cannot be negative.' };
    }
    const data: Record<string, unknown> = {};
    if (input.quantityOnHand !== undefined) data.quantityOnHand = input.quantityOnHand;
    if (input.parLevel !== undefined) data.parLevel = input.parLevel;
    if (input.name !== undefined) data.name = input.name.trim();
    if (input.unit !== undefined) data.unit = input.unit.trim();

    await db.orm.public.InventoryItem.where({ id: itemId }).update(data);
    return { success: true };
  } catch (error) {
    console.error('Error updating inventory item:', error);
    return { error: 'Failed to update inventory item.' };
  }
}

export async function deleteInventoryItem(itemId: string) {
  try {
    const item = await db.orm.public.InventoryItem.where({ id: itemId }).all().first();
    if (item) await requireMembership(item.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    await db.orm.public.InventoryItem.where({ id: itemId }).delete();
    return { success: true };
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    return { error: 'Failed to delete inventory item.' };
  }
}

// ---------------------------------------------------------------------
// Guest Folio & Settlement (charge-to-room lands here)
// ---------------------------------------------------------------------

export async function getFolio(reservationId: string) {
  try {
    const reservation = await db.orm.public.Reservation.where({ id: reservationId }).all().first();
    if (!reservation) return null;
    await requireMembership(reservation.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'RECEPTIONIST'], reservation.locationId ?? undefined);

    const charges = await db.orm.public.FolioCharge.where({ reservationId }).all();
    const roomCharge = reservation.totalPrice ?? 0;
    const extrasTotal = charges.reduce((sum, c) => sum + c.amount, 0);

    return JSON.parse(JSON.stringify({
      reservation,
      charges,
      roomCharge,
      extrasTotal,
      grandTotal: roomCharge + extrasTotal,
    }));
  } catch (error) {
    console.error('Error fetching folio:', error);
    return null;
  }
}

export async function addFolioCharge(input: {
  reservationId: string;
  description: string;
  amount: number;
  category: 'ROOM' | 'FOOD_AND_BEVERAGE' | 'SPA' | 'OTHER';
}) {
  try {
    const res = await db.orm.public.Reservation.where({ id: input.reservationId }).all().first();
    if (res) await requireMembership(res.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'RECEPTIONIST']);
    if (!input.description.trim()) return { error: 'Description is required.' };
    if (input.amount <= 0) return { error: 'Amount must be positive.' };

    await db.orm.public.FolioCharge.create({
      reservationId: input.reservationId,
      description: input.description.trim(),
      amount: input.amount,
      category: input.category,
    });

    return { success: true };
  } catch (error) {
    console.error('Error adding folio charge:', error);
    return { error: 'Failed to add charge.' };
  }
}

// Settles the full folio (room + all extras). If the guest is a linked
// resident with a funded CityWallet, this moves real balance from their
// wallet to the hotel's wallet; otherwise it's recorded as settled by other
// means (cash/card at the desk) — either way paymentStatus becomes PAID.
export async function settleFolio(reservationId: string) {
  try {
    const res = await db.orm.public.Reservation.where({ id: reservationId }).all().first();
    if (!res) return { error: 'Reservation not found.' } as { success?: boolean; paidViaWallet?: boolean; error?: string };
    await requireMembership(res.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'RECEPTIONIST'], res.locationId ?? undefined);

    if (res.paymentStatus === 'PAID') {
      return { success: true, paidViaWallet: false } as { success?: boolean; paidViaWallet?: boolean; error?: string };
    }

    return await db.transaction(async (tx: any) => {
      // Acquire a transaction-scoped advisory lock keyed on the reservation ID.
      // This serializes concurrent settlement attempts: one blocks until the other commits.
      // pg_advisory_xact_lock is safe with PgBouncer in transaction mode because the
      // lock is acquired and released within the same transaction boundary.
      const advisoryLockPlan = db.raw.sql`SELECT pg_advisory_xact_lock(('x' || md5(${reservationId}))::bit(64)::bigint)`
        .affectedCount()
        .build();
      await tx.execute(advisoryLockPlan);

      // Re-read inside the transaction after acquiring the lock
      const lockedRes = await tx.orm.public.Reservation.where({ id: reservationId }).all().first();
      if (!lockedRes) return { error: 'Reservation not found.' } as { success?: boolean; paidViaWallet?: boolean; error?: string };
      // If the first concurrent call already settled it, the second finds PAID here
      if (lockedRes.paymentStatus === 'PAID') {
        return { success: true, paidViaWallet: false } as { success?: boolean; paidViaWallet?: boolean; error?: string };
      }

      const charges = await tx.orm.public.FolioCharge.where({ reservationId }).all();
      let total = lockedRes.totalPrice ?? 0;
      for (const c of charges) total += c.amount;

      let paidViaWallet = false;
      if (lockedRes.guestRelationshipId && total > 0) {
        const rel = await tx.orm.public.Relationship.where({ id: lockedRes.guestRelationshipId }).all().first();
        if (rel) {
          const guestWallet = await tx.orm.public.Wallet.where({ personId: rel.personId }).all().first();
          const hotelWallet = await tx.orm.public.Wallet.where({ organizationId: res.organizationId }).all().first();

          if (guestWallet && hotelWallet && guestWallet.balance >= total) {
            const txn = await tx.orm.public.Transaction.create({
              status: 'COMPLETED',
              description: 'Hotel stay settlement',
            });
            await tx.orm.public.LedgerEntry.create({
              walletId: guestWallet.id,
              transactionId: txn.id,
              amount: -total,
              currency: guestWallet.currency,
            });
            await tx.orm.public.LedgerEntry.create({
              walletId: hotelWallet.id,
              transactionId: txn.id,
              amount: total,
              currency: hotelWallet.currency,
            });
            await tx.orm.public.Wallet.where({ id: guestWallet.id }).update({ balance: guestWallet.balance - total });
            await tx.orm.public.Wallet.where({ id: hotelWallet.id }).update({ balance: hotelWallet.balance + total });
            await tx.orm.public.Payment.create({
              transactionId: txn.id,
              status: 'COMPLETED',
              method: 'WALLET',
              amount: total,
              currency: guestWallet.currency,
            });
            paidViaWallet = true;
          }
        }
      }

      await tx.orm.public.Reservation.where({ id: reservationId }).update({ paymentStatus: 'PAID' });
      return { success: true, paidViaWallet } as { success?: boolean; paidViaWallet?: boolean; error?: string };
    });
  } catch (error) {
    console.error('Error settling folio:', error);
    return { error: 'Failed to settle folio.' } as { success?: boolean; paidViaWallet?: boolean; error?: string };
  }
}




// ---------------------------------------------------------------------
// Multi-Outlet Management: Restaurants / Bars / Clubs + Unified POS
// ---------------------------------------------------------------------

export async function getOutletsData(organizationId: string) {
  try {
    await requireMembership(organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'RECEPTIONIST']);
    const outlets = await db.orm.public.Outlet.where({ organizationId }).all();

    const items: any[] = [];
    for (const outlet of outlets) {
      const outletItems = await db.orm.public.OutletItem.where({ outletId: outlet.id }).all();
      items.push(...outletItems);
    }

    const orders = (await db.orm.public.OutletOrder.where({ organizationId }).all()).sort(
      (a, b) => epochMs(b.createdAt) - epochMs(a.createdAt)
    );

    const orderItems: any[] = [];
    for (const order of orders) {
      const oi = await db.orm.public.OutletOrderItem.where({ outletOrderId: order.id }).all();
      orderItems.push(...oi);
    }

    return JSON.parse(JSON.stringify({ outlets, items, orders, orderItems }));
  } catch (error) {
    console.error('Error fetching outlets data:', error);
    return null;
  }
}

export async function createOutlet(input: { organizationId: string; name: string; type: 'RESTAURANT' | 'BAR' | 'CLUB' | 'SPA' }) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    if (!input.name.trim()) return { error: 'Outlet name is required.' };
    await db.orm.public.Outlet.create({ organizationId: input.organizationId, name: input.name.trim(), type: input.type });
    return { success: true };
  } catch (error) {
    console.error('Error creating outlet:', error);
    return { error: 'Failed to create outlet.' };
  }
}

export async function updateOutlet(
  outletId: string,
  input: { name?: string; type?: 'RESTAURANT' | 'BAR' | 'CLUB' | 'SPA'; isActive?: boolean }
) {
  try {
    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name.trim();
    if (input.type !== undefined) data.type = input.type;
    if (input.isActive !== undefined) data.isActive = input.isActive;

    await db.orm.public.Outlet.where({ id: outletId }).update(data);
    return { success: true };
  } catch (error) {
    console.error('Error updating outlet:', error);
    return { error: 'Failed to update outlet.' };
  }
}

export async function deleteOutlet(outletId: string) {
  try {
    const outlet = await db.orm.public.Outlet.where({ id: outletId }).all().first();
    if (outlet) await requireMembership(outlet.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    const openOrders = await db.orm.public.OutletOrder.where({ outletId, status: 'OPEN' }).all();
    if (openOrders.length > 0) {
      return { error: 'This outlet has open tabs — close or settle them before removing it.' };
    }
    await db.orm.public.Outlet.where({ id: outletId }).delete();
    return { success: true };
  } catch (error) {
    console.error('Error deleting outlet:', error);
    return { error: 'Failed to remove outlet.' };
  }
}

export async function createOutletItem(input: { outletId: string; name: string; price: number; category: string }) {
  try {
    const outlet = await db.orm.public.Outlet.where({ id: input.outletId }).all().first();
    if (outlet) await requireMembership(outlet.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    if (!input.name.trim()) return { error: 'Item name is required.' };
    if (input.price < 0) return { error: 'Price cannot be negative.' };
    await db.orm.public.OutletItem.create({
      outletId: input.outletId,
      name: input.name.trim(),
      price: input.price,
      category: input.category.trim() || 'General',
    });
    return { success: true };
  } catch (error) {
    console.error('Error creating outlet item:', error);
    return { error: 'Failed to create item.' };
  }
}

export async function updateOutletItem(itemId: string, input: { name?: string; price?: number; category?: string }) {
  try {
    const item = await db.orm.public.OutletItem.where({ id: itemId }).all().first();
    if (item) {
      const outlet = await db.orm.public.Outlet.where({ id: item.outletId }).all().first();
      if (outlet) await requireMembership(outlet.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    }
    if (input.price !== undefined && input.price < 0) return { error: 'Price cannot be negative.' };
    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name.trim();
    if (input.price !== undefined) data.price = input.price;
    if (input.category !== undefined) data.category = input.category.trim();

    await db.orm.public.OutletItem.where({ id: itemId }).update(data);
    return { success: true };
  } catch (error) {
    console.error('Error updating outlet item:', error);
    return { error: 'Failed to update item.' };
  }
}

export async function deleteOutletItem(itemId: string) {
  try {
    const item = await db.orm.public.OutletItem.where({ id: itemId }).all().first();
    if (item) {
      const outlet = await db.orm.public.Outlet.where({ id: item.outletId }).all().first();
      if (outlet) await requireMembership(outlet.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    }
    await db.orm.public.OutletItem.where({ id: itemId }).delete();
    return { success: true };
  } catch (error) {
    console.error('Error deleting outlet item:', error);
    return { error: 'Failed to remove item.' };
  }
}

export async function createOutletOrder(input: { organizationId: string; outletId: string; tabName: string }) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'RECEPTIONIST', 'STAFF']);
    if (!input.tabName.trim()) return { error: 'A table/tab name is required.' };
    const order = await db.orm.public.OutletOrder.create({
      organizationId: input.organizationId,
      outletId: input.outletId,
      tabName: input.tabName.trim(),
      status: 'OPEN',
      totalAmount: 0,
    });
    return { success: true, orderId: order.id };
  } catch (error) {
    console.error('Error creating outlet order:', error);
    return { error: 'Failed to open a new tab.' };
  }
}

async function recalculateOrderTotal(outletOrderId: string) {
  const orderItems = await db.orm.public.OutletOrderItem.where({ outletOrderId }).all();
  let total = 0;
  for (const oi of orderItems) {
    const item = await db.orm.public.OutletItem.where({ id: oi.outletItemId }).all().first();
    total += (item?.price ?? 0) * oi.quantity;
  }
  await db.orm.public.OutletOrder.where({ id: outletOrderId }).update({ totalAmount: total });
  return total;
}

export async function addItemToOrder(input: { outletOrderId: string; outletItemId: string; quantity: number }) {
  try {
    const order = await db.orm.public.OutletOrder.where({ id: input.outletOrderId }).all().first();
    if (order) await requireMembership(order.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'RECEPTIONIST', 'STAFF']);
    if (input.quantity <= 0) return { error: 'Quantity must be positive.' };
    await db.orm.public.OutletOrderItem.create({
      outletOrderId: input.outletOrderId,
      outletItemId: input.outletItemId,
      quantity: input.quantity, unitPrice: 0 });
    await recalculateOrderTotal(input.outletOrderId);
    return { success: true };
  } catch (error) {
    console.error('Error adding item to order:', error);
    return { error: 'Failed to add item.' };
  }
}

// "Charge to Room" — the core Little-Hotelier-style multi-outlet flow. Posts
// the order total as a FolioCharge on the guest's reservation and closes the
// tab, instead of collecting payment at the outlet.
export async function chargeOrderToRoom(outletOrderId: string, reservationId: string) {
  try {
    const order = await db.orm.public.OutletOrder.where({ id: outletOrderId }).all().first();
    if (order) await requireMembership(order.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'RECEPTIONIST', 'STAFF']);
    if (!order) return { error: 'Order not found.' };
    if (order.status !== 'OPEN') return { error: 'This tab is already closed.' };

    const reservation = await db.orm.public.Reservation.where({ id: reservationId }).all().first();
    if (!reservation) return { error: 'Reservation not found.' } as { success?: boolean; paidViaWallet?: boolean; error?: string };
    if (reservation.status !== 'CHECKED_IN') {
      return { error: 'Guest must be checked in to charge to their room.' };
    }

    const outlet = await db.orm.public.Outlet.where({ id: order.outletId }).all().first();
    const category = outlet?.type === 'SPA' ? 'SPA' : 'FOOD_AND_BEVERAGE';

    await db.orm.public.FolioCharge.create({
      reservationId,
      description: `${outlet?.name ?? 'Outlet'} — tab ${order.tabName}`,
      amount: order.totalAmount,
      category,
    });

    await db.orm.public.OutletOrder.where({ id: outletOrderId }).update({
      status: 'CHARGED_TO_ROOM',
      reservationId,
    });

    return { success: true };
  } catch (error) {
    console.error('Error charging order to room:', error);
    return { error: 'Failed to charge to room.' };
  }
}

export async function payOrderDirectly(outletOrderId: string) {
  try {
    const order = await db.orm.public.OutletOrder.where({ id: outletOrderId }).all().first();
    if (order) await requireMembership(order.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'RECEPTIONIST', 'STAFF']);
    await db.orm.public.OutletOrder.where({ id: outletOrderId }).update({ status: 'PAID' });
    return { success: true };
  } catch (error) {
    console.error('Error closing order:', error);
    return { error: 'Failed to close the tab.' };
  }
}

// ---------------------------------------------------------------------
// Maintenance Ticketing
// ---------------------------------------------------------------------

export async function getMaintenanceTickets(organizationId: string) {
  try {
    await requireMembership(organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'MAINTENANCE']);
    const tickets = await db.orm.public.MaintenanceTicket.where({ organizationId }).all();
    return JSON.parse(JSON.stringify(tickets.sort((a, b) => epochMs(b.createdAt) - epochMs(a.createdAt))));
  } catch (error) {
    console.error('Error fetching maintenance tickets:', error);
    return [];
  }
}

export async function createMaintenanceTicket(input: {
  organizationId: string;
  roomId: string | null;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
}) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'RECEPTIONIST', 'STAFF']);
    if (!input.title.trim()) return { error: 'A short title is required.' };
    await db.orm.public.MaintenanceTicket.create({
      organizationId: input.organizationId,
      roomId: input.roomId ?? undefined,
      title: input.title.trim(),
      description: input.description.trim() || undefined,
      priority: input.priority,
      status: 'OPEN',
    });
    // A room with an open maintenance ticket is out of rotation until resolved.
    if (input.roomId) {
      await db.orm.public.HotelRoom.where({ id: input.roomId }).update({ status: 'OUT_OF_ORDER' });
    }
    return { success: true };
  } catch (error) {
    console.error('Error creating maintenance ticket:', error);
    return { error: 'Failed to create ticket.' };
  }
}

export async function updateMaintenanceTicketStatus(
  ticketId: string,
  status: 'IN_PROGRESS' | 'RESOLVED'
) {
  try {
    const ticket = await db.orm.public.MaintenanceTicket.where({ id: ticketId }).all().first();
    if (!ticket) return { error: 'Ticket not found.' };

    const data: Record<string, unknown> = { status };
    if (status === 'RESOLVED') data.resolvedAt = toInstant(new Date());
    await db.orm.public.MaintenanceTicket.where({ id: ticketId }).update(data);

    if (status === 'RESOLVED' && ticket.roomId) {
      await db.orm.public.HotelRoom.where({ id: ticket.roomId }).update({ status: 'DIRTY' });
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating maintenance ticket:', error);
    return { error: 'Failed to update ticket.' };
  }
}

// ---------------------------------------------------------------------
// Group Room Blocks
// ---------------------------------------------------------------------

export async function getRoomBlocks(organizationId: string) {
  try {
    await requireMembership(organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'RECEPTIONIST']);
    const blocks = await db.orm.public.RoomBlock.where({ organizationId }).all();
    const withCounts = [];
    for (const block of blocks) {
      const reservations = await db.orm.public.Reservation.where({ roomBlockId: block.id }).all();
      withCounts.push({ ...block, reservationCount: reservations.length });
    }
    return JSON.parse(JSON.stringify(withCounts.sort((a, b) => epochMs(b.createdAt) - epochMs(a.createdAt))));
  } catch (error) {
    console.error('Error fetching room blocks:', error);
    return [];
  }
}

export async function createRoomBlock(input: {
  organizationId: string;
  groupName: string;
  checkInDate: string;
  checkOutDate: string;
  notes?: string;
}) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    if (!input.groupName.trim()) return { error: 'Group name is required.' };
    const checkIn = new Date(input.checkInDate);
    const checkOut = new Date(input.checkOutDate);
    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime()) || checkOut.getTime() <= checkIn.getTime()) {
      return { error: 'Invalid date range.' };
    }

    await db.orm.public.RoomBlock.create({
      organizationId: input.organizationId,
      groupName: input.groupName.trim(),
      checkInDate: toInstant(checkIn),
      checkOutDate: toInstant(checkOut),
      notes: input.notes?.trim() || undefined,
    });

    return { success: true };
  } catch (error) {
    console.error('Error creating room block:', error);
    return { error: 'Failed to create group block.' };
  }
}

// Adds one reservation under an existing group block, using the block's own
// date range and reusing the same double-booking guard as a normal booking.
export async function addReservationToBlock(input: {
  roomBlockId: string;
  organizationId: string;
  roomId: string;
  guestName: string;
}) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'RECEPTIONIST']);
    const block = await db.orm.public.RoomBlock.where({ id: input.roomBlockId }).all().first();
    if (!block) return { error: 'Group block not found.' };

    const checkIn = new Date(epochMs(block.checkInDate));
    const checkOut = new Date(epochMs(block.checkOutDate));

    return await createReservation({
      organizationId: input.organizationId,
      roomId: input.roomId,
      guestName: input.guestName,
      checkInDate: checkIn.toISOString(),
      checkOutDate: checkOut.toISOString(),
      roomBlockId: input.roomBlockId,
    });
  } catch (error) {
    console.error('Error adding reservation to block:', error);
    return { error: 'Failed to add reservation to group block.' };
  }
}

// ---------------------------------------------------------------------
// Night Audit / CityPay General Ledger
// ---------------------------------------------------------------------

export async function getNightAuditReports(organizationId: string) {
  try {
    await requireMembership(organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    const reports = await db.orm.public.NightAuditReport.where({ organizationId }).all();
    return JSON.parse(JSON.stringify(reports.sort((a, b) => epochMs(b.auditDate) - epochMs(a.auditDate))));
  } catch (error) {
    console.error('Error fetching night audit reports:', error);
    return [];
  }
}

// Manager-triggered instead of a literal 2am cron (this is a prototype) — for
// the given business date, reconciles room revenue, F&B/spa revenue (via
// FolioCharge), and occupancy into one immutable daily report row.
export async function runNightAudit(organizationId: string, auditDateStr: string) {
  try {
    await requireMembership(organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    const auditDate = new Date(auditDateStr);
    auditDate.setHours(0, 0, 0, 0);
    if (isNaN(auditDate.getTime())) return { error: 'Invalid date.' };

    const existing = await db.orm.public.NightAuditReport
      .where({ organizationId, auditDate: toInstant(auditDate) })
      .all()
      .first();
    if (existing) return { error: 'Night audit has already been run for this date.' };

    const rooms = await db.orm.public.HotelRoom.where({ organizationId }).all();
    const reservations = await db.orm.public.Reservation.where({ organizationId }).all();

    const activeTonight = reservations.filter((r) => {
      if (r.status === 'CANCELLED') return false;
      const checkIn = epochMs(r.checkInDate);
      const checkOut = epochMs(r.checkOutDate);
      return checkIn <= auditDate.getTime() && auditDate.getTime() < checkOut;
    });

    const occupancyRate = rooms.length > 0 ? (activeTonight.length / rooms.length) * 100 : 0;

    let roomRevenue = 0;
    for (const r of activeTonight) {
      const checkIn = epochMs(r.checkInDate);
      const checkOut = epochMs(r.checkOutDate);
      const nights = Math.max(1, Math.round((checkOut - checkIn) / 86400000));
      roomRevenue += (r.totalPrice ?? 0) / nights;
    }

    let fnbRevenue = 0;
    let otherRevenue = 0;
    for (const r of reservations) {
      const charges = await db.orm.public.FolioCharge.where({ reservationId: r.id }).all();
      for (const c of charges) {
        const createdMs = epochMs(c.createdAt);
        const createdDate = new Date(createdMs);
        createdDate.setHours(0, 0, 0, 0);
        if (createdDate.getTime() !== auditDate.getTime()) continue;
        if (c.category === 'FOOD_AND_BEVERAGE' || c.category === 'SPA') fnbRevenue += c.amount;
        else if (c.category === 'OTHER') otherRevenue += c.amount;
      }
    }

    const totalRevenue = roomRevenue + fnbRevenue + otherRevenue;

    await db.orm.public.NightAuditReport.create({
      organizationId,
      auditDate: toInstant(auditDate),
      roomRevenue,
      fnbRevenue,
      otherRevenue,
      totalRevenue,
      occupancyRate,
      roomsSold: activeTonight.length,
    });

    return { success: true };
  } catch (error) {
    console.error('Error running night audit:', error);
    return { error: 'Failed to run night audit.' };
  }
}

// ---------------------------------------------------------------------
// Housekeeping Portal
// ---------------------------------------------------------------------

export async function getHousekeepingTasks(organizationId: string) {
  try {
    await requireMembership(organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'HOUSEKEEPER']);
    const allRooms = await db.orm.public.HotelRoom.where({ organizationId }).all();
    const allReservations = await db.orm.public.Reservation.where({ organizationId }).all();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tasks = [];
    for (const room of allRooms) {
      let requiresAttention = false;
      let type: 'checkout' | 'stayover' | undefined;
      let guestName: string | undefined;

      const roomReservations = allReservations.filter(r => r.roomId === room.id && r.status !== 'CANCELLED');
      const activeReservation = roomReservations.find(r => {
        const checkIn = epochMs(r.checkInDate);
        const checkOut = epochMs(r.checkOutDate);
        return checkIn < tomorrow.getTime() && checkOut > today.getTime();
      });

      if (room.status === 'DIRTY' || room.status === 'CLEANING') {
        requiresAttention = true;
      }

      if (activeReservation) {
        guestName = activeReservation.guestName;
        const checkOutMs = epochMs(activeReservation.checkOutDate);
        if (checkOutMs >= today.getTime() && checkOutMs < tomorrow.getTime()) {
           type = 'checkout';
           if (room.status === 'OCCUPIED') requiresAttention = true;
        } else {
           type = 'stayover';
        }
      }

      if (requiresAttention) {
        tasks.push({
          id: room.id,
          roomNumber: room.roomNumber,
          roomType: room.type,
          status: room.status,
          guestName,
          type: type || 'checkout',
          isPriority: type === 'checkout'
        });
      } else if (room.status !== 'AVAILABLE' && room.status !== 'OCCUPIED') {
         // also show inspected or other states if needed, but the guide says DIRTY, CLEANING, OCCUPIED w/ checkout today
      }
    }
    return JSON.parse(JSON.stringify(tasks));
  } catch (error) {
    console.error('Error fetching housekeeping tasks:', error);
    return [];
  }
}

export async function updateRoomStatus(roomId: string, newStatus: string, housekeeperId?: string) {
  try {
    const room = await db.orm.public.HotelRoom.where({ id: roomId }).all().first();
    if (room) await requireMembership(room.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'HOUSEKEEPER', 'RECEPTIONIST']);
    await db.orm.public.HotelRoom.where({ id: roomId }).update({ status: newStatus });
    await db.orm.public.HousekeepingLog.create({
      roomId,
      statusChangedTo: newStatus,
      housekeeperId: housekeeperId ?? undefined
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating room status:', error);
    return { error: 'Failed to update room status.' };
  }
}

