import os

f = 'lib/actions/hq.ts'
with open(f, 'r', encoding='utf-8') as file:
    c = file.read()

# For inspectPerson, we replaced `Transaction.where({ personId })` which also doesn't exist, we probably replaced it with Promise.resolve([])
replacement_person = """    db.orm.public.Wallet.where({ personId }).all().then(async wallets => {
      if (!wallets.length) return [];
      const walletIds = wallets.map(w => w.id);
      const entries = await db.orm.public.LedgerEntry.where((le) => le.walletId.in(walletIds)).include((inc) => ({ transaction: inc.transaction })).orderBy((le) => le.createdAt.desc()).limit(10).all();
      return entries.map(e => e.transaction).filter(Boolean);
    })"""

c = c.replace("    Promise.resolve([]), // Wait, does person have retail orders?", replacement_person + ", // Wait, does person have retail orders?")
# Actually, I didn't see the exact string I replaced for inspectPerson. Let me grep it.

with open(f, 'w', encoding='utf-8') as file:
    file.write(c)

