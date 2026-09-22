import fs from 'fs';

let content = fs.readFileSync('lib/actions/retail.ts', 'utf8');

const start = content.indexOf('export async function refundOrder(');
const end = content.indexOf('export async function getSuppliers(', start);
if (end === -1) {
  console.log("Could not find getSuppliers!");
  process.exit(1);
}

const newRefundOrder = `export async function refundOrder(orderId: string, input: { reason?: string }) {
  try {
    const o = await db.orm.public.RetailOrder.where({ id: orderId }).all().first();
    if (!o) return { error: 'Order not found.' };
    const { membership } = await requireMembership(o.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);

    await db.transaction(async (tx) => {
      const order = await tx.orm.public.RetailOrder.where({ id: orderId }).all().first();
      if (!order) throw new Error('Order not found.');
      if (order.status === 'REFUNDED') throw new Error('Order is already refunded.');

      const items = await tx.orm.public.RetailOrderItem.where({ orderId }).all();
      for (const item of items) {
        const product = await tx.orm.public.RetailProduct.where({ id: item.productId }).all().first();
        if (product) {
          if (order.locationId) {
            const stock = await getOrInitLocationStock(tx, product.organizationId, order.locationId, product.id);
            const next = stock.stockQuantity + item.quantity;
            await tx.orm.public.RetailLocationStock.where({ id: stock.id }).update({ stockQuantity: next });
            await tx.orm.public.RetailStockMovement.create({
              organizationId: product.organizationId,
              locationId: order.locationId,
              productId: product.id,
              delta: item.quantity,
              beforeQty: stock.stockQuantity,
              afterQty: next,
              reason: 'REFUND',
              note: input.reason ?? \`Order \${order.id.slice(0, 8)} refunded\`,
              referenceType: 'ORDER',
              referenceId: order.id,
              recordedById: membership.id,
            });
          } else {
            await tx.orm.public.RetailProduct.where({ id: item.productId }).update({ stockQuantity: product.stockQuantity + item.quantity });
            await tx.orm.public.RetailStockMovement.create({
              organizationId: product.organizationId,
              productId: product.id,
              delta: item.quantity,
              beforeQty: product.stockQuantity,
              afterQty: product.stockQuantity + item.quantity,
              reason: 'REFUND',
              note: input.reason ?? \`Order \${order.id.slice(0, 8)} refunded\`,
              referenceType: 'ORDER',
              referenceId: order.id,
              recordedById: membership.id,
            });
          }
        }
      }

      await tx.orm.public.RetailOrder.where({ id: orderId }).update({
        status: 'REFUNDED',
        refundedAt: (globalThis as any).Temporal.Instant.fromEpochMilliseconds(new Date().getTime()),
        refundedById: membership.id,
        refundReason: input.reason,
      });
    });

    revalidatePath('/market');
    revalidatePath('/workspaces/shopos');
    return { success: true };
  } catch (error) {
    console.error('Error refunding order:', error);
    return { error: error instanceof Error ? error.message : 'Failed to refund order.' };
  }
}

// ---------------------------------------------------------------------
// Suppliers & Purchase Orders
// ---------------------------------------------------------------------

`;

content = content.substring(0, start) + newRefundOrder + content.substring(end);
fs.writeFileSync('lib/actions/retail.ts', content);
console.log('Patched refundOrder safely');
