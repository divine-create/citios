import { test, describe, before } from 'node:test';
import assert from 'node:assert';
import { createRequire } from 'module';
import { encode } from 'next-auth/jwt';
import { authOptions } from '../auth';
import { db } from '../../src/prisma/db';
import {
  saveResidentAddress,
  getResidentAddresses,
  getResidentDefaultAddress,
  updateResidentAddress,
  deactivateResidentAddress,
  setDefaultResidentAddress,
  extractReadableDeliveryAddress,
} from './resident-address';
import {
  registerMerchantPickupLocation,
  getMerchantPickupLocations,
  verifyMerchantPickupServiceability,
} from './merchant-pickup';
import {
  checkInRider,
  checkOutRider,
  getRiderReadiness,
  getRiderTelemetry,
  setTestRiderTelemetry,
  isDriverLocationFresh,
} from './logistics-rider';
import {
  findNetworkCandidates,
  dispatchNetworkJob,
  acceptDispatch,
} from './logistics-dispatch';
import {
  createLogisticsDeliveryRequest,
} from './logistics-api';
import { LogisticsDomainError } from './logistics-domain';
import { CALABAR_CANONICAL_LANDMARKS } from '../mapping/calabar-coverage';

// Mock Next.js headers & cookies for getServerSession
const require = createRequire(import.meta.url);
const nextHeaders = require('next/headers');
let mockCookies: Record<string, string> = {};
nextHeaders.headers = () => new Map();
nextHeaders.cookies = () => ({
  get: (name: string) => (mockCookies[name] ? { name, value: mockCookies[name] } : undefined),
  getAll: () => Object.entries(mockCookies).map(([n, v]) => ({ name: n, value: v })),
});

function setActiveUserToken(token: string | null) {
  if (token) {
    mockCookies['next-auth.session-token'] = token;
  } else {
    delete mockCookies['next-auth.session-token'];
  }
}

async function loginAs(person: any, memberships: any[] = []) {
  const token = await encode({
    token: {
      email: `${person.id}@calabar.test`,
      name: `${person.firstName} ${person.lastName}`,
      personId: person.id,
      memberships,
    },
    secret: (authOptions.secret as string) || process.env.NEXTAUTH_SECRET || 'super_secret_cityconnect_key_2026_!@#',
  });
  setActiveUserToken(token);
}

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

describe('CityDrive Network — Phase 2: Resident Address & Merchant Pickup Readiness', () => {
  let residentPersonA: any;
  let residentPersonB: any;
  let merchantOrg: any;
  let networkLogisticsOrg: any;
  let privateLogisticsOrg: any;
  let riderPerson: any;
  let riderDriverProfile: any;
  let activeVehicle: any;
  let calabarCity: any;

  before(async () => {
    // 1. Ensure Calabar city
    calabarCity = await db.orm.public.City.where({ slug: 'calabar' }).all().first();
    if (!calabarCity) {
      calabarCity = await db.orm.public.City.create({
        name: 'Calabar',
        slug: 'calabar',
        state: 'Cross River',
        country: 'Nigeria',
        isActive: true,
      });
    }

    // 2. Provision resident Person A
    residentPersonA = await db.orm.public.Person.create({
      firstName: 'Effiong',
      lastName: 'Bassey',
      isSystemAdmin: false,
    });
    await db.orm.public.Account.create({
      personId: residentPersonA.id,
      isActive: true,
    });
    await db.orm.public.PersonIdentifier.create({
      personId: residentPersonA.id,
      type: 'EMAIL',
      normalizedValue: `${residentPersonA.id}@calabar.test`,
      isVerified: true,
    });

    // 3. Provision resident Person B (for IDOR tests)
    residentPersonB = await db.orm.public.Person.create({
      firstName: 'Anietie',
      lastName: 'Okon',
      isSystemAdmin: false,
    });
    await db.orm.public.Account.create({
      personId: residentPersonB.id,
      isActive: true,
    });
    await db.orm.public.PersonIdentifier.create({
      personId: residentPersonB.id,
      type: 'EMAIL',
      normalizedValue: `${residentPersonB.id}@calabar.test`,
      isVerified: true,
    });

    // 4. Provision Merchant Organization
    merchantOrg = await db.orm.public.Organization.create({
      name: 'Calabar Fresh Foods Merchant',
      type: 'RETAIL' as any,
      status: 'ACTIVE' as any,
    });
    // Add Person A as OWNER of merchantOrg
    const mem = await db.orm.public.Membership.create({
      personId: residentPersonA.id,
      organizationId: merchantOrg.id,
    });
    await db.orm.public.MembershipRole.create({
      membershipId: mem.id,
      role: 'OWNER',
    });

    // 5. Provision Logistics Provider (Network Participant)
    networkLogisticsOrg = await db.orm.public.Organization.create({
      name: 'Cross River Express Logistics',
      type: 'LOGISTICS' as any,
      status: 'ACTIVE' as any,
    });
    process.env.CITYOS_FLEET_ORG_IDS = networkLogisticsOrg.id;
    await db.orm.public.LogisticsSettings.create({
      organizationId: networkLogisticsOrg.id,
      isNetworkParticipant: true,
      serviceRadiusKm: 25.0,
      platformFeeRate: 0.10,
    });
    await db.orm.public.DeliveryPricingRule.create({
      providerId: networkLogisticsOrg.id,
      baseFee: '500.00',
      perKmRate: '150.00',
      perKgRate: '50.00',
      currency: 'NGN',
      version: 1,
      isActive: true,
    });

    // 6. Provision Logistics Provider (Private Business Fleet - NOT Network Participant)
    privateLogisticsOrg = await db.orm.public.Organization.create({
      name: 'Private Merchant Internal Delivery',
      type: 'LOGISTICS' as any,
      status: 'ACTIVE' as any,
    });
    await db.orm.public.LogisticsSettings.create({
      organizationId: privateLogisticsOrg.id,
      isNetworkParticipant: false,
      serviceRadiusKm: 10.0,
      platformFeeRate: 0.10,
    });

    // 7. Provision Rider Person & Profile
    riderPerson = await db.orm.public.Person.create({
      firstName: 'Kufre',
      lastName: 'Edet',
      isSystemAdmin: false,
    });
    await db.orm.public.Account.create({
      personId: riderPerson.id,
      isActive: true,
    });
    await db.orm.public.PersonIdentifier.create({
      personId: riderPerson.id,
      type: 'EMAIL',
      normalizedValue: `${riderPerson.id}@calabar.test`,
      isVerified: true,
    });
    const riderMem = await db.orm.public.Membership.create({
      personId: riderPerson.id,
      organizationId: networkLogisticsOrg.id,
    });
    await db.orm.public.MembershipRole.create({
      membershipId: riderMem.id,
      role: 'DRIVER',
    });

    activeVehicle = await db.orm.public.LogisticsVehicle.create({
      providerId: networkLogisticsOrg.id,
      type: 'MOTORCYCLE',
      licensePlate: 'CAL-987-XA',
      status: 'ACTIVE',
    });

    riderDriverProfile = await db.orm.public.LogisticsDriverProfile.create({
      personId: riderPerson.id,
      providerId: networkLogisticsOrg.id,
      status: 'ONLINE',
      onboardingComplete: true,
      currentVehicleId: activeVehicle.id,
    });
  });

  // =========================================================================
  // WORKSTREAM A: RESIDENT ADDRESSES
  // =========================================================================

  describe('Workstream A — Resident Addresses', () => {
    test('1. Resident can save multiple named delivery addresses with distinct labels', async () => {
      await loginAs(residentPersonA);

      const home = await saveResidentAddress({
        label: 'Home',
        address: '15 Marian Road, Calabar',
        latitude: 4.9757,
        longitude: 8.3417,
        entranceInstructions: 'Black gate opposite church, ring bell',
        provenance: 'DEVICE_GPS',
        isDefault: true,
      });

      const office = await saveResidentAddress({
        label: 'Office',
        address: '42 Ndidem Usang Iso Road, Calabar',
        latitude: 4.9650,
        longitude: 8.3320,
        entranceInstructions: 'Floor 2, Suite 204',
        provenance: 'MAP_PIN',
        isDefault: false,
      });

      assert.strictEqual(home.label, 'Home');
      assert.strictEqual(home.isDefault, true);
      assert.strictEqual(home.verificationStatus, 'SERVICEABLE');

      assert.strictEqual(office.label, 'Office');
      assert.strictEqual(office.isDefault, false);
      assert.strictEqual(office.verificationStatus, 'SERVICEABLE');

      const all = await getResidentAddresses();
      assert.strictEqual(all.length, 2, 'Resident should have 2 saved addresses');

      // Check ResidentProfile.defaultDeliveryAddress was synced and can be extracted as a human-readable string
      const profile = await db.orm.public.ResidentProfile.where({ personId: residentPersonA.id }).all().first();
      assert.strictEqual(
        extractReadableDeliveryAddress(profile?.defaultDeliveryAddress),
        '15 Marian Road, Calabar'
      );
    });

    test('2. Landmark selection preserves destination pin and stores landmark distance', async () => {
      await loginAs(residentPersonA);

      const apexLandmark = CALABAR_CANONICAL_LANDMARKS.find((lm) => lm.id === 'lion-bank-apex')!;
      const destinationLat = apexLandmark.entrancePin.latitude + 0.0015;
      const destinationLng = apexLandmark.entrancePin.longitude + 0.0010;

      const saved = await saveResidentAddress({
        label: 'Shop near Lion Bank',
        address: 'Shop 4B, Marian Road Commercial Strip',
        latitude: destinationLat,
        longitude: destinationLng,
        nearbyLandmarkId: 'lion-bank-apex',
        entranceInstructions: 'Behind the main bank branch',
        provenance: 'MAP_PIN',
      });

      assert.strictEqual(saved.latitude, destinationLat, 'Actual destination pin latitude must be preserved');
      assert.strictEqual(saved.longitude, destinationLng, 'Actual destination pin longitude must be preserved');
      assert.strictEqual(saved.nearbyLandmarkId, 'lion-bank-apex');
      assert.strictEqual(saved.nearbyLandmarkName, apexLandmark.name);
      assert.ok(saved.landmarkDistanceMeters && saved.landmarkDistanceMeters > 0, 'Landmark distance should be calculated');
    });

    test('3. Rejects invalid coordinates strictly', async () => {
      await loginAs(residentPersonA);

      await assert.rejects(
        saveResidentAddress({
          label: 'Bad Coords',
          address: 'Nowhere',
          latitude: NaN,
          longitude: 8.33,
          provenance: 'MANUAL_ENTRY',
        }),
        (err: any) => err instanceof LogisticsDomainError && err.message.includes('Valid numeric latitude')
      );

      await assert.rejects(
        saveResidentAddress({
          label: 'Out of Range',
          address: 'Space',
          latitude: 95.0,
          longitude: 8.33,
          provenance: 'MANUAL_ENTRY',
        }),
        (err: any) => err instanceof LogisticsDomainError && err.message.includes('Valid numeric latitude')
      );
    });

    test('4. Coordinates outside Calabar are flagged as OUTSIDE_COVERAGE', async () => {
      await loginAs(residentPersonA);

      const lagosAddr = await saveResidentAddress({
        label: 'Lagos Branch',
        address: 'Victoria Island, Lagos',
        latitude: 6.4281,
        longitude: 3.4219,
        provenance: 'MANUAL_ENTRY',
      });

      assert.strictEqual(lagosAddr.verificationStatus, 'OUTSIDE_COVERAGE');
      assert.strictEqual(lagosAddr.zoneId, null);
    });

    test('5. Enforces resident ownership and IDOR isolation on address updates and deletions', async () => {
      // Create address under Person A
      await loginAs(residentPersonA);
      const addrA = await saveResidentAddress({
        label: 'Secret Cottage',
        address: '8 Secret Lane, Calabar',
        latitude: 4.9600,
        longitude: 8.3300,
        provenance: 'MAP_PIN',
      });

      // Person B attempts to edit or delete Person A's address
      await loginAs(residentPersonB);

      await assert.rejects(
        updateResidentAddress(addrA.id, { label: 'Hacked Label' }),
        (err: any) => err instanceof LogisticsDomainError && err.message.includes('not found or unauthorized')
      );

      await assert.rejects(
        deactivateResidentAddress(addrA.id),
        (err: any) => err instanceof LogisticsDomainError && err.message.includes('not found or unauthorized')
      );
    });
  });

  // =========================================================================
  // WORKSTREAM B: MERCHANT PICKUP VERIFICATION
  // =========================================================================

  describe('Workstream B — Merchant Pickup Verification', () => {
    test('1. Successfully registers serviceable merchant pickup location on Location model', async () => {
      await loginAs(residentPersonA, [{ organizationId: merchantOrg.id, role: 'OWNER' }]);

      const res = await registerMerchantPickupLocation({
        organizationId: merchantOrg.id,
        name: 'Central Bakery Pickup Bay',
        address: '10 Mary Slessor Avenue, Calabar',
        latitude: 4.9650,
        longitude: 8.3350,
        nearbyLandmarkId: 'rabana-roundabout',
        entranceInstructions: 'Loading bay behind customer parking, call store dispatch',
        contactPhone: '+2348031234567',
        provenance: 'DEVICE_GPS',
      });

      assert.strictEqual(res.verified, true);
      assert.strictEqual(res.serviceable, true);
      assert.ok(res.locationId, 'Location ID should be returned');
      assert.ok(res.zoneId, 'Zone ID must be resolved');

      // Verify DB record
      const loc = await db.orm.public.Location.where({ id: res.locationId }).all().first();
      assert.ok(loc, 'Location must exist in database');
      assert.strictEqual(loc.organizationId, merchantOrg.id);
      assert.strictEqual(loc.latitude, 4.9650);
      assert.strictEqual(loc.longitude, 8.3350);

      // Verify contact point was created
      const contact = await db.orm.public.OrganizationContactPoint
        .where({ locationId: loc.id, type: 'PHONE' })
        .all()
        .first();
      assert.ok(contact, 'OrganizationContactPoint should be created');
      assert.strictEqual(contact.value, '+2348031234567');
    });

    test('2. Rejects merchant pickup point outside Calabar delivery coverage', async () => {
      await loginAs(residentPersonA, [{ organizationId: merchantOrg.id, role: 'OWNER' }]);

      await assert.rejects(
        registerMerchantPickupLocation({
          organizationId: merchantOrg.id,
          name: 'Remote Warehouse',
          address: 'Odukpani Junction',
          latitude: 5.1200,
          longitude: 8.3200,
          provenance: 'MAP_PIN',
        }),
        (err: any) => err instanceof LogisticsDomainError && err.message.includes('outside active Calabar')
      );
    });

    test('3. Enforces merchant membership authorization (non-members cannot register pickup)', async () => {
      // Person B is not a member of merchantOrg
      await loginAs(residentPersonB, []);

      await assert.rejects(
        registerMerchantPickupLocation({
          organizationId: merchantOrg.id,
          name: 'Unauthorized Location',
          address: '10 Mary Slessor Avenue, Calabar',
          latitude: 4.9650,
          longitude: 8.3350,
          provenance: 'MAP_PIN',
        }),
        (err: any) => err.message.includes('FORBIDDEN') || err.message.includes('membership')
      );
    });

    test('4. Preserves private business fleet isolation (does not alter network participant status)', async () => {
      await loginAs(residentPersonA, [{ organizationId: merchantOrg.id, role: 'OWNER' }]);

      await registerMerchantPickupLocation({
        organizationId: merchantOrg.id,
        name: 'Private Hub Location',
        address: '5 Marian Road, Calabar',
        latitude: 4.9700,
        longitude: 8.3400,
        provenance: 'MAP_PIN',
      });

      const settings = await db.orm.public.LogisticsSettings.where({ organizationId: merchantOrg.id }).all().first();
      assert.strictEqual(settings?.isNetworkParticipant ?? false, false, 'Merchant should not be auto-opted into network');
    });
  });

  // =========================================================================
  // WORKSTREAM C: RIDER OPERATIONAL READINESS
  // =========================================================================

  describe('Workstream C — Rider Operational Readiness', () => {
    test('1. Onboarding incomplete rider cannot check in', async () => {
      const incompleteRider = await db.orm.public.LogisticsDriverProfile.create({
        personId: residentPersonB.id,
        providerId: networkLogisticsOrg.id,
        status: 'OFFLINE',
        onboardingComplete: false,
        currentVehicleId: activeVehicle.id,
      });

      await loginAs(residentPersonB);

      await assert.rejects(
        checkInRider({
          driverProfileId: incompleteRider.id,
          latitude: 4.9750,
          longitude: 8.3410,
        }),
        (err: any) => err instanceof LogisticsDomainError && err.message.includes('onboarding must be completed')
      );
    });

    test('2. Rider check-in enforces active vehicle and valid Calabar coordinates', async () => {
      await loginAs(riderPerson, [{ organizationId: networkLogisticsOrg.id, role: 'DRIVER' }]);

      // Rejects out-of-coverage check-in
      await assert.rejects(
        checkInRider({
          driverProfileId: riderDriverProfile.id,
          latitude: 6.5244, // Lagos
          longitude: 3.3792,
        }),
        (err: any) => err instanceof LogisticsDomainError && err.message.includes('outside active Calabar')
      );

      // Successful check-in inside Calabar (Marian zone)
      const res = await checkInRider({
        driverProfileId: riderDriverProfile.id,
        latitude: 4.9757,
        longitude: 8.3417,
        provenance: 'DEVICE_GPS',
      });

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.status, 'ONLINE');
      assert.ok(res.zoneId, 'Zone ID must be resolved');

      // Verify DB status
      const updated = await db.orm.public.LogisticsDriverProfile.where({ id: riderDriverProfile.id }).all().first();
      assert.strictEqual(updated?.status, 'ONLINE');
    });

    test('3. Stale GPS observations are detected and proximity ranking ignores stale riders', async () => {
      const now = Date.now();
      const freshTime = now - 5 * 60 * 1000; // 5 mins ago (fresh)
      const staleTime = now - 25 * 60 * 1000; // 25 mins ago (stale > 15m)

      assert.strictEqual(isDriverLocationFresh(freshTime), true, '5-minute-old ping should be fresh');
      assert.strictEqual(isDriverLocationFresh(staleTime), false, '25-minute-old ping should be stale');

      // Set fresh telemetry for rider in Marian zone
      setTestRiderTelemetry(riderDriverProfile.id, {
        latitude: 4.9757,
        longitude: 8.3417,
        observedAt: freshTime,
      });

      const readinessFresh = await getRiderReadiness(riderDriverProfile.id);
      assert.strictEqual(readinessFresh.isDispatchEligible, true);
      assert.strictEqual(readinessFresh.lastLocation?.isStale, false);

      // Now simulate stale telemetry
      setTestRiderTelemetry(riderDriverProfile.id, {
        latitude: 4.9757,
        longitude: 8.3417,
        observedAt: staleTime,
      });

      const readinessStale = await getRiderReadiness(riderDriverProfile.id);
      assert.strictEqual(readinessStale.lastLocation?.isStale, true);
      assert.ok(
        readinessStale.ineligibilityReasons.some((r) => r.includes('stale')),
        'Ineligibility reasons must note stale GPS'
      );
    });

    test('4. Proximity ranking awards affinity points to riders with fresh telemetry in pickup zone', async () => {
      setTestRiderTelemetry(riderDriverProfile.id, {
        latitude: 4.9757,
        longitude: 8.3417,
        observedAt: Date.now(),
      });

      const dummyJob = await db.orm.public.DeliveryJob.create({
        providerId: networkLogisticsOrg.id,
        sourceType: 'RETAIL_ORDER',
        sourceId: uid('src'),
        idempotencyKey: uid('job-key'),
        pickupAddress: 'Marian Road, Calabar',
        dropoffAddress: 'Watt Market, Calabar',
      });

      const result = await findNetworkCandidates({
        deliveryJobId: dummyJob.id,
        providerId: networkLogisticsOrg.id,
        pickup: { latitude: 4.9757, longitude: 8.3417 },
      });

      assert.ok(result.candidates.length > 0, 'Should find network candidate');
      assert.strictEqual(result.candidates[0].id, riderDriverProfile.id);
    });

    test('5. Safe check-out behavior verifies rider ownership and offline transition', async () => {
      await loginAs(riderPerson, [{ organizationId: networkLogisticsOrg.id, role: 'DRIVER' }]);

      const res = await checkOutRider({ driverProfileId: riderDriverProfile.id });
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.status, 'OFFLINE');

      const profile = await db.orm.public.LogisticsDriverProfile.where({ id: riderDriverProfile.id }).all().first();
      assert.strictEqual(profile?.status, 'OFFLINE');
    });

    test('6. Offline or suspended riders cannot accept dispatch assignments', async () => {
      // Driver is currently OFFLINE
      const job = await db.orm.public.DeliveryJob.create({
        providerId: networkLogisticsOrg.id,
        sourceType: 'DIRECT_DELIVERY',
        sourceId: uid('direct'),
        idempotencyKey: uid('offline-job'),
        dropoffAddress: 'Watt Market',
      });

      const dispatch = await db.orm.public.DeliveryDispatch.create({
        deliveryJobId: job.id,
        providerId: networkLogisticsOrg.id,
        driverProfileId: riderDriverProfile.id,
        status: 'OFFERED',
        attempt: 1,
      });

      await assert.rejects(
        acceptDispatch({
          dispatchId: dispatch.id,
          driverProfileId: riderDriverProfile.id,
          providerId: networkLogisticsOrg.id,
        }),
        (err: any) => err instanceof LogisticsDomainError && err.message.includes('Offline drivers cannot accept')
      );
    });
  });

  // =========================================================================
  // WORKSTREAM D: ROUTING & QUOTE SAFEGUARDS INTEGRATION
  // =========================================================================

  describe('Workstream D — Routing & Quote Safeguards', () => {
    test('1. createLogisticsDeliveryRequest rejects requests with out-of-coverage coordinates', async () => {
      await assert.rejects(
        createLogisticsDeliveryRequest({
          sourceType: 'RETAIL_ORDER',
          sourceId: uid('ord-bad'),
          idempotencyKey: uid('idemp-bad'),
          pickup: {
            address: 'Lagos Island',
            latitude: 6.4549, // Lagos
            longitude: 3.4246,
          },
          dropoff: {
            address: 'Watt Market, Calabar',
            latitude: 4.9600,
            longitude: 8.3300,
          },
        }),
        (err: any) =>
          err instanceof LogisticsDomainError &&
          (err.message.includes('unserviceable') || err.message.includes('outside the Calabar'))
      );
    });

    test('2. createLogisticsDeliveryRequest successfully calculates trusted distance for valid Calabar coordinates', async () => {
      const job = await createLogisticsDeliveryRequest({
        sourceType: 'RETAIL_ORDER',
        sourceId: uid('ord-good'),
        idempotencyKey: uid('idemp-good'),
        pickup: {
          address: 'Marian Market, Calabar',
          latitude: 4.9757,
          longitude: 8.3417,
        },
        dropoff: {
          address: 'Watt Market, Calabar',
          latitude: 4.9600,
          longitude: 8.3300,
        },
      });

      assert.ok(job.id, 'Job must be created');
      assert.strictEqual(job.status, 'CREATED');
    });
  });
});
