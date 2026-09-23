import sys

with open('app/actions/payment.ts', 'r', encoding='utf-8') as f:
    c = f.read()

bad1 = '''      const res = await placeRestaurantOrder({
        items: input.items.map((i) => ({ menuItemId: i.productId, qty: i.qty, name: i.name })),
        type: input.type || 'TAKEOUT',
        tableNumber: input.tableNumber,
        paymentReference: reference,
        method: input.method,
      });'''

good1 = '''      if (!input.locationId) throw new Error('Location is required for food orders');
      const res = await placeRestaurantOrder({
        locationId: input.locationId,
        items: input.items.map((i) => ({ menuItemId: i.productId, qty: i.qty, name: i.name })),
        type: input.type || 'TAKEOUT',
        tableNumber: input.tableNumber,
        paymentReference: reference,
        method: input.method,
      });'''

bad2 = '''    const orderResult: any = await placeRestaurantOrder({
      items: input.items.map((i) => ({ menuItemId: i.productId, qty: i.qty, name: i.name })),
      type: input.type || 'TAKEOUT',
      tableNumber: input.tableNumber,
        paymentReference: reference,
        method: input.method,
    });'''

good2 = '''    if (!input.locationId) throw new Error('Location is required for food orders');
    const orderResult: any = await placeRestaurantOrder({
      locationId: input.locationId,
      items: input.items.map((i) => ({ menuItemId: i.productId, qty: i.qty, name: i.name })),
      type: input.type || 'TAKEOUT',
      tableNumber: input.tableNumber,
      paymentReference: reference,
      method: input.method,
    });'''

c = c.replace(bad1, good1).replace(bad2, good2)

with open('app/actions/payment.ts', 'w', encoding='utf-8') as f:
    f.write(c)
