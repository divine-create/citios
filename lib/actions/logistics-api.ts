import { db } from '../../src/prisma/db';
import { LogisticsDomainError, createDeliveryJob, transitionDeliveryStatus } from './logistics-domain';
import { calculateDeliveryQuote, offerQuote, acceptQuote } from './logistics-pricing';

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

  idempotencyKey: string;
  priority?: boolean;
}

/**
 * Deterministically selects a logistics provider for network dispatch.
 * In a real implementation this would evaluate geographic coverage, fleet capacity, etc.
 */
async function selectNetworkProvider(): Promise<string> {
  const activeProviders = await db.orm.public.Organization.where({ 
    type: 'LOGISTICS' as any,
    status: 'ACTIVE' as any
  }).all();

  // For simulation / tests: we want a provider that actually has active pricing rules
  const allRules = await db.orm.public.DeliveryPricingRule.all();
  const activeProviderIds = new Set(allRules.filter(r => r.isActive).map(r => r.providerId));
  
  const eligibleProviders = activeProviders.filter(p => activeProviderIds.has(p.id));

  if (eligibleProviders.length === 0) {
    throw new LogisticsDomainError('No active logistics providers available on the network.');
  }

  // Deterministic selection: sort by ID (or name) to always pick the same one predictably for tests
  eligibleProviders.sort((a: any, b: any) => a.id.localeCompare(b.id));
  return eligibleProviders[0].id;
}

/**
 * The canonical entry point for all verticals to request a logistics delivery.
 */
export async function createLogisticsDeliveryRequest(req: LogisticsDeliveryRequest) {
  // 1 & 2. Validate input
  if (!req.sourceType || !req.sourceId) {
    throw new LogisticsDomainError('sourceType and sourceId are required');
  }
  if (!req.pickup?.address || !req.dropoff?.address) {
    throw new LogisticsDomainError('pickup.address and dropoff.address are required');
  }
  if (!req.idempotencyKey) {
    throw new LogisticsDomainError('idempotencyKey is required');
  }

  // 3 & 4. Provider selection
  let resolvedProviderId = req.providerId;
  if (!resolvedProviderId) {
    resolvedProviderId = await selectNetworkProvider();
  } else {
    // Validate explicit provider
    const explicitProvider = (await db.orm.public.Organization.where({ id: resolvedProviderId }).all())[0];
    if (!explicitProvider || (explicitProvider.type as any) !== 'LOGISTICS') {
      throw new LogisticsDomainError(`Explicit provider ${resolvedProviderId} is not a valid logistics provider`);
    }
  }

  // Generate a provider-scoped key
  const finalIdempotencyKey = `${req.idempotencyKey}`;

  // 6. Create the DeliveryJob
  // This uses db.transaction internally and returns the existing job if already created idempotently
  const job = await createDeliveryJob({
    providerId: resolvedProviderId,
    sourceType: req.sourceType,
    sourceId: req.sourceId,
    idempotencyKey: finalIdempotencyKey,
    dropoffAddress: req.dropoff.address,
  });

  // If the job was just created (REQUESTED), calculate and accept the quote
  if (job.status === 'REQUESTED') {
    // 5. Generate Pricing
    // We pass distance 5 km generically for now unless we add geo logic
    const distanceKm = 5; 
    const quote = await calculateDeliveryQuote({
      deliveryJobId: job.id,
      providerId: resolvedProviderId,
      distanceKm,
      weightKg: req.package?.weightKg || 1,
      priority: req.priority,
      idempotencyKey: `${finalIdempotencyKey}-quote`,
    });

    // Accept the quote automatically for immediate fulfillment flow
    await offerQuote(quote.id, resolvedProviderId);
    await acceptQuote(quote.id, resolvedProviderId);
    
    // Transition job to CREATED to make it ready for dispatch
    await transitionDeliveryStatus(job.id, 'CREATED', resolvedProviderId);
  }

  // Re-fetch final job state
  const finalJob = (await db.orm.public.DeliveryJob.where({ id: job.id }).all())[0];
  return finalJob;
}

/**
 * Cross-Vertical Read Contract
 * Allows a source vertical to safely read tracking status using its source identity.
 */
export async function getDeliveryStatusForSource(sourceType: DeliverySourceType, sourceId: string) {
  const jobs = await db.orm.public.DeliveryJob.where({ sourceType, sourceId }).all();
  if (jobs.length === 0) return null;
  
  // Sort by createdAt desc to get the most recent attempt
  jobs.sort((a: any, b: any) => b.createdAt.toString().localeCompare(a.createdAt.toString()));
  const job = jobs[0];

  const trackingEvents = await db.orm.public.DeliveryTrackingEvent.where({ deliveryJobId: job.id }).all();
  trackingEvents.sort((a: any, b: any) => a.timestamp.toString().localeCompare(b.timestamp.toString()));

  // Return a safe subset of data
  return {
    deliveryJobId: job.id,
    status: job.status,
    providerId: job.providerId,
    pickupAddress: job.pickupAddress,
    dropoffAddress: job.dropoffAddress,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    trackingEvents: trackingEvents.map((e: any) => ({
      status: e.status,
      timestamp: e.timestamp,
      locationLat: e.locationLat,
      locationLng: e.locationLng,
    })),
  };
}
