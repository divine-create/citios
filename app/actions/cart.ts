'use server';

import { getServerSession } from 'next-auth';
import { getVoiceCart, addVoiceCartItem, removeVoiceCartItem, updateVoiceCartQuantity } from '@/lib/voice/cart';

export async function fetchUserCart() {
  const session = await getServerSession();
  if (!session?.user?.personId) return null;
  const { cart, subtotal } = await getVoiceCart(session.user.personId);
  return { cart, subtotal };
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
