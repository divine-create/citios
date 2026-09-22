import {
  PaymentProviderAdapter,
  InitializePaymentInput,
  InitializePaymentOutput,
  VerifyPaymentOutput,
  RefundPaymentInput,
  RefundPaymentOutput,
  NormalizedWebhookEvent,
} from '../types';
import { initializePayment as paystackInitialize, verifyPayment as paystackVerify, verifyWebhookSignature } from '@/lib/paystack';

export class PaystackAdapter implements PaymentProviderAdapter {
  readonly providerName = 'PAYSTACK';

  async initializePayment(input: InitializePaymentInput): Promise<InitializePaymentOutput> {
    try {
      const result = await paystackInitialize({
        email: input.email,
        amount: Math.round(input.amount * 100), // Paystack uses Kobo/Cents
        reference: input.reference,
        callbackUrl: input.callbackUrl,
        metadata: input.metadata,
      });

      return {
        success: true,
        authorizationUrl: result.authorizationUrl,
        isSandbox: result.isSandbox,
        providerReference: result.reference, // Paystack returns the same reference we send usually
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async verifyPayment(reference: string): Promise<VerifyPaymentOutput> {
    try {
      const result = await paystackVerify(reference);
      
      let status: 'SUCCESS' | 'FAILED' | 'PENDING' = 'PENDING';
      if (result.status === 'success') status = 'SUCCESS';
      else if (result.status === 'failed' || result.status === 'abandoned') status = 'FAILED';

      return {
        success: result.success,
        status,
        amount: result.amount ? result.amount / 100 : undefined,
        currency: 'NGN',
      };
    } catch (error: any) {
      return { success: false, status: 'FAILED', error: error.message };
    }
  }

  validateWebhookSignature(rawBody: string, signature: string | null): boolean {
    if (!signature) return false;
    return verifyWebhookSignature(rawBody, signature);
  }

  normalizeWebhookEvent(payload: any): NormalizedWebhookEvent | null {
    if (!payload || !payload.event || !payload.data) return null;
    
    let status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'REFUNDED' = 'PENDING';
    if (payload.event === 'charge.success') status = 'SUCCESS';
    else if (payload.event === 'refund.processed') status = 'REFUNDED';
    else if (payload.event === 'charge.failed') status = 'FAILED';
    
    // Convert from kobo/cents back to standard unit
    const amount = payload.data.amount ? payload.data.amount / 100 : 0;

    return {
      providerEventId: payload.data.id ? String(payload.data.id) : `${payload.event}-${payload.data.reference}`,
      providerReference: String(payload.data.id || payload.data.reference),
      reference: payload.data.reference || null,
      status,
      amount,
      currency: payload.data.currency || 'NGN',
      rawPayload: payload,
    };
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    // Basic paystack refund call mock for this phase until standard API integrated
    try {
      console.log(`[PaystackAdapter] Triggering refund for ${input.providerReference}`);
      // Normally we would call Paystack's /refund endpoint here
      return {
        success: true,
        status: 'REFUNDED',
        providerRefundId: 'REF_' + Date.now(),
      };
    } catch (error: any) {
      return { success: false, status: 'FAILED', error: error.message };
    }
  }
}
