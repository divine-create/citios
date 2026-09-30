import { db } from './src/prisma/db';
import { addVoiceCartItem, removeVoiceCartItem } from './lib/voice/cart';

async function test() {
  try {
    const personId = '1d805a30-98b9-4471-b033-b899968d9655';
    const products = await db.orm.public.RetailProduct.all();
    const product = products.find(p => (p.stockQuantity || 0) > 0);
    console.log('Adding product:', product?.id, product?.stockQuantity);
    
    let res = await addVoiceCartItem(personId, product!.id, 1, 'retail');
    console.log('Cart after add:', res.cart.items.length);

    res = await removeVoiceCartItem(personId, product!.id);
    console.log('Cart after remove:', res.cart.items.length);
  } catch(e: any) {
    console.error('Error:', e.stack || e.message);
  }
}
test();
