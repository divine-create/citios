import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/prisma/db';
import { verifyWebhookSignature } from '@/lib/paystack';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-paystack-signature');

    // Verify signature in live production environments
    if (process.env.NODE_ENV === 'production' && process.env.PAYSTACK_SECRET_KEY) {
      const isValid = verifyWebhookSignature(rawBody, signature);
      if (!isValid) {
        console.warn('[Paystack Webhook] Invalid signature received.');
        return new NextResponse('Invalid signature', { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;
    const data = payload.data;

    if (event === 'charge.success') {
      const reference = data.reference;
      if (!reference) {
        return NextResponse.json({ message: 'No reference' }, { status: 400 });
      }

      // Find transaction by reference
      const tx = await db.orm.public.Transaction
        .where({ reference })
        .all()
        .first();

      if (!tx) {
        console.warn(`[Paystack Webhook] No matching transaction found for ref: ${reference}`);
        return NextResponse.json({ message: 'Transaction not found' }, { status: 404 });
      }

      const payment = await db.orm.public.Payment
        .where({ transactionId: tx.id })
        .all()
        .first();

      if (!payment) {
        console.warn(`[Paystack Webhook] No payment found for transaction: ${tx.id}`);
        return NextResponse.json({ message: 'Payment not found' }, { status: 404 });
      }

      if (payment.status === 'COMPLETED') {
        // Idempotent exit
        return NextResponse.json({ status: 'already_completed' });
      }

      // Mark payment & transaction completed
      await db.transaction(async (prismaTx: any) => {
        await prismaTx.orm.public.Transaction.where({ id: tx.id }).update({
          status: 'COMPLETED',
        });

        await prismaTx.orm.public.Payment.where({ id: payment.id }).update({
          status: 'COMPLETED',
        });

        // Update retail order if applicable
        if (payment.retailOrderId) {
          await prismaTx.orm.public.RetailOrder.where({ id: payment.retailOrderId }).update({
            status: 'COMPLETED',
          });
        }

        // Update restaurant order if applicable
        if (payment.restaurantOrderId) {
          await prismaTx.orm.public.RestaurantOrder.where({ id: payment.restaurantOrderId }).update({
            status: 'PREPARING',
          });
        }
      });

      console.info(`[Paystack Webhook] Successfully processed payment for ref: ${reference}`);
    }

    return NextResponse.json({ status: 'success' });
  } catch (err: any) {
    console.error('[Paystack Webhook] Error processing event:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
