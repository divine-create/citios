import fs from 'fs';

let code = fs.readFileSync('lib/actions/retail.ts', 'utf8');

code = code.replace(
  /export async function createOrder\(input: \{\n  organizationId: string;\n  shiftId\?: string;\n  customerDataId\?: string;\n  items:/,
  `export async function createOrder(input: {
  organizationId: string;
  shiftId?: string;
  locationId?: string;
  idempotencyKey?: string;
  customerDataId?: string;
  items:`
);

code = code.replace(
  /const \{ membership \} = await requireMembership\(input\.organizationId/,
  `if (input.idempotencyKey) {
      const existing = await db.orm.public.RetailOrder.where({ idempotencyKey: input.idempotencyKey }).all().first();
      if (existing) return { success: true, orderId: existing.id, totalAmount: existing.totalAmount, taxAmount: existing.taxAmount };
    }
    const { membership } = await requireMembership(input.organizationId`
);

code = code.replace(
  /const next = Math\.max\(0, product\.stockQuantity - line\.quantity\);\n          await tx\.orm\.public\.RetailProduct\.where\(\{ id: line\.productId \}\)\.update\(\{ stockQuantity: next \}\);/,
  `if (!product.isWeighed && product.stockQuantity < line.quantity) throw new Error(\`Concurrency error: Not enough stock for \${product.name}\`);
          const next = product.stockQuantity - line.quantity;
          await tx.orm.public.RetailProduct.where({ id: line.productId }).update({ stockQuantity: next });`
);

code = code.replace(
  /const created = await tx\.orm\.public\.RetailOrder\.create\(\{[\s\S]*?status: 'COMPLETED',\n        \}\);/,
  `const created = await tx.orm.public.RetailOrder.create({
          organizationId: input.organizationId,
          shiftId: input.shiftId,
          locationId: input.locationId,
          cashierId,
          customerDataId: input.customerDataId,
          couponId: coupon?.id,
          totalAmount,
          taxAmount,
          discountAmount,
          paymentMethod: input.paymentMethod,
          status: 'COMPLETED',
          idempotencyKey: input.idempotencyKey,
        });`
);

code = code.replace(
  /await tx\.orm\.public\.RetailStockMovement\.create\(\{[\s\S]*?organizationId: input\.organizationId,\n              productId: line\.productId,\n              delta: -line\.quantity,\n              beforeQty: product\.stockQuantity,\n              afterQty: next,\n              reason: 'SALE',\n              note: `Order \$\{created\.id\.slice\(0, 8\)\}`,\n              recordedById: cashierId,\n            \}\);/,
  `await tx.orm.public.RetailStockMovement.create({
              organizationId: input.organizationId,
              locationId: input.locationId,
              productId: line.productId,
              delta: -line.quantity,
              beforeQty: product.stockQuantity,
              afterQty: next,
              reason: 'SALE',
              referenceType: 'ORDER',
              referenceId: created.id,
              note: \`Order \${created.id.slice(0, 8)}\`,
              recordedById: cashierId,
            });`
);

fs.writeFileSync('lib/actions/retail.ts', code);
console.log('createOrder updated successfully');
