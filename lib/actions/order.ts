import { db } from '@/src/prisma/db';
import { requireMembership } from './tenant';

export const ORDER_LIFECYCLE = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['READY', 'CANCELLED'],
  READY: ['FULFILLED', 'CANCELLED'],
  FULFILLED: ['REFUNDED', 'PARTIALLY_REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
  PARTIALLY_REFUNDED: ['REFUNDED']
};

export async function transitionOrderStatus(
  organizationId: string, 
  orderId: string, 
  currentState: string, 
  nextState: string
) {
  // Validate transition
  const allowedNext = (ORDER_LIFECYCLE as any)[currentState] || [];
  if (!allowedNext.includes(nextState)) {
    throw new Error(`Invalid order transition from ${currentState} to ${nextState}`);
  }

  // Determine order type based on what exists (Restaurant or Retail)
  let result = null;
  
  await db.transaction(async (prismaTx: any) => {
    // Attempt RetailOrder update
    const retailOrder = await prismaTx.orm.public.RetailOrder.where({ id: orderId, organizationId }).all().first();
    if (retailOrder) {
      if (retailOrder.status !== currentState) {
        throw new Error('Current state mismatch');
      }
      await prismaTx.orm.public.RetailOrder.where({ id: orderId }).update({ status: nextState });
      result = 'RETAIL';
      return;
    }

    // Attempt RestaurantOrder update
    const restaurantOrder = await prismaTx.orm.public.RestaurantOrder.where({ id: orderId, organizationId }).all().first();
    if (restaurantOrder) {
      if (restaurantOrder.status !== currentState) {
        throw new Error('Current state mismatch');
      }
      // Note: RestaurantOrder uses an enum for status, so we have to ensure it matches
      await prismaTx.orm.public.RestaurantOrder.where({ id: orderId }).update({ status: nextState as any });
      result = 'RESTAURANT';
      return;
    }

    throw new Error('Order not found or not owned by organization');
  });

  return result;
}
