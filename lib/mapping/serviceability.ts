import type {
  DeliveryServiceability,
  GeoPoint,
  OperationalDeliveryZone,
  PointServiceability,
} from './types';
import {
  CALABAR_ADMINISTRATIVE_LGAS,
  CALABAR_CANONICAL_LANDMARKS,
  CALABAR_COARSE_BOUNDING_BOX,
  CALABAR_OPERATIONAL_ZONES,
} from './calabar-coverage';

/**
 * Computes great-circle distance between two points on Earth using Haversine formula.
 * Internal utility for spatial radius checks.
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371; // Earth's mean radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Validates whether a coordinate object contains valid, finite, in-bounds numeric coordinates.
 */
export function validateCoordinate(
  point: GeoPoint | null | undefined
): { valid: boolean; reason?: string } {
  if (!point) {
    return { valid: false, reason: 'Coordinate point is missing or undefined' };
  }

  const { latitude, longitude } = point;

  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return { valid: false, reason: 'Latitude and longitude must be numbers' };
  }

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { valid: false, reason: 'Latitude and longitude must be finite numeric values' };
  }

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return { valid: false, reason: 'Latitude and longitude cannot be NaN' };
  }

  if (latitude < -90 || latitude > 90) {
    return { valid: false, reason: `Latitude ${latitude} is out of valid range [-90, 90]` };
  }

  if (longitude < -180 || longitude > 180) {
    return { valid: false, reason: `Longitude ${longitude} is out of valid range [-180, 180]` };
  }

  return { valid: true };
}

/**
 * Resolves the serviceability of a single geographic point in Calabar.
 *
 * Evaluation Order:
 * 1. Validate numeric coordinate format. Missing/invalid -> UNVERIFIABLE.
 * 2. Check coarse Calabar bounding box. Outside -> OUTSIDE_COVERAGE.
 * 3. Check proximity to active Operational Delivery Zones (ODZs).
 *    - Matching zone -> INSIDE_COVERAGE (with LGA and nearest landmark).
 *    - No matching zone -> UNVERIFIABLE (inside envelope, but unconfirmed road/delivery access).
 */
export function resolvePointServiceability(
  point: GeoPoint | null | undefined
): PointServiceability {
  const validation = validateCoordinate(point);
  if (!validation.valid || !point) {
    return {
      status: 'UNVERIFIABLE',
      point: null,
      reason: validation.reason || 'Invalid coordinate',
    };
  }

  // 1. Coarse bounding box sanity check (fast reject)
  const isWithinBoundingBox =
    point.latitude >= CALABAR_COARSE_BOUNDING_BOX.minLat &&
    point.latitude <= CALABAR_COARSE_BOUNDING_BOX.maxLat &&
    point.longitude >= CALABAR_COARSE_BOUNDING_BOX.minLng &&
    point.longitude <= CALABAR_COARSE_BOUNDING_BOX.maxLng;

  if (!isWithinBoundingBox) {
    return {
      status: 'OUTSIDE_COVERAGE',
      point,
      reason: `Coordinates (${point.latitude.toFixed(4)}, ${point.longitude.toFixed(4)}) lie outside the Calabar metropolitan coverage area.`,
    };
  }

  // 2. Zone matching: Find closest active operational zone within its service radius
  let bestZone: OperationalDeliveryZone | null = null;
  let minDistanceKm = Infinity;

  for (const zone of CALABAR_OPERATIONAL_ZONES) {
    if (!zone.isActive) continue;
    const dist = calculateHaversineDistanceKm(
      point.latitude,
      point.longitude,
      zone.center.latitude,
      zone.center.longitude
    );

    if (dist <= zone.approxRadiusKm && dist < minDistanceKm) {
      minDistanceKm = dist;
      bestZone = zone;
    }
  }

  // If no zone matched within operational radius, point is inside coarse envelope
  // but cannot be verified as serviceable (e.g. river, mangrove, unmapped forest)
  if (!bestZone) {
    return {
      status: 'UNVERIFIABLE',
      point,
      reason: `Point is within the Calabar geographic envelope, but outside confirmed operational delivery corridors or active zones.`,
    };
  }

  // 3. Resolve administrative LGA and nearest landmark
  const lga = CALABAR_ADMINISTRATIVE_LGAS[bestZone.lgaId];

  let nearestLandmark = undefined;
  let landmarkMinDist = Infinity;

  for (const lm of CALABAR_CANONICAL_LANDMARKS) {
    const lmDist = calculateHaversineDistanceKm(
      point.latitude,
      point.longitude,
      lm.entrancePin ? lm.entrancePin.latitude : lm.center.latitude,
      lm.entrancePin ? lm.entrancePin.longitude : lm.center.longitude
    );
    if (lmDist < landmarkMinDist && lmDist <= 2.5) {
      landmarkMinDist = lmDist;
      nearestLandmark = lm;
    }
  }

  return {
    status: 'INSIDE_COVERAGE',
    point,
    zone: bestZone,
    lga,
    nearestLandmark,
    reason: `Verified inside ${bestZone.name} (${lga.name}, ${lga.code}).`,
  };
}

/**
 * Resolves delivery serviceability between a pickup point and a dropoff point.
 * A delivery is serviceable if and only if BOTH pickup and dropoff points are verified INSIDE_COVERAGE.
 */
export function resolveDeliveryServiceability(
  pickup: GeoPoint | null | undefined,
  dropoff: GeoPoint | null | undefined
): DeliveryServiceability {
  const pickupServiceability = resolvePointServiceability(pickup);
  const dropoffServiceability = resolvePointServiceability(dropoff);

  if (pickupServiceability.status !== 'INSIDE_COVERAGE') {
    return {
      serviceable: false,
      pickup: pickupServiceability,
      dropoff: dropoffServiceability,
      rejectionReason: `Pickup location unserviceable: ${pickupServiceability.reason || 'Outside coverage'}`,
    };
  }

  if (dropoffServiceability.status !== 'INSIDE_COVERAGE') {
    return {
      serviceable: false,
      pickup: pickupServiceability,
      dropoff: dropoffServiceability,
      rejectionReason: `Dropoff location unserviceable: ${dropoffServiceability.reason || 'Outside coverage'}`,
    };
  }

  return {
    serviceable: true,
    pickup: pickupServiceability,
    dropoff: dropoffServiceability,
  };
}

/**
 * Convenience helper to validate coordinate numbers directly.
 */
export function isValidCoordinate(latitude: any, longitude: any): boolean {
  return validateCoordinate({ latitude, longitude }).valid;
}

/**
 * Convenience helper checking if a point is verified inside Calabar coverage.
 */
export function isPointServiceable(point: GeoPoint | null | undefined): boolean {
  return resolvePointServiceability(point).status === 'INSIDE_COVERAGE';
}

/**
 * Convenience helper returning the closest active operational zone for a point.
 */
export function findClosestOperationalZone(point: GeoPoint | null | undefined) {
  const result = resolvePointServiceability(point);
  if (result.zone) {
    return {
      zone: result.zone,
      lga: result.lga,
    };
  }
  return null;
}
