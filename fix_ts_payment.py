import sys

with open('app/actions/payment.ts', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('primaryOrderId = res.reservationId;', 'primaryOrderId = (res as any).reservationId;')

with open('app/actions/payment.ts', 'w', encoding='utf-8') as f:
    f.write(c)
