/**
 * Types and Interfaces for CityOS Mapping, Geocoding, Routing, and Serviceability.
 * Focused on the Calabar Geographic Foundation (Calabar Municipal & Calabar South).
 */

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface GeoBoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export type AdministrativeLGAId = 'calabar-municipal' | 'calabar-south';

export interface AdministrativeLGA {
  id: AdministrativeLGAId;
  name: string;
  code: string; // 'CR-MUN' | 'CR-SOU'
  headquarters: string;
  center: GeoPoint;
}

export interface OperationalDeliveryZone {
  id: string; // Matches canonical slug, e.g. 'marian-road'
  code: string; // e.g. 'DZ-CAL-01'
  name: string;
  shortName: string;
  lgaId: AdministrativeLGAId;
  center: GeoPoint;
  approxRadiusKm: number;
  description: string;
  isPopular?: boolean;
  isActive: boolean;
  corridors: string[];
}

export interface CalabarLandmarkEntry {
  id: string;
  name: string;
  alternativeNames: string[];
  zoneId: string;
  lgaId: AdministrativeLGAId;
  center: GeoPoint;
  entrancePin?: GeoPoint;
  driverNotes?: string;
  isVerified: boolean;
}

export type ServiceabilityStatus = 'INSIDE_COVERAGE' | 'OUTSIDE_COVERAGE' | 'UNVERIFIABLE';

export interface PointServiceability {
  status: ServiceabilityStatus;
  point: GeoPoint | null;
  zone?: OperationalDeliveryZone;
  lga?: AdministrativeLGA;
  nearestLandmark?: CalabarLandmarkEntry;
  reason?: string;
}

export interface DeliveryServiceability {
  serviceable: boolean;
  pickup: PointServiceability;
  dropoff: PointServiceability;
  rejectionReason?: string;
}

export type RoutingTier = 'ROAD_NETWORK' | 'FALLBACK_ESTIMATE' | 'UNAVAILABLE';

export interface RoutingResult {
  tier: RoutingTier;
  distanceKm: number | null;
  durationMinutes: number | null;
  geometryPolyline?: string;
  provider: string; // 'OSRM' | 'GRAPH_HOPPER' | 'HAVERSINE_CALABAR_CURVATURE' | 'NONE'
  notes?: string;
  error?: string;
}

export interface RouteOptions {
  allowFallbackEstimate?: boolean;
  curvatureFactor?: number;
  maxEstimatedDistanceKm?: number;
  timeoutMs?: number;
}

export interface IRoutingProvider {
  calculateRoute(origin: GeoPoint, destination: GeoPoint, options?: RouteOptions): Promise<RoutingResult>;
}

export interface GeocodingResult {
  formattedAddress: string;
  latitude: number;
  longitude: number;
  landmark?: string;
  zoneId?: string;
  lgaId?: AdministrativeLGAId;
  confidence: number;
  provenance: 'EXACT_GPS' | 'LANDMARK_MATCH' | 'GEOCODER_API' | 'MANUAL';
}

export interface IGeocodingProvider {
  geocode(query: string): Promise<GeocodingResult[]>;
  reverseGeocode(lat: number, lng: number): Promise<GeocodingResult | null>;
}
