import { db } from '@/src/prisma/db';
import { createLogisticsDeliveryRequest, getDeliveryStatusForSource } from './logistics-api';
import { requireMembership } from './tenant';

/**
 * Requests logistics fulfillment for a RestaurantOS food delivery order.
 */
export async function requestRestaurantDelivery(orderId: string, locationId?: string) {
  const order = await db.orm.public.RestaurantOrder.where({ id: orderId }).all().first();
  if (!order) throw new Error('Restaurant order not found');

  // Verify caller membership for restaurant organization
  await requireMembership(order.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'KITCHEN'], locationId || order.locationId);

  // Check if delivery request already exists
  const existingJob = await getDeliveryStatusForSource('RESTAURANT_ORDER', order.id);
  if (existingJob) {
    return {
      success: true,
      deliveryJobId: existingJob.deliveryJobId,
      trackingReference: existingJob.trackingReference,
      status: existingJob.status,
    };
  }

  // Resolve pickup address from Restaurant Location or Org
  let pickupAddress = 'Restaurant Kitchen';
  if (order.locationId) {
    const loc = await db.orm.public.Location.where({ id: order.locationId }).all().first();
    if (loc?.address) pickupAddress = `${loc.name ? loc.name + ' - ' : ''}${loc.address}`;
  }
  if (pickupAddress === 'Restaurant Kitchen') {
    const org = await db.orm.public.Organization.where({ id: order.organizationId }).all().first();
    if (org?.name) pickupAddress = `${org.name} Kitchen`;
  }

  // Resolve dropoff address from order notes or customer data
  const dropoffAddress = order.tableNumber
    ? `Dine-in / Table ${order.tableNumber}`
    : 'Customer Delivery Address';

  const job = await createLogisticsDeliveryRequest({
    sourceType: 'RESTAURANT_ORDER',
    sourceId: order.id,
    pickup: {
      address: pickupAddress,
    },
    dropoff: {
      address: dropoffAddress,
    },
    package: {
      description: `Food Order #${order.orderNumber || order.id.slice(0, 8)}`,
      weightKg: 1.5,
    },
    idempotencyKey: `restaurant-fulfillment-${order.id}`,
  });

  return {
    success: true,
    deliveryJobId: job.id,
    trackingReference: job.trackingReference,
    status: job.status,
  };
}

/**
 * Syncs delivery state changes back into the RestaurantOS order lifecycle.
 */
export async function syncLogisticsStatusToRestaurantOS(jobId: string) {
  const job = await db.orm.public.DeliveryJob.where({ id: jobId }).all().first();
  if (!job || job.sourceType !== 'RESTAURANT_ORDER' || !job.sourceId) return;

  const orderId = job.sourceId;
  const deliveryStatus = job.status;

  const order = await db.orm.public.RestaurantOrder.where({ id: orderId }).all().first();
  if (!order) return;

  // Monotonicity: Do not regress completed orders
  if (order.status === 'COMPLETED') {
    return;
  }

  if (deliveryStatus === 'DELIVERED') {
    await db.orm.public.RestaurantOrder.where({ id: orderId }).update({
      status: 'COMPLETED',
    });
  } else if (['PICKED_UP', 'IN_TRANSIT', 'AT_DROPOFF'].includes(deliveryStatus)) {
    await db.orm.public.RestaurantOrder.where({ id: orderId }).update({
      status: 'DELIVERING',
    });
  } else if (['FAILED', 'CANCELLED'].includes(deliveryStatus)) {
    const updatePayload: { status: 'CANCELLED'; paymentStatus?: 'REFUNDED' } = {
      status: 'CANCELLED',
    };
    if (order.paymentStatus === 'COMPLETED') {
      updatePayload.paymentStatus = 'REFUNDED';
    }
    await db.orm.public.RestaurantOrder.where({ id: orderId }).update(updatePayload);
  }
}
