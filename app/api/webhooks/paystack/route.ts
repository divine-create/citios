import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/paystack';
import { processPaymentEvent } from '@/lib/actions/citypay';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-paystack-signature');

    if (process.env.NODE_ENV === 'production' && process.env.PAYSTACK_SECRET_KEY) {
      const isValid = verifyWebhookSignature(rawBody, signature);
      if (!isValid) {
        console.warn('[Paystack Webhook] Invalid signature received.');
        return new NextResponse('Invalid signature', { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody);
    const result = await processPaymentEvent(payload);

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[Paystack Webhook] Error processing event:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
