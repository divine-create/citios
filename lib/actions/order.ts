import { db } from '@/src/prisma/db';
import { requireMembership } from './tenant';
import { handleFailedRetailPayment } from './citypay';
import { notifyPerson } from '@/lib/notify';
import { revalidatePath } from 'next/cache';

export const ORDER_LIFECYCLE = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['READY', 'CANCELLED'],
  READY: ['FULFILLED', 'DELIVERING', 'CANCELLED'],
  DELIVERING: ['FULFILLED', 'CANCELLED'],
  FULFILLED: ['REFUNDED', 'PARTIALLY_REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
  PARTIALLY_REFUNDED: ['REFUNDED']
};

/**
 * Authoritative merchant status transition for Retail and Restaurant orders.
 * Strictly verifies actor membership in the organization.
 * Dispatches real-time resident notifications on status progression.
 */
export async function transitionOrderStatus(
  organizationId: string, 
  orderId: string, 
  currentState: string, 
  nextState: string
) {
  // 1. Enforce strict merchant authorization
  await requireMembership(organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'STAFF']);

  // 2. Validate transition lifecycle
  const allowedNext = (ORDER_LIFECYCLE as any)[currentState] || [];
  if (!allowedNext.includes(nextState)) {
    throw new Error(`Invalid order transition from ${currentState} to ${nextState}`);
  }

  let result: 'RETAIL' | 'RESTAURANT' | null = null;
  let targetPersonId: string | null = null;
  let merchantName = 'Store';
  
  await db.transaction(async (prismaTx: any) => {
    const org = await prismaTx.orm.public.Organization.where({ id: organizationId }).all().first();
    if (org) merchantName = org.name;

    // 3. Attempt RetailOrder update
    const retailOrder = await prismaTx.orm.public.RetailOrder.where({ id: orderId, organizationId }).all().first();
    if (retailOrder) {
      // For RetailOrder, the operational state is tracked via status (PENDING/CONFIRMED/CANCELLED) 
      // or fulfillmentStatus (UNFULFILLED/PROCESSING/READY/FULFILLED/CANCELLED)
      const currentOperationalState = retailOrder.status === 'CONFIRMED'
        ? (retailOrder.fulfillmentStatus === 'UNFULFILLED' ? 'CONFIRMED' : retailOrder.fulfillmentStatus)
        : retailOrder.status;

      if (currentOperationalState !== currentState) {
        throw new Error(`Current state mismatch: order is in state ${currentOperationalState}, expected ${currentState}`);
      }

      if (nextState === 'CANCELLED') {
        await prismaTx.orm.public.RetailOrder.where({ id: orderId }).update({
          status: 'CANCELLED',
          fulfillmentStatus: 'CANCELLED',
        });
        await handleFailedRetailPayment(prismaTx, orderId);
      } else if (nextState === 'CONFIRMED') {
        await prismaTx.orm.public.RetailOrder.where({ id: orderId }).update({
          status: 'CONFIRMED',
          fulfillmentStatus: 'PROCESSING',
        });
      } else if (nextState === 'PROCESSING' || nextState === 'READY' || nextState === 'FULFILLED') {
        await prismaTx.orm.public.RetailOrder.where({ id: orderId }).update({
          fulfillmentStatus: nextState,
        });
      }

      // Resolve personId for notification
      if (retailOrder.customerDataId) {
        const cust = await prismaTx.orm.public.CustomerData.where({ id: retailOrder.customerDataId }).all().first();
        if (cust) {
          if (cust.personId) targetPersonId = cust.personId;
          else if (cust.relationshipId) {
            const rel = await prismaTx.orm.public.Relationship.where({ id: cust.relationshipId }).all().first();
            if (rel) targetPersonId = rel.personId;
          }
        }
      }

      result = 'RETAIL';
      return;
    }

    // 4. Attempt RestaurantOrder update
    const restaurantOrder = await prismaTx.orm.public.RestaurantOrder.where({ id: orderId, organizationId }).all().first();
    if (restaurantOrder) {
      // Map states: PROCESSING -> PREPARING, FULFILLED -> COMPLETED
      let orderCurrentState = restaurantOrder.status as string;
      if (orderCurrentState === 'PREPARING' && currentState === 'PROCESSING') {
        orderCurrentState = 'PROCESSING';
      } else if (orderCurrentState === 'COMPLETED' && currentState === 'FULFILLED') {
        orderCurrentState = 'FULFILLED';
      }

      if (orderCurrentState !== currentState) {
        throw new Error(`Current state mismatch: order is in state ${orderCurrentState}, expected ${currentState}`);
      }

      let restaurantNextState = nextState;
      if (nextState === 'PROCESSING') restaurantNextState = 'PREPARING';
      if (nextState === 'FULFILLED') restaurantNextState = 'COMPLETED';

      await prismaTx.orm.public.RestaurantOrder.where({ id: orderId }).update({
        status: restaurantNextState as any,
      });

      // Resolve personId for notification
      if (restaurantOrder.customerDataId) {
        const cust = await prismaTx.orm.public.CustomerData.where({ id: restaurantOrder.customerDataId }).all().first();
        if (cust) {
          if (cust.personId) targetPersonId = cust.personId;
          else if (cust.relationshipId) {
            const rel = await prismaTx.orm.public.Relationship.where({ id: cust.relationshipId }).all().first();
            if (rel) targetPersonId = rel.personId;
          }
        }
      }

      result = 'RESTAURANT';
      return;
    }

    throw new Error('Order not found or not owned by organization');
  });

  // 5. Trigger resident notification on status change
  if (targetPersonId) {
    try {
      let notifTitle = `Order Status: ${nextState}`;
      let notifBody = `Your order #${orderId.slice(0, 8).toUpperCase()} at ${merchantName} is now ${nextState.toLowerCase()}.`;

      if (nextState === 'READY') {
        notifTitle = 'Order Ready for Pickup!';
        notifBody = `Your order at ${merchantName} is packed and ready for pickup!`;
      } else if (nextState === 'DELIVERING') {
        notifTitle = 'Order On The Way!';
        notifBody = `Your order from ${merchantName} has been dispatched for delivery.`;
      } else if (nextState === 'FULFILLED' || nextState === 'COMPLETED') {
        notifTitle = 'Order Completed!';
        notifBody = `Your order at ${merchantName} has been fulfilled. Thank you!`;
      }

      await notifyPerson(targetPersonId, {
        type: `ORDER_STATUS_${nextState}`,
        title: notifTitle,
        body: notifBody,
        href: `/activity/${(result || 'retail').toLowerCase()}_order/${orderId}`,
      });
    } catch (notifErr) {
      console.warn('[transitionOrderStatus] Notification warning:', notifErr);
    }
  }

  try {
    revalidatePath('/orders');
    revalidatePath('/activity');
    revalidatePath(`/workspaces/shopos`);
    revalidatePath(`/workspaces/restaurantos`);
  } catch (_e) {
    // Next.js static generation store unavailable in test context
  }

  return result;
}
