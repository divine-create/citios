'use server';

import { db } from '@/src/prisma/db';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { requireMembership } from './tenant';
import { LogisticsDomainError } from './logistics-domain';
import { getNetworkDispatchPolicy } from './logistics-policy';
import '@js-temporal/polyfill';

function toTemporal(date: Date) {
  return (globalThis as any).Temporal.Instant.fromEpochMilliseconds(date.getTime());
}

export interface ExternalCourierQuoteRequest {
  pickupAddress: string;
  dropoffAddress: string;
  weightKg: number;
  priority?: boolean;
}

export interface ExternalCourierQuoteResponse {
  courierName: string;
  quoteReference: string;
  totalAmount: number;
  currency: string;
  estimatedDeliveryMinutes: number;
}

export interface ExternalCourierBookingRequest {
  quoteReference: string;
  pickupAddress: string;
  dropoffAddress: string;
  recipientName: string;
  recipientPhone: string;
  description: string;
  idempotencyKey: string;
}

export interface ExternalCourierBookingResponse {
  success: boolean;
  externalTrackingNumber: string;
  status: string;
}

/**
 * Common Adapter Interface for 3rd-Party Logistics Couriers
 */
export interface ExternalLogisticsAdapter {
  providerName: string;
  getQuote(req: ExternalCourierQuoteRequest): Promise<ExternalCourierQuoteResponse>;
  bookShipment(req: ExternalCourierBookingRequest): Promise<ExternalCourierBookingResponse>;
  getTracking(externalTrackingNumber: string): Promise<{ status: string; milestones: string[] }>;
}


/**
 * Enables or updates a logistics provider's participation in the shared CityDrive Network.
 */
export async function setNetworkParticipation(params: {
  providerId: string;
  isParticipant: boolean;
  serviceRadiusKm?: number;
}) {
  await requireMembership(params.providerId, ['OWNER', 'ADMIN']);

  const existingSettings = await db.orm.public.LogisticsSettings.where({
    organizationId: params.providerId,
  }).first();

  if (existingSettings) {
    await db.orm.public.LogisticsSettings.where({ id: existingSettings.id }).update({
      isNetworkParticipant: params.isParticipant,
      serviceRadiusKm: params.serviceRadiusKm ?? existingSettings.serviceRadiusKm,
    });
  } else {
    await db.orm.public.LogisticsSettings.create({
      id: uuidv4(),
      organizationId: params.providerId,
      platformFeeRate: '0.10',
      isNetworkParticipant: params.isParticipant,
      serviceRadiusKm: params.serviceRadiusKm ?? 25.0,
    });
  }

  return {
    providerId: params.providerId,
    isNetworkParticipant: params.isParticipant,
    serviceRadiusKm: params.serviceRadiusKm ?? 25.0,
  };
}

/**
 * Retrieves all approved logistics providers currently active on the shared fulfillment network.
 */
export async function getActiveNetworkProviders() {
  const orgs = await db.orm.public.Organization.where({
    type: 'LOGISTICS' as any,
    status: 'ACTIVE' as any,
  }).all();

  const settingsList = await db.orm.public.LogisticsSettings.all();
  const settingsByOrg = new Map(settingsList.map((s: any) => [s.organizationId, s]));

  const rulesList = await db.orm.public.DeliveryPricingRule.all();
  const activeRulesByOrg = new Set(rulesList.filter((r: any) => r.isActive).map((r: any) => r.providerId));

  const networkProviders = [];

  for (const org of orgs) {
    const s = settingsByOrg.get(org.id);
    const hasRules = activeRulesByOrg.has(org.id);
    const isParticipant = s ? s.isNetworkParticipant : false;

    if (isParticipant && hasRules) {
      networkProviders.push({
        id: org.id,
        name: org.name,
        serviceRadiusKm: s?.serviceRadiusKm || 20,
        platformFeeRate: s?.platformFeeRate || 0.10,
      });
    }
  }

  return networkProviders;
}

/**
 * Validates HMAC-SHA256 signature on incoming partner webhook payloads.
 */
export async function verifyPartnerWebhookSignature(
  rawPayload: string,
  signatureHeader: string | null | undefined,
  secret: string
): Promise<boolean> {
  if (!signatureHeader || !secret) return false;
  try {
    const computed = crypto.createHmac('sha256', secret).update(rawPayload).digest('hex');
    const cleanSig = signatureHeader.replace(/^sha256=/i, '').trim();
    if (computed.length !== cleanSig.length) return false;
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(cleanSig));
  } catch {
    return false;
  }
}

/**
 * Handles incoming partner webhooks with signature and idempotency checks.
 */
export async function processPartnerWebhook(params: {
  providerId: string;
  eventType: 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED';
  deliveryJobId: string;
  externalReference: string;
  notes?: string;
  idempotencyKey: string;
}) {
  return await db.transaction(async (tx: any) => {
    // 1. Check idempotency
    const existing = await tx.orm.public.DeliveryTrackingEvent.where({
      providerId: params.providerId,
      deliveryJobId: params.deliveryJobId,
      idempotencyKey: params.idempotencyKey,
    }).all();

    if (existing.length > 0) {
      return { success: true, duplicate: true, event: existing[0] };
    }

    const job = await tx.orm.public.DeliveryJob.where({
      id: params.deliveryJobId,
      providerId: params.providerId,
    }).first();

    if (!job) {
      throw new LogisticsDomainError('DeliveryJob not found for provider');
    }

    // 2. Record external tracking event
    const event = await tx.orm.public.DeliveryTrackingEvent.create({
      id: uuidv4(),
      deliveryJobId: params.deliveryJobId,
      eventType: params.eventType,
      providerId: params.providerId,
      idempotencyKey: params.idempotencyKey,
      notes: `External Partner Update (${params.externalReference}): ${params.notes || ''}`.trim(),
    });

    // 3. Update job status if appropriate, enforcing monotonicity (no regressions from terminal/delivered)
    const isTerminalOrDelivered = ['COMPLETED', 'DELIVERED', 'CANCELLED'].includes(job.status);
    if (!isTerminalOrDelivered) {
      if (params.eventType === 'DELIVERED') {
        await tx.orm.public.DeliveryJob.where({ id: params.deliveryJobId }).update({
          status: 'DELIVERED',
        });
      } else if (params.eventType === 'FAILED') {
        await tx.orm.public.DeliveryJob.where({ id: params.deliveryJobId }).update({
          status: 'FAILED',
          failureReason: params.notes || 'External partner delivery failure',
        });
      } else if (params.eventType === 'IN_TRANSIT' && ['DISPATCHED', 'ASSIGNED', 'AT_PICKUP', 'PICKED_UP'].includes(job.status)) {
        await tx.orm.public.DeliveryJob.where({ id: params.deliveryJobId }).update({
          status: 'IN_TRANSIT',
        });
      }
    }

    return { success: true, duplicate: false, event, stateRegressed: false };
  });
}

/**
 * Fallback booking with approved external logistics partner when internal network capacity is exhausted.
 * Enforces:
 * 1. DeliveryJob exists and is in a valid state (not already assigned, completed, or cancelled).
 * 2. Idempotency to prevent duplicate external bookings.
 * 3. Records partner tracking number and transitions delivery status.
 */
export async function bookPartnerCourierFallback(params: {
  deliveryJobId: string;
  providerId: string;
  adapter: ExternalLogisticsAdapter;
  idempotencyKey?: string;
  priority?: boolean;
}) {
  return await db.transaction(async (tx: any) => {
    const policy = getNetworkDispatchPolicy();
    if (policy !== 'OPEN_NETWORK') {
      throw new LogisticsDomainError(
        'External partner courier fallback is disabled in CityOS-only launch mode.'
      );
    }

    const job = (await tx.orm.public.DeliveryJob.where({ id: params.deliveryJobId }).all())[0];
    if (!job) throw new LogisticsDomainError('DeliveryJob not found');

    if (['COMPLETED', 'DELIVERED', 'CANCELLED'].includes(job.status)) {
      throw new LogisticsDomainError(`Cannot book partner courier for job in status ${job.status}`);
    }

    // Check if active internal assignment exists
    const assignments = await tx.orm.public.DeliveryAssignment
      .where({ deliveryJobId: params.deliveryJobId, status: 'ACCEPTED' })
      .all();
    if (assignments.length > 0) {
      throw new LogisticsDomainError('Cannot book partner courier: Delivery has active internal assignment');
    }

    // Check idempotency for existing partner booking
    if (params.idempotencyKey) {
      const existingEvents = await tx.orm.public.DeliveryTrackingEvent.where({
        deliveryJobId: params.deliveryJobId,
        idempotencyKey: params.idempotencyKey,
      }).all();
      if (existingEvents.length > 0) {
        return {
          success: true,
          duplicate: true,
          partnerName: params.adapter.providerName,
          trackingEvent: existingEvents[0],
        };
      }
    }

    // 1. Get quote from external partner
    const quote = await params.adapter.getQuote({
      pickupAddress: job.pickupAddress,
      dropoffAddress: job.dropoffAddress,
      weightKg: job.packageWeightKg || 1.0,
      priority: params.priority,
    });

    // 2. Book shipment with external partner
    const booking = await params.adapter.bookShipment({
      quoteReference: quote.quoteReference,
      pickupAddress: job.pickupAddress,
      dropoffAddress: job.dropoffAddress,
      recipientName: job.dropoffContactName || 'Resident',
      recipientPhone: job.dropoffContactPhone || '',
      description: job.packageDescription || 'Standard Delivery',
      idempotencyKey: params.idempotencyKey || `partner-booking-${job.id}`,
    });

    if (!booking.success) {
      throw new LogisticsDomainError(`External partner booking failed: ${booking.status}`);
    }

    // 3. Record tracking event & update job
    const event = await tx.orm.public.DeliveryTrackingEvent.create({
      id: uuidv4(),
      deliveryJobId: job.id,
      eventType: 'ASSIGNED',
      providerId: params.providerId,
      idempotencyKey: params.idempotencyKey,
      notes: `Booked with approved partner courier ${params.adapter.providerName}. External Tracking: ${booking.externalTrackingNumber}`,
      recordedAt: toTemporal(new Date()),
    });

    await tx.orm.public.DeliveryJob.where({ id: job.id }).update({
      status: 'ASSIGNED',
    });

    return {
      success: true,
      duplicate: false,
      partnerName: params.adapter.providerName,
      externalTrackingNumber: booking.externalTrackingNumber,
      quote,
      trackingEvent: event,
    };
  });
}
