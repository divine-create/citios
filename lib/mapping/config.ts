/**
 * Environment and Provider Configuration for CityOS Mapping, Geocoding, and Routing.
 * All credentials and endpoints are resolved server-side with safe public defaults.
 */

export interface MapTileConfig {
  tileUrl: string;
  attribution: string;
  maxZoom: number;
  minZoom: number;
  isVector: boolean;
}

export interface RoutingConfig {
  providerUrl: string | null;
  providerType: 'OSRM' | 'GRAPH_HOPPER' | 'VALHALLA' | 'NONE';
  apiKey: string | null;
  timeoutMs: number;
  allowFallbackEstimate: boolean;
  curvatureFactor: number;
  maxEstimatedDistanceKm: number;
}

export interface GeocodingConfig {
  providerUrl: string | null;
  providerType: 'NOMINATIM' | 'PHOTON' | 'LOCAL';
  userAgent: string;
  timeoutMs: number;
}

/**
 * Resolves map tile layer configuration.
 * Defaults to OpenStreetMap standard tiles with full attribution.
 */
export function getMapTileConfig(): MapTileConfig {
  const customTileUrl =
    process.env.MAP_TILE_URL ||
    process.env.NEXT_PUBLIC_MAP_TILE_URL;

  const tileUrl =
    customTileUrl || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

  const attribution =
    process.env.MAP_ATTRIBUTION ||
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  return {
    tileUrl,
    attribution,
    maxZoom: 19,
    minZoom: 1,
    isVector: false,
  };
}

/**
 * Resolves routing engine configuration.
 * When MAP_ROUTING_URL is unset, providerType is 'NONE' and requests
 * can fall back to explicit, safe estimates if allowed.
 */
export function getRoutingConfig(): RoutingConfig {
  const providerUrl = process.env.MAP_ROUTING_URL || null;
  const rawProviderType = (process.env.MAP_ROUTING_PROVIDER || '').toUpperCase();
  const providerType =
    rawProviderType === 'GRAPH_HOPPER'
      ? 'GRAPH_HOPPER'
      : rawProviderType === 'VALHALLA'
      ? 'VALHALLA'
      : providerUrl
      ? 'OSRM'
      : 'NONE';

  const apiKey = process.env.MAP_ROUTING_API_KEY || null;
  const timeoutMs = parseInt(process.env.MAP_ROUTING_TIMEOUT_MS || '4000', 10);

  // In production, fallback estimates can be disabled by setting MAP_ALLOW_FALLBACK_ESTIMATE=false
  const allowFallbackEstimate =
    process.env.MAP_ALLOW_FALLBACK_ESTIMATE !== 'false';

  // Calabar urban road network curvature factor over straight-line Haversine
  const curvatureFactor = parseFloat(
    process.env.MAP_CALABAR_CURVATURE_FACTOR || '1.45'
  );

  // Maximum distance for which an estimate will be produced (safety bound)
  const maxEstimatedDistanceKm = parseFloat(
    process.env.MAP_MAX_ESTIMATED_DISTANCE_KM || '35.0'
  );

  return {
    providerUrl,
    providerType,
    apiKey,
    timeoutMs,
    allowFallbackEstimate,
    curvatureFactor,
    maxEstimatedDistanceKm,
  };
}

/**
 * Resolves geocoding configuration.
 */
export function getGeocodingConfig(): GeocodingConfig {
  const providerUrl = process.env.MAP_GEOCODING_URL || null;
  const providerType = providerUrl ? 'NOMINATIM' : 'LOCAL';
  const userAgent =
    process.env.MAP_USER_AGENT || 'CityOS-Calabar-CityDrive/1.0 (admin@9jalive.online)';
  const timeoutMs = parseInt(process.env.MAP_GEOCODING_TIMEOUT_MS || '5000', 10);

  return {
    providerUrl,
    providerType,
    userAgent,
    timeoutMs,
  };
}
