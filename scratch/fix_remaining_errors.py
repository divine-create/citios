import re

def fix_retail(content):
    # 1. ProductCategory -> RetailCategory
    content = content.replace('db.orm.public.ProductCategory', 'db.orm.public.RetailCategory')
    # 2. PurchaseOrder -> RetailPurchaseOrder
    content = content.replace('db.orm.public.PurchaseOrder', 'db.orm.public.RetailPurchaseOrder')
    # 3. BusinessExpense -> RetailExpense
    content = content.replace('db.orm.public.BusinessExpense', 'db.orm.public.RetailExpense')
    # 4. Fix stale o.customerId in enrichCustomers (old code)
    content = content.replace("o.customerId === c.id && o.status === 'COMPLETED'", "o.customerDataId === c.id && o.status === 'COMPLETED'")
    return content

def fix_hotel(content):
    # 1. Fix Transaction.create — Transaction has only status, reference, description
    # The wallet transfer should use LedgerEntry instead
    old_txn = '''          await db.orm.public.Transaction.create({
            amount: total,
            senderWalletId: guestWallet.id,
            receiverWalletId: hotelWallet.id,
            type: 'PAYMENT',
            status: 'COMPLETED',
            description: `Hotel stay settlement for reservation ${reservationId}`
          });'''
    new_txn = '''          const txn = await db.orm.public.Transaction.create({
            status: 'COMPLETED',
            description: `Hotel stay settlement for reservation ${reservationId}`
          });
          await db.orm.public.LedgerEntry.create({ walletId: guestWallet.id, transactionId: txn.id, amount: -total, type: 'DEBIT' });
          await db.orm.public.LedgerEntry.create({ walletId: hotelWallet.id, transactionId: txn.id, amount: total, type: 'CREDIT' });'''
    content = content.replace(old_txn, new_txn)

    # 2. Fix duplicate const order in chargeOrderToRoom — remove the injected auth-check duplicate
    old_dup = '''    const order = await db.orm.public.OutletOrder.where({ id: outletOrderId }).all().first();
    if (order) await requireMembership(order.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'RECEPTIONIST', 'STAFF']);
    const order = await db.orm.public.OutletOrder.where({ id: outletOrderId }).all().first();'''
    new_dup = '''    const order = await db.orm.public.OutletOrder.where({ id: outletOrderId }).all().first();
    if (order) await requireMembership(order.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'RECEPTIONIST', 'STAFF']);'''
    content = content.replace(old_dup, new_dup)

    # Also fix the same pattern in payOrderDirectly
    old_dup2 = '''    const order = await db.orm.public.OutletOrder.where({ id: outletOrderId }).all().first();
    if (order) await requireMembership(order.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'RECEPTIONIST', 'STAFF']);
    const order = await db.orm.public.OutletOrder.where({ id: outletOrderId }).all().first();'''
    content = content.replace(old_dup2, new_dup)

    # 3. Fix addReservationToBlock: the auth check wrongly uses input.reservationId which doesn't exist in the input
    # Replace the bad auth guard with organizationId-based check
    content = content.replace(
        '    const res = await db.orm.public.Reservation.where({ id: input.reservationId }).all().first();\n    if (res) await requireMembership(res.organizationId, [\'OWNER\', \'ADMIN\', \'MANAGER\', \'RECEPTIONIST\']);',
        '    await requireMembership(input.organizationId, [\'OWNER\', \'ADMIN\', \'MANAGER\', \'RECEPTIONIST\']);'
    )
    return content

def fix_shopos(content):
    # Membership.create doesn't accept role — create Membership then MembershipRole
    old = '''    // 2. Add User as Owner
    await db.orm.public.Membership.create({
      personId: session.user.userId,
      organizationId: org.id,
      role: "OWNER",
    });'''
    new = '''    // 2. Add User as Owner via Membership + MembershipRole
    const ownerMembership = await db.orm.public.Membership.create({
      personId: session.user.userId,
      organizationId: org.id,
    });
    await db.orm.public.MembershipRole.create({
      membershipId: ownerMembership.id,
      role: "OWNER",
    });'''
    content = content.replace(old, new)
    return content

with open('lib/actions/retail.ts', 'r', encoding='utf-8') as f:
    retail = f.read()
retail = fix_retail(retail)
with open('lib/actions/retail.ts', 'w', encoding='utf-8') as f:
    f.write(retail)

with open('lib/actions/hotel.ts', 'r', encoding='utf-8') as f:
    hotel = f.read()
hotel = fix_hotel(hotel)
with open('lib/actions/hotel.ts', 'w', encoding='utf-8') as f:
    f.write(hotel)

with open('lib/actions/shopos.ts', 'r', encoding='utf-8') as f:
    shopos = f.read()
shopos = fix_shopos(shopos)
with open('lib/actions/shopos.ts', 'w', encoding='utf-8') as f:
    f.write(shopos)

print("Done")
