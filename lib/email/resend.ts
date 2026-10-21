import { db } from '@/src/prisma/db';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export interface SendEmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  isSuppressed?: boolean;
}

/**
 * Native HTTP client for Resend REST API (zero external dependency bloat).
 */
export async function sendResendEmail(payload: SendEmailPayload): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || '9jaLive <notifications@cityos.ng>';

  // Check suppression table before sending
  const normalizedTo = payload.to.trim().toLowerCase();
  const suppressed = await db.orm.public.SuppressionEntry.where({
    type: 'EMAIL',
    value: normalizedTo,
  }).all().first();

  if (suppressed) {
    return {
      success: false,
      isSuppressed: true,
      error: `Recipient ${normalizedTo} is on the suppression list (${suppressed.reason}).`,
    };
  }

  // Graceful fallback for local development or mock environments
  if (!apiKey || apiKey === 'mock-key' || apiKey.startsWith('re_mock')) {
    console.info(`[Resend Mock] Email sent to: ${normalizedTo} | Subject: "${payload.subject}"`);
    return {
      success: true,
      messageId: `mock_resend_${uuidv4()}`,
    };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [normalizedTo],
        subject: payload.subject,
        html: payload.html,
        text: payload.text || undefined,
        reply_to: payload.replyTo || undefined,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      return {
        success: false,
        error: `Resend API error (${res.status}): ${errorText}`,
      };
    }

    const data = await res.json();
    return {
      success: true,
      messageId: data.id,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Unknown network error communicating with Resend.',
    };
  }
}

/**
 * Generate a responsive HTML template for routing customer leads to businesses.
 */
export function buildEnquiryEmailHtml(params: {
  businessName: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  serviceRequested?: string | null;
  message: string;
  claimUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Customer Enquiry via 9jaLive</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
    .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: #0f766e; color: #ffffff; padding: 24px; text-align: left; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.02em; }
    .header p { margin: 6px 0 0; font-size: 13px; opacity: 0.9; }
    .content { padding: 24px; }
    .field { margin-bottom: 16px; }
    .label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 4px; }
    .value { font-size: 14px; font-weight: 600; color: #0f172a; }
    .message-box { background: #f1f5f9; border-radius: 12px; padding: 16px; font-size: 14px; line-height: 1.6; color: #334155; margin-top: 16px; border-left: 4px solid #0f766e; }
    .claim-box { margin-top: 32px; padding: 20px; background: #f0fdf4; border: 1px dashed #86efac; border-radius: 12px; text-align: center; }
    .claim-box h3 { margin: 0 0 8px; font-size: 15px; font-weight: 700; color: #166534; }
    .claim-box p { margin: 0 0 16px; font-size: 12px; color: #15803d; line-height: 1.5; }
    .btn { display: inline-block; background: #0f766e; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-size: 13px; font-weight: 700; }
    .footer { padding: 16px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>New Customer Enquiry</h1>
      <p>A resident discovered <strong>${escapeHtml(params.businessName)}</strong> on 9jaLive.</p>
    </div>
    <div class="content">
      <div class="field">
        <div class="label">Customer Name</div>
        <div class="value">${escapeHtml(params.customerName)}</div>
      </div>
      <div class="field">
        <div class="label">Customer Contact</div>
        <div class="value">
          <a href="mailto:${escapeHtml(params.customerEmail)}" style="color: #0f766e;">${escapeHtml(params.customerEmail)}</a>
          ${params.customerPhone ? ` · ${escapeHtml(params.customerPhone)}` : ''}
        </div>
      </div>
      ${params.serviceRequested ? `
      <div class="field">
        <div class="label">Requested Service / Offering</div>
        <div class="value">${escapeHtml(params.serviceRequested)}</div>
      </div>` : ''}
      <div class="field">
        <div class="label">Customer Message</div>
        <div class="message-box">${escapeHtml(params.message).replace(/\n/g, '<br>')}</div>
      </div>

      <div class="claim-box">
        <h3>Manage this listing on 9jaLive</h3>
        <p>Are you the owner or manager of <strong>${escapeHtml(params.businessName)}</strong>? Claim your free profile to update hours, accept direct bookings, and reply to leads from your owner dashboard.</p>
        <a href="${params.claimUrl}" class="btn">Claim & Manage Profile →</a>
      </div>
    </div>
    <div class="footer">
      This lead was routed by 9jaLive Hyperlocal Discovery. If you received this by mistake or want to stop receiving enquiries, reply directly or submit a removal request.
    </div>
  </div>
</body>
</html>
  `;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function toTemporal(date: Date = new Date()) {
  return (globalThis as any).Temporal.Instant.fromEpochMilliseconds(date.getTime());
}

/**
 * Worker function to process pending OutboxEvent records.
 * Invoked by Vercel Cron at /api/cron/process-outbox.
 */
export async function processOutboxBatch(batchSize = 25) {
  const pendingEvents = await db.orm.public.OutboxEvent.where({
    status: 'PENDING',
  }).all();

  // Take the batch size
  const batch = pendingEvents.slice(0, batchSize);
  const results = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    suppressed: 0,
  };

  const appUrl = process.env.NEXTAUTH_URL || 'https://cityos.ng';

  for (const event of batch) {
    results.processed++;
    // Optimistic lock
    await db.orm.public.OutboxEvent.where({ id: event.id }).update({
      status: 'PROCESSING',
      lockedAt: toTemporal(),
    });

    try {
      if (event.eventType === 'ENQUIRY_ROUTING') {
        const payload = JSON.parse(event.payload);
        const { deliveryId, enquiryId, recipientEmail, businessName, customerName, customerEmail, customerPhone, serviceRequested, message, orgId } = payload;

        const claimUrl = `${appUrl}/business/claim?orgId=${orgId}`;
        const emailHtml = buildEnquiryEmailHtml({
          businessName,
          customerName,
          customerEmail,
          customerPhone,
          serviceRequested,
          message,
          claimUrl,
        });

        const sendResult = await sendResendEmail({
          to: recipientEmail,
          subject: `New enquiry for ${businessName}: ${serviceRequested || 'Customer request'}`,
          html: emailHtml,
          replyTo: customerEmail,
        });

        if (sendResult.isSuppressed) {
          results.suppressed++;
          await db.orm.public.MessageDelivery.where({ id: deliveryId }).update({
            status: 'SUPPRESSED',
            lastError: sendResult.error,
          });
          await db.orm.public.OutboxEvent.where({ id: event.id }).update({
            status: 'COMPLETED',
          });
        } else if (sendResult.success) {
          results.succeeded++;
          await db.orm.public.MessageDelivery.where({ id: deliveryId }).update({
            status: 'ACCEPTED_BY_PROVIDER',
            providerMessageId: sendResult.messageId || null,
            sentAt: toTemporal(),
          });
          await db.orm.public.OutboxEvent.where({ id: event.id }).update({
            status: 'COMPLETED',
          });
        } else {
          throw new Error(sendResult.error || 'Failed to dispatch via Resend');
        }
      } else {
        // Unknown event type marked completed to prevent infinite loop
        await db.orm.public.OutboxEvent.where({ id: event.id }).update({
          status: 'COMPLETED',
        });
      }
    } catch (err: any) {
      results.failed++;
      const nextAttempts = event.attempts + 1;
      const willFailPermanently = nextAttempts >= event.maxAttempts;

      await db.orm.public.OutboxEvent.where({ id: event.id }).update({
        status: willFailPermanently ? 'FAILED' : 'PENDING',
        attempts: nextAttempts,
        lastError: err.message || 'Unknown processing error',
      });
    }
  }

  return results;
}

/**
 * Verify Svix / Resend Webhook Signatures using Node.js crypto.
 */
export function verifyResendWebhookSignature(
  payload: string,
  headers: { id?: string | null; timestamp?: string | null; signature?: string | null },
  secret: string
): boolean {
  if (!headers.id || !headers.timestamp || !headers.signature) {
    return false;
  }

  // Svix secret usually starts with 'whsec_'
  const cleanSecret = secret.startsWith('whsec_') ? secret.slice(6) : secret;
  const secretBytes = Buffer.from(cleanSecret, 'base64');

  const signedPayload = `${headers.id}.${headers.timestamp}.${payload}`;
  const computedSignature = crypto
    .createHmac('sha256', secretBytes)
    .update(signedPayload)
    .digest('base64');

  const signatures = headers.signature.split(' ');
  for (const versionedSig of signatures) {
    const [version, sig] = versionedSig.split(',');
    if (version === 'v1' && sig === computedSignature) {
      return true;
    }
  }

  return false;
}


/**
 * Generate a responsive HTML template for password reset recovery.
 */
export function buildPasswordResetEmailHtml(params: {
  recipientName: string;
  resetUrl: string;
  isOAuthUser?: boolean;
}): string {
  const greeting = params.recipientName ? `Hello ${params.recipientName},` : 'Hello,';
  const oauthNote = params.isOAuthUser
    ? `<div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 14px 18px; margin-bottom: 24px; color: #166534; font-size: 13px; line-height: 1.5;">
         <strong>Google Account Notice:</strong> Your account was originally registered via Google Sign-In. You can continue signing in with Google, or click the button below to set a custom password for direct email login.
       </div>`
    : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px 16px; color: #0f172a;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);">
    <tr>
      <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #f1f5f9; background: linear-gradient(180deg, #f0fdfa 0%, #ffffff 100%);">
        <h1 style="margin: 0; font-size: 24px; font-weight: 900; color: #0f766e; letter-spacing: -0.5px;">9jaLive</h1>
        <p style="margin: 4px 0 0; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px;">Hyperlocal City Network</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px;">
        <h2 style="margin: 0 0 16px; font-size: 18px; font-weight: 800; color: #0f172a;">Reset Your Account Password</h2>
        <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #475569;">
          ${greeting}
        </p>
        <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #475569;">
          We received a request to reset the password for your 9jaLive resident account. Click the button below to choose a new password:
        </p>
        ${oauthNote}
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 28px 0;">
          <tr>
            <td align="center">
              <a href="${params.resetUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; background-color: #0f766e; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 800; border-radius: 12px; box-shadow: 0 2px 4px rgba(15, 118, 110, 0.2);">
                Reset Password
              </a>
            </td>
          </tr>
        </table>
        <p style="margin: 0 0 12px; font-size: 13px; line-height: 1.5; color: #64748b;">
          This password reset link will expire in <strong>30 minutes</strong> for your security.
        </p>
        <p style="margin: 0 0 24px; font-size: 12px; line-height: 1.5; color: #94a3b8;">
          If you did not make this request, you can safely ignore this email. Your account password will remain unchanged.
        </p>
        <div style="border-top: 1px solid #f1f5f9; padding-top: 16px;">
          <p style="margin: 0 0 6px; font-size: 11px; color: #94a3b8;">
            Button not working? Copy and paste this URL into your browser:
          </p>
          <p style="margin: 0; font-size: 11px; word-break: break-all; color: #0f766e;">
            <a href="${params.resetUrl}" style="color: #0f766e; text-decoration: underline;">${params.resetUrl}</a>
          </p>
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 32px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center;">
        <p style="margin: 0; font-size: 11px; color: #94a3b8;">
          &copy; ${new Date().getFullYear()} 9jaLive Hyperlocal Network. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
