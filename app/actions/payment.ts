'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/src/prisma/db';
import { placeRetailOrder } from '@/app/actions/commerce';
import { placeRestaurantOrder } from '@/app/actions/food';
import { getPaymentAdapter } from '@/lib/payments/factory';

export interface InitiateCheckoutInput {
  kind: 'retail' | 'food';
  items: { productId: string; qty: number; name: string }[];
  method: 'wallet' | 'card' | 'transfer';
  type?: 'TAKEOUT' | 'DINE_IN';
  tableNumber?: string;
  callbackUrl?: string;
  locationId?: string;
  idempotencyKey?: string;
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

  // 1. Wallet payment: executes immediately and completes
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
        locationId: input.locationId,
        idempotencyKey: input.idempotencyKey,
      });
      return { success: true, redirectUrl: '/pay/success' };
    }
  }

  // 2. Gateway payments (Card / Bank Transfer)
  let totalAmount = 0;
  if (input.kind === 'retail') {
    for (const item of input.items) {
      const p = await db.orm.public.RetailProduct.where({ id: item.productId }).all().first();
      if (!p) return { error: `Product ${item.name} not found.` };
      // Note: we do NOT decrement stock here. We just calculate the total safely.
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

  // Determine provider (for now, default to PAYSTACK)
  const provider = 'PAYSTACK';
  const adapter = getPaymentAdapter(provider);

  // Pre-create the order/payment in database with PENDING status
  let primaryOrderId: string | undefined;
  
  if (input.kind === 'retail') {
    const orderResult: any = await placeRetailOrder({
      items: input.items,
      method: input.method,
      locationId: input.locationId,
      idempotencyKey: input.idempotencyKey,
      paymentReference: reference,
    });
    // In our modified placeRetailOrder, if idempotency hits, it returns the order object
    // If newly created, it also returns the order object (since orderResult is the createdOrder)
    // Wait, the previous logic returned { success: true, orderIds: [...], total: grandTotal } from placeRetailOrder!
    // I need to be careful with what placeRetailOrder returns.
    if (orderResult && orderResult.id) {
       // If returning order directly (idempotency hit or single creation inside transaction)
       primaryOrderId = orderResult.id;
    } else if (orderResult && orderResult.orderIds) {
       primaryOrderId = orderResult.orderIds[0];
    }
  } else {
    // Restaurant OS fallback
    const orderResult: any = await placeRestaurantOrder({
      items: input.items.map((i) => ({ menuItemId: i.productId, qty: i.qty, name: i.name })),
      type: input.type || 'TAKEOUT',
      tableNumber: input.tableNumber,
    });
    primaryOrderId = orderResult.orderId || (orderResult.orderIds && orderResult.orderIds[0]);
  }

  if (primaryOrderId) {
     // Ensure the payment has the right provider recorded
     const payment = await db.orm.public.Payment.where({ reference }).all().first();
     if (payment) {
        await db.orm.public.Payment.where({ id: payment.id }).update({ provider });
     }
  }

  // Initialize with the abstract provider
  const origin = process.env.NEXTAUTH_URL || 'http://localhost:3001';
  const callbackUrl = `${origin}/pay/success?reference=${encodeURIComponent(reference)}`;

  const initResult = await adapter.initializePayment({
    email: userEmail,
    amount: totalAmount,
    currency: 'NGN',
    reference,
    callbackUrl,
    metadata: {
      orderId: primaryOrderId,
      kind: input.kind,
      personId: session.user.personId,
    },
  });

  if (!initResult.success) {
    return { error: initResult.error || 'Failed to initialize payment.' };
  }

  // Optionally update providerReference if returned immediately
  if (initResult.providerReference) {
    const p = await db.orm.public.Payment.where({ reference }).all().first();
    if (p) {
      await db.orm.public.Payment.where({ id: p.id }).update({ providerReference: initResult.providerReference });
    }
  }

  return {
    success: true,
    redirectUrl: initResult.authorizationUrl || callbackUrl,
    reference,
    isSandbox: initResult.isSandbox,
  };
}

export async function verifyOrderPayment(reference: string) {
  // Try to find the payment
  const payment = await db.orm.public.Payment.where({ reference }).all().first();
  if (!payment) return { success: false, message: 'Payment reference not found.' };

  const adapter = getPaymentAdapter(payment.provider || 'PAYSTACK');
  const verifyResult = await adapter.verifyPayment(reference);

  if (!verifyResult.success || verifyResult.status !== 'SUCCESS') {
    return { success: false, message: verifyResult.error || 'Payment has not been confirmed yet.' };
  }

  // Note: Actual fulfillment and stock deduction is handled securely by the Webhook Gateway.
  // The client calling verifyOrderPayment merely checks the status. If the webhook hasn't fired yet,
  // we could theoretically do a sync fulfillment here, but to avoid race conditions, it's safer
  // to rely purely on the webhook for fulfillment. We just return the confirmed status.

  return {
    success: true,
    reference,
    status: verifyResult.status,
  };
}


export async function refundOrderPayment(reference: string, reason?: string) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.personId) {
    return { success: false, message: 'Unauthorized' };
  }

  const payment = await db.orm.public.Payment.where({ reference }).all().first();
  if (!payment) return { success: false, message: 'Payment not found.' };

  // Access control validation: Ensure user belongs to the org that owns this payment
  let orgId = null;
  if (payment.retailOrderId) {
     const order = await db.orm.public.RetailOrder.where({ id: payment.retailOrderId }).all().first();
     if (order) orgId = order.organizationId;
  } else if (payment.restaurantOrderId) {
     const order = await db.orm.public.RestaurantOrder.where({ id: payment.restaurantOrderId }).all().first();
     if (order) orgId = order.organizationId;
  }

  if (!orgId) return { success: false, message: 'Cannot determine organization for payment.' };
  
  const isMember = session.user.memberships?.some((m: any) => m.organizationId === orgId);
  if (!isMember) return { success: false, message: 'Unauthorized to refund this payment.' };

  if (payment.status !== 'COMPLETED') {
     return { success: false, message: 'Only COMPLETED payments can be refunded.' };
  }
  
  if (!payment.providerReference || !payment.provider) {
     return { success: false, message: 'Missing provider identity.' };
  }

  const adapter = getPaymentAdapter(payment.provider);
  
  // Call provider API
  const refundResult = await adapter.refundPayment({
     providerReference: payment.providerReference,
     amount: payment.amount,
     reason
  });

  if (!refundResult.success) {
     return { success: false, message: refundResult.error || 'Provider refund failed.' };
  }

  // Restore inventory & reverse ledger
  await db.transaction(async (tx: any) => {
     await tx.orm.public.Payment.where({ id: payment.id }).update({ status: 'REFUNDED' });
     
     if (payment.retailOrderId) {
        const order = await tx.orm.public.RetailOrder.where({ id: payment.retailOrderId }).all().first();
        if (order) {
           await tx.orm.public.RetailOrder.where({ id: order.id }).update({ status: 'REFUNDED' });
           
           const items = await tx.orm.public.RetailOrderItem.where({ orderId: order.id }).all();
           for (const item of items) {
              if (order.locationId) {
                 const locStock = await tx.orm.public.RetailLocationStock.where({ locationId: order.locationId, productId: item.productId }).all().first();
                 if (locStock) {
                    await tx.orm.public.RetailLocationStock.where({ id: locStock.id }).update({ quantity: locStock.quantity + item.quantity });
                    await tx.orm.public.RetailStockMovement.create({
                      organizationId: order.organizationId,
                      locationId: order.locationId,
                      productId: item.productId,
                      delta: item.quantity,
                      beforeQty: locStock.quantity,
                      afterQty: locStock.quantity + item.quantity,
                      reason: 'REFUND',
                      note: `Refund Order #${order.id.slice(0, 8)}`,
                    });
                 }
              } else {
                 const product = await tx.orm.public.RetailProduct.where({ id: item.productId }).all().first();
                 if (product && !product.isWeighed) {
                    await tx.orm.public.RetailProduct.where({ id: product.id }).update({ stockQuantity: product.stockQuantity + item.quantity });
                 }
              }
           }
        }
     }
     
     if (payment.restaurantOrderId) {
        await tx.orm.public.RestaurantOrder.where({ id: payment.restaurantOrderId }).update({ status: 'REFUNDED' });
     }
     
     // Reverse ledger
     let wallet = await tx.orm.public.Wallet.where({ organizationId: orgId }).all().first();
     if (wallet && payment.transactionId) {
        // Create reversal transaction
        const revTx = await tx.orm.public.Transaction.create({
          reference: `REV-${payment.reference}`,
          status: 'COMPLETED',
          description: `Refund for ${payment.reference}`
        });
        await tx.orm.public.LedgerEntry.create({
          walletId: wallet.id,
          transactionId: revTx.id,
          amount: -payment.amount,
          currency: wallet.currency
        });
        await tx.orm.public.Wallet.where({ id: wallet.id }).update({ balance: wallet.balance - payment.amount });
     }
  });

  return { success: true, message: 'Refund processed successfully.' };
}


