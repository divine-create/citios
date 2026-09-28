import os
f = 'app/(hq)/hq/ledger/wallets/[walletId]/page.tsx'
with open(f, 'r', encoding='utf-8') as file:
    c = file.read()

c = c.replace("wallet.person.email || wallet.person.name", "(wallet.person as any).email || (wallet.person as any).name")
c = c.replace("wallet.person ?", "(wallet.person as any) ?")
c = c.replace("wallet.organization.name", "(wallet.organization as any).name")

with open(f, 'w', encoding='utf-8') as file:
    file.write(c)

