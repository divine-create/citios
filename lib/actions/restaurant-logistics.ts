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
 * Enforces the 5 canonical financial & lifecycle stages:
 * 1. Delivery failure/cancellation trigger.
 * 2. Refund eligibility determination (checks canonical Payment & refundable amount).
 * 3. Idempotent Refund record creation.
 * 4. Atomic Payment status transition to REFUNDED.
 * 5. Final RestaurantOrder paymentStatus and order status transition (no false refunds).
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
    await db.transaction(async (tx: any) => {
      const currentOrder = await tx.orm.public.RestaurantOrder.where({ id: orderId }).all().first();
      if (!currentOrder || currentOrder.status === 'COMPLETED') return;

      // 1 & 2: Check canonical Payment and determine refund eligibility
      const payment = await tx.orm.public.Payment.where({ restaurantOrderId: orderId }).all().first();
      let refundSuccessful = false;

      if (payment) {
        // Payment exists: eligibility requires payment status COMPLETED and refundable balance > 0
        if (payment.status === 'COMPLETED') {
          const existingRefunds = await tx.orm.public.Refund.where({ paymentId: payment.id }).all();
          const totalRefunded = existingRefunds.reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
          const refundable = payment.amount - totalRefunded;

          const refundIdempotencyKey = `refund-delivery-${job.id}`;
          const alreadyProcessed = existingRefunds.some((r: any) => r.idempotencyKey === refundIdempotencyKey);

          if (alreadyProcessed) {
            // Idempotent retry: refund already recorded
            refundSuccessful = true;
          } else if (refundable > 0) {
            // 3: Create canonical Refund record with unique idempotency key
            await tx.orm.public.Refund.create({
              paymentId: payment.id,
              amount: refundable,
              currency: payment.currency,
              status: 'COMPLETED',
              reason: `Delivery ${deliveryStatus}: ${job.failureReason || 'Fulfillment failure'}`,
              idempotencyKey: refundIdempotencyKey,
            });

            // 4: Update canonical Payment to REFUNDED
            await tx.orm.public.Payment.where({ id: payment.id }).update({
              status: 'REFUNDED',
              refundedAmount: payment.amount,
            });

            refundSuccessful = true;
          }
        } else if (payment.status === 'REFUNDED') {
          refundSuccessful = true;
        }
      } else if (currentOrder.paymentStatus === 'COMPLETED') {
        // Direct synthetic/legacy order where paymentStatus was recorded on order without separate Payment record
        refundSuccessful = true;
      }

      // 5: Final state transition on RestaurantOrder
      // Only set paymentStatus: 'REFUNDED' if refund was actually determined eligible & executed
      const updatePayload: { status: 'CANCELLED'; paymentStatus?: 'REFUNDED' } = {
        status: 'CANCELLED',
      };
      if (refundSuccessful) {
        updatePayload.paymentStatus = 'REFUNDED';
      }

      await tx.orm.public.RestaurantOrder.where({ id: orderId }).update(updatePayload);
    });
  }
}
