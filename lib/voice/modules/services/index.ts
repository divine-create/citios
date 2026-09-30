import { VoiceModule } from '../../core/policy';
import { searchServices, getMyServiceRequests, prepareServiceRequest, confirmServiceRequest } from '../../tools/impl/services';

export const ServicesModule: VoiceModule = {
  version: '1.0.0',
  id: 'services',
  name: 'City Services Module',
  description: 'Find and book service professionals, report city issues.',
  tools: [searchServices, getMyServiceRequests, prepareServiceRequest, confirmServiceRequest]
};
