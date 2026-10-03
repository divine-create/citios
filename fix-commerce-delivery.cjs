const fs = require('fs');
let content = fs.readFileSync('app/actions/commerce.ts', 'utf8');

content = content.replace(
  "const items = await db.orm.public.RetailOrderItem.where({ orderId: o.id }).all();",
  "const items = await db.orm.public.RetailOrderItem.where({ orderId: o.id }).all();\n      const delivery = await db.orm.public.DeliveryJob.where({ retailOrderId: o.id }).all().first();"
);
content = content.replace(
  "deliveryJobId: o.delivery?.id || null,",
  "deliveryJobId: delivery?.id || null,"
);

fs.writeFileSync('app/actions/commerce.ts', content);
