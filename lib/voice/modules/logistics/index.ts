import { VoiceModule } from '../../core/policy';
import { listMyDeliveries, getDeliveryStatus } from '../../tools/impl/logistics';

export const logisticsModule: VoiceModule = {
  id: 'logistics',
  name: 'Logistics Module',
  description: 'Tools for tracking deliveries and shipments across CityOS.',
  version: '1.0.0',
  tools: [
    listMyDeliveries,
    getDeliveryStatus
  ]
};

export {
  listMyDeliveries,
  getDeliveryStatus
};
