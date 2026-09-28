import os
f = 'app/(hq)/hq/ledger/wallets/[walletId]/page.tsx'
with open(f, 'r', encoding='utf-8') as file:
    c = file.read()

c = c.replace("{wallet.organization.name}", "{wallet.organization.name as string}")
c = c.replace("{wallet.person.email || wallet.person.name}", "{(wallet.person.email || wallet.person.name) as string}")

with open(f, 'w', encoding='utf-8') as file:
    file.write(c)

