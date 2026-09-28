import { registerTool, VoiceToolDefinition } from '../policy';
import { getVoiceContext, updateVoiceContext, pushRecentEntity } from '../context/manager';

// We will import implementations and register them here.
import { searchCity, searchProducts, searchBusinesses, searchRestaurants } from './impl/discovery';
import { getProfile, getOrderStatus, getDeliveryStatus } from './impl/account';
import { getCart, addToCart, updateCartQuantity, removeFromCart, prepareCheckout, confirmCheckout } from './impl/cart';
import { searchServices, getMyServiceRequests, prepareServiceRequest, confirmServiceRequest } from './impl/services';

export function initializeToolRegistry() {
  // Discovery
  registerTool(searchCity);
  registerTool(searchProducts);
  registerTool(searchBusinesses);
  registerTool(searchRestaurants);

  // Account
  registerTool(getProfile);
  registerTool(getOrderStatus);
  registerTool(getDeliveryStatus);

  // Cart & Checkout
  registerTool(getCart);
  registerTool(addToCart);
  registerTool(updateCartQuantity);
  registerTool(removeFromCart);
  registerTool(prepareCheckout);
  registerTool(confirmCheckout);

  // Services
  registerTool(searchServices);
  registerTool(getMyServiceRequests);
  registerTool(prepareServiceRequest);
  registerTool(confirmServiceRequest);
}
