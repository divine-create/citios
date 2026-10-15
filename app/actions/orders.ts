'use server';

import { getDeliveryStatusForSource } from '@/lib/actions/logistics-api';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/src/prisma/db';
import { resolveResidentCustomerIds } from '@/lib/resident-activity/compose';
import { handleFailedRetailPayment } from '@/lib/actions/citypay';
import { notifyPerson } from '@/lib/notify';
import { revalidatePath } from 'next/cache';

/**
 * Helper to safely extract epoch milliseconds from any timestamp representation
 */
function toEpochMs(val: any): number {
  if (!val) return 0;
  if (typeof val.epochMilliseconds === 'number') return val.epochMilliseconds;
  if (typeof val.getTime === 'function') return val.getTime();
  return new Date(String(val)).getTime();
}

/**
 * Fetch all retail and restaurant orders belonging to the authenticated resident.
 * Derived strictly from session; enforces complete customer data isolation.
 */
export async function fetchMyOrders() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || !session.user.personId) {
    throw new Error('Unauthorized');
  }

  const personId = session.user.personId as string;
  const customerIds = await resolveResidentCustomerIds(personId);
  if (customerIds.length === 0) return { retail: [], restaurant: [] };

  // Fetch Retail Orders
  const retailOrders = await db.orm.public.RetailOrder
    .where((o) => o.customerDataId.in(customerIds))
    .all();
  
  // Fetch Restaurant Orders
  const restaurantOrders = await db.orm.public.RestaurantOrder
    .where((o) => o.customerDataId.in(customerIds))
    .all();

  // For each, fetch the organization, items, payment and delivery
  const enrichedRetail = await Promise.all(retailOrders.map(async (order) => {
    const org = await db.orm.public.Organization.where({ id: order.organizationId }).all().first();
    const items = await db.orm.public.RetailOrderItem.where({ orderId: order.id }).all();
    const payment = await db.orm.public.Payment.where({ retailOrderId: order.id }).all().first();
    const delivery = await getDeliveryStatusForSource('RETAIL_ORDER', order.id);
    
    // Eagerly resolve product names for UI
    const enrichedItems = await Promise.all(items.map(async (item) => {
      const product = await db.orm.public.RetailProduct.where({ id: item.productId }).all().first();
      return { ...item, product };
    }));

    return { ...order, org, items: enrichedItems, payment, delivery };
  }));

  const enrichedRestaurant = await Promise.all(restaurantOrders.map(async (order) => {
    const org = await db.orm.public.Organization.where({ id: order.organizationId }).all().first();
    const items = await db.orm.public.OrderItem.where({ orderId: order.id }).all();
    const payment = await db.orm.public.Payment.where({ restaurantOrderId: order.id }).all().first();
    const delivery = await getDeliveryStatusForSource('RESTAURANT_ORDER', order.id);
    
    const enrichedItems = await Promise.all(items.map(async (item) => {
      const product = await db.orm.public.MenuItem.where({ id: item.menuItemId }).all().first();
      return { ...item, product };
    }));

    return { ...order, org, items: enrichedItems, payment, delivery };
  }));

  // Sort both by createdAt descending safely handling Temporal Instant
  enrichedRetail.sort((a, b) => toEpochMs(b.createdAt) - toEpochMs(a.createdAt));
  enrichedRestaurant.sort((a, b) => toEpochMs(b.createdAt) - toEpochMs(a.createdAt));

  return JSON.parse(JSON.stringify({
    retail: enrichedRetail,
    restaurant: enrichedRestaurant
  }));
}

/**
 * Resident cancellation for a pending retail or food order.
 * Strictly checks actor session and customer ownership.
 * Safely cancels order, cancels pending payment, restores reserved retail stock.
 */
export async function cancelMyOrder(orderId: string, category: 'MARKET' | 'FOOD', reason?: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.personId) {
    throw new Error('Unauthorized. You must be logged in to cancel an order.');
  }

  const personId = session.user.personId as string;
  const customerIds = await resolveResidentCustomerIds(personId);

  return await db.transaction(async (tx: any) => {
    if (category === 'MARKET') {
      const order = await tx.orm.public.RetailOrder.where({ id: orderId }).all().first();
      if (!order) throw new Error('Order not found.');
      if (!order.customerDataId || !customerIds.includes(order.customerDataId)) {
        throw new Error('Forbidden. You do not own this order.');
      }
      if (order.status !== 'PENDING') {
        throw new Error(`Cannot cancel order in status ${order.status}. Only PENDING orders can be cancelled.`);
      }

      // Cancel payment if pending
      const payment = await tx.orm.public.Payment.where({ retailOrderId: order.id }).all().first();
      if (payment && payment.status === 'PENDING') {
        await tx.orm.public.Payment.where({ id: payment.id }).update({ status: 'CANCELLED' });
      }

      // Restore inventory and mark order cancelled
      await handleFailedRetailPayment(tx, order.id);
      await tx.orm.public.RetailOrder.where({ id: order.id }).update({
        status: 'CANCELLED',
        fulfillmentStatus: 'CANCELLED',
      });

      // Fire notification
      try {
        await notifyPerson(personId, {
          type: 'ORDER_CANCELLED',
          title: 'Order Cancelled',
          body: `Your order #${order.id.slice(0, 8).toUpperCase()} was cancelled. Reserved items have been released.`,
          href: '/orders',
        });
      } catch (notifErr) {
        console.warn('[cancelMyOrder] Notification warning:', notifErr);
      }

      try {
        revalidatePath('/orders');
        revalidatePath('/activity');
      } catch (_e) {
        // Next.js static store unavailable in test context
      }

      return { success: true, message: 'Order cancelled successfully.' };
    } else {
      const order = await tx.orm.public.RestaurantOrder.where({ id: orderId }).all().first();
      if (!order) throw new Error('Order not found.');
      if (!order.customerDataId || !customerIds.includes(order.customerDataId)) {
        throw new Error('Forbidden. You do not own this order.');
      }
      if (order.status !== 'PENDING') {
        throw new Error(`Cannot cancel food order in status ${order.status}. Only PENDING orders can be cancelled.`);
      }

      // Cancel payment if pending
      const payment = await tx.orm.public.Payment.where({ restaurantOrderId: order.id }).all().first();
      if (payment && payment.status === 'PENDING') {
        await tx.orm.public.Payment.where({ id: payment.id }).update({ status: 'CANCELLED' });
      }

      await tx.orm.public.RestaurantOrder.where({ id: order.id }).update({
        status: 'CANCELLED',
        paymentStatus: 'FAILED',
      });

      // Fire notification
      try {
        await notifyPerson(personId, {
          type: 'FOOD_ORDER_CANCELLED',
          title: 'Food Order Cancelled',
          body: `Your food order #${order.id.slice(0, 8).toUpperCase()} was cancelled.`,
          href: '/orders',
        });
      } catch (notifErr) {
        console.warn('[cancelMyOrder] Notification warning:', notifErr);
      }

      try {
        revalidatePath('/orders');
        revalidatePath('/activity');
      } catch (_e) {
        // Next.js static store unavailable in test context
      }

      return { success: true, message: 'Food order cancelled successfully.' };
    }
  });
}

/**
 * Resident requests a refund or reports an issue with a completed/confirmed order.
 */
export async function requestMyOrderRefund(orderId: string, category: 'MARKET' | 'FOOD', reason?: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.personId) {
    throw new Error('Unauthorized. You must be logged in to request a refund.');
  }

  const personId = session.user.personId as string;
  const customerIds = await resolveResidentCustomerIds(personId);

  return await db.transaction(async (tx: any) => {
    if (category === 'MARKET') {
      const order = await tx.orm.public.RetailOrder.where({ id: orderId }).all().first();
      if (!order) throw new Error('Order not found.');
      if (!order.customerDataId || !customerIds.includes(order.customerDataId)) {
        throw new Error('Forbidden. You do not own this order.');
      }
      if (order.status !== 'CONFIRMED') {
        throw new Error(`Refund cannot be requested for order with status ${order.status}.`);
      }
      if (order.refundedAt) {
        throw new Error('Refund has already been requested or processed for this order.');
      }

      await tx.orm.public.RetailOrder.where({ id: order.id }).update({
        refundReason: reason || 'Customer requested refund via orders portal',
      });

      try {
        await notifyPerson(personId, {
          type: 'REFUND_REQUESTED',
          title: 'Refund Request Received',
          body: `Your refund request for order #${order.id.slice(0, 8).toUpperCase()} has been submitted to the merchant for review.`,
          href: '/orders',
        });
      } catch (notifErr) {
        console.warn('[requestMyOrderRefund] Notification warning:', notifErr);
      }

      try {
        revalidatePath('/orders');
        revalidatePath('/activity');
      } catch (_e) {
        // Next.js static store unavailable in test context
      }

      return { success: true, message: 'Refund request submitted to merchant.' };
    } else {
      const order = await tx.orm.public.RestaurantOrder.where({ id: orderId }).all().first();
      if (!order) throw new Error('Order not found.');
      if (!order.customerDataId || !customerIds.includes(order.customerDataId)) {
        throw new Error('Forbidden. You do not own this order.');
      }
      if (order.status !== 'COMPLETED' && order.status !== 'PREPARING' && order.status !== 'READY') {
        throw new Error(`Refund cannot be requested for food order with status ${order.status}.`);
      }

      try {
        await notifyPerson(personId, {
          type: 'REFUND_REQUESTED',
          title: 'Refund Request Received',
          body: `Your refund request for food order #${order.id.slice(0, 8).toUpperCase()} has been submitted to the restaurant.`,
          href: '/orders',
        });
      } catch (notifErr) {
        console.warn('[requestMyOrderRefund] Notification warning:', notifErr);
      }

      try {
        revalidatePath('/orders');
        revalidatePath('/activity');
      } catch (_e) {
        // Next.js static store unavailable in test context
      }

      return { success: true, message: 'Refund request submitted to restaurant.' };
    }
  });
}


export async function fetchMyOrderById(orderId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.personId) {
    throw new Error('Unauthorized');
  }

  const personId = session.user.personId as string;
  const customerIds = await resolveResidentCustomerIds(personId);

  // 1. Try finding in RestaurantOrder
  const restOrder = await db.orm.public.RestaurantOrder.where({ id: orderId }).all().first();
  if (restOrder) {
    if (customerIds.length > 0 && !customerIds.includes(restOrder.customerDataId || '')) {
      throw new Error('Forbidden: You do not own this order.');
    }
    const org = await db.orm.public.Organization.where({ id: restOrder.organizationId }).all().first();
    const items = await db.orm.public.OrderItem.where({ orderId: restOrder.id }).all();
    const enrichedItems = await Promise.all(items.map(async (item) => {
      const mi = await db.orm.public.MenuItem.where({ id: item.menuItemId }).all().first();
      return {
        id: item.id,
        name: mi?.name || 'Dish',
        price: item.unitPrice,
        quantity: item.quantity,
        image: mi?.imageUrl,
      };
    }));
    const payment = await db.orm.public.Payment.where({ restaurantOrderId: restOrder.id }).all().first();
    const delivery = await getDeliveryStatusForSource('RESTAURANT_ORDER', restOrder.id);
    const location = restOrder.locationId ? await db.orm.public.Location.where({ id: restOrder.locationId }).all().first() : null;

    return {
      id: restOrder.id,
      category: 'FOOD' as const,
      status: restOrder.status,
      paymentStatus: restOrder.paymentStatus,
      totalAmount: restOrder.totalAmount,
      createdAt: restOrder.createdAt,
      type: restOrder.type,
      org,
      location,
      items: enrichedItems,
      payment,
      delivery,
    };
  }

  // 2. Try finding in RetailOrder
  const retOrder = await db.orm.public.RetailOrder.where({ id: orderId }).all().first();
  if (retOrder) {
    if (customerIds.length > 0 && !customerIds.includes(retOrder.customerDataId || '')) {
      throw new Error('Forbidden: You do not own this order.');
    }
    const org = await db.orm.public.Organization.where({ id: retOrder.organizationId }).all().first();
    const items = await db.orm.public.RetailOrderItem.where({ orderId: retOrder.id }).all();
    const enrichedItems = await Promise.all(items.map(async (item) => {
      const prod = await db.orm.public.RetailProduct.where({ id: item.productId }).all().first();
      return {
        id: item.id,
        name: prod?.name || 'Item',
        price: item.unitPrice,
        quantity: item.quantity,
        image: prod?.imageAssetId,
      };
    }));
    const payment = await db.orm.public.Payment.where({ retailOrderId: retOrder.id }).all().first();
    const delivery = await getDeliveryStatusForSource('RETAIL_ORDER', retOrder.id);
    const location = retOrder.locationId ? await db.orm.public.Location.where({ id: retOrder.locationId }).all().first() : null;

    return {
      id: retOrder.id,
      category: 'MARKET' as const,
      status: retOrder.status,
      paymentStatus: payment?.status || 'PENDING',
      totalAmount: retOrder.totalAmount,
      createdAt: retOrder.createdAt,
      type: 'DELIVERY',
      org,
      location,
      items: enrichedItems,
      payment,
      delivery,
    };
  }

  return null;
}
