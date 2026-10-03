const fs = require('fs');
let orders = fs.readFileSync('app/actions/orders.ts', 'utf8');

// Add delivery job fetch for retail
orders = orders.replace(
  /const payment = await db\.orm\.public\.Payment\.where\(\{ retailOrderId: order\.id \}\)\.all\(\)\.first\(\);/g,
  `const payment = await db.orm.public.Payment.where({ retailOrderId: order.id }).all().first();
    const delivery = await db.orm.public.DeliveryJob.where({ retailOrderId: order.id }).all().first();`
);

orders = orders.replace(
  /return \{ \.\.\.order, org, items: enrichedItems, payment \};/g,
  `return { ...order, org, items: enrichedItems, payment, delivery };`
);

fs.writeFileSync('app/actions/orders.ts', orders);

// Fix CityProfile implicit any
let profile = fs.readFileSync('components/cityos/CityProfile.tsx', 'utf8');
profile = profile.replace(
  /\.then\(orders => \{ setRealOrders\(orders\); setOrdersError\(false\); \}\)/g,
  `.then((orders: any) => { setRealOrders(orders); setOrdersError(false); })`
);
profile = profile.replace(
  /\.catch\(err => \{ console\.error\(err\); setOrdersError\(true\); \}\);/g,
  `.catch((err: any) => { console.error(err); setOrdersError(true); });`
);
fs.writeFileSync('components/cityos/CityProfile.tsx', profile);
