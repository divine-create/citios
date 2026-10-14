/**
 * Resident Activity — status presentation (pure, no I/O).
 *
 * Translates authoritative vertical / Core / Logistics states into resident-facing
 * labels. This module NEVER writes state back; it is presentation only.
 *
 * Every mapped value below exists in src/prisma/contract.prisma:
 *  - RetailOrderStatus:        PENDING | CONFIRMED | CANCELLED                (ShopOS)
 *  - RetailFulfillmentStatus:  UNFULFILLED | PROCESSING | READY | FULFILLED | CANCELLED | RETURNED
 *  - OrderStatus:              PENDING | PREPARING | READY | DELIVERING | COMPLETED | CANCELLED (RestaurantOS)
 *  - ServiceJob.status (str):  NEW | SCHEDULED | ASSIGNED | IN_PROGRESS | ON_HOLD | COMPLETED | CANCELLED
 *  - PaymentStatus:            PENDING | PROCESSING | CONFIRMED | COMPLETED | FAILED | REVERSED |
 *                              REFUNDED | PARTIALLY_REFUNDED | MANUAL_REFUND_NEEDED | OUT_OF_STOCK_REFUNDED
 *  - RefundRequestStatus:      REQUESTED | APPROVED | REJECTED
 *  - DeliveryStatus:           REQUESTED | PRICED | CREATED | DISPATCHED | ASSIGNED | AT_PICKUP | PICKED_UP |
 *                              IN_TRANSIT | AT_DROPOFF | DELIVERED | COMPLETED | CANCELLED | FAILED
 *
 * Unknown values fall through to a neutral label rather than being invented.
 */

import { residentDeliveryStatus } from '@/lib/resident-logistics/status';

export type ActivityTone = 'neutral' | 'progress' | 'success' | 'warning' | 'danger';

export type StatusView = {
  /** Raw authoritative value, unchanged. */
  raw: string;
  /** Resident-facing label. */
  label: string;
  tone: ActivityTone;
};

function view(raw: string, label: string, tone: ActivityTone): StatusView {
  return { raw, label, tone };
}

function unknown(raw: string | null | undefined): StatusView {
  const r = raw ?? 'UNKNOWN';
  const pretty = r.toLowerCase().replace(/_/g, ' ');
  return view(r, pretty.charAt(0).toUpperCase() + pretty.slice(1), 'neutral');
}

/** ShopOS: combines RetailOrder.status with fulfillmentStatus (both owned by ShopOS). */
export function retailOrderStatusView(status: string, fulfillment?: string | null): StatusView {
  if (status === 'CANCELLED') return view(status, 'Cancelled', 'danger');
  if (status === 'PENDING') return view(status, 'Awaiting confirmation', 'warning');
  if (status === 'CONFIRMED') {
    switch (fulfillment) {
      case 'PROCESSING': return view(`${status}/${fulfillment}`, 'Being prepared', 'progress');
      case 'READY': return view(`${status}/${fulfillment}`, 'Ready', 'progress');
      case 'FULFILLED': return view(`${status}/${fulfillment}`, 'Completed', 'success');
      case 'RETURNED': return view(`${status}/${fulfillment}`, 'Returned', 'neutral');
      case 'CANCELLED': return view(`${status}/${fulfillment}`, 'Cancelled', 'danger');
      default: return view(status, 'Confirmed', 'progress');
    }
  }
  return unknown(status);
}

/** RestaurantOS: OrderStatus. */
export function restaurantOrderStatusView(status: string): StatusView {
  switch (status) {
    case 'PENDING': return view(status, 'Order received', 'warning');
    case 'PREPARING': return view(status, 'Preparing', 'progress');
    case 'READY': return view(status, 'Ready', 'progress');
    case 'DELIVERING': return view(status, 'On the way', 'progress');
    case 'COMPLETED': return view(status, 'Completed', 'success');
    case 'CANCELLED': return view(status, 'Cancelled', 'danger');
    default: return unknown(status);
  }
}

/** ServiceOS: ServiceJob.status (free string with documented values). */
export function serviceJobStatusView(status: string): StatusView {
  switch (status) {
    case 'NEW': return view(status, 'Awaiting provider', 'warning');
    case 'SCHEDULED': return view(status, 'Scheduled', 'progress');
    case 'ASSIGNED': return view(status, 'Provider assigned', 'progress');
    case 'IN_PROGRESS': return view(status, 'In progress', 'progress');
    case 'ON_HOLD': return view(status, 'On hold', 'warning');
    case 'COMPLETED': return view(status, 'Completed', 'success');
    case 'CANCELLED': return view(status, 'Cancelled', 'danger');
    default: return unknown(status);
  }
}

/** Core Finance: PaymentStatus. Wallet vs gateway does not change the mapping. */
export function paymentStatusView(status: string): StatusView {
  switch (status) {
    case 'PENDING': return view(status, 'Payment pending', 'warning');
    case 'PROCESSING': return view(status, 'Payment processing', 'warning');
    case 'CONFIRMED':
    case 'COMPLETED': return view(status, 'Paid', 'success');
    case 'FAILED': return view(status, 'Payment failed', 'danger');
    case 'REVERSED': return view(status, 'Payment reversed', 'neutral');
    case 'REFUNDED':
    case 'OUT_OF_STOCK_REFUNDED': return view(status, 'Refunded', 'neutral');
    case 'PARTIALLY_REFUNDED': return view(status, 'Partially refunded', 'neutral');
    case 'MANUAL_REFUND_NEEDED': return view(status, 'Refund pending', 'warning');
    default: return unknown(status);
  }
}

/** Core Finance: RefundRequestStatus (resident-initiated refund requests). */
export function refundRequestStatusView(status: string): StatusView {
  switch (status) {
    case 'REQUESTED': return view(status, 'Refund requested', 'warning');
    case 'APPROVED': return view(status, 'Refund approved', 'success');
    case 'REJECTED': return view(status, 'Refund rejected', 'danger');
    default: return unknown(status);
  }
}

/** LogisticsOS: DeliveryStatus. */
export function deliveryStatusView(status: string): StatusView {
  const d = residentDeliveryStatus(status);
  return view(d.raw, d.label, d.tone);
}

/**
 * Deterministic headline for a list card. The three state machines stay separate in
 * the payload; this only decides which ONE to surface first, by precedence:
 *   1. Terminal order failure (cancelled)          → order
 *   2. Payment problem (failed / pending / refund) → payment
 *   3. Active delivery                             → delivery
 *   4. Otherwise                                   → order
 */
export function headlineStatus(input: {
  order: StatusView;
  payment?: StatusView | null;
  delivery?: StatusView | null;
}): StatusView {
  const { order, payment, delivery } = input;
  if (order.tone === 'danger') return order;
  if (payment && (payment.tone === 'danger' || payment.tone === 'warning' || payment.tone === 'neutral')) {
    return payment;
  }
  if (delivery && order.tone !== 'success') return delivery;
  if (delivery && delivery.tone === 'success') return delivery;
  return order;
}
