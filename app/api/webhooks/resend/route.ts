import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/prisma/db';
import { verifyResendWebhookSignature } from '@/lib/email/resend';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const svixId = req.headers.get('svix-id');
    const svixTimestamp = req.headers.get('svix-timestamp');
    const svixSignature = req.headers.get('svix-signature');

    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

    // Verify signature in production or if secret is configured
    if (webhookSecret) {
      const isValid = verifyResendWebhookSignature(
        rawBody,
        { id: svixId, timestamp: svixTimestamp, signature: svixSignature },
        webhookSecret
      );

      if (!isValid) {
        console.warn('[Resend Webhook] Invalid webhook signature received.');
        return new NextResponse('Invalid signature', { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody);
    const eventType = payload.type;
    const emailData = payload.data || {};
    const emailId = emailData.email_id || emailData.id;
    const recipient = emailData.to?.[0]?.toLowerCase();

    if (!emailId) {
      return NextResponse.json({ status: 'ignored_no_email_id' });
    }

    // Match MessageDelivery by providerMessageId
    const delivery = await db.orm.public.MessageDelivery.where({
      providerMessageId: emailId,
    }).all().first();

    if (!delivery) {
      console.info(`[Resend Webhook] Delivery not found for email_id: ${emailId}`);
      return NextResponse.json({ status: 'not_found' });
    }

    if (eventType === 'email.delivered') {
      await db.orm.public.MessageDelivery.where({ id: delivery.id }).update({
        status: 'DELIVERED',
        deliveredAt: new Date(),
      });
      // Also update parent enquiry status
      await db.orm.public.CustomerEnquiry.where({ id: delivery.enquiryId }).update({
        status: 'DELIVERED',
      });
    } else if (eventType === 'email.bounced') {
      await db.orm.public.MessageDelivery.where({ id: delivery.id }).update({
        status: 'BOUNCED',
        lastError: emailData.bounce?.message || 'Email bounced by recipient mail server.',
      });
      await db.orm.public.CustomerEnquiry.where({ id: delivery.enquiryId }).update({
        status: 'BOUNCED',
      });

      // Add to suppression list so future leads are not sent to this dead address
      if (recipient) {
        const existingSuppression = await db.orm.public.SuppressionEntry.where({
          type: 'EMAIL',
          value: recipient,
        }).all().first();

        if (!existingSuppression) {
          await db.orm.public.SuppressionEntry.create({
            id: uuidv4(),
            type: 'EMAIL',
            value: recipient,
            reason: 'BOUNCE',
          });
        }
      }
    } else if (eventType === 'email.complained') {
      await db.orm.public.MessageDelivery.where({ id: delivery.id }).update({
        status: 'BOUNCED',
        lastError: 'Recipient flagged message as spam/complaint.',
      });

      if (recipient) {
        const existingSuppression = await db.orm.public.SuppressionEntry.where({
          type: 'EMAIL',
          value: recipient,
        }).all().first();

        if (!existingSuppression) {
          await db.orm.public.SuppressionEntry.create({
            id: uuidv4(),
            type: 'EMAIL',
            value: recipient,
            reason: 'COMPLAINT',
          });
        }
      }
    }

    return NextResponse.json({ success: true, eventType });
  } catch (error: any) {
    console.error('[Resend Webhook Error]:', error);
    return NextResponse.json({ error: error.message || 'Webhook processing error' }, { status: 500 });
  }
}
