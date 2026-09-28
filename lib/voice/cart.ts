import { db } from '@/src/prisma/db';
import { placeRetailOrder } from '@/app/actions/commerce';

interface VoiceCartItemType {
  id: string;
  productId: string;
  quantity: number;
  product?: { name: string; price: number };
}

// Gets or creates a VoiceCart for a person
export async function getVoiceCart(personId: string) {
  let cart = await db.orm.public.VoiceCart
    .where({ personId })
    .select('id', 'personId', 'updatedAt')
    .include('items', (i) => i
      .select('id', 'productId', 'quantity')
      .include('product', (p) => p.select('id', 'name', 'price', 'stockQuantity'))
    )
    .include('checkout', (c) => c.select('id', 'totalAmount', 'expiresAt', 'idempotencyKey'))
    .first();

  if (!cart) {
    cart = await db.orm.public.VoiceCart.select('id', 'personId', 'updatedAt').create({ personId }) as any;
    cart!.items = [];
    cart!.checkout = null;
  }

  const items = cart!.items || [];

  // Calculate totals
  let subtotal = 0;
  items.forEach((item) => {
    subtotal += (item.product?.price || 0) * item.quantity;
  });

  return { cart: { ...cart, items }, subtotal };
}

export async function addVoiceCartItem(personId: string, productId: string, quantity: number) {
  if (typeof quantity !== 'number' || isNaN(quantity) || quantity <= 0) {
    throw new Error('Invalid quantity.');
  }
  const { cart } = await getVoiceCart(personId);
  
  // Find product
  const product = await db.orm.public.RetailProduct.where({ id: productId }).first();
  if (!product) throw new Error('Product not found.');
  if (!product.isWeighed && !Number.isInteger(quantity)) throw new Error('Product cannot be bought in fractions.');
  if ((product.stockQuantity || 0) < quantity) throw new Error('Insufficient stock.');

  await db.transaction(async (tx) => {
    const existingItem = await tx.orm.public.VoiceCartItem.where({ cartId: cart.id as string, productId }).all().first();
    if (existingItem) {
      await tx.orm.public.VoiceCartItem.where({ id: existingItem.id as string }).update({
        quantity: (existingItem.quantity as number) + quantity
      });
    } else {
      await tx.orm.public.VoiceCartItem.create({
        cartId: cart.id as string,
        productId,
        quantity
      });
    }
  });

  // Clear any pending checkout since cart changed
  if (cart.checkout) {
    await db.orm.public.VoiceCheckout.where({ id: (cart.checkout as any).id as string }).delete();
  }

  return getVoiceCart(personId);
}

export async function removeVoiceCartItem(personId: string, productId: string) {
  const { cart } = await getVoiceCart(personId);
  
  const existingItem = cart.items.find((item) => item.productId === productId);
  if (existingItem) {
    await db.orm.public.VoiceCartItem.where({ id: existingItem.id as string }).delete();
  }

  // Clear pending checkout
  if (cart.checkout) {
    await db.orm.public.VoiceCheckout.where({ id: (cart.checkout as any).id as string }).delete();
  }

  return getVoiceCart(personId);
}

export async function updateVoiceCartQuantity(personId: string, productId: string, quantity: number) {
  if (typeof quantity !== 'number' || isNaN(quantity)) throw new Error('Invalid quantity.');
  if (quantity <= 0) return removeVoiceCartItem(personId, productId);
  
  const { cart } = await getVoiceCart(personId);
  
  const product = await db.orm.public.RetailProduct.where({ id: productId }).first();
  if (!product) throw new Error('Product not found.');
  if (!product.isWeighed && !Number.isInteger(quantity)) throw new Error('Product cannot be bought in fractions.');
  if ((product.stockQuantity || 0) < quantity) throw new Error('Insufficient stock.');

  await db.transaction(async (tx) => {
    const existingItem = await tx.orm.public.VoiceCartItem.where({ cartId: cart.id as string, productId }).all().first();
    if (existingItem) {
      await tx.orm.public.VoiceCartItem.where({ id: existingItem.id as string }).update({
        quantity
      });
    } else {
      await tx.orm.public.VoiceCartItem.create({
        cartId: cart.id as string,
        productId,
        quantity
      });
    }
  });

  // Clear pending checkout
  if (cart.checkout) {
    await db.orm.public.VoiceCheckout.where({ id: (cart.checkout as any).id as string }).delete();
  }

  return getVoiceCart(personId);
}

export async function prepareVoiceCheckout(personId: string) {
  const { cart, subtotal } = await getVoiceCart(personId);
  
  if (cart.items.length === 0) throw new Error('Cart is empty.');

  // Validate stock again
  for (const item of cart.items) {
    if ((item.product?.price || 0) === 0) {
       // Just a safe check
    }
    // We already know it's validated at addition, but let's re-check
    const prod = await db.orm.public.RetailProduct.where({ id: item.productId as string }).first();
    if (!prod || (prod.stockQuantity || 0) < item.quantity) {
      throw new Error(`Item ${item.product?.name} no longer has sufficient stock.`);
    }
  }

  // Create pending checkout
  if (cart.checkout) {
    await db.orm.public.VoiceCheckout.where({ id: (cart.checkout as any).id as string }).delete();
  }

  const checkout = await db.orm.public.VoiceCheckout.create({
    cartId: cart.id as string,
    totalAmount: subtotal,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 mins
    idempotencyKey: Math.random().toString(36).substring(2, 15)
  });

  return {
    checkoutId: checkout.id,
    totalAmount: subtotal,
    itemCount: cart.items.length
  };
}

export async function confirmVoiceCheckout(personId: string, checkoutId: string) {
  const { cart } = await getVoiceCart(personId);
  const checkout = cart.checkout as any;
  
  if (!checkout || checkout.id !== checkoutId) {
    throw new Error('Checkout session invalid or expired.');
  }

  if (new Date() > (checkout.expiresAt as Date)) {
    await db.orm.public.VoiceCheckout.where({ id: checkoutId }).delete();
    throw new Error('Checkout expired.');
  }

  const itemsPayload = cart.items.map((i) => ({
    productId: i.productId as string,
    qty: i.quantity as number,
    name: i.product?.name || 'Unknown Item'
  }));

  const result = await placeRetailOrder({
    items: itemsPayload,
    method: 'bank_transfer',
    idempotencyKey: checkout.idempotencyKey as string,
    expectedTotal: checkout.totalAmount as number
  });

  try {
    for (const item of cart.items) {
      await db.orm.public.VoiceCartItem.where({ id: item.id as string }).delete();
    }
    await db.orm.public.VoiceCheckout.where({ id: checkoutId }).delete();
  } catch (err) {
    // Ignore errors if already deleted by a concurrent confirmation
  }

  return result;
}
