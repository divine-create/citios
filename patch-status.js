import fs from 'fs';

let code = fs.readFileSync('lib/actions/restaurantos.ts', 'utf8');

// Update updateOrderStatus to record timestamps
code = code.replace(
  "if (order.status === 'CANCELLED' && status !== 'CANCELLED') throw new Error('Cannot change status of a cancelled order.');",
  `if (order.status === 'CANCELLED' && status !== 'CANCELLED') throw new Error('Cannot change status of a cancelled order.');

      // Update timestamps
      let kitchenStartedAt = order.kitchenStartedAt;
      let kitchenCompletedAt = order.kitchenCompletedAt;
      if (status === 'PREPARING' && !kitchenStartedAt) kitchenStartedAt = new Date();
      if (status === 'READY' && !kitchenCompletedAt) kitchenCompletedAt = new Date();
`
);

code = code.replace(
  /await tx\.orm\.public\.RestaurantOrder\.where\(\{ id: orderId \}\)\.update\(\{ status \}\);/,
  "await tx.orm.public.RestaurantOrder.where({ id: orderId }).update({ status, kitchenStartedAt, kitchenCompletedAt });"
);

// Add updateOrderItemStatus
if (!code.includes('export async function updateOrderItemStatus')) {
  code += `\n
export async function updateOrderItemStatus(
  orderId: string,
  itemId: string,
  kitchenStatus: 'PENDING' | 'PREPARING' | 'READY' | 'DELIVERING' | 'COMPLETED' | 'CANCELLED'
) {
  try {
    const res = await db.transaction(async (tx: any) => {
      const lockedCount = await tx.execute(db.raw.sql\`SELECT id FROM "RestaurantOrder" WHERE id = \${orderId} FOR UPDATE\`.affectedCount().build());
      if (lockedCount === 0) throw new Error('Order not found.');

      const order = await tx.orm.public.RestaurantOrder.where({ id: orderId }).all().first();
      if (!order) throw new Error('Order not found.');
      await requireMembership(order.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'KITCHEN', 'WAITER'], order.locationId);

      const item = await tx.orm.public.OrderItem.where({ id: itemId }).all().first();
      if (!item) throw new Error('Item not found.');

      await tx.orm.public.OrderItem.where({ id: itemId }).update({ kitchenStatus });

      // If all items are READY or COMPLETED, mark order as READY
      const allItems = await tx.orm.public.OrderItem.where({ orderId }).all();
      const allReady = allItems.every((i: any) => 
        i.id === itemId ? ['READY', 'COMPLETED'].includes(kitchenStatus) : ['READY', 'COMPLETED'].includes(i.kitchenStatus)
      );

      if (allReady && !['READY', 'COMPLETED', 'DELIVERING'].includes(order.status)) {
        await tx.orm.public.RestaurantOrder.where({ id: orderId }).update({ 
          status: 'READY',
          kitchenCompletedAt: order.kitchenCompletedAt || new Date()
        });
      }
      
      // If any item is PREPARING, mark order as PREPARING
      if (kitchenStatus === 'PREPARING' && order.status === 'PENDING') {
        await tx.orm.public.RestaurantOrder.where({ id: orderId }).update({ 
          status: 'PREPARING',
          kitchenStartedAt: order.kitchenStartedAt || new Date()
        });
      }

      return { success: true };
    });
    
    // Fire event/revalidate outside tx
    revalidatePath('/admin/restaurantos');
    return res;
  } catch (error) {
    console.error('Error updating order item status:', error);
    return { error: error instanceof Error ? error.message : 'Failed to update item status.' };
  }
}
`;
}

fs.writeFileSync('lib/actions/restaurantos.ts', code);
