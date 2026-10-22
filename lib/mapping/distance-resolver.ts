import type {
  DeliveryServiceability,
  GeoPoint,
  RouteOptions,
  RoutingTier,
} from './types';
import { resolveDeliveryServiceability } from './serviceability';
import { defaultRoutingService } from './routing';

export interface DeliveryDistanceResolution {
  success: boolean;
  distanceKm: number | null;
  durationMinutes: number | null;
  tier: RoutingTier;
  provider: string;
  serviceability: DeliveryServiceability;
  error?: string;
  notes?: string;
}

/**
 * Resolves trusted delivery distance for delivery pricing and dispatch.
 * Enforces:
 * 1. Geographic serviceability in Calabar (pickup & dropoff must be INSIDE_COVERAGE).
 * 2. Trusted routing distance (road network or explicit, safety-capped fallback estimate).
 * 3. Never accepts an arbitrary client default or missing coordinate.
 */
export async function resolveTrustedDeliveryDistance(
  pickup: GeoPoint | null | undefined,
  dropoff: GeoPoint | null | undefined,
  options?: RouteOptions
): Promise<DeliveryDistanceResolution> {
  // 1. Verify serviceability
  const serviceability = resolveDeliveryServiceability(pickup, dropoff);

  if (!serviceability.serviceable) {
    return {
      success: false,
      distanceKm: null,
      durationMinutes: null,
      tier: 'UNAVAILABLE',
      provider: 'NONE',
      serviceability,
      error: serviceability.rejectionReason || 'Locations are not serviceable within Calabar.',
    };
  }

  // Both points are guaranteed valid GeoPoint instances because serviceability is true
  const validPickup = pickup as GeoPoint;
  const validDropoff = dropoff as GeoPoint;

  // 2. Query routing service
  const route = await defaultRoutingService.calculateRoute(
    validPickup,
    validDropoff,
    options
  );

  if (route.tier === 'UNAVAILABLE' || !route.distanceKm) {
    return {
      success: false,
      distanceKm: null,
      durationMinutes: null,
      tier: 'UNAVAILABLE',
      provider: route.provider,
      serviceability,
      error: route.error || 'Failed to determine a safe road route between locations.',
      notes: route.notes,
    };
  }

  return {
    success: true,
    distanceKm: route.distanceKm,
    durationMinutes: route.durationMinutes,
    tier: route.tier,
    provider: route.provider,
    serviceability,
    notes: route.notes,
  };
}
