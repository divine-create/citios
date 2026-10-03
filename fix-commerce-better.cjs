const fs = require('fs');
let content = fs.readFileSync('app/actions/commerce.ts', 'utf8');

content = content.replace(
  /status: o\.status === 'CONFIRMED' \? 'packing' : 'delivered',/,
  "status: o.status === 'CANCELLED' ? 'CANCELLED' : o.fulfillmentStatus,\n        deliveryJobId: o.delivery?.id || null,"
);

fs.writeFileSync('app/actions/commerce.ts', content);
