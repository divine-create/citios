import os
f = 'lib/actions/hq.ts'
with open(f, 'r', encoding='utf-8') as file:
    c = file.read()

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

with open(f, 'w', encoding='utf-8') as file:
    file.write(c)
