import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/prisma/db';
import { getPaymentAdapter } from '@/lib/payments/factory';
import { settleSuccessfulPayment, settleFailedPayment } from '@/lib/actions/payment-settlement';

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

    // 3. Early Idempotency Check & Reference Validation
    if (!event.reference && !event.providerReference) {
      console.warn(`[${providerName} Webhook] Missing both reference and providerReference in event payload.`);
      return NextResponse.json({ status: 'missing_reference' }, { status: 400 });
    }

    if (event.providerEventId) {
      const existingEvent = await db.orm.public.PaymentEvent.where({ 
        providerEventId: event.providerEventId 
      }).all().first();
      if (existingEvent) {
        console.info(`[${providerName} Webhook] Idempotent exit for providerEventId ${event.providerEventId}`);
        return NextResponse.json({ status: 'already_processed' });
      }
    }

    const payment = await db.orm.public.Payment.where({ 
      reference: event.reference || undefined, 
      providerReference: event.providerReference || undefined 
    }).all().first();

    if (!payment) {
      console.warn(`[${providerName} Webhook] Payment not found for reference ${event.reference || event.providerReference}`);
      return NextResponse.json({ status: 'payment_not_found' }, { status: 404 });
    }

    // 4. State Check & Amount Validation
    if (payment.status !== 'PENDING') {
      console.info(`[${providerName} Webhook] Ignoring event for Payment ${payment.id} because status is ${payment.status}`);
      return NextResponse.json({ status: `ignored_status_${payment.status.toLowerCase()}` });
    }

    if (event.status === 'SUCCESS') {
      if (Math.abs(payment.amount - event.amount) > 0.01) {
        console.error(`[${providerName} Webhook] Amount mismatch. Expected ${payment.amount}, got ${event.amount}`);
        return NextResponse.json({ status: 'amount_mismatch' }, { status: 400 });
      }

      try {
        const result = await settleSuccessfulPayment({
          paymentId: payment.id,
          providerReference: event.providerReference,
          providerEventId: event.providerEventId,
          eventType: rawPayload.event || event.status,
          rawPayload: event.rawPayload,
        });
        return NextResponse.json(result);
      } catch (err: any) {
        if (
          err.code === 'P2002' ||
          err.sqlState === '23505' ||
          err.code === '23505' ||
          err.message?.toLowerCase().includes('unique constraint') ||
          err.message?.toLowerCase().includes('duplicate key') ||
          err.detail?.includes('already exists')
        ) {
          console.info(`[${providerName} Webhook] Concurrent duplicate delivery caught via unique constraint: ${event.providerEventId}`);
          return NextResponse.json({ status: 'already_processed' });
        }
        console.error(`[${providerName} Webhook] Downstream settlement failed:`, err);
        throw err;
      }


    } else if (event.status === 'FAILED') {
      try {
        const result = await settleFailedPayment({
          paymentId: payment.id,
          providerEventId: event.providerEventId,
          eventType: rawPayload.event || 'charge.failed',
          rawPayload: event.rawPayload,
        });
        return NextResponse.json(result);
      } catch (err: any) {
        if (
          err.code === 'P2002' ||
          err.sqlState === '23505' ||
          err.code === '23505' ||
          err.message?.toLowerCase().includes('unique constraint') ||
          err.message?.toLowerCase().includes('duplicate key') ||
          err.detail?.includes('already exists')
        ) {
          return NextResponse.json({ status: 'already_processed' });
        }
        throw err;
      }
    }

    return NextResponse.json({ status: 'success' });
  } catch (err: any) {
    console.error(`[${providerName} Webhook] Error processing event:`, err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
