import sys
with open('app/actions/payment.ts', 'r', encoding='utf-8') as f:
    c = f.read()
c = c.replace('error: Room not found.', 'error: "Room not found."')
with open('app/actions/payment.ts', 'w', encoding='utf-8') as f:
    f.write(c)
