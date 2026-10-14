import crypto from 'crypto';
import { 
  PaymentProviderAdapter, 
  InitializePaymentInput, 
  InitializePaymentOutput, 
  VerifyPaymentOutput, 
  RefundPaymentInput, 
  RefundPaymentOutput, 
  NormalizedWebhookEvent 
} from '../types';

export class MonnifyAdapter implements PaymentProviderAdapter {
  readonly providerName = 'MONNIFY';

  private isConfigured(): boolean {
    const apiKey = process.env.MONNIFY_API_KEY;
    const secretKey = process.env.MONNIFY_SECRET_KEY;
    return Boolean(apiKey && secretKey && !apiKey.startsWith('mock') && !secretKey.startsWith('mock'));
  }

  private getAuthHeaders(): Record<string, string> {
    const apiKey = process.env.MONNIFY_API_KEY || '';
    const secretKey = process.env.MONNIFY_SECRET_KEY || '';
    const token = Buffer.from(`${apiKey}:${secretKey}`).toString('base64');
    return {
      'Authorization': `Basic ${token}`,
      'Content-Type': 'application/json'
    };
  }

  private async getBearerToken(): Promise<string> {
    const response = await fetch(`${process.env.MONNIFY_BASE_URL || 'https://sandbox.monnify.com'}/api/v1/auth/login`, {
      method: 'POST',
      headers: this.getAuthHeaders()
    });
    const data = await response.json();
    if (!data.requestSuccessful) {
      throw new Error(`Monnify Auth Error: ${data.responseMessage}`);
    }
    return data.responseBody.accessToken;
  }

  async initializePayment(input: InitializePaymentInput): Promise<InitializePaymentOutput> {
    if (!this.isConfigured()) {
      return {
        success: true,
        authorizationUrl: `/pay/sandbox?reference=${encodeURIComponent(input.reference)}&amount=${Math.round(input.amount * 100)}&email=${encodeURIComponent(input.email)}`,
        providerReference: `MNFY_${Date.now()}`,
        isSandbox: true,
      };
    }

    try {
      const token = await this.getBearerToken();
      const response = await fetch(`${process.env.MONNIFY_BASE_URL || 'https://sandbox.monnify.com'}/api/v1/merchant/transactions/init-transaction`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: input.amount,
          customerName: input.metadata?.customerName || 'Resident',
          customerEmail: input.email,
          paymentReference: input.reference,
          paymentDescription: input.metadata?.description || 'CityOS Payment',
          currencyCode: input.currency,
          contractCode: process.env.MONNIFY_CONTRACT_CODE || '',
          redirectUrl: input.callbackUrl,
          paymentMethods: ["CARD", "ACCOUNT_TRANSFER"]
        })
      });

      const data = await response.json();
      
      if (!data.requestSuccessful) {
        return { success: false, error: data.responseMessage };
      }

      return {
        success: true,
        authorizationUrl: data.responseBody.checkoutUrl,
        providerReference: data.responseBody.transactionReference,
        isSandbox: process.env.MONNIFY_BASE_URL?.includes('sandbox') ?? true
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async verifyPayment(reference: string): Promise<VerifyPaymentOutput> {
    if (!this.isConfigured()) {
      return {
        success: true,
        status: 'SUCCESS',
        amount: undefined,
        currency: 'NGN',
      };
    }

    try {
      const token = await this.getBearerToken();
      const response = await fetch(`${process.env.MONNIFY_BASE_URL || 'https://sandbox.monnify.com'}/api/v1/merchant/transactions/query?paymentReference=${reference}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      if (!data.requestSuccessful) {
        return { success: false, status: 'FAILED', error: data.responseMessage };
      }

      const statusMap: Record<string, 'SUCCESS'|'FAILED'|'PENDING'> = {
        'PAID': 'SUCCESS',
        'PENDING': 'PENDING',
        'FAILED': 'FAILED'
      };

      return {
        success: data.responseBody.paymentStatus === 'PAID',
        status: statusMap[data.responseBody.paymentStatus] || 'PENDING',
        amount: data.responseBody.amountPaid,
        currency: data.responseBody.currencyCode
      };
    } catch (err: any) {
      return { success: false, status: 'FAILED', error: err.message };
    }
  }

  validateWebhookSignature(rawBody: string, signature: string | null): boolean {
    if (!signature) return false;
    const secretKey = process.env.MONNIFY_SECRET_KEY || '';
    const computedHash = crypto.createHmac('sha512', secretKey).update(rawBody).digest('hex');
    return computedHash === signature;
  }

  normalizeWebhookEvent(payload: any): NormalizedWebhookEvent | null {
    if (!payload.eventData) return null;
    
    // Monnify webhooks don't always have a strict globally unique event ID for exactly-once processing
    // So we use transactionReference as a fallback, though realistically we should use a hash of the event.
    const eventId = payload.eventData.transactionReference + '_' + payload.eventType;

    let status: NormalizedWebhookEvent['status'] = 'PENDING';
    if (payload.eventType === 'SUCCESSFUL_TRANSACTION') {
      status = 'SUCCESS';
    } else if (payload.eventType === 'FAILED_TRANSACTION') {
      status = 'FAILED';
    } else if (payload.eventType === 'REFUND_COMPLETED') {
      status = 'REFUNDED';
    }

    return {
      providerEventId: eventId,
      providerReference: payload.eventData.transactionReference,
      reference: payload.eventData.paymentReference || null,
      status,
      amount: payload.eventData.amountPaid || payload.eventData.amount,
      currency: payload.eventData.currency || 'NGN',
      rawPayload: payload
    };
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    try {
      const token = await this.getBearerToken();
      const response = await fetch(`${process.env.MONNIFY_BASE_URL || 'https://sandbox.monnify.com'}/api/v1/disbursements/refund`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          transactionReference: input.providerReference,
          refundAmount: input.amount,
          refundReason: input.reason || 'Requested by merchant'
        })
      });

      const data = await response.json();
      
      if (!data.requestSuccessful) {
        return { success: false, status: 'FAILED', error: data.responseMessage };
      }

      return {
        success: true,
        status: 'PENDING', // Monnify refunds are asynchronous
        providerRefundId: data.responseBody.refundReference
      };
    } catch (err: any) {
      return { success: false, status: 'FAILED', error: err.message };
    }
  }

  // Payout implementation
  async createPayout(input: any): Promise<any> {
    try {
      const token = await this.getBearerToken();
      const response = await fetch(`${process.env.MONNIFY_BASE_URL || 'https://sandbox.monnify.com'}/api/v2/disbursements/single`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: input.amount,
          reference: input.reference,
          narration: input.description,
          destinationBankCode: input.bankCode,
          destinationAccountNumber: input.accountNumber,
          currency: input.currency || "NGN",
          sourceAccountNumber: process.env.MONNIFY_WALLET_ACCOUNT_NUMBER || ''
        })
      });

      const data = await response.json();
      if (!data.requestSuccessful) {
        return { success: false, status: 'FAILED', error: data.responseMessage };
      }
      return { success: true, status: 'PROCESSING', providerReference: data.responseBody.reference };
    } catch (err: any) {
      return { success: false, status: 'FAILED', error: err.message };
    }
  }
}
