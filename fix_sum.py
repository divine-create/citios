import os
f = 'lib/actions/hq-ledger.ts'
with open(f, 'r', encoding='utf-8') as file:
    c = file.read()

c = c.replace("volume: a.sum(a.field('amount'))", "volume: a.sum('amount')")

with open(f, 'w', encoding='utf-8') as file:
    file.write(c)
