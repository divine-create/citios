import os

f = 'lib/actions/hq.ts'
with open(f, 'r', encoding='utf-8') as file:
    c = file.read()

# Replace the Promise.resolve([]) with actual Wallet/LedgerEntry logic
# For inspectOrganization
replacement_org = """    db.orm.public.Wallet.where({ organizationId }).all().then(async wallets => {
      if (!wallets.length) return [];
      const walletIds = wallets.map(w => w.id);
      const entries = await db.orm.public.LedgerEntry.where((le) => le.walletId.in(walletIds)).include((inc) => ({ transaction: inc.transaction })).orderBy((le) => le.createdAt.desc()).limit(10).all();
      return entries.map(e => e.transaction).filter(Boolean);
    }),"""

c = c.replace("    Promise.resolve([]),\n    db.orm.public.RetailOrder.where({ organizationId }).all(),", 
              replacement_org + "\n    db.orm.public.RetailOrder.where({ organizationId }).all(),")

with open(f, 'w', encoding='utf-8') as file:
    file.write(c)

