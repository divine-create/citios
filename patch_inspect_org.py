import os
import re

f = 'lib/actions/hq.ts'
with open(f, 'r', encoding='utf-8') as file:
    c = file.read()

# Fix inspectOrganization Promise.all array and destructuring
c = c.replace('''    ] = await Promise.all([
      db.orm.public.Membership.where({ organizationId }).all(),
      db.orm.public.Location.where({ organizationId }).all(),
      db.orm.public.Wallet.where({ organizationId }).all().then(async wallets => {
        if (!wallets.length) return [];
        const walletIds = wallets.map(w => w.id);
        const entries = await db.orm.public.LedgerEntry.where((le) => le.walletId.in(walletIds)).include('transaction').orderBy((le) => le.createdAt.desc()).limit(10).all();
        return entries.map(e => e.transaction).filter(Boolean);
      }),
      db.orm.public.RetailOrder.where({ organizationId }).all(),
      db.orm.public.HQAuditEvent.where({ targetId: organizationId }).all()
    ]);''', 
'''    ] = await Promise.all([
      db.orm.public.Membership.where({ organizationId }).all(),
      db.orm.public.Location.where({ organizationId }).all(),
      db.orm.public.Wallet.where({ organizationId }).all(),
      db.orm.public.Wallet.where({ organizationId }).all().then(async wallets => {
        if (!wallets.length) return [];
        const walletIds = wallets.map(w => w.id);
        const entries = await db.orm.public.LedgerEntry.where((le) => le.walletId.in(walletIds)).include('transaction').orderBy((le) => le.createdAt.desc()).limit(10).all();
        return entries.map(e => e.transaction).filter(Boolean);
      }),
      db.orm.public.RetailOrder.where({ organizationId }).all(),
      db.orm.public.HQAuditEvent.where({ targetId: organizationId }).all()
    ]);''')

# Fix destructuring for inspectOrganization
c = c.replace('''    const [
      memberships,
      locations,
      transactions,
      orders,
      auditEvents
    ] = await Promise.all([''',
'''    const [
      memberships,
      locations,
      wallets,
      transactions,
      orders,
      auditEvents
    ] = await Promise.all([''')

c = c.replace('''    return {
      organization: org,
      memberships: enrichedMemberships,
      locations,
      recentTransactions: transactions.slice(-10),
      recentOrders: orders.slice(-10),
      recentAuditEvents: auditEvents.slice(-10),
    };''',
'''    return {
      organization: org,
      memberships: enrichedMemberships,
      locations,
      wallets,
      recentTransactions: transactions.slice(-10),
      recentOrders: orders.slice(-10),
      recentAuditEvents: auditEvents.slice(-10),
    };''')

# Fix Ledger data type error in page
f2 = 'app/(hq)/hq/ledger/page.tsx'
with open(f2, 'r', encoding='utf-8') as file:
    c2 = file.read()
c2 = c2.replace("const totalPages = Math.ceil(ledgerData.total / 50);", "const totalPages = Math.ceil((ledgerData.total as number) / 50);")
c2 = c2.replace("overview.metrics.totalTransactions", "(overview.metrics.totalTransactions as number)")
c2 = c2.replace("overview.metrics.totalPaymentVolume.toLocaleString()", "(overview.metrics.totalPaymentVolume as number).toLocaleString()")
c2 = c2.replace("overview.metrics.successfulPaymentsCount", "(overview.metrics.successfulPaymentsCount as number)")
c2 = c2.replace("overview.metrics.totalRefundVolume.toLocaleString()", "(overview.metrics.totalRefundVolume as number).toLocaleString()")
c2 = c2.replace("overview.metrics.refundCount", "(overview.metrics.refundCount as number)")

with open(f2, 'w', encoding='utf-8') as file:
    file.write(c2)

