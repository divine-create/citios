import { PaymentProviderAdapter } from './types';
import { PaystackAdapter } from './adapters/paystack';
import { MonnifyAdapter } from './adapters/monnify';

export function getPaymentAdapter(provider: string): PaymentProviderAdapter {
  const normalized = provider.toUpperCase();
  
  if (normalized === 'PAYSTACK') {
    return new PaystackAdapter();
  }
  if (normalized === 'MONNIFY') {
    return new MonnifyAdapter();
  }
  
  throw new Error(`Payment provider ${provider} is not configured.`);
}
