const fs = require('fs');
let content = fs.readFileSync('lib/actions/retail.ts', 'utf8');

const cancelOld = `    await db.transaction(async (tx: any) => {
      // Restore stock for unpaid pending orders if stock was deducted?`;

const cancelNew = `    await db.transaction(async (tx: any) => {
      const plan = db.raw.sql\`
        UPDATE "retailOrder"
        SET "status" = 'CANCELLED', "fulfillmentStatus" = 'CANCELLED'
        WHERE id = \${orderId} AND "status" != 'CANCELLED'
        RETURNING id
      \`.returnsRow({ id: 'text' }).build();
      const updated = await tx.execute(plan);
      if ((updated && updated.affectedRows === 0) || (Array.isArray(updated) && updated.length === 0) || !updated) {
        throw new Error('Order is already cancelled.');
      }
      
      // Restore stock for unpaid pending orders if stock was deducted?`;

content = content.replace(cancelOld, cancelNew);
content = content.replace(/await tx\.orm\.public\.RetailOrder\.where\(\{ id: orderId \}\)\.update\(\{\r?\n\s*status: 'CANCELLED',\r?\n\s*fulfillmentStatus: 'CANCELLED',\r?\n\s*\}\);/, '// updated atomically above');

fs.writeFileSync('lib/actions/retail.ts', content);
