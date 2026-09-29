import { VoiceModule } from '../../core/policy';
import { searchServices, getMyServiceRequests, prepareServiceRequest, confirmServiceRequest } from '../../tools/impl/services';

export const ServicesModule: VoiceModule = {
  id: 'services',
  name: 'City Services Module',
  description: 'Find and book service professionals, report city issues.',
  tools: [searchServices, getMyServiceRequests, prepareServiceRequest, confirmServiceRequest]
};
