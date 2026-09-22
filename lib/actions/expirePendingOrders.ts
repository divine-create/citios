import { db } from "@/src/prisma/db";
import { handleFailedRetailPayment } from "./citypay";

export async function expirePendingOrders() {
  const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
  
  const pendingOrders = await db.orm.public.RetailOrder
    .where({ status: 'PENDING' }) // Can't easily filter by date in simple wrapper without builder, let's fetch all and filter in JS for MVP
    .all();

  const toExpire = pendingOrders.filter(o => new Date(o.createdAt) < thirtyMinsAgo);
  
  for (const order of toExpire) {
    try {
      await db.transaction(async (tx: any) => {
        // Find payment
        const payment = await tx.orm.public.Payment.where({ retailOrderId: order.id }).all().first();
        if (payment && payment.status === 'PENDING') {
          await tx.orm.public.Payment.where({ id: payment.id }).update({ status: 'CANCELLED' });
        }
        await handleFailedRetailPayment(tx, order.id);
      });
      console.log(`Expired pending order ${order.id}`);
    } catch (err) {
      console.error(`Failed to expire order ${order.id}`, err);
    }
  }
}
