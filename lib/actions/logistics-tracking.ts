import { db } from '@/src/prisma/db';

export interface PublicTrackingMilestone {
  eventType: string;
  label: string;
  recordedAt: string;
}

export interface PublicTrackingResponse {
  trackingReference: string;
  status: string;
  statusLabel: string;
  serviceLevel: string;
  dropoffAddress: string;
  pickupAddressArea?: string;
  milestones: PublicTrackingMilestone[];
  isDelivered: boolean;
  isFailed: boolean;
  isCancelled: boolean;
  createdAt: string;
  updatedAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  REQUESTED: 'Order Placed',
  PRICED: 'Order Confirmed',
  CREATED: 'Preparing Delivery',
  DISPATCHED: 'Dispatching Rider',
  ASSIGNED: 'Rider Assigned',
  AT_PICKUP: 'Rider at Pickup Location',
  PICKED_UP: 'Package Picked Up',
  IN_TRANSIT: 'On the Way',
  AT_DROPOFF: 'Arriving at Destination',
  DELIVERED: 'Delivered',
  COMPLETED: 'Delivery Completed',
  CANCELLED: 'Delivery Cancelled',
  FAILED: 'Delivery Exception',
};

/**
 * Masks street-level address details for anonymous tracking viewers
 * to prevent leaking private home/unit addresses while preserving district/city context.
 */
export function maskPublicAddress(address?: string | null): string {
  if (!address || typeof address !== 'string') return '';
  const parts = address.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length > 1) {
    return `***, ${parts.slice(1).join(', ')}`;
  }
  const words = address.trim().split(/\s+/);
  if (words.length > 1) {
    return `*** ${words.slice(1).join(' ')}`;
  }
  return '*** Destination Area';
}

/**
 * Public, privacy-safe tracking reader by human-readable reference or job ID.
 * Does not leak internal UUIDs, driver personal phone/data, or provider finances.
 */
export async function getPublicDeliveryTracking(reference: string): Promise<PublicTrackingResponse | null> {
  if (!reference || reference.trim().length === 0) return null;
  const cleanRef = reference.trim();

  // Try finding by trackingReference first, then fall back to id for backwards compatibility
  let job = await db.orm.public.DeliveryJob.where({ trackingReference: cleanRef }).first();
  if (!job) {
    job = await db.orm.public.DeliveryJob.where({ id: cleanRef }).first();
  }
  if (!job) return null;

  // Fetch tracking milestones
  const events = await db.orm.public.DeliveryTrackingEvent
    .where({ deliveryJobId: job.id })
    .all();

  // Sort chronologically
  events.sort((a: any, b: any) => Date.parse(String(a.recordedAt)) - Date.parse(String(b.recordedAt)));

  const milestones: PublicTrackingMilestone[] = events
    .filter((e: any) => e.eventType !== 'LOCATION_UPDATE' && !e.notes?.startsWith('OTP_VERIFICATION_FAILED'))
    .map((e: any) => ({
      eventType: e.eventType,
      label: STATUS_LABELS[e.eventType] || e.eventType,
      recordedAt: new Date(String(e.recordedAt)).toISOString(),
    }));

  const status = job.status as string;
  const statusLabel = STATUS_LABELS[status] || status;

  return {
    trackingReference: job.trackingReference || job.id.slice(0, 8).toUpperCase(),
    status,
    statusLabel,
    serviceLevel: job.serviceLevel || 'STANDARD',
    dropoffAddress: maskPublicAddress(job.dropoffAddress),
    pickupAddressArea: job.pickupAddress ? job.pickupAddress.split(',')[0] : undefined,
    milestones,
    isDelivered: ['DELIVERED', 'COMPLETED'].includes(status),
    isFailed: status === 'FAILED',
    isCancelled: status === 'CANCELLED',
    createdAt: new Date(String(job.createdAt)).toISOString(),
    updatedAt: new Date(String(job.updatedAt || job.createdAt)).toISOString(),
  };
}
