import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/prisma/db';
import { getPaymentAdapter } from '@/lib/payments/factory';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const providerName = provider.toUpperCase();

  try {
    const rawBody = await req.text();
    const signature = req.headers.get(`x-${providerName.toLowerCase()}-signature`);

    const adapter = getPaymentAdapter(providerName);

    // 1. Signature Verification
    if (process.env.NODE_ENV === 'production' || signature) {
       const isValid = adapter.validateWebhookSignature(rawBody, signature);
       if (!isValid) {
         console.warn(`[${providerName} Webhook] Invalid signature received.`);
         return new NextResponse('Invalid signature', { status: 401 });
       }
    }

    // 2. Parse & Normalize Event
    const rawPayload = JSON.parse(rawBody);
    const event = adapter.normalizeWebhookEvent(rawPayload);

    if (!event) {
      console.warn(`[${providerName} Webhook] Could not normalize event.`);
      return new NextResponse('Unrecognized event format', { status: 400 });
    }

    // 3. Early Idempotency Check (Without locking Payment)
    // To prevent processing the exact same webhook payload twice
    try {
       // We insert into PaymentEvent first to claim exactly-once processing
       const payment = await db.orm.public.Payment.where({ 
         reference: event.reference || undefined, 
         providerReference: event.providerReference || undefined 
       }).all().first();

       if (!payment) {
         console.warn(`[${providerName} Webhook] Payment not found for reference ${event.reference || event.providerReference}`);
         return NextResponse.json({ status: 'payment_not_found' }, { status: 404 });
       }

       await db.orm.public.PaymentEvent.create({
         paymentId: payment.id,
         providerEventId: event.providerEventId,
         type: rawPayload.event || event.status,
         payload: event.rawPayload,
       });
       
       // If it successfully created, we are the ONLY process handling this specific event instance.
       // We can now safely proceed.
    } catch (err: any) {
       if (err.code === 'P2002' || err.message?.includes('Unique constraint')) {
          // This exact event was already processed.
          console.info(`[${providerName} Webhook] Idempotent exit for providerEventId ${event.providerEventId}`);
          return NextResponse.json({ status: 'already_processed' });
       }
       throw err;
    }

    // Find the payment again, now ready for the transaction
    const payment = await db.orm.public.Payment.where({ 
       reference: event.reference || undefined, 
       providerReference: event.providerReference || undefined 
    }).all().first();
    
    if (!payment) {
      return NextResponse.json({ status: 'payment_not_found' }, { status: 404 });
    }

    // 4. State Check & Amount Validation
    if (payment.status !== 'PENDING') {
      // Payment is already completed/failed by a previous event (e.g. charge.success followed by invoice.paid)
      console.info(`[${providerName} Webhook] Ignoring event for Payment ${payment.id} because status is ${payment.status}`);
      return NextResponse.json({ status: `ignored_status_${payment.status.toLowerCase()}` });
    }

    if (event.status === 'SUCCESS') {
      if (Math.abs(payment.amount - event.amount) > 0.01) {
         console.error(`[${providerName} Webhook] Amount mismatch. Expected ${payment.amount}, got ${event.amount}`);
         return NextResponse.json({ status: 'amount_mismatch' }, { status: 400 });
      }

      // 5. Atomic Fulfillment Transaction
      let oversellOccurred = false;
      try {
         await db.transaction(async (tx: any) => {
           // If Retail Order
           if (payment.retailOrderId) {
              const order = await tx.orm.public.RetailOrder.where({ id: payment.retailOrderId }).all().first();
              if (order) {
                 const items = await tx.orm.public.RetailOrderItem.where({ orderId: order.id }).all();
                 
                 for (const item of items) {
                    if (order.locationId) {
                      const locStock = await tx.orm.public.RetailLocationStock.where({ locationId: order.locationId, productId: item.productId }).all().first();
                      if (!locStock || locStock.quantity < item.quantity) {
                         throw new Error('OVERSELL');
                      }
                      await tx.orm.public.RetailLocationStock.where({ id: locStock.id }).update({ quantity: locStock.quantity - item.quantity });
                      
                      await tx.orm.public.RetailStockMovement.create({
                        organizationId: order.organizationId,
                        locationId: order.locationId,
                        productId: item.productId,
                        delta: -item.quantity,
                        beforeQty: locStock.quantity,
                        afterQty: locStock.quantity - item.quantity,
                        reason: 'SALE',
                        note: `Online Order #${order.id.slice(0, 8)}`,
                      });
                    } else {
                      // Fallback to global
                      const product = await tx.orm.public.RetailProduct.where({ id: item.productId }).all().first();
                      if (product && !product.isWeighed) {
                         if (product.stockQuantity < item.quantity) throw new Error('OVERSELL');
                         await tx.orm.public.RetailProduct.where({ id: product.id }).update({ stockQuantity: product.stockQuantity - item.quantity });
                      }
                    }
                 }
                 await tx.orm.public.RetailOrder.where({ id: order.id }).update({ status: 'CONFIRMED' });
              }
           }
           
           // If Restaurant Order
           if (payment.restaurantOrderId) {
              await tx.orm.public.RestaurantOrder.where({ id: payment.restaurantOrderId }).update({ status: 'PREPARING' });
           }

           // Credit Wallet Ledger
           let targetOrgId = null;
           if (payment.retailOrderId) {
             const r = await tx.orm.public.RetailOrder.where({ id: payment.retailOrderId }).all().first();
             if (r) targetOrgId = r.organizationId;
           } else if (payment.restaurantOrderId) {
             const r = await tx.orm.public.RestaurantOrder.where({ id: payment.restaurantOrderId }).all().first();
             if (r) targetOrgId = r.organizationId;
           }
           
           if (targetOrgId) {
             let wallet = await tx.orm.public.Wallet.where({ organizationId: targetOrgId }).all().first();
             if (!wallet) {
               wallet = await tx.orm.public.Wallet.create({ organizationId: targetOrgId, balance: 0, currency: payment.currency || 'NGN' });
             }
             
             let transactionRecord = null;
             if (payment.transactionId) {
                transactionRecord = await tx.orm.public.Transaction.where({ id: payment.transactionId }).all().first();
                await tx.orm.public.Transaction.where({ id: payment.transactionId }).update({ status: 'CONFIRMED' });
             } else {
                transactionRecord = await tx.orm.public.Transaction.create({
                  reference: payment.reference || `TX-${payment.id.slice(0,8)}`,
                  status: 'CONFIRMED',
                  description: `Online settlement ${payment.reference}`
                });
                await tx.orm.public.Payment.where({ id: payment.id }).update({ transactionId: transactionRecord.id });
             }
             
             await tx.orm.public.LedgerEntry.create({
               walletId: wallet.id,
               transactionId: transactionRecord.id,
               amount: payment.amount,
               currency: wallet.currency
             });
             
             await tx.orm.public.Wallet.where({ id: wallet.id }).update({ balance: wallet.balance + payment.amount });
           }

           // Finally mark payment completed
           await tx.orm.public.Payment.where({ id: payment.id }).update({ 
             status: 'CONFIRMED', 
             providerReference: event.providerReference 
           });
         });
      } catch (err: any) {
         if (err.message === 'OVERSELL') {
            oversellOccurred = true;
         } else {
            throw err;
         }
      }

      if (oversellOccurred) {
         console.warn(`[${providerName} Webhook] Oversell detected for payment ${payment.id}. Triggering auto-refund.`);
         
         const refundResult = await adapter.refundPayment({
            providerReference: event.providerReference,
            amount: payment.amount
         });

         await db.transaction(async (tx: any) => {
            await tx.orm.public.Payment.where({ id: payment.id }).update({ 
               status: 'OUT_OF_STOCK_REFUNDED' 
            });
            if (payment.retailOrderId) {
               await tx.orm.public.RetailOrder.where({ id: payment.retailOrderId }).update({ status: 'OUT_OF_STOCK_REFUNDED' });
            }
         });
         
         if (!refundResult.success) {
            console.error(`[${providerName} Webhook] Failed to auto-refund oversell for ${payment.id}. Manual intervention required!`);
            await db.orm.public.Payment.where({ id: payment.id }).update({ status: 'FAILED' });
         }
      }
      
    } else if (event.status === 'FAILED') {
      await db.transaction(async (tx: any) => {
         await tx.orm.public.Payment.where({ id: payment.id }).update({ status: 'FAILED' });
         if (payment.retailOrderId) {
            await tx.orm.public.RetailOrder.where({ id: payment.retailOrderId }).update({ status: 'CANCELLED' });
         }
         if (payment.transactionId) {
            await tx.orm.public.Transaction.where({ id: payment.transactionId }).update({ status: 'FAILED' });
         }
      });
    }

    return NextResponse.json({ status: 'success' });
  } catch (err: any) {
    console.error(`[${providerName} Webhook] Error processing event:`, err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
