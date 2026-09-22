import { db } from '@/src/prisma/db';

export async function processPaymentEvent(payload: any) {
  const { event, data } = payload;
  const providerEventId = data.id?.toString() || payload.id?.toString();

  if (!providerEventId) {
    throw new Error('No provider event ID found in payload');
  }

  // 1. Check idempotency
  const existingEvent = await db.orm.public.PaymentEvent
    .where({ providerEventId })
    .all()
    .first();

  if (existingEvent) {
    console.info(`[CityPay] Event ${providerEventId} already processed.`);
    return { status: 'already_processed' };
  }

  // Find transaction by reference
  const reference = data.reference;
  if (!reference) {
    throw new Error('No reference found in payload');
  }

  const tx = await db.orm.public.Transaction
    .where({ reference })
    .all()
    .first();

  if (!tx) {
    throw new Error(`Transaction not found for ref: ${reference}`);
  }

  const payment = await db.orm.public.Payment
    .where({ transactionId: tx.id })
    .all()
    .first();

  if (!payment) {
    throw new Error(`Payment not found for transaction: ${tx.id}`);
  }

  // 2. Atomic processing
  await db.transaction(async (prismaTx: any) => {
    // Save the event
    await prismaTx.orm.public.PaymentEvent.create({
      paymentId: payment.id,
      providerEventId,
      type: event,
      payload: JSON.stringify(payload)
    });

    if (event === 'charge.success') {
      // Update Payment and Transaction
      await prismaTx.orm.public.Transaction.where({ id: tx.id }).update({
        status: 'COMPLETED'
      });

      await prismaTx.orm.public.Payment.where({ id: payment.id }).update({
        status: 'COMPLETED'
      });

      // Update related Orders (Defer to vertical statuses, but standardizing Payment dependency)
      if (payment.retailOrderId) {
        await prismaTx.orm.public.RetailOrder.where({ id: payment.retailOrderId }).update({
          status: 'COMPLETED'
        });
      }

      if (payment.restaurantOrderId) {
        await prismaTx.orm.public.RestaurantOrder.where({ id: payment.restaurantOrderId }).update({
          status: 'PREPARING'
        });
      }
      
      // Update Ledger & Wallet if necessary
      // For now, assume LedgerEntry is created at checkout initiation or here.
      // If we need to settle Wallet balance:
      const ledgerEntries = await prismaTx.orm.public.LedgerEntry
        .where({ transactionId: tx.id })
        .all();
        
      for (const entry of ledgerEntries) {
        // Atomic wallet update (via SQL to avoid read-modify-write race condition)
        await prismaTx.sql`UPDATE "Wallet" SET balance = balance + ${entry.amount} WHERE id = ${entry.walletId}`;
      }
    } else if (event === 'charge.failed') {
      await prismaTx.orm.public.Transaction.where({ id: tx.id }).update({
        status: 'FAILED'
      });
      await prismaTx.orm.public.Payment.where({ id: payment.id }).update({
        status: 'FAILED'
      });
    }
  });

  return { status: 'success' };
}
