import { db } from '@/src/prisma/db';
 // We will define this

export async function processPaymentEvent(payload: any) {
  const { event, data } = payload;
  const providerEventId = data.id?.toString() || payload.id?.toString();

  if (!providerEventId) {
    throw new Error('No provider event ID found in payload');
  }

  // Pre-check for idempotency (optimization)
  const existingEvent = await db.orm.public.PaymentEvent.where({ providerEventId }).all().first();
  if (existingEvent) {
    console.info(`[CityPay] Event ${providerEventId} already processed.`);
    return { status: 'already_processed' };
  }

  const reference = data.reference; // This is the Payment.id
  if (!reference) {
    throw new Error('No reference found in payload');
  }

  const payment = await db.orm.public.Payment.where({ id: reference }).all().first();
  if (!payment) {
    throw new Error(`Payment not found for ref: ${reference}`);
  }

  // 2. Atomic processing with P2002 concurrent safety
  try {
    await db.transaction(async (prismaTx: any) => {
      // Save the event (traps duplicate providerEventId uniquely)
      await prismaTx.orm.public.PaymentEvent.create({
        paymentId: payment.id,
        providerEventId,
        type: event,
        payload: JSON.stringify(payload)
      });

      if (event === 'charge.success') {
        const currentPayment = await prismaTx.orm.public.Payment.where({ id: payment.id }).all().first();
        if (currentPayment.status === 'COMPLETED') {
            console.info(`[CityPay] Payment ${payment.id} already completed.`);
            return { status: 'already_processed' };
        }

        const txRow = await prismaTx.orm.public.Transaction.create({
          status: 'COMPLETED',
          reference: payment.id,
          description: `Online Payment Capture`,
        });

        await prismaTx.orm.public.Payment.where({ id: payment.id }).update({
          status: 'COMPLETED',
          transactionId: txRow.id
        });

        // Update related Orders
        if (payment.retailOrderId) {
          await prismaTx.orm.public.RetailOrder.where({ id: payment.retailOrderId }).update({
            status: 'CONFIRMED',
            fulfillmentStatus: 'PROCESSING'
          });
        }

        if (payment.restaurantOrderId) {
          await prismaTx.orm.public.RestaurantOrder.where({ id: payment.restaurantOrderId }).update({
            status: 'PREPARING'
          });
        }

        // --- MERCHANTS PAYOUT ACCOUNTING ---
        let organizationId = null;
        if (payment.retailOrderId) {
          const retailOrder = await prismaTx.orm.public.RetailOrder.where({ id: payment.retailOrderId }).all().first();
          if (retailOrder) organizationId = retailOrder.organizationId;
        } else if (payment.restaurantOrderId) {
          const restOrder = await prismaTx.orm.public.RestaurantOrder.where({ id: payment.restaurantOrderId }).all().first();
          if (restOrder) organizationId = restOrder.organizationId;
        }

        if (organizationId) {
          const wallet = await prismaTx.orm.public.Wallet.where({ organizationId }).all().first();
          if (wallet) {
            await prismaTx.orm.public.LedgerEntry.create({
              walletId: wallet.id,
              transactionId: txRow.id,
              amount: payment.amount,
              currency: wallet.currency
            });
            // Update balance natively
            await prismaTx.orm.public.Wallet.where({ id: wallet.id }).update({ balance: wallet.balance + payment.amount });
          }
        }
        // -----------------------------------
        
      } else if (event === 'charge.failed') {
        await prismaTx.orm.public.Payment.where({ id: payment.id }).update({
          status: 'FAILED'
        });
        
        // Trigger explicit cancellation to reverse inventory safely
        if (payment.retailOrderId) {
          // We can't easily call external cancelOrder inside this transaction safely if cancelOrder also uses db.transaction.
          // Wait, cancelOrder can take the prismaTx to join the transaction.
          await handleFailedRetailPayment(prismaTx, payment.retailOrderId);
        }
      }
    });
  } catch (error: any) {
    if (error.code === 'P2002' || error.message?.includes('P2002') || error.message?.includes('Unique constraint')) {
      console.info(`[CityPay] Concurrent duplicate event ${providerEventId} ignored safely.`);
      return { status: 'already_processed' };
    }
    throw error;
  }

  return { status: 'success' };
}

// Inline helper for reversing inventory on failed payment
export async function handleFailedRetailPayment(prismaTx: any, retailOrderId: string) {
  const order = await prismaTx.orm.public.RetailOrder.where({ id: retailOrderId }).all().first();
  if (order.status !== 'PENDING') return;

  await prismaTx.orm.public.RetailOrder.where({ id: retailOrderId }).update({
    status: 'CANCELLED',
    fulfillmentStatus: 'CANCELLED'
  });

  const items = await prismaTx.orm.public.RetailOrderItem.where({ orderId: retailOrderId }).all();
  for (const item of items) {
    const product = await prismaTx.orm.public.RetailProduct.where({ id: item.productId }).all().first();
    if (product && !product.isWeighed) {
      const stock = await prismaTx.orm.public.RetailLocationStock.where({ organizationId: product.organizationId, locationId: order.locationId, productId: product.id }).all().first();
      if (stock) {
        const updated = await prismaTx.sql`
          UPDATE "RetailLocationStock"
          SET "stockQuantity" = "stockQuantity" + ${item.quantity}
          WHERE id = ${stock.id}
          RETURNING "stockQuantity"
        `;
        
        await prismaTx.orm.public.RetailStockMovement.create({
            organizationId: product.organizationId,
            locationId: order.locationId,
            productId: product.id,
            delta: item.quantity,
            beforeQty: stock.stockQuantity,
            afterQty: updated[0].stockQuantity,
            reason: 'SALE_FAILED_REVERSAL',
            referenceType: 'SALE_FAILED_REVERSAL',
            referenceId: item.id, // Enforces exact-once reversal per item
            note: `Order ${order.id} payment failed/cancelled`,
            recordedById: 'SYSTEM',
        });
      }
    }
  }
}

