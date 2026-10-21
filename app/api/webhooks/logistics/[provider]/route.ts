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

    const configuredSecret =
      process.env[`LOGISTICS_WEBHOOK_SECRET_${courierSlug.toUpperCase()}`] ||
      process.env.LOGISTICS_WEBHOOK_SECRET;

    // Fail closed in production if secret is unconfigured
    if (process.env.NODE_ENV === 'production' && !configuredSecret) {
      return NextResponse.json(
        { error: 'WEBHOOK_SECRET_NOT_CONFIGURED', message: `Webhook secret is not configured for provider ${courierSlug}` },
        { status: 500 }
      );
    }

    const webhookSecret = configuredSecret || 'citydrive-partner-webhook-secret-2026';

    // Verify timestamp freshness (replay attack prevention) within 5-minute window
    const timestampHeader =
      req.headers.get('x-timestamp') ||
      req.headers.get('x-partner-timestamp') ||
      req.headers.get('x-citydrive-timestamp');

    if (timestampHeader) {
      const tsNum = Number(timestampHeader);
      const timestampMs = isNaN(tsNum) ? Date.parse(timestampHeader) : (tsNum < 1e11 ? tsNum * 1000 : tsNum);
      const now = Date.now();
      if (isNaN(timestampMs) || Math.abs(now - timestampMs) > 5 * 60 * 1000) {
        return NextResponse.json(
          { error: 'TIMESTAMP_EXPIRED', message: 'Webhook timestamp is expired or outside the 5-minute freshness window' },
          { status: 401 }
        );
      }
    }

    // In production, signature is mandatory; in dev/test, enforce if signature header provided
    if (process.env.NODE_ENV === 'production' && !signature) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED_SIGNATURE', message: 'Missing partner webhook signature header' },
        { status: 401 }
      );
    }

    if (signature) {
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
    if (error?.name === 'LogisticsDomainError' || error?.message?.includes('DeliveryJob not found')) {
      return NextResponse.json(
        { error: 'DOMAIN_ERROR', message: error.message },
        { status: 404 }
      );
    }
    console.error(`[Logistics Webhook ${courierSlug}] Processing error:`, error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: error.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
