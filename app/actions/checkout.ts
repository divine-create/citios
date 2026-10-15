'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/src/prisma/db';
import { removeVoiceCartItem } from '@/lib/voice/cart';
import { placeRetailOrder } from '@/app/actions/commerce';
import { placeRestaurantOrder } from '@/app/actions/food';
import { requestServiceJob } from '@/app/actions/service';
import { fetchUserCart } from '@/app/actions/cart';
import { getPaymentAdapter } from '@/lib/payments/factory';

export type CheckoutResponse = {
  success: boolean;
  message?: string;
  authorizationUrl?: string; // Provider's checkout URL
  reference?: string;
  orderId?: string;
  errors?: string[];
  requiresPaymentAction?: boolean;
};

export async function processMerchantCheckout(
  orgId: string,
  method: 'wallet' | 'card' | 'transfer',
  idempotencyKey: string,
  locationId?: string
): Promise<CheckoutResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.personId) {
    throw new Error('Unauthorized');
  }
  const personId = session.user.personId;
  const userEmail = session.user.email || 'customer@cityos.local';

  // 1. Fetch Cart securely (this inherently re-fetches authoritative prices and orgs)
  const cartData = await fetchUserCart();
  if (!cartData || !cartData.lines || cartData.lines.length === 0) {
    throw new Error('Cart is empty.');
  }

  // 2. Isolate items for this org
  const orgLines = cartData.lines.filter((l: any) => l.orgId === orgId);
  if (orgLines.length === 0) {
    throw new Error('No items in cart for this merchant.');
  }

  const retailItems = orgLines.filter((l: any) => l.kind === 'retail');
  const foodItems = orgLines.filter((l: any) => l.kind === 'food');
  const serviceItems = orgLines.filter((l: any) => l.kind === 'service');

  // 3. Authoritative Revalidation happens via fetchUserCart which reads current DB state.
  let calculatedTotal = 0;
  for (const item of retailItems) calculatedTotal += (item.price * item.qty);
  for (const item of foodItems) calculatedTotal += (item.price * item.qty);
  // ServiceItems do not charge at checkout (they generate quotes/requests).

  const reference = `CC-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  // 4. Create obligations
  // If only services, no payment needed.
  if (retailItems.length === 0 && foodItems.length === 0 && serviceItems.length > 0) {
    for (const item of serviceItems) {
      await requestServiceJob({ serviceId: item.productId, notes: 'Requested via Resident Cart' });
      await removeVoiceCartItem(personId, item.productId);
    }
    return { success: true, message: 'Service requests submitted successfully.' };
  }

  // If we have retail/food, we must execute them. Note that multiple verticals for same org is supported,
  // but if both exist, we might have two separate orders.
  // Wait, if BOTH retail and food exist for the same org (unlikely but possible), how do we handle payment?
  // We cannot have a single Payment record pointing to both retailOrderId and restaurantOrderId if we use placeRetailOrder and placeRestaurantOrder sequentially, because they each create their own Payment.
  // The safest implementation according to the existing Finance architecture is to dispatch them separately if they are mixed, or restrict checkout to one vertical at a time.
  // To avoid failing multi-vertical checkout, we will process Retail and Food sequentially. 
  // If method is wallet, they debit sequentially.
  // If method is card/transfer, we can only initialize ONE Monnify intent! 
  // Thus, if method is external and they have BOTH Retail and Food for the same org, we must return an error instructing them to checkout separately, as Core Payment cannot span them.
  if (method !== 'wallet' && retailItems.length > 0 && foodItems.length > 0) {
    throw new Error('Cannot process external payment for mixed Retail and Restaurant items simultaneously. Please pay with Wallet or split your cart.');
  }

  let placedOrderId: string | undefined = undefined;

  try {

    if (retailItems.length > 0) {
      const retRes = await placeRetailOrder({
        items: retailItems.map((i: any) => ({ productId: i.productId, qty: i.qty, name: i.name })),
        method,
        idempotencyKey: idempotencyKey + '_ret',
        paymentReference: retailItems.length > 0 && foodItems.length === 0 ? reference : reference + '_RET',
        expectedTotal: retailItems.reduce((acc: number, i: any) => acc + (i.price * i.qty), 0)
      });
      if ((retRes as any)?.orderId) placedOrderId = (retRes as any).orderId;
      // Clear them from cart
      for (const item of retailItems) await removeVoiceCartItem(personId, item.productId);
    }

    if (foodItems.length > 0) {
      const foodRes = await placeRestaurantOrder({
        locationId,
        items: foodItems.map((i: any) => ({ menuItemId: i.productId, qty: i.qty, name: i.name })),
        type: 'TAKEOUT', // Default for resident checkout
        idempotencyKey,
        paymentReference: foodItems.length > 0 && retailItems.length === 0 ? reference : reference + '_FOOD',
        method
      });
      if (foodRes?.orderIds && foodRes.orderIds[0]) placedOrderId = foodRes.orderIds[0];
      for (const item of foodItems) await removeVoiceCartItem(personId, item.productId);
    }

    if (serviceItems.length > 0) {
      for (const item of serviceItems) {
        await requestServiceJob({ serviceId: item.productId, notes: 'Requested via Resident Cart' });
        await removeVoiceCartItem(personId, item.productId);
      }
    }

  } catch (error: any) {
    throw new Error(error.message || 'Failed to place order.');
  }

  // 5. If Wallet, it's already completed inside the vertical actions!
  if (method === 'wallet') {
    return { success: true, message: 'Payment successful via Wallet.', orderId: placedOrderId };
  }

  // 6. External Payment: Initialize configured gateway via adapter
  // Since we enforced that external payments only have EITHER Retail OR Food, the reference matches exactly one Payment created in the vertical action.
  const provider = (process.env.PAYMENT_PROVIDER || 'PAYSTACK').toUpperCase();
  const adapter = getPaymentAdapter(provider);
  
  const initResult = await adapter.initializePayment({
    amount: calculatedTotal,
    currency: 'NGN',
    reference,
    email: userEmail,
    metadata: {
      customerName: session.user.name || 'Resident'
    },
    callbackUrl: process.env.NEXT_PUBLIC_APP_URL 
      ? `${process.env.NEXT_PUBLIC_APP_URL}/pay/success?reference=${encodeURIComponent(reference)}` 
      : `http://localhost:3000/pay/success?reference=${encodeURIComponent(reference)}`
  });

  if (!initResult.success) {
    return { success: false, errors: ['Payment gateway initialization failed.'] };
  }

  return {
    success: true,
    requiresPaymentAction: true,
    authorizationUrl: initResult.authorizationUrl,
    reference
  };
}
