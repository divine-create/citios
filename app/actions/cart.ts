'use server';

import { getServerSession } from 'next-auth';
import { getVoiceCart, addVoiceCartItem, removeVoiceCartItem, updateVoiceCartQuantity, clearVoiceCart } from '@/lib/voice/cart';

export async function fetchUserCart() {
  const session = await getServerSession();
  if (!session?.user?.personId) return null;
  const { cart, subtotal } = await getVoiceCart(session.user.personId);
  
  const mappedLines = cart.items.map((item: any) => {
    const isRetail = item.kind === 'retail';
    const ref = isRetail ? item.product : item.menuItem;
    return {
      productId: isRetail ? item.retailProductId : item.menuItemId,
      qty: item.quantity,
      name: ref?.name || 'Unknown',
      price: ref?.price || 0,
      orgId: ref?.organizationId || '',
      orgName: ref?.organization?.name || 'Unknown Store',
      kind: item.kind,
      citySlug: cart.citySlug || undefined
    };
  });

  return { lines: mappedLines, subtotal, cartCitySlug: cart.citySlug };
}

export async function addCartItemAction(productId: string, quantity: number, kind: 'retail' | 'food') {
  const session = await getServerSession();
  if (!session?.user?.personId) throw new Error('Unauthorized');
  await addVoiceCartItem(session.user.personId, productId, quantity, kind);
}

export async function removeCartItemAction(productId: string) {
  const session = await getServerSession();
  if (!session?.user?.personId) throw new Error('Unauthorized');
  await removeVoiceCartItem(session.user.personId, productId);
}

export async function updateCartItemQuantityAction(productId: string, quantity: number, kind: 'retail' | 'food') {
  const session = await getServerSession();
  if (!session?.user?.personId) throw new Error('Unauthorized');
  await updateVoiceCartQuantity(session.user.personId, productId, quantity, kind);
}

export async function clearCartAction() {
  const session = await getServerSession();
  if (!session?.user?.personId) return;
  await clearVoiceCart(session.user.personId);
}
