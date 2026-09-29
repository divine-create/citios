import { VoiceModule } from '../../core/policy';
import { searchCity, searchProducts, searchBusinesses, searchRestaurants, searchFoodItems } from '../../tools/impl/discovery';

export const DiscoveryModule: VoiceModule = {
  id: 'discovery',
  name: 'Discovery & Search Module',
  description: 'Find organizations, services, products, and restaurants across the city.',
  tools: [searchCity, searchProducts, searchBusinesses, searchRestaurants]
};
