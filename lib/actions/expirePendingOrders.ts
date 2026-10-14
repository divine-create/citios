import { db } from "@/src/prisma/db";
import { handleFailedRetailPayment } from "./citypay";

function toEpochMs(val: any): number {
  if (!val) return 0;
  if (typeof val.epochMilliseconds === 'number') return val.epochMilliseconds;
  if (typeof val.getTime === 'function') return val.getTime();
  return new Date(String(val)).getTime();
}

export async function expirePendingOrders(thresholdMinutes: number = 30) {
  const thresholdMs = Date.now() - thresholdMinutes * 60 * 1000;
  
  // 1. Expire stale Retail Orders & restore reserved stock
  const pendingRetailOrders = await db.orm.public.RetailOrder
    .where({ status: 'PENDING' })
    .all();

  const retailToExpire = pendingRetailOrders.filter(o => toEpochMs(o.createdAt) <= thresholdMs);
  
  for (const order of retailToExpire) {
    try {
      await db.transaction(async (tx: any) => {
        const payment = await tx.orm.public.Payment.where({ retailOrderId: order.id }).all().first();
        if (payment && payment.status === 'PENDING') {
          await tx.orm.public.Payment.where({ id: payment.id }).update({ status: 'CANCELLED' });
        }
        await handleFailedRetailPayment(tx, order.id);
      });
      console.log(`Expired pending retail order ${order.id}`);
    } catch (err) {
      console.error(`Failed to expire retail order ${order.id}`, err);
    }
  }

  // 2. Expire stale Restaurant Orders
  const pendingRestaurantOrders = await db.orm.public.RestaurantOrder
    .where({ status: 'PENDING' })
    .all();

  const restToExpire = pendingRestaurantOrders.filter(o => toEpochMs(o.createdAt) <= thresholdMs);
  
  for (const rOrder of restToExpire) {
    try {
      await db.transaction(async (tx: any) => {
        const payment = await tx.orm.public.Payment.where({ restaurantOrderId: rOrder.id }).all().first();
        if (payment && payment.status === 'PENDING') {
          await tx.orm.public.Payment.where({ id: payment.id }).update({ status: 'CANCELLED' });
        }
        await tx.orm.public.RestaurantOrder.where({ id: rOrder.id }).update({
          status: 'CANCELLED',
          paymentStatus: 'FAILED',
        });
      });
      console.log(`Expired pending restaurant order ${rOrder.id}`);
    } catch (err) {
      console.error(`Failed to expire restaurant order ${rOrder.id}`, err);
    }
  }
}
