import type {
  GeoPoint,
  IRoutingProvider,
  RouteOptions,
  RoutingResult,
} from './types';
import { getRoutingConfig } from './config';
import { calculateHaversineDistanceKm, validateCoordinate } from './serviceability';

/**
 * In-memory test override for deterministic unit and integration testing.
 */
let testRoutingEngine: IRoutingProvider | null = null;

export function setTestRoutingEngine(engine: IRoutingProvider | null) {
  testRoutingEngine = engine;
}

/**
 * Standard implementation of IRoutingProvider.
 * Interacts with external road-network engines (OSRM, GraphHopper) when configured,
 * or falls back to explicit, safe Calabar curvature estimates when enabled.
 */
export class CalabarRoutingService implements IRoutingProvider {
  async calculateRoute(
    origin: GeoPoint,
    destination: GeoPoint,
    options?: RouteOptions
  ): Promise<RoutingResult> {
    if (testRoutingEngine) {
      return testRoutingEngine.calculateRoute(origin, destination, options);
    }

    // 1. Validate coordinates
    const originValidation = validateCoordinate(origin);
    if (!originValidation.valid) {
      return {
        tier: 'UNAVAILABLE',
        distanceKm: null,
        durationMinutes: null,
        provider: 'NONE',
        error: `Invalid origin coordinate: ${originValidation.reason}`,
      };
    }

    const destValidation = validateCoordinate(destination);
    if (!destValidation.valid) {
      return {
        tier: 'UNAVAILABLE',
        distanceKm: null,
        durationMinutes: null,
        provider: 'NONE',
        error: `Invalid destination coordinate: ${destValidation.reason}`,
      };
    }

    const config = getRoutingConfig();
    const allowFallback =
      options?.allowFallbackEstimate !== undefined
        ? options.allowFallbackEstimate
        : config.allowFallbackEstimate;
    const curvatureFactor = options?.curvatureFactor || config.curvatureFactor;
    const maxEstimatedDistanceKm =
      options?.maxEstimatedDistanceKm || config.maxEstimatedDistanceKm;
    const timeoutMs = options?.timeoutMs || config.timeoutMs;

    // 2. Attempt Road-Network Routing if provider is configured
    if (config.providerUrl && config.providerType !== 'NONE') {
      try {
        const result = await this.queryRoadNetworkProvider(
          origin,
          destination,
          config.providerUrl,
          config.providerType,
          config.apiKey,
          timeoutMs
        );
        if (result) {
          return result;
        }
      } catch (err: any) {
        // Road network engine call failed or timed out — log and evaluate fallback
        // (Do NOT throw; fall through to controlled fallback evaluation)
      }
    }

    // 3. Fallback evaluation
    if (!allowFallback) {
      return {
        tier: 'UNAVAILABLE',
        distanceKm: null,
        durationMinutes: null,
        provider: 'NONE',
        error: 'Road-network routing engine unavailable and fallback estimate is disabled.',
      };
    }

    // 4. Calculate explicit Calabar curvature estimate
    const straightLineKm = calculateHaversineDistanceKm(
      origin.latitude,
      origin.longitude,
      destination.latitude,
      destination.longitude
    );

    const estimatedKm = Number((straightLineKm * curvatureFactor).toFixed(2));

    if (estimatedKm > maxEstimatedDistanceKm) {
      return {
        tier: 'UNAVAILABLE',
        distanceKm: null,
        durationMinutes: null,
        provider: 'NONE',
        error: `Estimated distance (${estimatedKm} km) exceeds maximum safety limit (${maxEstimatedDistanceKm} km).`,
      };
    }

    // Average delivery speed in Calabar urban traffic (~20 km/h) plus base handling time (5 mins)
    const estimatedMinutes = Math.max(5, Math.round((estimatedKm / 20) * 60) + 5);

    return {
      tier: 'FALLBACK_ESTIMATE',
      distanceKm: estimatedKm,
      durationMinutes: estimatedMinutes,
      provider: 'HAVERSINE_CALABAR_CURVATURE',
      notes: `Road-network provider unavailable. Using explicit Calabar curvature estimate (${curvatureFactor}x straight-line).`,
    };
  }

  private async queryRoadNetworkProvider(
    origin: GeoPoint,
    destination: GeoPoint,
    baseUrl: string,
    providerType: string,
    apiKey: string | null,
    timeoutMs: number
  ): Promise<RoutingResult | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      let url = '';
      if (providerType === 'OSRM') {
        url = `${baseUrl.replace(/\/+$/, '')}/route/v1/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=simplified&geometries=polyline`;
      } else if (providerType === 'GRAPH_HOPPER') {
        url = `${baseUrl.replace(/\/+$/, '')}/route?point=${origin.latitude},${origin.longitude}&point=${destination.latitude},${destination.longitude}&vehicle=bike${apiKey ? `&key=${apiKey}` : ''}`;
      } else {
        return null;
      }

      const response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();

      if (providerType === 'OSRM' && data.routes && data.routes[0]) {
        const route = data.routes[0];
        const distanceKm = Number((route.distance / 1000).toFixed(2));
        const durationMinutes = Math.round(route.duration / 60);
        return {
          tier: 'ROAD_NETWORK',
          distanceKm,
          durationMinutes,
          geometryPolyline: route.geometry,
          provider: 'OSRM',
        };
      }

      if (providerType === 'GRAPH_HOPPER' && data.paths && data.paths[0]) {
        const path = data.paths[0];
        const distanceKm = Number((path.distance / 1000).toFixed(2));
        const durationMinutes = Math.round(path.time / (1000 * 60));
        return {
          tier: 'ROAD_NETWORK',
          distanceKm,
          durationMinutes,
          geometryPolyline: path.points,
          provider: 'GRAPH_HOPPER',
        };
      }

      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Singleton instance of Calabar routing service.
 */
export const defaultRoutingService = new CalabarRoutingService();
