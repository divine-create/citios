import { db } from '@/src/prisma/db';
import { settleSuccessfulPayment, settleFailedPayment } from '@/lib/actions/payment-settlement';

export async function processPaymentEvent(payload: any) {
  const { event, data } = payload;
  const providerEventId = data?.id?.toString() || payload?.id?.toString();

  if (!providerEventId) {
    throw new Error('No provider event ID found in payload');
  }

  // Pre-check for idempotency (optimization)
  const existingEvent = await db.orm.public.PaymentEvent.where({ providerEventId }).all().first();
  if (existingEvent) {
    console.info(`[CityPay] Event ${providerEventId} already processed.`);
    return { status: 'already_processed' };
  }

  const reference = data?.reference || payload?.reference;
  if (!reference) {
    throw new Error('No reference found in payload');
  }

  const payment = await db.orm.public.Payment.where({ reference }).all().first()
    || await db.orm.public.Payment.where({ id: reference }).all().first()
    || await db.orm.public.Payment.where({ providerReference: reference }).all().first();

  if (!payment) {
    throw new Error(`Payment not found for ref: ${reference}`);
  }

  try {
    if (event === 'charge.success' || event === 'SUCCESS') {
      return await settleSuccessfulPayment({
        paymentId: payment.id,
        providerReference: data?.id?.toString() || reference,
        providerEventId,
        eventType: event,
        rawPayload: payload,
      });
    } else if (event === 'charge.failed' || event === 'FAILED') {
      return await settleFailedPayment({
        paymentId: payment.id,
        providerEventId,
        eventType: event,
        rawPayload: payload,
      });
    }
    return { status: 'unhandled_event' };
  } catch (error: any) {
    if (
      error.code === 'P2002' ||
      error.sqlState === '23505' ||
      error.code === '23505' ||
      error.message?.toLowerCase().includes('unique constraint') ||
      error.message?.toLowerCase().includes('duplicate key') ||
      error.detail?.includes('already exists')
    ) {
      console.info(`[CityPay] Concurrent duplicate event ${providerEventId} ignored safely.`);
      return { status: 'already_processed' };
    }
    throw error;
  }
}

// Inline helper for reversing inventory on failed payment
export async function handleFailedRetailPayment(prismaTx: any, retailOrderId: string) {
  const order = await prismaTx.orm.public.RetailOrder.where({ id: retailOrderId }).all().first();
  if (!order || order.status !== 'PENDING') return;

  await prismaTx.orm.public.RetailOrder.where({ id: retailOrderId }).update({
    status: 'CANCELLED',
    fulfillmentStatus: 'CANCELLED'
  });

  const items = await prismaTx.orm.public.RetailOrderItem.where({ orderId: retailOrderId }).all();
  for (const item of items) {
    const product = await prismaTx.orm.public.RetailProduct.where({ id: item.productId }).all().first();
    if (product && !product.isWeighed) {
      if (order.locationId) {
        const stock = await prismaTx.orm.public.RetailLocationStock.where({ organizationId: product.organizationId, locationId: order.locationId, productId: product.id }).all().first();
        if (stock) {
          await prismaTx.orm.public.RetailLocationStock.where({ id: stock.id }).update({
            stockQuantity: stock.stockQuantity + item.quantity
          });
          await prismaTx.orm.public.RetailProduct.where({ id: product.id }).update({
            stockQuantity: product.stockQuantity + item.quantity
          });
          
          await prismaTx.orm.public.RetailStockMovement.create({
              organizationId: product.organizationId,
              locationId: order.locationId,
              productId: product.id,
              delta: item.quantity,
              beforeQty: stock.stockQuantity,
              afterQty: stock.stockQuantity + item.quantity,
              reason: 'SALE_FAILED_REVERSAL',
              referenceType: 'SALE_FAILED_REVERSAL',
              referenceId: item.id, // Enforces exact-once reversal per item
              note: `Order ${order.id} payment failed/cancelled`,
              recordedById: 'SYSTEM',
          });
          continue;
        }
      }

      // Location-agnostic fallback: restore directly to RetailProduct.stockQuantity
      await prismaTx.orm.public.RetailProduct.where({ id: product.id }).update({
        stockQuantity: product.stockQuantity + item.quantity,
      });

      await prismaTx.orm.public.RetailStockMovement.create({
        organizationId: product.organizationId,
        productId: product.id,
        delta: item.quantity,
        beforeQty: product.stockQuantity,
        afterQty: product.stockQuantity + item.quantity,
        reason: 'SALE_FAILED_REVERSAL',
        referenceType: 'SALE_FAILED_REVERSAL',
        referenceId: item.id,
        note: `Order ${order.id} payment failed/cancelled`,
        recordedById: 'SYSTEM',
      });
    }
  }
}

