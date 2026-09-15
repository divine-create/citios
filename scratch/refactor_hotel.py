import re

def main():
    with open('lib/actions/hotel.ts', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Add requireMembership import
    if 'requireMembership' not in content:
        content = re.sub(r'import \{ db \} from \'@/src/prisma/db\';', "import { db } from '@/src/prisma/db';\nimport { requireMembership } from '@/lib/auth';", content)

    # 2. Fix settleFolio
    settle_folio = """export async function settleFolio(reservationId: string) {
  try {
    const reservation = await db.orm.public.Reservation.where({ id: reservationId }).all().first();
    if (!reservation) return { error: 'Reservation not found.' };

    await requireMembership(reservation.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'RECEPTIONIST']);

    const charges = await db.orm.public.FolioCharge.where({ reservationId }).all();
    const total = (reservation.totalPrice ?? 0) + charges.reduce((sum, c) => sum + c.amount, 0);

    let paidViaWallet = false;
    if (reservation.guestRelationshipId && total > 0) {
      const rel = await db.orm.public.Relationship.where({ id: reservation.guestRelationshipId }).all().first();
      if (rel) {
        const guestWallet = await db.orm.public.Wallet.where({ personId: rel.personId }).all().first();
        const hotelWallet = await db.orm.public.Wallet.where({ organizationId: reservation.organizationId }).all().first();
        if (guestWallet && hotelWallet && guestWallet.balance >= total) {
          await db.orm.public.Transaction.create({
            amount: total,
            senderWalletId: guestWallet.id,
            receiverWalletId: hotelWallet.id,
            type: 'PAYMENT',
            status: 'COMPLETED',
            description: `Hotel stay settlement for reservation ${reservationId}`
          });
          
          await db.orm.public.Wallet.where({ id: guestWallet.id }).update({ balance: guestWallet.balance - total });
          await db.orm.public.Wallet.where({ id: hotelWallet.id }).update({ balance: hotelWallet.balance + total });
          
          paidViaWallet = true;
        }
      }
    }

    await db.orm.public.Reservation.where({ id: reservationId }).update({ paymentStatus: 'PAID' });
    return { success: true, paidViaWallet };
  } catch (error) {
    console.error('Error settling folio:', error);
    return { error: 'Failed to settle folio.' };
  }
}"""
    content = re.sub(r'export async function settleFolio\(reservationId: string\) \{[\s\S]*?return \{ error: \'Failed to settle folio\.\' \};\n  \}\n\}', settle_folio, content)

    # 3. Inject requireMembership into all mutations using regex
    mutations = [
        (r'(export async function updateHotelSettings\(\n\s*organizationId: string,\n\s*input: \{[\s\S]*?\}\n\) \{\n\s*try \{)', r"\1\n    await requireMembership(organizationId, ['OWNER', 'ADMIN', 'MANAGER']);"),
        (r'(export async function createReservation\(input: \{[\s\S]*?\}\) \{\n\s*try \{)', r"\1\n    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'RECEPTIONIST']);"),
        (r'(export async function updateReservationStatus\(\n\s*reservationId: string,\n\s*status: ReservationStatus\n\) \{\n\s*try \{)', r"\1\n    const res = await db.orm.public.Reservation.where({ id: reservationId }).all().first();\n    if (res) await requireMembership(res.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'RECEPTIONIST']);"),
        (r'(export async function extendReservationStay\(reservationId: string, newCheckOutDate: string\) \{\n\s*try \{)', r"\1\n    const res = await db.orm.public.Reservation.where({ id: reservationId }).all().first();\n    if (res) await requireMembership(res.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'RECEPTIONIST']);"),
        (r'(export async function createRoom\(input: \{[\s\S]*?\}\) \{\n\s*try \{)', r"\1\n    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);"),
        (r'(export async function updateRoom\(\n\s*roomId: string,\n\s*data: \{[\s\S]*?\}\n\) \{\n\s*try \{)', r"\1\n    const room = await db.orm.public.HotelRoom.where({ id: roomId }).all().first();\n    if (room) await requireMembership(room.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);"),
        (r'(export async function deleteRoom\(roomId: string\) \{\n\s*try \{)', r"\1\n    const room = await db.orm.public.HotelRoom.where({ id: roomId }).all().first();\n    if (room) await requireMembership(room.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);"),
        (r'(export async function upsertRateRule\(input: \{[\s\S]*?\}\) \{\n\s*try \{)', r"\1\n    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);"),
        (r'(export async function createInventoryItem\(input: \{[\s\S]*?\}\) \{\n\s*try \{)', r"\1\n    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);"),
        (r'(export async function updateInventoryItem\(\n\s*itemId: string,\n\s*data: \{[\s\S]*?\}\n\) \{\n\s*try \{)', r"\1\n    const item = await db.orm.public.InventoryItem.where({ id: itemId }).all().first();\n    if (item) await requireMembership(item.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);"),
        (r'(export async function deleteInventoryItem\(itemId: string\) \{\n\s*try \{)', r"\1\n    const item = await db.orm.public.InventoryItem.where({ id: itemId }).all().first();\n    if (item) await requireMembership(item.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);"),
        (r'(export async function addFolioCharge\(input: \{[\s\S]*?\}\) \{\n\s*try \{)', r"\1\n    const res = await db.orm.public.Reservation.where({ id: input.reservationId }).all().first();\n    if (res) await requireMembership(res.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'RECEPTIONIST']);"),
        (r'(export async function createOutlet\(input: \{ organizationId: string; name: string; type: \'RESTAURANT\' \| \'BAR\' \| \'CLUB\' \| \'SPA\' \}\) \{\n\s*try \{)', r"\1\n    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);"),
        (r'(export async function updateOutlet\(\n\s*outletId: string,\n\s*input: \{ name\?: string; type\?: \'RESTAURANT\' \| \'BAR\' \| \'CLUB\' \| \'SPA\' \}\n\) \{\n\s*try \{)', r"\1\n    const outlet = await db.orm.public.Outlet.where({ id: outletId }).all().first();\n    if (outlet) await requireMembership(outlet.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);"),
        (r'(export async function deleteOutlet\(outletId: string\) \{\n\s*try \{)', r"\1\n    const outlet = await db.orm.public.Outlet.where({ id: outletId }).all().first();\n    if (outlet) await requireMembership(outlet.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);"),
        (r'(export async function createOutletItem\(input: \{ outletId: string; name: string; price: number; category: string \}\) \{\n\s*try \{)', r"\1\n    const outlet = await db.orm.public.Outlet.where({ id: input.outletId }).all().first();\n    if (outlet) await requireMembership(outlet.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);"),
        (r'(export async function updateOutletItem\(itemId: string, input: \{ name\?: string; price\?: number; category\?: string \}\) \{\n\s*try \{)', r"\1\n    const item = await db.orm.public.OutletItem.where({ id: itemId }).all().first();\n    if (item) {\n      const outlet = await db.orm.public.Outlet.where({ id: item.outletId }).all().first();\n      if (outlet) await requireMembership(outlet.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);\n    }"),
        (r'(export async function deleteOutletItem\(itemId: string\) \{\n\s*try \{)', r"\1\n    const item = await db.orm.public.OutletItem.where({ id: itemId }).all().first();\n    if (item) {\n      const outlet = await db.orm.public.Outlet.where({ id: item.outletId }).all().first();\n      if (outlet) await requireMembership(outlet.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);\n    }"),
        (r'(export async function createOutletOrder\(input: \{ organizationId: string; outletId: string; tabName: string \}\) \{\n\s*try \{)', r"\1\n    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'RECEPTIONIST', 'STAFF']);"),
        (r'(export async function addItemToOrder\(input: \{ outletOrderId: string; outletItemId: string; quantity: number \}\) \{\n\s*try \{)', r"\1\n    const order = await db.orm.public.OutletOrder.where({ id: input.outletOrderId }).all().first();\n    if (order) await requireMembership(order.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'RECEPTIONIST', 'STAFF']);"),
        (r'(export async function chargeOrderToRoom\(outletOrderId: string, reservationId: string\) \{\n\s*try \{)', r"\1\n    const order = await db.orm.public.OutletOrder.where({ id: outletOrderId }).all().first();\n    if (order) await requireMembership(order.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'RECEPTIONIST', 'STAFF']);"),
        (r'(export async function payOrderDirectly\(outletOrderId: string\) \{\n\s*try \{)', r"\1\n    const order = await db.orm.public.OutletOrder.where({ id: outletOrderId }).all().first();\n    if (order) await requireMembership(order.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'RECEPTIONIST', 'STAFF']);"),
        (r'(export async function createMaintenanceTicket\(input: \{[\s\S]*?\}\) \{\n\s*try \{)', r"\1\n    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'RECEPTIONIST', 'STAFF']);"),
        (r'(export async function updateMaintenanceTicketStatus\(\n\s*ticketId: string,\n\s*status: \'OPEN\' \| \'IN_PROGRESS\' \| \'RESOLVED\'\n\) \{\n\s*try \{)', r"\1\n    const ticket = await db.orm.public.MaintenanceTicket.where({ id: ticketId }).all().first();\n    if (ticket) await requireMembership(ticket.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'STAFF']);"),
        (r'(export async function createRoomBlock\(input: \{[\s\S]*?\}\) \{\n\s*try \{)', r"\1\n    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);"),
        (r'(export async function addReservationToBlock\(input: \{[\s\S]*?\}\) \{\n\s*try \{)', r"\1\n    const res = await db.orm.public.Reservation.where({ id: input.reservationId }).all().first();\n    if (res) await requireMembership(res.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'RECEPTIONIST']);"),
        (r'(export async function runNightAudit\(organizationId: string, auditDateStr: string\) \{\n\s*try \{)', r"\1\n    await requireMembership(organizationId, ['OWNER', 'ADMIN', 'MANAGER']);"),
        (r'(export async function updateRoomStatus\(roomId: string, newStatus: string, housekeeperId\?: string\) \{\n\s*try \{)', r"\1\n    const room = await db.orm.public.HotelRoom.where({ id: roomId }).all().first();\n    if (room) await requireMembership(room.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'HOUSEKEEPER', 'RECEPTIONIST']);"),
    ]

    for pattern, repl in mutations:
        content = re.sub(pattern, repl, content)

    with open('lib/actions/hotel.ts', 'w', encoding='utf-8') as f:
        f.write(content)
        
    print("Injected tenant boundaries into hotel.ts")

if __name__ == '__main__':
    main()
