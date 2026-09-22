import fs from "fs";
let s = fs.readFileSync("lib/actions/retail.ts", "utf8");

const oldRefundStr = `        const product = await tx.orm.public.RetailProduct.where({ id: item.productId }).all().first();
        if (product) {
          await tx.orm.public.RetailProduct.where({ id: item.productId }).update({ stockQuantity: product.stockQuantity + item.quantity });
          await tx.orm.public.RetailStockMovement.create({
            organizationId: product.organizationId,
            productId: product.id,
            delta: item.quantity,
            beforeQty: product.stockQuantity,
            afterQty: product.stockQuantity + item.quantity,
            reason: 'REFUND',
            note: input.reason ?? \`Order \${order.id.slice(0, 8)} refunded\`,
            recordedById: membership.id,
          });
        }`;

const newRefundStr = `        const product = await tx.orm.public.RetailProduct.where({ id: item.productId }).all().first();
        if (product && !product.isWeighed && order.locationId) {
          const stock = await tx.orm.public.RetailLocationStock.where({ organizationId: product.organizationId, locationId: order.locationId, productId: product.id }).all().first();
          if (stock) {
            const updated = await tx.sql\`
              UPDATE "RetailLocationStock"
              SET "stockQuantity" = "stockQuantity" + \${item.quantity}
              WHERE id = \${stock.id}
              RETURNING "stockQuantity"
            \`;
            
            await tx.orm.public.RetailStockMovement.create({
              organizationId: product.organizationId,
              locationId: order.locationId,
              productId: product.id,
              delta: item.quantity,
              beforeQty: stock.stockQuantity,
              afterQty: updated[0].stockQuantity,
              reason: 'REFUND',
              referenceType: 'REFUND',
              referenceId: item.id, // Idempotency key per item
              note: input.reason ?? \`Order \${order.id.slice(0, 8)} refunded\`,
              recordedById: membership.id,
            });
          }
        }`;

if (s.includes(oldRefundStr)) {
  s = s.replace(oldRefundStr, newRefundStr);
  fs.writeFileSync("lib/actions/retail.ts", s);
  console.log("refundOrder patched");
} else {
  console.log("Could not find refund pattern to patch.");
}
