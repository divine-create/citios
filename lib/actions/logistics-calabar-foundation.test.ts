import test from 'node:test';
import assert from 'node:assert';
import { db } from '../../src/prisma/db';
import {
  validateCoordinate,
  resolvePointServiceability,
  resolveDeliveryServiceability,
  calculateHaversineDistanceKm,
} from '../mapping/serviceability';
import {
  CALABAR_CITY_METADATA,
  CALABAR_ADMINISTRATIVE_LGAS,
  CALABAR_OPERATIONAL_ZONES,
  CALABAR_COARSE_BOUNDING_BOX,
} from '../mapping/calabar-coverage';
import {
  CalabarRoutingService,
  setTestRoutingEngine,
} from '../mapping/routing';
import {
  resolveTrustedDeliveryDistance,
} from '../mapping/distance-resolver';
import {
  calculateDeliveryQuote,
  quoteDeliveryRoute,
} from './logistics-pricing';
import {
  findNetworkCandidates,
  dispatchNetworkJob,
  dispatchDelivery,
  findEligibleCandidates,
} from './logistics-dispatch';
import { LogisticsDomainError } from './logistics-domain';
import type { GeoPoint, IRoutingProvider } from '../mapping/types';

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

test('CityDrive Calabar Geographic Foundation — Serviceability & Coverage', async (t) => {
  await t.test('1. Coordinate Validation: strictly rejects non-finite, out-of-range, and null values', () => {
    // Valid
    assert.strictEqual(validateCoordinate({ latitude: 4.9757, longitude: 8.3417 }).valid, true);

    // Null and undefined
    assert.strictEqual(validateCoordinate(null).valid, false);
    assert.strictEqual(validateCoordinate(undefined).valid, false);

    // Non-finite / NaN
    assert.strictEqual(validateCoordinate({ latitude: NaN, longitude: 8.3417 }).valid, false);
    assert.strictEqual(validateCoordinate({ latitude: 4.9757, longitude: Infinity }).valid, false);

    // Out of valid latitude range [-90, 90]
    assert.strictEqual(validateCoordinate({ latitude: 91.0, longitude: 8.3417 }).valid, false);
    assert.strictEqual(validateCoordinate({ latitude: -91.0, longitude: 8.3417 }).valid, false);

    // Out of valid longitude range [-180, 180]
    assert.strictEqual(validateCoordinate({ latitude: 4.9757, longitude: 181.0 }).valid, false);
    assert.strictEqual(validateCoordinate({ latitude: 4.9757, longitude: -181.0 }).valid, false);
  });

  await t.test('2. Administrative Coverage: accurately maps Calabar Municipal and Calabar South', () => {
    // Point in Marian Road -> Calabar Municipal
    const marian = resolvePointServiceability({ latitude: 4.9720, longitude: 8.3370 });
    assert.strictEqual(marian.status, 'INSIDE_COVERAGE');
    assert.strictEqual(marian.lga?.id, 'calabar-municipal');
    assert.strictEqual(marian.lga?.code, 'CR-MUN');
    assert.strictEqual(marian.zone?.id, 'marian-road');

    // Point in State Housing -> Calabar Municipal
    const stateHousing = resolvePointServiceability({ latitude: 4.9850, longitude: 8.3420 });
    assert.strictEqual(stateHousing.status, 'INSIDE_COVERAGE');
    assert.strictEqual(stateHousing.lga?.id, 'calabar-municipal');
    assert.strictEqual(stateHousing.zone?.id, 'state-housing');

    // Point in Watt Market -> Calabar South
    const wattMarket = resolvePointServiceability({ latitude: 4.9520, longitude: 8.3240 });
    assert.strictEqual(wattMarket.status, 'INSIDE_COVERAGE');
    assert.strictEqual(wattMarket.lga?.id, 'calabar-south');
    assert.strictEqual(wattMarket.lga?.code, 'CR-SOU');
    assert.strictEqual(wattMarket.zone?.id, 'calabar-south');

    // Point in Anantigha Coastal -> Calabar South
    const anantigha = resolvePointServiceability({ latitude: 4.9350, longitude: 8.3280 });
    assert.strictEqual(anantigha.status, 'INSIDE_COVERAGE');
    assert.strictEqual(anantigha.lga?.id, 'calabar-south');
    assert.strictEqual(anantigha.zone?.id, 'anantigha-coastal');
  });

  await t.test('3. Sanity Boundary: points outside Calabar envelope are rejected as OUTSIDE_COVERAGE', () => {
    // Lagos
    const lagos = resolvePointServiceability({ latitude: 6.5244, longitude: 3.3792 });
    assert.strictEqual(lagos.status, 'OUTSIDE_COVERAGE');

    // Uyo
    const uyo = resolvePointServiceability({ latitude: 5.0377, longitude: 7.9128 });
    assert.strictEqual(uyo.status, 'OUTSIDE_COVERAGE');

    // Abuja
    const abuja = resolvePointServiceability({ latitude: 9.0765, longitude: 7.3986 });
    assert.strictEqual(abuja.status, 'OUTSIDE_COVERAGE');
  });

  await t.test('4. Unverifiable Boundary: point in envelope but outside active zones is UNVERIFIABLE', () => {
    // Coordinate in the middle of the Calabar River or uninhabited mangrove (lat 4.98, lng 8.26)
    // Within bounding box (4.85 - 5.15, 8.25 - 8.45) but > 4km from any zone center
    const riverPoint = resolvePointServiceability({ latitude: 4.9800, longitude: 8.2600 });
    assert.strictEqual(riverPoint.status, 'UNVERIFIABLE');
    assert.ok(riverPoint.reason?.includes('geographic envelope'));
  });

  await t.test('5. Delivery Serviceability: requires BOTH pickup and dropoff to be verified INSIDE_COVERAGE', () => {
    const pickupMunicipal = { latitude: 4.9720, longitude: 8.3370 }; // Marian
    const dropoffSouth = { latitude: 4.9520, longitude: 8.3240 }; // Watt Market
    const outOfBounds = { latitude: 6.5244, longitude: 3.3792 }; // Lagos

    // Cross-district Municipal to South delivery -> serviceable
    const crossDistrict = resolveDeliveryServiceability(pickupMunicipal, dropoffSouth);
    assert.strictEqual(crossDistrict.serviceable, true);
    assert.strictEqual(crossDistrict.pickup.lga?.id, 'calabar-municipal');
    assert.strictEqual(crossDistrict.dropoff.lga?.id, 'calabar-south');

    // Dropoff outside coverage -> unserviceable
    const unserviceableDropoff = resolveDeliveryServiceability(pickupMunicipal, outOfBounds);
    assert.strictEqual(unserviceableDropoff.serviceable, false);
    assert.ok(unserviceableDropoff.rejectionReason?.includes('Dropoff location unserviceable'));

    // Missing coordinates -> unserviceable
    const missingCoords = resolveDeliveryServiceability(null, dropoffSouth);
    assert.strictEqual(missingCoords.serviceable, false);
    assert.ok(missingCoords.rejectionReason?.includes('Pickup location unserviceable'));
  });
});

test('CityDrive Calabar Geographic Foundation — Routing & Distance Resolution', async (t) => {
  const router = new CalabarRoutingService();
  const marian: GeoPoint = { latitude: 4.9720, longitude: 8.3370 };
  const wattMarket: GeoPoint = { latitude: 4.9520, longitude: 8.3240 };

  await t.test('1. Distinguishes Road Network vs Fallback Estimate tiers strictly', async () => {
    // A. Explicit Fallback Estimate (when no router is configured)
    const fallbackRoute = await router.calculateRoute(marian, wattMarket, {
      allowFallbackEstimate: true,
      curvatureFactor: 1.45,
    });

    assert.strictEqual(fallbackRoute.tier, 'FALLBACK_ESTIMATE');
    assert.strictEqual(fallbackRoute.provider, 'HAVERSINE_CALABAR_CURVATURE');
    assert.ok(fallbackRoute.distanceKm !== null && fallbackRoute.distanceKm > 0);
    assert.ok(fallbackRoute.durationMinutes !== null && fallbackRoute.durationMinutes > 0);
    assert.ok(fallbackRoute.notes?.includes('Calabar curvature estimate'));

    // Ensure it is NEVER labeled ROAD_NETWORK
    assert.notStrictEqual(fallbackRoute.tier, 'ROAD_NETWORK');

    // B. Mock Road Network Router -> returns ROAD_NETWORK
    const mockRoadRouter: IRoutingProvider = {
      async calculateRoute() {
        return {
          tier: 'ROAD_NETWORK',
          distanceKm: 5.85,
          durationMinutes: 16,
          geometryPolyline: 'mock_polyline_encoded',
          provider: 'OSRM',
        };
      },
    };

    setTestRoutingEngine(mockRoadRouter);
    try {
      const roadRoute = await router.calculateRoute(marian, wattMarket);
      assert.strictEqual(roadRoute.tier, 'ROAD_NETWORK');
      assert.strictEqual(roadRoute.distanceKm, 5.85);
      assert.strictEqual(roadRoute.durationMinutes, 16);
      assert.strictEqual(roadRoute.provider, 'OSRM');
    } finally {
      setTestRoutingEngine(null);
    }
  });

  await t.test('2. Disallowed fallback estimate returns UNAVAILABLE when router is offline', async () => {
    const disabledFallback = await router.calculateRoute(marian, wattMarket, {
      allowFallbackEstimate: false,
    });

    assert.strictEqual(disabledFallback.tier, 'UNAVAILABLE');
    assert.strictEqual(disabledFallback.distanceKm, null);
    assert.ok(disabledFallback.error?.includes('fallback estimate is disabled'));
  });

  await t.test('3. Distance resolver integrates serviceability and returns structured resolution', async () => {
    const res = await resolveTrustedDeliveryDistance(marian, wattMarket, {
      allowFallbackEstimate: true,
    });

    assert.strictEqual(res.success, true);
    assert.ok(res.distanceKm && res.distanceKm > 0);
    assert.strictEqual(res.serviceability.serviceable, true);
    assert.strictEqual(res.serviceability.pickup.lga?.id, 'calabar-municipal');
    assert.strictEqual(res.serviceability.dropoff.lga?.id, 'calabar-south');

    // Unserviceable location resolution failure
    const lagosPoint = { latitude: 6.5244, longitude: 3.3792 };
    const failedRes = await resolveTrustedDeliveryDistance(marian, lagosPoint);
    assert.strictEqual(failedRes.success, false);
    assert.strictEqual(failedRes.tier, 'UNAVAILABLE');
    assert.ok(failedRes.error?.includes('Dropoff location unserviceable'));
  });
});

test('CityDrive Calabar Geographic Foundation — Delivery Pricing Integration', async (t) => {
  // Provision a test logistics organization and delivery job
  const prov = await db.orm.public.Organization.create({
    name: uid('CalabarPricingOrg'),
    type: 'LOGISTICS' as any,
    status: 'ACTIVE' as any,
  });

  await db.orm.public.DeliveryPricingRule.create({
    providerId: prov.id,
    baseFee: '500.00',
    perKmRate: '150.00',
    perKgRate: '50.00',
    prioritySurcharge: '300.00',
    isActive: true,
    version: 1,
  });

  const job = await db.orm.public.DeliveryJob.create({
    providerId: prov.id,
    dropoffAddress: 'Watt Market Commercial Core, Calabar South',
    status: 'REQUESTED',
  });

  await t.test('1. calculateDeliveryQuote strictly rejects NaN, zero, and negative distance', async () => {
    await assert.rejects(
      () => calculateDeliveryQuote({ deliveryJobId: job.id, providerId: prov.id, distanceKm: -5.0 }),
      LogisticsDomainError
    );

    await assert.rejects(
      () => calculateDeliveryQuote({ deliveryJobId: job.id, providerId: prov.id, distanceKm: NaN }),
      LogisticsDomainError
    );

    await assert.rejects(
      () => calculateDeliveryQuote({ deliveryJobId: job.id, providerId: prov.id, distanceKm: 0 }),
      LogisticsDomainError
    );
  });

  await t.test('2. quoteDeliveryRoute calculates quote using trusted Calabar distance', async () => {
    const pickup: GeoPoint = { latitude: 4.9720, longitude: 8.3370 }; // Marian
    const dropoff: GeoPoint = { latitude: 4.9520, longitude: 8.3240 }; // Watt Market

    const res = await quoteDeliveryRoute({
      deliveryJobId: job.id,
      providerId: prov.id,
      pickup,
      dropoff,
      weightKg: 2.0,
      allowFallbackEstimate: true,
      idempotencyKey: uid('quote-idem'),
    });

    assert.ok(res.quote.id);
    assert.strictEqual(res.quote.deliveryJobId, job.id);
    assert.strictEqual(res.quote.providerId, prov.id);
    assert.ok(res.distanceKm > 0);
    assert.strictEqual(res.serviceability.serviceable, true);
    assert.strictEqual(res.routingTier, 'FALLBACK_ESTIMATE');

    // Financial arithmetic check: base (500) + distance (dist * 150) + weight (2 * 50 = 100)
    const expectedSubtotal = 500 + Math.round(res.distanceKm * 150) + 100;
    assert.strictEqual(Math.round(parseFloat(res.quote.total as string)), expectedSubtotal);
  });
});

test('CityDrive Calabar Geographic Foundation — Network Dispatch & Partner Fallback', async (t) => {
  // 1. Create a network participant provider
  const networkProv = await db.orm.public.Organization.create({
    name: uid('CalabarNetworkExpress'),
    type: 'LOGISTICS' as any,
    status: 'ACTIVE' as any,
  });

  await db.orm.public.LogisticsSettings.create({
    organizationId: networkProv.id,
    isNetworkParticipant: true,
    platformFeeRate: '0.10',
    serviceRadiusKm: 25.0,
  });

  // 2. Create an online network driver
  const person = await db.orm.public.Person.create({
    firstName: 'Ekpenyong',
    lastName: 'Okon',
  });

  const vehicle = await db.orm.public.LogisticsVehicle.create({
    providerId: networkProv.id,
    type: 'MOTORCYCLE',
    licensePlate: uid('CR-BIKE'),
    status: 'ACTIVE',
  });

  const driver = await db.orm.public.LogisticsDriverProfile.create({
    personId: person.id,
    providerId: networkProv.id,
    status: 'ONLINE',
    onboardingComplete: true,
    currentVehicleId: vehicle.id,
  });

  // 3. Create a delivery job
  const job = await db.orm.public.DeliveryJob.create({
    providerId: networkProv.id,
    pickupAddress: 'Marian Road, Calabar Municipal',
    pickupLat: 4.9720,
    pickupLng: 8.3370,
    dropoffAddress: 'Watt Market, Calabar South',
    dropoffLat: 4.9520,
    dropoffLng: 8.3240,
    packageWeightKg: 2.5,
    status: 'REQUESTED',
  });

  await t.test('1. findNetworkCandidates finds and scores eligible online network drivers', async () => {
    const candidatesResult = await findNetworkCandidates({
      deliveryJobId: job.id,
      pickup: { latitude: 4.9720, longitude: 8.3370 },
      dropoff: { latitude: 4.9520, longitude: 8.3240 },
    });

    assert.ok(candidatesResult.candidates.length >= 1);
    const found = candidatesResult.candidates.find((c: any) => c.id === driver.id);
    assert.ok(found, 'Created network driver should be in candidate list');
    assert.strictEqual(candidatesResult.serviceabilityVerified, true);
    assert.strictEqual(candidatesResult.pickupZone?.id, 'marian-road');
  });

  await t.test('2. dispatchNetworkJob offers to CityOS network rider first', async () => {
    const dispatchRes = await dispatchNetworkJob({
      deliveryJobId: job.id,
      pickup: { latitude: 4.9720, longitude: 8.3370 },
      dropoff: { latitude: 4.9520, longitude: 8.3240 },
      acceptanceWindowSeconds: 60,
      idempotencyKey: uid('net-disp'),
    });

    assert.strictEqual(dispatchRes.success, true);
    assert.strictEqual(dispatchRes.tier, 'CITYOS_NETWORK');
    assert.strictEqual(dispatchRes.partnerFallbackEligible, false);
    assert.ok(dispatchRes.dispatch);
    assert.strictEqual(dispatchRes.dispatch.driverProfileId, driver.id);
  });

  await t.test('3. When network capacity is exhausted, flags PARTNER_FALLBACK without external calls', async () => {
    // Create another job when the driver already has an active assignment/dispatch
    const job2 = await db.orm.public.DeliveryJob.create({
      providerId: networkProv.id,
      pickupAddress: 'Marian Road',
      pickupLat: 4.9720,
      pickupLng: 8.3370,
      dropoffAddress: 'Watt Market',
      dropoffLat: 4.9520,
      dropoffLng: 8.3240,
      status: 'REQUESTED',
    });

    // Take driver offline to simulate capacity exhaustion
    await db.orm.public.LogisticsDriverProfile.where({ id: driver.id }).update({
      status: 'BUSY',
    });

    const fallbackRes = await dispatchNetworkJob({
      deliveryJobId: job2.id,
      pickup: { latitude: 4.9720, longitude: 8.3370 },
      dropoff: { latitude: 4.9520, longitude: 8.3240 },
    });

    assert.strictEqual(fallbackRes.success, false);
    assert.strictEqual(fallbackRes.tier, 'PARTNER_FALLBACK');
    assert.strictEqual(fallbackRes.partnerFallbackEligible, true);
    assert.strictEqual(fallbackRes.candidateCount, 0);
    assert.ok(fallbackRes.reason?.includes('exhausted'));
  });

  await t.test('4. Private business fleet isolation is strictly preserved', async () => {
    const privateMerchantProv = await db.orm.public.Organization.create({
      name: uid('DominosPrivateFleet'),
      type: 'LOGISTICS' as any,
      status: 'ACTIVE' as any,
    });

    const privateJob = await db.orm.public.DeliveryJob.create({
      providerId: privateMerchantProv.id,
      dropoffAddress: 'State Housing',
      status: 'REQUESTED',
    });

    // Eligible candidates for privateJob only queries privateMerchantProv
    const privateCandidates = await findEligibleCandidates({
      deliveryJobId: privateJob.id,
      providerId: privateMerchantProv.id,
    });

    // The network driver belongs to networkProv, NOT privateMerchantProv
    const foundDriver = privateCandidates.drivers.find((d: any) => d.id === driver.id);
    assert.strictEqual(foundDriver, undefined, 'Network driver must not bleed into private merchant fleet');

    // Attempting to dispatch a private job with mismatched providerId throws provider isolation error
    await assert.rejects(
      () =>
        dispatchDelivery({
          deliveryJobId: privateJob.id,
          providerId: networkProv.id, // Mismatched provider
          driverProfileId: driver.id,
        }),
      /Provider isolation violation/
    );
  });
});
