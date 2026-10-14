/**
 * Resident Logistics — delivery status presentation (pure, no I/O).
 *
 * Maps the authoritative LogisticsOS `DeliveryStatus` / `TrackingEventType`
 * enums (src/prisma/contract.prisma) to resident-facing wording. Presentation
 * only: nothing here writes or infers LogisticsOS state, and delivery state is
 * never derived from order or payment state.
 *
 *  DeliveryStatus: REQUESTED | PRICED | CREATED | DISPATCHED | ASSIGNED | AT_PICKUP |
 *                  PICKED_UP | IN_TRANSIT | AT_DROPOFF | DELIVERED | COMPLETED |
 *                  CANCELLED | FAILED
 *  TrackingEventType: the same lifecycle values + LOCATION_UPDATE (GPS ping, not a milestone)
 */

export type DeliveryTone = 'neutral' | 'progress' | 'success' | 'warning' | 'danger';

export type ResidentDeliveryStatus = {
  /** Authoritative LogisticsOS value, unchanged. */
  raw: string;
  label: string;
  /** One-line "what is happening / what next" for the resident. */
  description: string;
  tone: DeliveryTone;
  /** Position on the resident progress bar (0..PROGRESS_STEPS.length - 1); null when terminal-failure. */
  stage: number | null;
};

/** Resident-facing progress steps (index = `stage`). */
export const PROGRESS_STEPS = ['Preparing', 'Finding a rider', 'Rider assigned', 'Picked up', 'On the way', 'Delivered'] as const;

export const DELIVERY_STATUSES = [
  'REQUESTED', 'PRICED', 'CREATED', 'DISPATCHED', 'ASSIGNED', 'AT_PICKUP', 'PICKED_UP',
  'IN_TRANSIT', 'AT_DROPOFF', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'FAILED',
] as const;

function s(raw: string, label: string, description: string, tone: DeliveryTone, stage: number | null): ResidentDeliveryStatus {
  return { raw, label, description, tone, stage };
}

export function residentDeliveryStatus(status: string | null | undefined): ResidentDeliveryStatus {
  switch (status) {
    case 'REQUESTED':
    case 'PRICED':
    case 'CREATED':
      return s(status, 'Preparing delivery', 'Delivery is being arranged for your order.', 'warning', 0);
    case 'DISPATCHED':
      return s(status, 'Finding a rider', 'We are looking for a rider to deliver your order.', 'warning', 1);
    case 'ASSIGNED':
      return s(status, 'Rider assigned', 'A rider is on the way to collect your order.', 'progress', 2);
    case 'AT_PICKUP':
      return s(status, 'Rider at pickup', 'Your rider has arrived to collect your order.', 'progress', 2);
    case 'PICKED_UP':
      return s(status, 'Picked up', 'Your order has been collected.', 'progress', 3);
    case 'IN_TRANSIT':
      return s(status, 'On the way', 'Your order is on its way to you.', 'progress', 4);
    case 'AT_DROPOFF':
      return s(status, 'Arriving soon', 'Your rider has reached your location.', 'progress', 4);
    case 'DELIVERED':
    case 'COMPLETED':
      return s(status, 'Delivered', 'Your order has been delivered.', 'success', 5);
    case 'CANCELLED':
      return s(status, 'Delivery cancelled', 'This delivery was cancelled.', 'danger', null);
    case 'FAILED':
      return s(status, 'Delivery issue', 'There was a problem delivering your order. Please contact the merchant.', 'danger', null);
    default: {
      const raw = status ?? 'UNKNOWN';
      const pretty = raw.toLowerCase().replace(/_/g, ' ');
      return s(raw, pretty.charAt(0).toUpperCase() + pretty.slice(1), 'We will update you when there is news.', 'neutral', null);
    }
  }
}

/** Milestone events shown on the resident timeline (LOCATION_UPDATE is deliberately excluded). */
export const TIMELINE_EVENT_TYPES = [
  'CREATED', 'DISPATCHED', 'ASSIGNED', 'AT_PICKUP', 'PICKED_UP', 'IN_TRANSIT',
  'AT_DROPOFF', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'FAILED',
] as const;

export function isTimelineEvent(eventType: string): boolean {
  return (TIMELINE_EVENT_TYPES as readonly string[]).includes(eventType);
}

export function isActiveDelivery(status: string | null | undefined): boolean {
  return !!status && !['DELIVERED', 'COMPLETED', 'CANCELLED', 'FAILED'].includes(status);
}

/**
 * Presentation-only "taking longer than expected" hint, based on how long the
 * authoritative record has gone without any update. Not a LogisticsOS SLA.
 */
const DELAY_MINUTES: Record<string, number> = {
  REQUESTED: 30, PRICED: 30, CREATED: 30, DISPATCHED: 30,
  ASSIGNED: 45, AT_PICKUP: 45,
  PICKED_UP: 90, IN_TRANSIT: 90, AT_DROPOFF: 90,
};

export function isDeliveryDelayed(status: string, lastActivityMs: number, nowMs: number): boolean {
  const limit = DELAY_MINUTES[status];
  if (!limit || !lastActivityMs) return false;
  return (nowMs - lastActivityMs) / 60000 > limit;
}

export const LOCATION_FRESH_MINUTES = 5;
