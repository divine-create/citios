import re

f = 'lib/actions/hq.ts'
with open(f, 'r', encoding='utf-8') as file:
    c = file.read()

c = re.sub(r'const \[\s*memberships,\s*locations,\s*transactions,\s*orders,\s*auditEvents\s*\] = await Promise.all',
           'const [ memberships, locations, wallets, transactions, orders, auditEvents ] = await Promise.all',
           c)

with open(f, 'w', encoding='utf-8') as file:
    file.write(c)
