import { db } from '../../src/prisma/db';
import { LogisticsDomainError, createDeliveryJob, transitionDeliveryStatus } from './logistics-domain';
import { calculateDeliveryQuote, offerQuote, acceptQuote } from './logistics-pricing';
import { resolveTrustedDeliveryDistance } from '../mapping/distance-resolver';
import { getNetworkDispatchPolicy, isCityOSPlatformFleet } from './logistics-policy';

export type DeliverySourceType =
  | 'RESTAURANT_ORDER'
  | 'RETAIL_ORDER'
  | 'HOTEL_REQUEST'
  | 'SERVICE_JOB'
  | 'HEALTH_REQUEST'
  | 'DIRECT_DELIVERY';

export interface LogisticsDeliveryRequest {
  providerId?: string | null;
  sourceType: DeliverySourceType;
  sourceId: string;

  pickup: {
    address: string;
    latitude?: number;
    longitude?: number;
    contactName?: string;
    contactPhone?: string;
  };

  dropoff: {
    address: string;
    latitude?: number;
    longitude?: number;
    contactName?: string;
    contactPhone?: string;
  };

  package?: {
    description?: string;
    quantity?: number;
    weightKg?: number;
  };

  serviceLevel?: string;
  idempotencyKey: string;
  priority?: boolean;
}

function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const km = Number((R * c).toFixed(2));
  return Math.max(1.5, km);
}

/**
 * Deterministically selects an active logistics provider participating in the shared network.
 */
async function selectNetworkProvider(): Promise<string> {
  const activeProviders = await db.orm.public.Organization.where({ 
    type: 'LOGISTICS' as any,
    status: 'ACTIVE' as any
  }).all();

  const allRules = await db.orm.public.DeliveryPricingRule.all();
  const activeProviderIds = new Set(allRules.filter((r: any) => r.isActive).map((r: any) => r.providerId));
  
  let eligibleProviders = activeProviders.filter((p: any) => activeProviderIds.has(p.id));
  const policy = getNetworkDispatchPolicy();
  if (policy === 'CITYOS_ONLY') {
    eligibleProviders = eligibleProviders.filter((p: any) => isCityOSPlatformFleet(p.id));
    if (eligibleProviders.length === 0) {
      throw new LogisticsDomainError('No active CityOS platform fleet providers available on the network.');
    }
  }

  if (eligibleProviders.length === 0) {
    throw new LogisticsDomainError('No active logistics providers available on the network.');
  }

  // Deterministic priority ordering by ID
  eligibleProviders.sort((a: any, b: any) => a.id.localeCompare(b.id));
  return eligibleProviders[0].id;
}

/**
 * The canonical entry point for all CityOS verticals to request logistics fulfillment.
 */
export async function createLogisticsDeliveryRequest(req: LogisticsDeliveryRequest) {
  // 1. Validate input
  if (!req.sourceType || !req.sourceId) {
    throw new LogisticsDomainError('sourceType and sourceId are required');
  }
  if (!req.pickup?.address || !req.dropoff?.address) {
    throw new LogisticsDomainError('pickup.address and dropoff.address are required');
  }
  if (!req.idempotencyKey) {
    throw new LogisticsDomainError('idempotencyKey is required');
  }

  // 2. Provider resolution
  let resolvedProviderId = req.providerId;
  if (!resolvedProviderId) {
    resolvedProviderId = await selectNetworkProvider();
  } else {
    const explicitProvider = (await db.orm.public.Organization.where({ id: resolvedProviderId }).all())[0];
    if (!explicitProvider || (explicitProvider.type as any) !== 'LOGISTICS') {
      throw new LogisticsDomainError(`Explicit provider ${resolvedProviderId} is not a valid logistics provider`);
    }
  }

  const finalIdempotencyKey = `${req.idempotencyKey}`;

  // 3. Create the DeliveryJob
  const job = await createDeliveryJob({
    providerId: resolvedProviderId,
    sourceType: req.sourceType,
    sourceId: req.sourceId,
    idempotencyKey: finalIdempotencyKey,
    dropoffAddress: req.dropoff.address,
    dropoffLat: req.dropoff.latitude,
    dropoffLng: req.dropoff.longitude,
    dropoffContactName: req.dropoff.contactName,
    dropoffContactPhone: req.dropoff.contactPhone,
    pickupAddress: req.pickup.address,
    pickupLat: req.pickup.latitude,
    pickupLng: req.pickup.longitude,
    pickupContactName: req.pickup.contactName,
    pickupContactPhone: req.pickup.contactPhone,
    packageDescription: req.package?.description,
    packageWeightKg: req.package?.weightKg,
    serviceLevel: req.serviceLevel || 'STANDARD',
  });

  // If the job was newly created (REQUESTED), calculate and accept quote
  if (job.status === 'REQUESTED') {
    let distanceKm = 5.0;
    if (
      req.pickup.latitude &&
      req.pickup.longitude &&
      req.dropoff.latitude &&
      req.dropoff.longitude
    ) {
      const resolution = await resolveTrustedDeliveryDistance(
        { latitude: req.pickup.latitude, longitude: req.pickup.longitude },
        { latitude: req.dropoff.latitude, longitude: req.dropoff.longitude },
        { allowFallbackEstimate: true }
      );
      if (!resolution.success || !resolution.distanceKm) {
        throw new LogisticsDomainError(
          resolution.error || 'Delivery coordinates are not serviceable within Calabar.'
        );
      }
      distanceKm = resolution.distanceKm;
    }

    const quote = await calculateDeliveryQuote({
      deliveryJobId: job.id,
      providerId: resolvedProviderId,
      distanceKm,
      weightKg: req.package?.weightKg || 1,
      priority: req.priority,
      idempotencyKey: `${finalIdempotencyKey}-quote`,
    });

    await offerQuote(quote.id, resolvedProviderId);
    await acceptQuote(quote.id, resolvedProviderId);
    
    await transitionDeliveryStatus(job.id, 'CREATED', resolvedProviderId);
  }

  const finalJob = (await db.orm.public.DeliveryJob.where({ id: job.id }).all())[0];
  return finalJob;
}

/**
 * Cross-Vertical Read Contract:
 * Allows any source vertical (ShopOS, RestaurantOS, HotelOS) to safely read
 * fulfillment tracking status using its source identity.
 */
export async function getDeliveryStatusForSource(sourceType: DeliverySourceType, sourceId: string) {
  const jobs = await db.orm.public.DeliveryJob.where({ sourceType, sourceId }).all();
  if (jobs.length === 0) return null;
  
  jobs.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const job = jobs[0];

  const trackingEvents = await db.orm.public.DeliveryTrackingEvent.where({ deliveryJobId: job.id }).all();
  trackingEvents.sort((a: any, b: any) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());

  return {
    deliveryJobId: job.id,
    trackingReference: job.trackingReference,
    recipientOtp: job.recipientOtp,
    status: job.status,
    providerId: job.providerId,
    pickupAddress: job.pickupAddress,
    dropoffAddress: job.dropoffAddress,
    serviceLevel: job.serviceLevel || 'STANDARD',
    createdAt: job.createdAt,
    updatedAt: (job as any).updatedAt ?? job.createdAt,
    trackingEvents: trackingEvents.map((e: any) => ({
      eventType: e.eventType,
      recordedAt: e.recordedAt,
      latitude: e.latitude,
      longitude: e.longitude,
      notes: e.notes,
    })),
  };
}
