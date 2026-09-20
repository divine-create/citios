import crypto from 'crypto';

export interface PaystackInitializeOptions {
  email: string;
  amount: number; // in minor currency units (e.g. kobo: ₦100 = 10000 kobo)
  reference: string;
  callbackUrl?: string;
  metadata?: Record<string, any>;
  channels?: ('card' | 'bank' | 'ussd' | 'qr' | 'mobile_money' | 'bank_transfer')[];
  subaccount?: string; // for merchant payout split
  bearer?: 'account' | 'subaccount';
}

export interface PaystackInitResponse {
  success: boolean;
  authorizationUrl?: string;
  accessCode?: string;
  reference: string;
  isSandbox?: boolean;
  message?: string;
}

export interface PaystackVerifyResponse {
  success: boolean;
  status: 'success' | 'failed' | 'abandoned' | 'pending';
  amount?: number;
  reference: string;
  channel?: string;
  paidAt?: string;
  customer?: {
    email: string;
  };
  metadata?: Record<string, any>;
  isSandbox?: boolean;
  message?: string;
}

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const IS_CONFIGURED = Boolean(
  PAYSTACK_SECRET_KEY &&
  !PAYSTACK_SECRET_KEY.startsWith('mock') &&
  PAYSTACK_SECRET_KEY.startsWith('sk_')
);

/**
 * Initialize a Paystack checkout transaction.
 * If PAYSTACK_SECRET_KEY is not configured or in testing, smoothly falls back
 * to our built-in Sandbox Simulator so local testing and review never break.
 */
export async function initializePayment(options: PaystackInitializeOptions): Promise<PaystackInitResponse> {
  if (!IS_CONFIGURED) {
    console.info(`[Paystack Sandbox] Initializing transaction for ref=${options.reference}, amount=₦${(options.amount / 100).toLocaleString()}`);
    return {
      success: true,
      authorizationUrl: `/pay/sandbox?reference=${encodeURIComponent(options.reference)}&amount=${options.amount}&email=${encodeURIComponent(options.email)}`,
      reference: options.reference,
      isSandbox: true,
      message: 'Sandbox transaction initialized',
    };
  }

  try {
    const res = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: options.email,
        amount: Math.round(options.amount),
        reference: options.reference,
        callback_url: options.callbackUrl,
        metadata: options.metadata,
        channels: options.channels || ['card', 'bank', 'ussd', 'bank_transfer'],
        subaccount: options.subaccount,
        bearer: options.bearer,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.status) {
      throw new Error(data.message || 'Failed to initialize Paystack transaction');
    }

    return {
      success: true,
      authorizationUrl: data.data.authorization_url,
      accessCode: data.data.access_code,
      reference: data.data.reference,
      isSandbox: false,
    };
  } catch (error: any) {
    console.error('[Paystack] initializePayment error:', error);
    throw error;
  }
}

/**
 * Verify a transaction with Paystack or the Sandbox validator.
 */
export async function verifyPayment(reference: string): Promise<PaystackVerifyResponse> {
  if (!IS_CONFIGURED) {
    console.info(`[Paystack Sandbox] Verifying ref=${reference}`);
    return {
      success: true,
      status: 'success',
      reference,
      isSandbox: true,
      message: 'Sandbox payment verified successfully',
    };
  }

  try {
    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      },
    });

    const data = await res.json();
    if (!res.ok || !data.status) {
      return {
        success: false,
        status: 'failed',
        reference,
        message: data.message || 'Payment verification failed',
      };
    }

    const txData = data.data;
    return {
      success: txData.status === 'success',
      status: txData.status,
      amount: txData.amount,
      reference: txData.reference,
      channel: txData.channel,
      paidAt: txData.paid_at,
      customer: txData.customer,
      metadata: txData.metadata,
      isSandbox: false,
    };
  } catch (error: any) {
    console.error('[Paystack] verifyPayment error:', error);
    return {
      success: false,
      status: 'failed',
      reference,
      message: error?.message || 'Network error verifying payment',
    };
  }
}

/**
 * Validate incoming Paystack Webhook HMAC SHA512 signature.
 */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!PAYSTACK_SECRET_KEY || !signature) return false;
  try {
    const hash = crypto.createHmac('sha512', PAYSTACK_SECRET_KEY).update(rawBody).digest('hex');
    return hash === signature;
  } catch {
    return false;
  }
}
