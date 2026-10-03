const fs = require('fs');
let content = fs.readFileSync('lib/actions/retail.ts', 'utf8');

const oldCode = /const order = await tx\.orm\.public\.RetailOrder\.where\(\{ id: orderId \}\)\.all\(\)\.first\(\);\r?\n\s*if \(!order\) throw new Error\('Order not found\.'\);\r?\n\s*if \(order\.status === 'CANCELLED' && order\.refundedAt\) throw new Error\('Order is already refunded\.'\);\r?\n\s*if \(order\.status === 'PENDING'\) throw new Error\('Order is unpaid\.'\);/g;

const newCode = `const order = await tx.orm.public.RetailOrder.where({ id: orderId }).all().first();
      if (!order) throw new Error('Order not found.');
      if (order.status === 'CANCELLED' && order.refundedAt) throw new Error('Order is already refunded.');
      if (order.status === 'PENDING') throw new Error('Order is unpaid.');

      const plan = db.raw.sql\`
        UPDATE "retailOrder"
        SET "status" = 'CANCELLED', "fulfillmentStatus" = 'CANCELLED', "refundedAt" = now()
        WHERE id = \${order.id} AND "status" != 'CANCELLED'
        RETURNING id
      \`.returnsRow({ id: 'text' }).build();
      const updated = await tx.execute(plan);
      if ((updated && updated.affectedRows === 0) || (Array.isArray(updated) && updated.length === 0) || !updated) {
        throw new Error('Order is already refunded.');
      }`;

content = content.replace(oldCode, newCode);
fs.writeFileSync('lib/actions/retail.ts', content);
