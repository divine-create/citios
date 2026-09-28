import os
f = 'app/(hq)/hq/ledger/[id]/page.tsx'
with open(f, 'r', encoding='utf-8') as file:
    c = file.read()

c = c.replace("const transaction = await getTransactionTrace(id);", "const transaction: any = await getTransactionTrace(id);")

with open(f, 'w', encoding='utf-8') as file:
    file.write(c)
