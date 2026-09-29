import { VoiceModule } from '../../core/policy';
import { getProfile, getOrderStatus } from '../../tools/impl/account';

export const AccountModule: VoiceModule = {
  id: 'account',
  name: 'Account & Logistics Module',
  description: 'Handles resident profiles, orders, and delivery tracking.',
  tools: [getProfile, getOrderStatus, getDeliveryStatus] // Temporarily using existing implementations
};
