'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/src/prisma/db';
import { initializePayment, verifyPayment as paystackVerify } from '@/lib/paystack';
import { placeRetailOrder } from '@/app/actions/commerce';
import { placeRestaurantOrder } from '@/app/actions/food';

export interface InitiateCheckoutInput {
  kind: 'retail' | 'food';
  items: { productId: string; qty: number; name: string }[];
  method: 'wallet' | 'card' | 'transfer';
  type?: 'TAKEOUT' | 'DINE_IN';
  tableNumber?: string;
  callbackUrl?: string;
}

export async function initiateCheckout(input: InitiateCheckoutInput) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.personId) {
    return { error: 'You must be signed in to checkout.' };
  }

  const userEmail = session.user.email;
  if (!userEmail) {
    return { error: 'Valid user email required for payment processing.' };
  }

  // 1. Wallet payment: executes immediately
  if (input.method === 'wallet') {
    if (input.kind === 'food') {
      const res = await placeRestaurantOrder({
        items: input.items.map((i) => ({ menuItemId: i.productId, qty: i.qty, name: i.name })),
        type: input.type || 'TAKEOUT',
        tableNumber: input.tableNumber,
      });
      return { success: true, redirectUrl: '/pay/success' };
    } else {
      const res = await placeRetailOrder({
        items: input.items,
        method: 'wallet',
      });
      return { success: true, redirectUrl: '/pay/success' };
    }
  }

  // 2. Gateway payments (Card / Bank Transfer):
  // Calculate verified server-side total
  let totalAmount = 0;
  if (input.kind === 'retail') {
    for (const item of input.items) {
      const p = await db.orm.public.RetailProduct.where({ id: item.productId }).all().first();
      if (!p) return { error: `Product ${item.name} not found.` };
      if (!p.isWeighed && p.stockQuantity < item.qty) {
        return { error: `Insufficient stock for ${p.name}.` };
      }
      totalAmount += p.price * item.qty;
    }
  } else {
    for (const item of input.items) {
      const m = await db.orm.public.MenuItem.where({ id: item.productId }).all().first();
      if (!m) return { error: `Menu item ${item.name} not found.` };
      totalAmount += m.price * item.qty;
    }
  }

  // Generate unique canonical payment reference
  const reference = `CC-${input.kind.toUpperCase().slice(0, 3)}-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  // Pre-create the order in database with PENDING status
  let orderResult: any;
  if (input.kind === 'retail') {
    orderResult = await placeRetailOrder({
      items: input.items,
      method: input.method,
    });
  } else {
    orderResult = await placeRestaurantOrder({
      items: input.items.map((i) => ({ menuItemId: i.productId, qty: i.qty, name: i.name })),
      type: input.type || 'TAKEOUT',
      tableNumber: input.tableNumber,
    });
  }

  const primaryOrderId = orderResult.orderIds ? orderResult.orderIds[0] : orderResult.orderId;

  // Create Transaction and attach reference
  const tx = await db.orm.public.Transaction.create({
    reference,
    status: 'PENDING',
    description: `${input.kind === 'food' ? 'Food' : 'Market'} Order #${reference}`,
  });

  // Link transaction to payment
  if (primaryOrderId) {
    if (input.kind === 'retail') {
      const payment = await db.orm.public.Payment.where({ retailOrderId: primaryOrderId }).all().first();
      if (payment) {
        await db.orm.public.Payment.where({ id: payment.id }).update({
          transactionId: tx.id,
          currency: 'NGN',
        });
      }
    } else {
      const payment = await db.orm.public.Payment.where({ restaurantOrderId: primaryOrderId }).all().first();
      if (payment) {
        await db.orm.public.Payment.where({ id: payment.id }).update({
          transactionId: tx.id,
          currency: 'NGN',
        });
      }
    }
  }

  // Initialize with Paystack (or Sandbox if keys aren't configured)
  const origin = process.env.NEXTAUTH_URL || 'http://localhost:3001';
  const callbackUrl = `${origin}/pay/success?reference=${encodeURIComponent(reference)}`;

  const paystackRes = await initializePayment({
    email: userEmail,
    amount: Math.round(totalAmount * 100), // convert to kobo
    reference,
    callbackUrl,
    metadata: {
      orderId: primaryOrderId,
      kind: input.kind,
      personId: session.user.personId,
    },
  });

  return {
    success: true,
    redirectUrl: paystackRes.authorizationUrl || callbackUrl,
    reference,
    isSandbox: paystackRes.isSandbox,
  };
}

export async function verifyOrderPayment(reference: string) {
  try {
    const paystackResult = await paystackVerify(reference);

    if (!paystackResult.success || paystackResult.status !== 'success') {
      return { success: false, message: 'Payment has not been confirmed yet.' };
    }

    // Find and update Transaction
    const tx = await db.orm.public.Transaction.where({ reference }).all().first();
    if (tx) {
      await db.orm.public.Transaction.where({ id: tx.id }).update({ status: 'COMPLETED' });

      const payment = await db.orm.public.Payment.where({ transactionId: tx.id }).all().first();
      if (payment) {
        await db.orm.public.Payment.where({ id: payment.id }).update({ status: 'COMPLETED' });
        
        if (payment.retailOrderId) {
          await db.orm.public.RetailOrder.where({ id: payment.retailOrderId }).update({ status: 'COMPLETED' });
        }
        if (payment.restaurantOrderId) {
          await db.orm.public.RestaurantOrder.where({ id: payment.restaurantOrderId }).update({ status: 'PREPARING' });
        }
      }
    }

    return {
      success: true,
      reference,
      status: 'COMPLETED',
    };
  } catch (err: any) {
    console.error('Error verifying payment:', err);
    return { success: false, message: err?.message || 'Verification failed.' };
  }
}
