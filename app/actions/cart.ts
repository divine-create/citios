'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getVoiceCart, addVoiceCartItem, removeVoiceCartItem, updateVoiceCartQuantity, clearVoiceCart } from '@/lib/voice/cart';

export async function fetchUserCart() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.personId) return null;
  const { cart, subtotal } = await getVoiceCart(session.user.personId);
  
  const mappedLines = await Promise.all(cart.items.map(async (item: any) => {
    let svcName = 'Service';
    let svcPrice = 0;
    let svcOrgId = '';
    let svcOrgName = 'Unknown Provider';
    let isAvailable = true;
    let image: string | null = null;
    let stockQuantity: number | undefined = undefined;

    if (item.kind === 'service' && item.sourceId) {
      const svc = await import('@/src/prisma/db').then(m => m.db.orm.public.ServiceCatalogItem.where({ id: item.sourceId }).include('organization', o => o.select('name')).first());
      if (svc) {
        svcName = svc.name as string;
        svcPrice = svc.price as number;
        svcOrgId = svc.organizationId as string;
        svcOrgName = svc.organization?.name as string;
        image = svc.imageAssetId || null;
        isAvailable = (svc as any).isActive !== false;
      } else {
        isAvailable = false;
      }
    } else if (item.kind === 'food') {
      image = item.menuItem?.imageUrl || null;
      isAvailable = item.menuItem?.isAvailable !== false;
    } else if (item.kind === 'retail') {
      image = item.product?.imageAssetId || null;
      stockQuantity = item.product?.stockQuantity ?? 0;
      isAvailable = (item.product?.stockQuantity ?? 0) >= item.quantity;
    }

    return {
      productId: item.kind === 'retail' ? item.retailProductId : item.kind === 'food' ? item.menuItemId : item.sourceId,
      qty: item.quantity,
      name: item.kind === 'retail' ? (item.product?.name || 'Unknown') : item.kind === 'food' ? (item.menuItem?.name || 'Unknown') : svcName,
      price: item.kind === 'retail' ? (item.product?.price || 0) : item.kind === 'food' ? (item.menuItem?.price || 0) : svcPrice,
      image,
      isAvailable,
      stockQuantity,
      orgId: item.kind === 'retail' ? item.product?.organizationId : item.kind === 'food' ? item.menuItem?.organizationId : svcOrgId,
      orgName: item.kind === 'retail' ? (item.product?.organization?.name) : item.kind === 'food' ? (item.menuItem?.organization?.name) : svcOrgName,
      kind: item.kind,
      citySlug: cart.citySlug || undefined
    };
  }));

  return { lines: mappedLines, subtotal, cartCitySlug: cart.citySlug };
}

export async function addCartItemAction(productId: string, quantity: number, kind: 'retail' | 'food' | 'service') {
  const session = await getServerSession(authOptions);
  if (!session?.user?.personId) throw new Error('Unauthorized');
  await addVoiceCartItem(session.user.personId, productId, quantity, kind);
}

export async function removeCartItemAction(productId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.personId) throw new Error('Unauthorized');
  await removeVoiceCartItem(session.user.personId, productId);
}

export async function updateCartItemQuantityAction(productId: string, quantity: number, kind: 'retail' | 'food' | 'service') {
  const session = await getServerSession(authOptions);
  if (!session?.user?.personId) throw new Error('Unauthorized');
  await updateVoiceCartQuantity(session.user.personId, productId, quantity, kind);
}

export async function clearCartAction() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.personId) return;
  await clearVoiceCart(session.user.personId);
}
