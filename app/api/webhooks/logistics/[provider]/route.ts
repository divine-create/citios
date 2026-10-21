import { NextRequest, NextResponse } from 'next/server';
import { processPartnerWebhook, verifyPartnerWebhookSignature } from '@/lib/actions/logistics-network';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const courierSlug = provider.toLowerCase();

  try {
    const rawBody = await req.text();
    const signature =
      req.headers.get('x-partner-signature') ||
      req.headers.get('x-citydrive-signature') ||
      req.headers.get(`x-${courierSlug}-signature`);

    const webhookSecret =
      process.env[`LOGISTICS_WEBHOOK_SECRET_${courierSlug.toUpperCase()}`] ||
      process.env.LOGISTICS_WEBHOOK_SECRET ||
      'citydrive-partner-webhook-secret-2026';

    // In production or when signature header is present, enforce HMAC signature
    if (process.env.NODE_ENV === 'production' || signature) {
      const isValid = await verifyPartnerWebhookSignature(rawBody, signature, webhookSecret);
      if (!isValid) {
        return NextResponse.json(
          { error: 'UNAUTHORIZED_SIGNATURE', message: 'Invalid partner webhook HMAC signature' },
          { status: 401 }
        );
      }
    }

    const payload = JSON.parse(rawBody);

    if (!payload.providerId || !payload.deliveryJobId || !payload.eventType) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Missing required webhook fields: providerId, deliveryJobId, eventType' },
        { status: 400 }
      );
    }

    const result = await processPartnerWebhook({
      providerId: payload.providerId,
      deliveryJobId: payload.deliveryJobId,
      eventType: payload.eventType,
      externalReference: payload.externalReference || payload.trackingNumber || `EXT-${Date.now()}`,
      notes: payload.notes,
      idempotencyKey: payload.idempotencyKey || req.headers.get('x-idempotency-key') || `webhook-${payload.deliveryJobId}-${payload.eventType}`,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error(`[Logistics Webhook ${courierSlug}] Processing error:`, error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: error.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
