import fs from "fs";
let s = fs.readFileSync("lib/actions/retail.ts", "utf8");

const startIdx = s.indexOf("        const product = await tx.orm.public.RetailProduct.where({ id: item.productId }).all().first();");
const endIdx = s.indexOf("      await tx.orm.public.RetailOrder.where({ id: orderId }).update({");

if (startIdx !== -1 && endIdx !== -1) {
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
              referenceId: item.id, // Idempotency
              note: input.reason ?? \`Order \${order.id.slice(0, 8)} refunded\`,
              recordedById: membership.id,
            });
          }
        }
      }
`;
  s = s.substring(0, startIdx) + newRefundStr + s.substring(endIdx);
  fs.writeFileSync("lib/actions/retail.ts", s);
  console.log("Patched refundOrder");
} else {
  console.log("Indices not found");
}
