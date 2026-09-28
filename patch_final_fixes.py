import os

f = 'lib/actions/hq.ts'
with open(f, 'r', encoding='utf-8') as file:
    lines = file.readlines()

out = []
for i, line in enumerate(lines):
    if "db.orm.public.Wallet.where({ organizationId }).all().then(async wallets => {" in line:
        out.append("      db.orm.public.Wallet.where({ organizationId }).all(),\n")
        out.append(line)
    elif "recentTransactions: transactions.slice(-10)," in line:
        out.append("      wallets,\n")
        out.append(line)
    else:
        out.append(line)

with open(f, 'w', encoding='utf-8') as file:
    file.writelines(out)

f2 = 'lib/actions/hq-ledger.ts'
with open(f2, 'r', encoding='utf-8') as file:
    c2 = file.read()

c2 = c2.replace(".include('organization', 'person')", ".include('organization').include('person')")
with open(f2, 'w', encoding='utf-8') as file:
    file.write(c2)

