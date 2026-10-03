const fs = require('fs');

let retail = fs.readFileSync('lib/actions/retail.ts', 'utf8');

// 1. adjustStock
retail = retail.replace(
  /const next = current\.stockQuantity \+ delta;\r?\n\s*if \(next < 0\) throw new Error\('Stock cannot go below zero\.'\);\r?\n\s*await tx\.orm\.public\.RetailProduct\.where\(\{ id: productId \}\)\.update\(\{ stockQuantity: next \}\);/g,
  `const loc = await resolveLocationContext(product.organizationId, locationId).catch(e => { throw e; });
      if (loc) {
        const stock = await getOrInitLocationStock(tx, product.organizationId, loc.id, productId);
        const locPlan = db.raw.sql\`
          UPDATE "retailLocationStock"
          SET "stockQuantity" = "stockQuantity" + \${delta}
          WHERE id = \${stock.id} AND "stockQuantity" + \${delta} >= 0
        \`.affectedCount();
        const locUpdated = await tx.execute(locPlan);
        if (locUpdated === 0) throw new Error('Stock cannot go below zero.');
        const nextLocQty = stock.stockQuantity + delta;

        await tx.orm.public.RetailStockMovement.create({
          organizationId: current.organizationId,
          locationId: loc.id,
          productId,
          delta,
          beforeQty: stock.stockQuantity,
          afterQty: nextLocQty,
          reason: 'MANUAL_CORRECTION',
          note: note || 'Manual adjustment',
          recordedById: membership.id,
        });
      } else {
        const prodPlan = db.raw.sql\`
          UPDATE "retailProduct"
          SET "stockQuantity" = "stockQuantity" + \${delta}
          WHERE id = \${productId} AND "stockQuantity" + \${delta} >= 0
        \`.affectedCount();
        const prodUpdated = await tx.execute(prodPlan);
        if (prodUpdated === 0) throw new Error('Stock cannot go below zero.');
        const next = current.stockQuantity + delta;

        await tx.orm.public.RetailStockMovement.create({
          organizationId: current.organizationId,
          productId,
          delta,
          beforeQty: current.stockQuantity,
          afterQty: next,
          reason: 'MANUAL_CORRECTION',
          note: note || 'Manual adjustment',
          recordedById: membership.id,
        });
      }`
);

// 2. processCanonicalRetailOrderTransaction (location validation)
retail = retail.replace(
  /let activeLocationId = input\.locationId;\r?\n\s*if \(!activeLocationId\) \{/g,
  `let activeLocationId = input.locationId;
    if (activeLocationId) {
      const validLoc = await tx.orm.public.Location.where({ id: activeLocationId, organizationId: input.organizationId }).all().first();
      if (!validLoc) throw new Error('Location does not belong to this organization.');
    }
    if (!activeLocationId) {`
);

// 3. updateFulfillmentStatus (guardrails)
retail = retail.replace(
  /const order = await tx\.orm\.public\.RetailOrder\.where\(\{ id: orderId \}\)\.all\(\)\.first\(\);\r?\n\s*if \(!order\) throw new Error\('Order not found\.'\);\r?\n\s*if \(order\.status !== 'CONFIRMED'\) return \{ error: 'Order must be confirmed before fulfillment\.' \};/g,
  `const order = await tx.orm.public.RetailOrder.where({ id: orderId }).all().first();
      if (!order) throw new Error('Order not found.');
      if (order.status !== 'CONFIRMED') return { error: 'Order must be confirmed before fulfillment.' };
      
      const levels = { UNFULFILLED: 0, PROCESSING: 1, READY: 2, FULFILLED: 3, CANCELLED: 4, RETURNED: 5 };
      if (status in levels && order.fulfillmentStatus in levels) {
        if (levels[status as keyof typeof levels] < levels[order.fulfillmentStatus as keyof typeof levels]) {
          throw new Error('Cannot regress fulfillment state.');
        }
      }`
);

// 4. cancelOrder (new)
const cancelOrderCode = `
export async function cancelOrder(orderId: string, input: { reason?: string }) {
  try {
    const o = await db.orm.public.RetailOrder.where({ id: orderId }).all().first();
    if (!o) return { error: 'Order not found.' };
    const { membership } = await requireMembership(o.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);

    await db.transaction(async (tx: any) => {
      const plan = db.raw.sql\`
        UPDATE "retailOrder"
        SET "status" = 'CANCELLED', "fulfillmentStatus" = 'CANCELLED'
        WHERE id = \${orderId} AND "status" != 'CANCELLED'
      \`.affectedCount();
      const updated = await tx.execute(plan);
      if (updated === 0) throw new Error('Order is already cancelled or cannot be cancelled.');
      
      const order = await tx.orm.public.RetailOrder.where({ id: orderId }).all().first();
      const items = await tx.orm.public.RetailOrderItem.where({ orderId }).all();
      for (const item of items) {
        const product = await tx.orm.public.RetailProduct.where({ id: item.productId }).all().first();
        if (product && !product.isWeighed && order.locationId) {
          const stock = await tx.orm.public.RetailLocationStock.where({ organizationId: product.organizationId, locationId: order.locationId, productId: product.id }).all().first();
          if (stock) {
            const plan3 = db.raw.sql\`
              UPDATE "retailLocationStock"
              SET "stockQuantity" = "stockQuantity" + \${item.quantity}
              WHERE id = \${stock.id}
            \`.affectedCount();
            await tx.execute(plan3);
            const afterQty = stock.stockQuantity + item.quantity;
            await tx.orm.public.RetailStockMovement.create({
              organizationId: product.organizationId,
              locationId: stock.locationId,
              productId: product.id,
              delta: item.quantity,
              beforeQty: stock.stockQuantity,
              afterQty: afterQty,
              reason: 'CANCELLATION',
              referenceType: 'CANCELLATION',
              referenceId: item.id,
              note: input.reason ?? \`Order \${order.id.slice(0, 8)} cancelled\`,
              recordedById: membership.id,
            });
          }
        }
      }
    });
    revalidatePath('/orders');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Cancellation failed.' };
  }
}
`;
retail = retail + cancelOrderCode;

// 5. refundOrder (fix status and atomic restore)
retail = retail.replace(
  /export async function refundOrder[\s\S]*?revalidatePath\('\/orders'\);\r?\n\s*return \{ success: true \};\r?\n\s*\} catch \(error: any\) \{\r?\n\s*return \{ error: error\.message \|\| 'Refund failed\.' \};\r?\n\s*\}\r?\n\}/g,
  `export async function refundOrder(orderId: string, input: { reason?: string }) {
  try {
    const o = await db.orm.public.RetailOrder.where({ id: orderId }).all().first();
    if (!o) return { error: 'Order not found.' };
    const { membership } = await requireMembership(o.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);

    await db.transaction(async (tx: any) => {
      const order = await tx.orm.public.RetailOrder.where({ id: orderId }).all().first();
      if (!order) throw new Error('Order not found.');
      if (order.status === 'CANCELLED' && order.refundedAt) throw new Error('Order is already refunded.');
      if (order.status === 'PENDING') throw new Error('Order is unpaid.');

      const plan = db.raw.sql\`
        UPDATE "retailOrder"
        SET "status" = 'CANCELLED', "fulfillmentStatus" = 'CANCELLED', "refundedAt" = now()
        WHERE id = \${order.id} AND "status" != 'CANCELLED'
      \`.affectedCount();
      const updated = await tx.execute(plan);
      if (updated === 0) {
        throw new Error('Order is already refunded.');
      }

      const items = await tx.orm.public.RetailOrderItem.where({ orderId }).all();
      for (const item of items) {
        const product = await tx.orm.public.RetailProduct.where({ id: item.productId }).all().first();
        if (product && !product.isWeighed && order.locationId) {
          const stock = await tx.orm.public.RetailLocationStock.where({ organizationId: product.organizationId, locationId: order.locationId, productId: product.id }).all().first();
          if (stock) {
            const plan3 = db.raw.sql\`
              UPDATE "retailLocationStock"
              SET "stockQuantity" = "stockQuantity" + \${item.quantity}
              WHERE id = \${stock.id}
            \`.affectedCount();
            await tx.execute(plan3);
            const afterQty = stock.stockQuantity + item.quantity;
            await tx.orm.public.RetailStockMovement.create({
              organizationId: product.organizationId,
              locationId: stock.locationId,
              productId: product.id,
              delta: item.quantity,
              beforeQty: stock.stockQuantity,
              afterQty: afterQty,
              reason: 'REFUND',
              referenceType: 'REFUND',
              referenceId: item.id,
              note: input.reason ?? \`Order \${order.id.slice(0, 8)} refunded\`,
              recordedById: membership.id,
            });
          }
        }
      }
      const existingPayment = await tx.orm.public.Payment.where({ retailOrderId: order.id, status: 'COMPLETED' }).all().first();
      if (existingPayment) {
        await tx.orm.public.Payment.where({ id: existingPayment.id }).update({ status: 'REFUNDED' });
      }
    });
    revalidatePath('/orders');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Refund failed.' };
  }
}`
);

fs.writeFileSync('lib/actions/retail.ts', retail);

// COMMERCE.TS FIXES
let commerce = fs.readFileSync('app/actions/commerce.ts', 'utf8');

// 1. fetchMyOrders (add deliveryJobId and real fulfillmentStatus)
commerce = commerce.replace(
  /status: o\.status === 'PENDING' \? 'pending' : 'completed',\r?\n\s*fulfillmentStatus: o\.status === 'PENDING' \? 'packing' : 'delivered',/g,
  `status: o.status === 'PENDING' ? 'pending' : 'completed',
          fulfillmentStatus: o.fulfillmentStatus,
          deliveryJobId: o.delivery?.id,`
);
commerce = commerce.replace(
  /const orders = await db\.orm\.public\.RetailOrder\.where\(\{ customerDataId: cust\.id \}\)\.all\(\);/g,
  `const orders = await db.orm.public.RetailOrder.where({ customerDataId: cust.id }).include({ delivery: true }).all();`
);

// 2. getCityMartProducts (stock reduction check)
commerce = commerce.replace(
  /if \(!p\.isWeighed && p\.stockQuantity <= 0\) return null;/g,
  `
      const pStock = await db.orm.public.RetailLocationStock.where({ productId: p.id }).all();
      const locIds = locs.map(l => l.id);
      const available = pStock.filter(s => locIds.includes(s.locationId)).reduce((acc, s) => acc + s.stockQuantity, 0);
      if (available <= 0 && !p.isWeighed) return null;`
);

// 3. placeRetailOrder (atomic checkout deduction)
commerce = commerce.replace(
  /const locStock = await tx\.orm\.public\.RetailLocationStock\.where\(\{ locationId: input\.locationId, productId: verifiedItem\.productId \}\)\.all\(\)\.first\(\);\r?\n\s*if \(!locStock \|\| locStock\.stockQuantity < verifiedItem\.quantity\) \{\r?\n\s*throw new Error\(`Insufficient stock for item at this location\.`\);\r?\n\s*\}\r?\n\s*const nextStock = locStock\.stockQuantity - verifiedItem\.quantity;\r?\n\s*await tx\.orm\.public\.RetailLocationStock\.where\(\{ locationId: input\.locationId, productId: verifiedItem\.productId \}\)\.update\(\{ stockQuantity: nextStock \}\);/g,
  `const locStock = await tx.orm.public.RetailLocationStock.where({ locationId: input.locationId, productId: verifiedItem.productId }).all().first();
               if (!locStock) {
                   throw new Error(\`Insufficient stock for item at this location.\`);
               }
               const plan = db.raw.sql\`
                   UPDATE "retailLocationStock"
                   SET "stockQuantity" = "stockQuantity" - \${verifiedItem.quantity}
                   WHERE id = \${locStock.id} AND "stockQuantity" >= \${verifiedItem.quantity}
               \`.affectedCount();
               const updated = await tx.execute(plan);
               if (updated === 0) {
                   throw new Error(\`Insufficient stock for item at this location.\`);
               }
               const nextStock = locStock.stockQuantity - verifiedItem.quantity;`
);

commerce = commerce.replace(
  /const product = await tx\.orm\.public\.RetailProduct\.where\(\{ id: verifiedItem\.productId \}\)\.all\(\)\.first\(\);\r?\n\s*if \(product && !product\.isWeighed\) \{\r?\n\s*const nextStock = product\.stockQuantity - verifiedItem\.quantity;\r?\n\s*if \(nextStock < 0\) \{\r?\n\s*throw new Error\(`Item "\$\{product\.name\}" has insufficient stock\.`\);\r?\n\s*\}\r?\n\s*await tx\.orm\.public\.RetailProduct\.where\(\{ id: verifiedItem\.productId \}\)\.update\(\{ stockQuantity: nextStock \}\);/g,
  `const product = await tx.orm.public.RetailProduct.where({ id: verifiedItem.productId }).all().first();
               if (product && !product.isWeighed) {
                 const plan = db.raw.sql\`
                   UPDATE "retailProduct"
                   SET "stockQuantity" = "stockQuantity" - \${verifiedItem.quantity}
                   WHERE id = \${product.id} AND "stockQuantity" >= \${verifiedItem.quantity}
                 \`.affectedCount();
                 const updated = await tx.execute(plan);
                 if (updated === 0) {
                   throw new Error(\`Item "\${product.name}" has insufficient stock.\`);
                 }
                 const nextStock = product.stockQuantity - verifiedItem.quantity;`
);

fs.writeFileSync('app/actions/commerce.ts', commerce);
