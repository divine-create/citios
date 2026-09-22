import { PaymentProviderAdapter } from './types';
import { PaystackAdapter } from './adapters/paystack';

export function getPaymentAdapter(provider: string): PaymentProviderAdapter {
  const normalized = provider.toUpperCase();
  
  if (normalized === 'PAYSTACK') {
    return new PaystackAdapter();
  }
  
  throw new Error(`Payment provider ${provider} is not configured.`);
}
