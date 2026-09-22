import fs from 'fs';

let code = fs.readFileSync('lib/actions/retail.ts', 'utf8');

// Patch refundOrder
code = code.replace(
  /await tx\.orm\.public\.RetailStockMovement\.create\(\{[\s\S]*?organizationId: product\.organizationId,\n              productId: product\.id,\n              delta: item\.quantity,\n              beforeQty: product\.stockQuantity,\n              afterQty: product\.stockQuantity \+ item\.quantity,\n              reason: 'REFUND',\n              note: input\.reason \?\? `Order \$\{order\.id\.slice\(0, 8\)\} refunded`,\n              recordedById: membership\.id,\n            \}\);/,
  `await tx.orm.public.RetailStockMovement.create({
              organizationId: product.organizationId,
              locationId: order.locationId,
              productId: product.id,
              delta: item.quantity,
              beforeQty: product.stockQuantity,
              afterQty: product.stockQuantity + item.quantity,
              reason: 'REFUND',
              referenceType: 'ORDER',
              referenceId: order.id,
              note: input.reason ?? \`Order \${order.id.slice(0, 8)} refunded\`,
              recordedById: membership.id,
            });`
);

// Patch adjustStock
code = code.replace(
  /export async function adjustStock\(productId: string, delta: number, note\?: string\)/,
  `export async function adjustStock(productId: string, delta: number, locationId?: string, note?: string)`
);

code = code.replace(
  /await tx\.orm\.public\.RetailStockMovement\.create\(\{[\s\S]*?organizationId: current\.organizationId,\n          productId,\n          delta,\n          beforeQty: current\.stockQuantity,\n          afterQty: next,\n          reason: 'ADJUSTMENT',\n          note: note \?\? null,\n          recordedById: membership\.id,\n        \}\);/,
  `await tx.orm.public.RetailStockMovement.create({
          organizationId: current.organizationId,
          locationId: locationId,
          productId,
          delta,
          beforeQty: current.stockQuantity,
          afterQty: next,
          reason: 'ADJUSTMENT',
          note: note ?? null,
          recordedById: membership.id,
        });`
);

fs.writeFileSync('lib/actions/retail.ts', code);
console.log('refundOrder and adjustStock updated successfully');
