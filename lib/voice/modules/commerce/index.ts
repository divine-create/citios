import { VoiceModule } from '../../core/policy';
import { getCart, addToCart, updateCartQuantity, removeFromCart, prepareCheckout, confirmCheckout } from '../../tools/impl/cart';

export const CommerceModule: VoiceModule = {
  id: 'commerce',
  name: 'Commerce & Cart Module',
  description: 'Manage shopping cart and checkout processes.',
  tools: [getCart, addToCart, updateCartQuantity, removeFromCart, prepareCheckout, confirmCheckout]
};
