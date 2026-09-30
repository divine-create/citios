const fs = require('fs');
let code = fs.readFileSync('lib/voice/cart.ts', 'utf8');

const confirmFunctionRegex = /export async function confirmVoiceCheckout\(personId: string, checkoutId: string\) \{[\s\S]*?return getVoiceCart\(personId\);\n\}/;

const newConfirmFunction = `export async function confirmVoiceCheckout(personId: string, checkoutId: string) {
  const { cart } = await getVoiceCart(personId);
  const checkout = cart.checkout as any;
  
  if (!checkout || checkout.id !== checkoutId) {
    throw new Error('Checkout session invalid or expired.');
  }

  if (new Date() > (checkout.expiresAt as Date)) {
    await db.orm.public.CartCheckout.where({ id: checkoutId }).delete();
    throw new Error('Checkout expired.');
  }

  const retailItems = cart.items.filter((i: any) => i.kind === 'retail').map((i: any) => ({
    productId: i.retailProductId,
    qty: i.quantity,
    name: i.product?.name || 'Unknown Item'
  }));

  const foodItems = cart.items.filter((i: any) => i.kind === 'food').map((i: any) => ({
    menuItemId: i.menuItemId,
    qty: i.quantity,
    name: i.menuItem?.name || 'Unknown Item'
  }));

  if (retailItems.length > 0) {
    await placeRetailOrder({
      items: retailItems,
      method: 'bank_transfer',
      idempotencyKey: checkout.idempotencyKey as string + '_retail',
      expectedTotal: cart.items.filter((i:any) => i.kind === 'retail').reduce((acc:any, i:any) => acc + (i.product?.price || 0) * i.quantity, 0)
    });
  }

  if (foodItems.length > 0) {
    const { placeRestaurantOrder } = await import('@/app/actions/food');
    
    // Get the first location for the organization of the first food item
    const firstFoodItem = cart.items.find((i: any) => i.kind === 'food');
    let locationId = '';
    if (firstFoodItem?.menuItem?.organizationId) {
      const loc = await db.orm.public.Location.where({ organizationId: firstFoodItem.menuItem.organizationId }).first();
      if (loc) locationId = loc.id as string;
    }

    await placeRestaurantOrder({
      locationId,
      items: foodItems,
      type: 'TAKEOUT',
      method: 'bank_transfer',
      paymentReference: checkout.idempotencyKey as string + '_food'
    });
  }

  try {
    await db.orm.public.CartItem.where({ cartId: cart.id as string }).delete();
    await db.orm.public.CartCheckout.where({ id: checkoutId }).delete();
  } catch (err) {
    console.error('Error clearing cart after checkout', err);
  }

  return getVoiceCart(personId);
}`;

code = code.replace(confirmFunctionRegex, newConfirmFunction);

fs.writeFileSync('lib/voice/cart.ts', code);
