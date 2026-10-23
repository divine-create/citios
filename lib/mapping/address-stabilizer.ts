import type {
  AdministrativeLGAId,
  GeoPoint,
  OperationalDeliveryZone,
  CalabarLandmarkEntry,
} from './types';
import {
  CALABAR_CITY_METADATA,
  CALABAR_ADMINISTRATIVE_LGAS,
  CALABAR_OPERATIONAL_ZONES,
  CALABAR_CANONICAL_LANDMARKS,
  CALABAR_COARSE_BOUNDING_BOX,
} from './calabar-coverage';
import {
  calculateHaversineDistanceKm,
  resolvePointServiceability,
  validateCoordinate,
} from './serviceability';
import { detectAreaFromAddress } from '../city-areas';

/**
 * Expanded Canonical Landmark Directory for Calabar.
 * Merges baseline landmarks with additional verified commercial, administrative,
 * and residential entrance pins across Calabar Municipal and Calabar South.
 */
export const EXPANDED_CALABAR_LANDMARKS: CalabarLandmarkEntry[] = [
  ...CALABAR_CANONICAL_LANDMARKS,
  {
    id: 'marian-market',
    name: 'Marian Market (Old Marian)',
    alternativeNames: ['Old Marian Market', 'Marian Market Main Gate'],
    zoneId: 'marian-road',
    lgaId: 'calabar-municipal',
    center: { latitude: 4.9750, longitude: 8.3385 },
    entrancePin: { latitude: 4.9752, longitude: 8.3387 },
    driverNotes: 'Pedestrian heavy. Two-wheeler parking along Marian Road curb.',
    isVerified: true,
  },
  {
    id: 'crutech-main-gate',
    name: 'UNICROSS / CRUTECH Main Gate',
    alternativeNames: ['CRUTECH Gate', 'Cross River University Gate', 'Ekpo Abasi Campus'],
    zoneId: 'anantigha-coastal',
    lgaId: 'calabar-south',
    center: { latitude: 4.9380, longitude: 8.3220 },
    entrancePin: { latitude: 4.9382, longitude: 8.3222 },
    driverNotes: 'Main security gate on Ekpo Abasi Street. Dispatch dropoff at security pavilion.',
    isVerified: true,
  },
  {
    id: 'calabar-airport-junction',
    name: 'Margaret Ekpo Airport Junction',
    alternativeNames: ['Airport Junction Calabar', 'IBB Way Airport Turnoff'],
    zoneId: 'marian-road',
    lgaId: 'calabar-municipal',
    center: { latitude: 4.9680, longitude: 8.3480 },
    entrancePin: { latitude: 4.9680, longitude: 8.3480 },
    driverNotes: 'Major intersection connecting IBB Way to airport road.',
    isVerified: true,
  },
  {
    id: 'uj-esuene-stadium',
    name: 'U.J. Esuene Stadium',
    alternativeNames: ['Calabar Stadium', 'Esuene Stadium Highway Gate'],
    zoneId: 'diamond-hill',
    lgaId: 'calabar-municipal',
    center: { latitude: 4.9580, longitude: 8.3310 },
    entrancePin: { latitude: 4.9585, longitude: 8.3315 },
    driverNotes: 'Main gate on Murtala Mohammed Highway opposite cultural centre.',
    isVerified: true,
  },
  {
    id: 'federal-housing-estate-gate',
    name: 'Federal Housing Estate Gate',
    alternativeNames: ['FHA Gate Ikot Ansa', 'Federal Housing 8 Miles Gate'],
    zoneId: 'federal-housing',
    lgaId: 'calabar-municipal',
    center: { latitude: 5.0120, longitude: 8.3490 },
    entrancePin: { latitude: 5.0122, longitude: 8.3492 },
    driverNotes: 'Northern highway corridor. Quick motorcycle access off MM Highway.',
    isVerified: true,
  },
  {
    id: 'parliamentary-extension-junction',
    name: 'Parliamentary Extension Secretariat',
    alternativeNames: ['Calabar Municipal Council', 'Parliamentary Roundabout'],
    zoneId: 'parliamentary',
    lgaId: 'calabar-municipal',
    center: { latitude: 4.9890, longitude: 8.3470 },
    entrancePin: { latitude: 4.9892, longitude: 8.3472 },
    driverNotes: 'Administrative zone. Visitor dropoff at security booth.',
    isVerified: true,
  },
  {
    id: 'goldie-target-junction',
    name: 'Goldie Street & Target Road Junction',
    alternativeNames: ['Target Goldie Junction', 'Calabar South Junction'],
    zoneId: 'calabar-south',
    lgaId: 'calabar-south',
    center: { latitude: 4.9480, longitude: 8.3260 },
    entrancePin: { latitude: 4.9480, longitude: 8.3260 },
    driverNotes: 'Bustling commercial crossway in Calabar South.',
    isVerified: true,
  },
  {
    id: 'spar-calabar-mall',
    name: 'SPAR Calabar Mall / Cultural Centre',
    alternativeNames: ['Calabar Mall', 'SPAR Highway'],
    zoneId: 'diamond-hill',
    lgaId: 'calabar-municipal',
    center: { latitude: 4.9590, longitude: 8.3290 },
    entrancePin: { latitude: 4.9592, longitude: 8.3295 },
    driverNotes: 'Designated courier dispatch parking near retail entrance.',
    isVerified: true,
  },
  {
    id: 'etta-agbor-slessor-junction',
    name: 'Etta Agbor & Mary Slessor Roundabout',
    alternativeNames: ['Mary Slessor Roundabout', 'Etta Agbor Gate'],
    zoneId: 'etta-agbor',
    lgaId: 'calabar-municipal',
    center: { latitude: 4.9620, longitude: 8.3390 },
    entrancePin: { latitude: 4.9620, longitude: 8.3390 },
    driverNotes: 'Student hub; shawarma and eatery corridor.',
    isVerified: true,
  },
  {
    id: 'marina-resort',
    name: 'Marina Resort Waterfront',
    alternativeNames: ['Marina Calabar', 'Waterfront Resort'],
    zoneId: 'diamond-hill',
    lgaId: 'calabar-municipal',
    center: { latitude: 4.9610, longitude: 8.3180 },
    entrancePin: { latitude: 4.9615, longitude: 8.3185 },
    driverNotes: 'Scenic harbor axis. Security checkpoint at main drive entrance.',
    isVerified: true,
  },
  {
    id: 'anantigha-secretariat',
    name: 'Calabar South LGA Secretariat (Anantigha)',
    alternativeNames: ['Anantigha Council', 'Calabar South Secretariat'],
    zoneId: 'anantigha-coastal',
    lgaId: 'calabar-south',
    center: { latitude: 4.9350, longitude: 8.3280 },
    entrancePin: { latitude: 4.9352, longitude: 8.3282 },
    driverNotes: 'Southern coastal administrative headquarters.',
    isVerified: true,
  },
];

/**
 * Standard Stabilized Address Contract
 */
export interface StabilizedAddress {
  formattedAddress: string;
  streetLine?: string;
  landmarkId?: string;
  landmarkName?: string;
  zoneId: string;
  zoneName: string;
  lgaId: AdministrativeLGAId;
  lgaName: string;
  citySlug: string;
  cityName: string;
  latitude: number;
  longitude: number;
  visualDescription?: string;
  driverNotes?: string;
  confidenceScore: number;
  resolutionSource: 'EXPLICIT_GPS' | 'LANDMARK_PIN' | 'ZONE_CENTROID' | 'CALABAR_CORE';
  isServiceable: boolean;
}

export interface AddressStabilizationInput {
  addressText?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  landmarkId?: string | null;
  zoneId?: string | null;
  lgaId?: string | null;
  visualDescription?: string | null;
  driverNotes?: string | null;
}

/**
 * Unified LGA Normalizer:
 * Merges "Calabar", "Calabar Municipality", and "Calabar Municipal" into 'calabar-municipal'
 * while preserving 'calabar-south' for the southern commercial and coastal district.
 */
export function normalizeCalabarLGA(inputLga?: string | null): AdministrativeLGAId {
  if (!inputLga) return 'calabar-municipal';
  const clean = inputLga.trim().toLowerCase();
  if (
    clean.includes('south') ||
    clean.includes('anantigha') ||
    clean.includes('watt') ||
    clean.includes('mbukpa') ||
    clean.includes('cr-sou')
  ) {
    return 'calabar-south';
  }
  // All other references ("calabar", "calabar municipal", "calabar municipality", "cr-mun") merge to calabar-municipal
  return 'calabar-municipal';
}

/**
 * Searches local canonical landmarks with instant offline client-side performance (<1ms).
 */
export function searchLocalLandmarks(query: string, lgaId?: string | null): CalabarLandmarkEntry[] {
  const clean = (query || '').trim().toLowerCase();
  const normalizedLga = lgaId ? normalizeCalabarLGA(lgaId) : null;

  return EXPANDED_CALABAR_LANDMARKS.filter((landmark) => {
    if (normalizedLga && landmark.lgaId !== normalizedLga) return false;
    if (!clean) return true;

    return (
      landmark.name.toLowerCase().includes(clean) ||
      landmark.alternativeNames.some((alt) => alt.toLowerCase().includes(clean)) ||
      (landmark.driverNotes && landmark.driverNotes.toLowerCase().includes(clean))
    );
  });
}

/**
 * Calculates Address Confidence Score (0 to 100)
 */
export function scoreAddressConfidence(address: Partial<StabilizedAddress>): number {
  let score = 0;

  // 1. Spatial Precision (40 pts)
  if (address.resolutionSource === 'EXPLICIT_GPS') {
    score += 40;
  } else if (address.resolutionSource === 'LANDMARK_PIN') {
    score += 35;
  } else if (address.resolutionSource === 'ZONE_CENTROID') {
    score += 20;
  } else if (address.latitude && address.longitude) {
    score += 15;
  }

  // 2. Verified Landmark Anchor (25 pts)
  if (address.landmarkId && address.landmarkId !== 'custom') {
    score += 25;
  }

  // 3. Operational Delivery Zone & LGA (20 pts)
  if (address.zoneId) {
    score += 15;
  }
  if (address.lgaId) {
    score += 5;
  }

  // 4. Street / Visual Details (15 pts)
  if (address.visualDescription && address.visualDescription.trim().length > 3) {
    score += 10;
  }
  if (address.streetLine && address.streetLine.trim().length > 3) {
    score += 5;
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * Finds the closest verified landmark to a given coordinate.
 */
export function findNearestLandmark(
  point: GeoPoint,
  maxDistanceKm: number = 3.0
): { landmark: CalabarLandmarkEntry; distanceKm: number } | null {
  let bestMatch: CalabarLandmarkEntry | null = null;
  let minDistance = Infinity;

  for (const landmark of EXPANDED_CALABAR_LANDMARKS) {
    const pin = landmark.entrancePin || landmark.center;
    const dist = calculateHaversineDistanceKm(
      point.latitude,
      point.longitude,
      pin.latitude,
      pin.longitude
    );
    if (dist < minDistance) {
      minDistance = dist;
      bestMatch = landmark;
    }
  }

  if (bestMatch && minDistance <= maxDistanceKm) {
    return { landmark: bestMatch, distanceKm: minDistance };
  }
  return null;
}

/**
 * Main Address Stabilization Function:
 * Takes raw or semi-structured user input and transforms it into a standardized,
 * geocoded, landmark-anchored, and confidence-scored address object.
 */
export function stabilizeAddressInput(input: AddressStabilizationInput): StabilizedAddress {
  let targetLat: number | null = null;
  let targetLng: number | null = null;
  let resolutionSource: StabilizedAddress['resolutionSource'] = 'CALABAR_CORE';
  let matchedLandmark: CalabarLandmarkEntry | null = null;
  let matchedZone: OperationalDeliveryZone | null = null;

  // 1. Check for explicit coordinates
  const coordValidation = validateCoordinate(
    input.latitude != null && input.longitude != null
      ? { latitude: input.latitude, longitude: input.longitude }
      : null
  );

  if (coordValidation.valid && input.latitude != null && input.longitude != null) {
    targetLat = input.latitude;
    targetLng = input.longitude;
    resolutionSource = 'EXPLICIT_GPS';

    // Reverse snap to nearest landmark
    const nearest = findNearestLandmark({ latitude: targetLat, longitude: targetLng }, 2.0);
    if (nearest) {
      matchedLandmark = nearest.landmark;
    }
  }

  // 2. Check for explicit or matched Landmark
  if (!targetLat && input.landmarkId) {
    matchedLandmark =
      EXPANDED_CALABAR_LANDMARKS.find((l) => l.id === input.landmarkId) || null;
    if (matchedLandmark) {
      const pin = matchedLandmark.entrancePin || matchedLandmark.center;
      targetLat = pin.latitude;
      targetLng = pin.longitude;
      resolutionSource = 'LANDMARK_PIN';
    }
  }

  // 3. Fallback Heuristic: Parse text for landmark or zone keywords
  if (!targetLat && input.addressText) {
    const textLower = input.addressText.toLowerCase();

    // Search landmark names and aliases
    for (const l of EXPANDED_CALABAR_LANDMARKS) {
      if (
        textLower.includes(l.name.toLowerCase()) ||
        l.alternativeNames.some((alt) => textLower.includes(alt.toLowerCase()))
      ) {
        matchedLandmark = l;
        const pin = l.entrancePin || l.center;
        targetLat = pin.latitude;
        targetLng = pin.longitude;
        resolutionSource = 'LANDMARK_PIN';
        break;
      }
    }

    // If still no coordinate, use city-areas corridor heuristic
    if (!targetLat) {
      const area = detectAreaFromAddress('calabar', input.addressText);
      if (area) {
        matchedZone =
          CALABAR_OPERATIONAL_ZONES.find((z) => z.id === area.id) || null;
        if (matchedZone) {
          targetLat = matchedZone.center.latitude;
          targetLng = matchedZone.center.longitude;
          resolutionSource = 'ZONE_CENTROID';
        }
      }
    }
  }

  // 4. Fallback to explicit zone
  if (!targetLat && input.zoneId) {
    matchedZone =
      CALABAR_OPERATIONAL_ZONES.find((z) => z.id === input.zoneId) || null;
    if (matchedZone) {
      targetLat = matchedZone.center.latitude;
      targetLng = matchedZone.center.longitude;
      resolutionSource = 'ZONE_CENTROID';
    }
  }

  // 5. Ultimate Fallback to Calabar Core Center
  if (!targetLat || !targetLng) {
    targetLat = CALABAR_CITY_METADATA.center.latitude;
    targetLng = CALABAR_CITY_METADATA.center.longitude;
    resolutionSource = 'CALABAR_CORE';
  }

  // Resolve Zone and LGA
  if (!matchedZone && matchedLandmark) {
    matchedZone =
      CALABAR_OPERATIONAL_ZONES.find((z) => z.id === matchedLandmark.zoneId) || null;
  }

  const pointServ = resolvePointServiceability({ latitude: targetLat, longitude: targetLng });
  if (!matchedZone && pointServ.zone) {
    matchedZone = pointServ.zone;
  }

  const effectiveZone = matchedZone || CALABAR_OPERATIONAL_ZONES[0];
  const effectiveLgaId: AdministrativeLGAId = normalizeCalabarLGA(
    input.lgaId || matchedLandmark?.lgaId || effectiveZone.lgaId
  );
  const effectiveLga = CALABAR_ADMINISTRATIVE_LGAS[effectiveLgaId];

  // Build clean, human-readable formatted address
  const streetPart = input.addressText?.trim() || '';
  const landmarkPart = matchedLandmark ? `Near ${matchedLandmark.name}` : '';
  const zonePart = effectiveZone.shortName || effectiveZone.name;
  const lgaDisplay = effectiveLgaId === 'calabar-municipal' ? 'Calabar Municipal' : 'Calabar South';

  const parts = [streetPart, landmarkPart, zonePart, lgaDisplay, 'Calabar'].filter(Boolean);
  // Deduplicate consecutive parts
  const formattedAddress = Array.from(new Set(parts)).join(', ');

  const result: StabilizedAddress = {
    formattedAddress,
    streetLine: streetPart || undefined,
    landmarkId: matchedLandmark?.id,
    landmarkName: matchedLandmark?.name,
    zoneId: effectiveZone.id,
    zoneName: effectiveZone.name,
    lgaId: effectiveLgaId,
    lgaName: effectiveLga.name,
    citySlug: CALABAR_CITY_METADATA.slug,
    cityName: CALABAR_CITY_METADATA.name,
    latitude: targetLat,
    longitude: targetLng,
    visualDescription: input.visualDescription?.trim() || undefined,
    driverNotes: input.driverNotes?.trim() || matchedLandmark?.driverNotes || undefined,
    confidenceScore: 0,
    resolutionSource,
    isServiceable: pointServ.status === 'INSIDE_COVERAGE',
  };

  result.confidenceScore = scoreAddressConfidence(result);
  return result;
}
