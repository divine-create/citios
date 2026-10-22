import test, { before, after } from 'node:test';
import assert from 'node:assert';
import { db } from '@/src/prisma/db';
import { v4 as uuidv4 } from 'uuid';
import { encode } from 'next-auth/jwt';
import { authOptions } from '@/lib/auth';
import { createRequire } from 'module';

import {
  dispatchNetworkJob,
  findNetworkCandidates,
  dispatchDelivery,
  acceptDispatch,
  declineDispatchOffer,
  handleDispatchOfferTimeout,
  reassignDeliveryJob,
} from './logistics-dispatch';
import {
  getNetworkDispatchPolicy,
  isCityOSPlatformFleet,
  getProviderCategory,
} from './logistics-policy';
import {
  setTestRiderTelemetry,
  checkInRider,
  checkOutRider,
  getRiderReadiness,
} from './logistics-rider';
import {
  setNetworkParticipation,
  bookPartnerCourierFallback,
} from './logistics-network';
import {
  getExhaustedDeliveries,
  getDeliveryDispatchAudit,
  reattemptDispatch,
  escalateDeliveryIssue,
} from './logistics-operations-admin';
import {
  isPointServiceable,
  resolvePointServiceability,
} from '../mapping/serviceability';
import { calculateDeliveryQuote } from './logistics-pricing';
import { settleDelivery } from './logistics-settlement';
import { LogisticsDomainError, MockPartnerCourierAdapter } from './logistics-domain';

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

async function createTestActor(orgId?: string, role = 'MEMBER') {
  const uid = uuidv4().slice(0, 8);
  const email = `test-actor-${uid}@cityos.calabar`;

  const person = await db.orm.public.Person.create({
    id: uuidv4(),
    firstName: 'Test',
    lastName: `Actor-${uid}`,
  });

  await db.orm.public.PersonIdentifier.create({
    personId: person.id,
    type: 'EMAIL',
    normalizedValue: email,
    isVerified: true,
  });

  await db.orm.public.Account.create({
    personId: person.id,
    isActive: true,
  });

  if (orgId) {
    const membership = await db.orm.public.Membership.create({
      personId: person.id,
      organizationId: orgId,
    });
    await db.orm.public.MembershipRole.create({
      membershipId: membership.id,
      role,
    });
  }

  const token = await encode({
    token: {
      email,
      name: `Test Actor ${uid}`,
      personId: person.id,
      memberships: orgId ? [{ organizationId: orgId, role, organizationType: 'LOGISTICS' }] : [],
    },
    secret: (authOptions.secret as string) || process.env.NEXTAUTH_SECRET || 'super_secret_cityconnect_key_2026_!@#',
  });

  return { person, token, email };
}

test('CityDrive Network — CityOS-Only Launch & Future Open-Network Readiness', async (t) => {
  // Enforce CityOS-only mode
  process.env.CITYDRIVE_NETWORK_POLICY = 'CITYOS_ONLY';

  let cityosOrg: any;
  let cityosActor1: any;
  let cityosActor2: any;
  let cityosVehicle1: any;
  let cityosVehicle2: any;
  let cityosDriver1: any;
  let cityosDriver2: any;

  let independentOrg: any;
  let independentActor: any;
  let independentVehicle: any;
  let independentDriver: any;

  let partner3PLOrg: any;
  let partner3PLActor: any;
  let partner3PLVehicle: any;
  let partner3PLDriver: any;

  let privateMerchantOrg: any;
  let privateMerchantActor: any;
  let privateMerchantDriver: any;
  let privateMerchantVehicle: any;

  before(async () => {
    // 1. Setup CityOS Platform Fleet Provider
    cityosOrg = await db.orm.public.Organization.create({
      id: uuidv4(),
      name: 'CityOS Calabar Fleet Operator',
      type: 'LOGISTICS' as any,
      status: 'ACTIVE' as any,
    });
    await db.orm.public.LogisticsSettings.create({
      id: uuidv4(),
      organizationId: cityosOrg.id,
      isNetworkParticipant: true,
      platformFeeRate: '0.10',
    });
    await db.orm.public.DeliveryPricingRule.create({
      providerId: cityosOrg.id,
      version: 1,
      currency: 'NGN',
      baseFee: '500.00' as any,
      perKmRate: '150.00' as any,
      perKgRate: '20.00' as any,
      prioritySurcharge: '500.00' as any,
      isActive: true,
    });

    cityosActor1 = await createTestActor(cityosOrg.id, 'STAFF');
    cityosVehicle1 = await db.orm.public.LogisticsVehicle.create({
      id: uuidv4(),
      providerId: cityosOrg.id,
      type: 'MOTORCYCLE',
      licensePlate: 'CR-CITYOS-01',
      status: 'ACTIVE',
    });
    cityosDriver1 = await db.orm.public.LogisticsDriverProfile.create({
      id: uuidv4(),
      personId: cityosActor1.person.id,
      providerId: cityosOrg.id,
      status: 'ONLINE',
      onboardingComplete: true,
      currentVehicleId: cityosVehicle1.id,
    });
    setTestRiderTelemetry(cityosDriver1.id, {
      latitude: 4.9757,
      longitude: 8.3417,
      observedAt: Date.now(),
    });

    cityosActor2 = await createTestActor(cityosOrg.id, 'STAFF');
    cityosVehicle2 = await db.orm.public.LogisticsVehicle.create({
      id: uuidv4(),
      providerId: cityosOrg.id,
      type: 'MOTORCYCLE',
      licensePlate: 'CR-CITYOS-02',
      status: 'ACTIVE',
    });
    cityosDriver2 = await db.orm.public.LogisticsDriverProfile.create({
      id: uuidv4(),
      personId: cityosActor2.person.id,
      providerId: cityosOrg.id,
      status: 'ONLINE',
      onboardingComplete: true,
      currentVehicleId: cityosVehicle2.id,
    });
    setTestRiderTelemetry(cityosDriver2.id, {
      latitude: 4.9600,
      longitude: 8.3300,
      observedAt: Date.now(),
    });

    // 2. Setup Independent Courier Provider
    independentOrg = await db.orm.public.Organization.create({
      id: uuidv4(),
      name: 'Independent Gig Couriers Calabar',
      type: 'LOGISTICS' as any,
      status: 'ACTIVE' as any,
    });
    await db.orm.public.LogisticsSettings.create({
      id: uuidv4(),
      organizationId: independentOrg.id,
      isNetworkParticipant: true,
    });
    independentActor = await createTestActor(independentOrg.id, 'STAFF');
    independentVehicle = await db.orm.public.LogisticsVehicle.create({
      id: uuidv4(),
      providerId: independentOrg.id,
      type: 'MOTORCYCLE',
      licensePlate: 'CR-GIG-01',
      status: 'ACTIVE',
    });
    independentDriver = await db.orm.public.LogisticsDriverProfile.create({
      id: uuidv4(),
      personId: independentActor.person.id,
      providerId: independentOrg.id,
      status: 'ONLINE',
      onboardingComplete: true,
      currentVehicleId: independentVehicle.id,
    });
    setTestRiderTelemetry(independentDriver.id, {
      latitude: 4.9757,
      longitude: 8.3417,
      observedAt: Date.now(),
    });

    // 3. Setup 3rd-Party Commercial Logistics Partner
    partner3PLOrg = await db.orm.public.Organization.create({
      id: uuidv4(),
      name: 'Commercial 3PL Express Calabar',
      type: 'LOGISTICS' as any,
      status: 'ACTIVE' as any,
    });
    await db.orm.public.LogisticsSettings.create({
      id: uuidv4(),
      organizationId: partner3PLOrg.id,
      isNetworkParticipant: true,
    });
    partner3PLActor = await createTestActor(partner3PLOrg.id, 'STAFF');
    partner3PLVehicle = await db.orm.public.LogisticsVehicle.create({
      id: uuidv4(),
      providerId: partner3PLOrg.id,
      type: 'VAN',
      licensePlate: 'CR-3PL-01',
      status: 'ACTIVE',
    });
    partner3PLDriver = await db.orm.public.LogisticsDriverProfile.create({
      id: uuidv4(),
      personId: partner3PLActor.person.id,
      providerId: partner3PLOrg.id,
      status: 'ONLINE',
      onboardingComplete: true,
      currentVehicleId: partner3PLVehicle.id,
    });
    setTestRiderTelemetry(partner3PLDriver.id, {
      latitude: 4.9757,
      longitude: 8.3417,
      observedAt: Date.now(),
    });

    // 4. Setup Private Merchant Business Fleet (Non-network participant)
    privateMerchantOrg = await db.orm.public.Organization.create({
      id: uuidv4(),
      name: 'Marian Grocery Private Dispatch',
      type: 'RETAIL' as any,
      status: 'ACTIVE' as any,
    });
    await db.orm.public.LogisticsSettings.create({
      id: uuidv4(),
      organizationId: privateMerchantOrg.id,
      isNetworkParticipant: false, // private business only!
    });
    privateMerchantActor = await createTestActor(privateMerchantOrg.id, 'STAFF');
    privateMerchantVehicle = await db.orm.public.LogisticsVehicle.create({
      id: uuidv4(),
      providerId: privateMerchantOrg.id,
      type: 'MOTORCYCLE',
      licensePlate: 'CR-PVT-01',
      status: 'ACTIVE',
    });
    privateMerchantDriver = await db.orm.public.LogisticsDriverProfile.create({
      id: uuidv4(),
      personId: privateMerchantActor.person.id,
      providerId: privateMerchantOrg.id,
      status: 'ONLINE',
      onboardingComplete: true,
      currentVehicleId: privateMerchantVehicle.id,
    });
  });

  after(async () => {
    delete process.env.CITYDRIVE_NETWORK_POLICY;
    setActiveUserToken(null);
  });

  // Test 1: CityOS rider can receive a valid network offer
  await t.test('1. CityOS rider can receive a valid network offer', async () => {
    process.env.CITYDRIVE_NETWORK_POLICY = 'CITYOS_ONLY';
    assert.strictEqual(getNetworkDispatchPolicy(), 'CITYOS_ONLY');
    assert.strictEqual(isCityOSPlatformFleet(cityosOrg.id, cityosOrg.name), true);
    assert.strictEqual(getProviderCategory(cityosOrg), 'CITYOS_FLEET');

    const job = await db.orm.public.DeliveryJob.create({
      id: uuidv4(),
      status: 'CREATED',
      pickupAddress: '88 Marian Road, Calabar',
      dropoffAddress: 'UNICAL Main Campus Gate, Calabar',
      pickupLat: 4.9757,
      pickupLng: 8.3417,
      dropoffLat: 4.9545,
      dropoffLng: 8.3438,
      packageWeightKg: 1.5,
    });

    const result = await dispatchNetworkJob({
      deliveryJobId: job.id,
      acceptanceWindowSeconds: 60,
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.tier, 'CITYOS_NETWORK');
    assert.ok(result.dispatch);
    assert.strictEqual(result.dispatch.status, 'OFFERED');
    assert.strictEqual(result.dispatch.driverProfileId, cityosDriver1.id);
    assert.strictEqual(result.partnerFallbackEligible, false);
  });

  // Test 2: Unapproved or suspended CityOS rider cannot receive an offer
  await t.test('2. Unapproved or suspended CityOS rider cannot receive an offer', async () => {
    // Sub-case A: Suspended CityOS driver
    await db.orm.public.LogisticsDriverProfile.where({ id: cityosDriver1.id }).update({ status: 'SUSPENDED' });
    await db.orm.public.LogisticsDriverProfile.where({ id: cityosDriver2.id }).update({ status: 'SUSPENDED' });

    const jobSuspended = await db.orm.public.DeliveryJob.create({
      id: uuidv4(),
      providerId: cityosOrg.id,
      status: 'CREATED',
      pickupAddress: 'Marian Road, Calabar',
      dropoffAddress: 'State Housing, Calabar',
      pickupLat: 4.9757,
      pickupLng: 8.3417,
      dropoffLat: 4.965,
      dropoffLng: 8.332,
    });

    const resSuspended = await dispatchNetworkJob({
      deliveryJobId: jobSuspended.id,
      providerId: cityosOrg.id,
    });
    assert.strictEqual(resSuspended.success, false);
    assert.strictEqual(resSuspended.tier, 'NO_RIDER_AVAILABLE');

    // Sub-case B: Onboarding incomplete CityOS driver
    await db.orm.public.LogisticsDriverProfile.where({ id: cityosDriver1.id }).update({
      status: 'ONLINE',
      onboardingComplete: false,
    });
    const resIncomplete = await dispatchNetworkJob({
      deliveryJobId: jobSuspended.id,
      providerId: cityosOrg.id,
    });
    assert.strictEqual(resIncomplete.success, false);
    assert.strictEqual(resIncomplete.tier, 'NO_RIDER_AVAILABLE');

    // Sub-case C: Inactive / maintenance vehicle
    await db.orm.public.LogisticsDriverProfile.where({ id: cityosDriver1.id }).update({
      onboardingComplete: true,
    });
    await db.orm.public.LogisticsVehicle.where({ id: cityosVehicle1.id }).update({
      status: 'MAINTENANCE',
    });
    const readiness = await getRiderReadiness(cityosDriver1.id);
    assert.strictEqual(readiness.hasActiveVehicle, false);
    assert.ok(readiness.ineligibilityReasons.some((r) => r.includes('maintenance') || r.includes('not active')));

    // Restore vehicle and status for subsequent tests
    await db.orm.public.LogisticsVehicle.where({ id: cityosVehicle1.id }).update({ status: 'ACTIVE' });
    await db.orm.public.LogisticsDriverProfile.where({ id: cityosDriver1.id }).update({ status: 'ONLINE', onboardingComplete: true });
    await db.orm.public.LogisticsDriverProfile.where({ id: cityosDriver2.id }).update({ status: 'ONLINE', onboardingComplete: true });
  });

  // Test 3: Independent rider is rejected in CityOS-only mode
  await t.test('3. Independent rider is rejected in CityOS-only mode', async () => {
    process.env.CITYDRIVE_NETWORK_POLICY = 'CITYOS_ONLY';
    assert.strictEqual(isCityOSPlatformFleet(independentOrg.id, independentOrg.name), false);
    assert.strictEqual(getProviderCategory(independentOrg), 'INDEPENDENT_RIDER');

    // Query candidates targeting independent provider in CITYOS_ONLY mode
    const job = await db.orm.public.DeliveryJob.create({
      id: uuidv4(),
      status: 'CREATED',
      pickupAddress: 'Target Street, Calabar',
      dropoffAddress: 'Watt Market, Calabar',
      pickupLat: 4.9757,
      pickupLng: 8.3417,
    });

    const candidates = await findNetworkCandidates({
      deliveryJobId: job.id,
      providerId: independentOrg.id,
      policy: 'CITYOS_ONLY',
    });

    assert.strictEqual(candidates.candidates.length, 0, 'Independent riders must be strictly rejected in CityOS-only mode');
  });

  // Test 4: Third-party logistics partner is rejected in CityOS-only mode
  await t.test('4. Third-party logistics partner is rejected in CityOS-only mode', async () => {
    process.env.CITYDRIVE_NETWORK_POLICY = 'CITYOS_ONLY';
    assert.strictEqual(isCityOSPlatformFleet(partner3PLOrg.id, partner3PLOrg.name), false);
    assert.strictEqual(getProviderCategory(partner3PLOrg), 'THIRD_PARTY_PARTNER');

    const job = await db.orm.public.DeliveryJob.create({
      id: uuidv4(),
      providerId: partner3PLOrg.id,
      status: 'CREATED',
      pickupAddress: 'Calabar Port Gate, Calabar',
      dropoffAddress: 'Murtala Mohammed Highway, Calabar',
    });

    const candidates = await findNetworkCandidates({
      deliveryJobId: job.id,
      providerId: partner3PLOrg.id,
      policy: 'CITYOS_ONLY',
    });

    assert.strictEqual(candidates.candidates.length, 0, '3PL partner candidates must be strictly rejected in CityOS-only mode');

    // Calling bookPartnerCourierFallback in CityOS-only mode must throw domain error
    const mockAdapter = new MockPartnerCourierAdapter();
    await assert.rejects(
      async () => {
        await bookPartnerCourierFallback({
          deliveryJobId: job.id,
          providerId: partner3PLOrg.id,
          adapter: mockAdapter,
        });
      },
      (err: any) => err instanceof LogisticsDomainError && err.message.includes('disabled in CityOS-only launch mode')
    );
  });

  // Test 5: No eligible CityOS rider results in defined no-rider-available behaviour
  await t.test('5. No eligible CityOS rider results in defined no-rider-available behaviour', async () => {
    process.env.CITYDRIVE_NETWORK_POLICY = 'CITYOS_ONLY';
    // Dedicated empty CityOS provider for exhaustion test
    const emptyCityosOrg = await db.orm.public.Organization.create({
      id: uuidv4(),
      name: 'CityOS Exhausted Calabar Fleet',
      type: 'LOGISTICS' as any,
      status: 'ACTIVE' as any,
    });
    await db.orm.public.LogisticsSettings.create({
      id: uuidv4(),
      organizationId: emptyCityosOrg.id,
      isNetworkParticipant: true,
    });

    const job = await db.orm.public.DeliveryJob.create({
      id: uuidv4(),
      providerId: emptyCityosOrg.id,
      status: 'CREATED',
      pickupAddress: 'Marian Road, Calabar',
      dropoffAddress: 'State Housing, Calabar',
      pickupLat: 4.9757,
      pickupLng: 8.3417,
    });

    const result = await dispatchNetworkJob({
      deliveryJobId: job.id,
      providerId: emptyCityosOrg.id,
      policy: 'CITYOS_ONLY',
    });

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.tier, 'NO_RIDER_AVAILABLE');
    assert.strictEqual(result.dispatch, null);
    assert.strictEqual(result.partnerFallbackEligible, false);
    assert.strictEqual(result.operationalInterventionRequired, true);

    // Verify audit tracking event recorded
    const trackingEvents = await db.orm.public.DeliveryTrackingEvent.where({ deliveryJobId: job.id }).all();
    const exhaustedEvent = trackingEvents.find((e: any) =>
      e.notes?.toLowerCase().includes('operations intervention') || e.notes?.toLowerCase().includes('exhausted')
    );
    assert.ok(exhaustedEvent, 'Exhaustion tracking event must be logged with operations intervention notice');
  });

  // Test 6: Decline and offer timeout correctly advance to another eligible CityOS rider
  await t.test('6. Decline and offer timeout correctly advance to another eligible CityOS rider', async () => {
    process.env.CITYDRIVE_NETWORK_POLICY = 'CITYOS_ONLY';
    await db.orm.public.LogisticsDriverProfile.where({ id: cityosDriver1.id }).update({ status: 'ONLINE', onboardingComplete: true });
    await db.orm.public.LogisticsDriverProfile.where({ id: cityosDriver2.id }).update({ status: 'ONLINE', onboardingComplete: true });
    setTestRiderTelemetry(cityosDriver1.id, { latitude: 4.9757, longitude: 8.3417, observedAt: Date.now() });
    setTestRiderTelemetry(cityosDriver2.id, { latitude: 4.9600, longitude: 8.3300, observedAt: Date.now() });

    const job = await db.orm.public.DeliveryJob.create({
      id: uuidv4(),
      providerId: cityosOrg.id,
      status: 'DISPATCHED',
      pickupAddress: '88 Marian Road, Calabar',
      dropoffAddress: 'UNICAL Main Gate, Calabar',
      pickupLat: 4.9757,
      pickupLng: 8.3417,
      dropoffLat: 4.9545,
      dropoffLng: 8.3438,
    });

    // Step A: First dispatch offered to Driver 1
    const dispatch1 = await db.orm.public.DeliveryDispatch.create({
      id: uuidv4(),
      deliveryJobId: job.id,
      providerId: cityosOrg.id,
      driverProfileId: cityosDriver1.id,
      status: 'OFFERED',
      attempt: 1,
    });

    // Step B: Driver 1 declines offer -> advances to Driver 2
    const { rejected, reassignment } = await declineDispatchOffer({
      dispatchId: dispatch1.id,
      driverProfileId: cityosDriver1.id,
      providerId: cityosOrg.id,
      reason: 'Punctured tire',
      policy: 'CITYOS_ONLY',
    });

    assert.strictEqual(rejected.status, 'REJECTED');
    assert.strictEqual(reassignment.reassigned, true);
    assert.strictEqual(reassignment.tier, 'CITYOS_NETWORK');
    assert.strictEqual(reassignment.driver.id, cityosDriver2.id, 'Must advance to second CityOS rider');

    // Step C: Driver 2 offer times out -> exhausts CityOS fleet without partner fallback
    const { expired, reassignment: reassignment2 } = await handleDispatchOfferTimeout({
      dispatchId: reassignment.dispatch.id,
      providerId: cityosOrg.id,
      policy: 'CITYOS_ONLY',
    });

    assert.strictEqual(expired.status, 'EXPIRED');
    assert.strictEqual(reassignment2.reassigned, false);
    assert.strictEqual(reassignment2.tier, 'NO_RIDER_AVAILABLE');
    assert.strictEqual(reassignment2.partnerFallbackEligible, false);
  });

  // Test 7: Concurrent dispatch workers cannot create conflicting active assignments
  await t.test('7. Concurrent dispatch workers cannot create conflicting active assignments', async () => {
    const cActor1 = await createTestActor(cityosOrg.id, 'STAFF');
    const cVeh1 = await db.orm.public.LogisticsVehicle.create({
      id: uuidv4(),
      providerId: cityosOrg.id,
      type: 'MOTORCYCLE',
      licensePlate: 'CR-CONCUR-01',
      status: 'ACTIVE',
    });
    const cDriver1 = await db.orm.public.LogisticsDriverProfile.create({
      id: uuidv4(),
      personId: cActor1.person.id,
      providerId: cityosOrg.id,
      status: 'ONLINE',
      onboardingComplete: true,
      currentVehicleId: cVeh1.id,
    });
    setTestRiderTelemetry(cDriver1.id, { latitude: 4.9757, longitude: 8.3417, observedAt: Date.now() });

    const cActor2 = await createTestActor(cityosOrg.id, 'STAFF');
    const cVeh2 = await db.orm.public.LogisticsVehicle.create({
      id: uuidv4(),
      providerId: cityosOrg.id,
      type: 'MOTORCYCLE',
      licensePlate: 'CR-CONCUR-02',
      status: 'ACTIVE',
    });
    const cDriver2 = await db.orm.public.LogisticsDriverProfile.create({
      id: uuidv4(),
      personId: cActor2.person.id,
      providerId: cityosOrg.id,
      status: 'ONLINE',
      onboardingComplete: true,
      currentVehicleId: cVeh2.id,
    });
    setTestRiderTelemetry(cDriver2.id, { latitude: 4.9757, longitude: 8.3417, observedAt: Date.now() });

    const job = await db.orm.public.DeliveryJob.create({
      id: uuidv4(),
      providerId: cityosOrg.id,
      status: 'DISPATCHED',
      pickupAddress: 'Marian Road, Calabar',
      dropoffAddress: 'State Housing, Calabar',
    });

    const dispatch = await db.orm.public.DeliveryDispatch.create({
      id: uuidv4(),
      deliveryJobId: job.id,
      providerId: cityosOrg.id,
      status: 'OFFERED',
      attempt: 1,
    });

    const results = await Promise.allSettled([
      acceptDispatch({
        dispatchId: dispatch.id,
        driverProfileId: cDriver1.id,
        providerId: cityosOrg.id,
      }),
      acceptDispatch({
        dispatchId: dispatch.id,
        driverProfileId: cDriver2.id,
        providerId: cityosOrg.id,
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    assert.strictEqual(fulfilled.length, 1, 'Exactly one concurrent accept must succeed');
    assert.strictEqual(rejected.length, 1, 'The competing worker must be rejected');

    const assignments = await db.orm.public.DeliveryAssignment.where({ deliveryJobId: job.id }).all();
    const activeAssignments = assignments.filter((a: any) => ['PENDING', 'ACCEPTED'].includes(a.status));
    assert.strictEqual(activeAssignments.length, 1, 'Database must enforce exactly one active assignment');

    for (const a of activeAssignments) {
      await db.orm.public.DeliveryAssignment.where({ id: a.id }).update({ status: 'COMPLETED' });
    }
  });

  // Test 8: Private CityDrive Business jobs never enter shared network dispatch
  await t.test('8. Private CityDrive Business jobs never enter shared network dispatch', async () => {
    process.env.CITYDRIVE_NETWORK_POLICY = 'CITYOS_ONLY';
    const privateJob = await db.orm.public.DeliveryJob.create({
      id: uuidv4(),
      providerId: privateMerchantOrg.id,
      status: 'CREATED',
      pickupAddress: 'Marian Supermarket, Calabar',
      dropoffAddress: 'Diamond Hill, Calabar',
    });

    // Calling dispatchNetworkJob on a private merchant job must throw LogisticsDomainError
    await assert.rejects(
      async () => {
        await dispatchNetworkJob({
          deliveryJobId: privateJob.id,
        });
      },
      (err: any) => err instanceof LogisticsDomainError && err.message.includes('Private CityDrive Business delivery')
    );

    // Private merchant driver must never appear in shared network candidate pool
    const candidates = await findNetworkCandidates({
      deliveryJobId: privateJob.id,
    });
    assert.strictEqual(
      candidates.candidates.some((c: any) => c.id === privateMerchantDriver.id),
      false,
      'Private merchant driver must never be pooled into network candidates'
    );
  });

  // Test 9: Unauthorized users cannot change provider eligibility or approve riders
  await t.test('9. Unauthorized users cannot change provider eligibility or approve riders', async () => {
    // Non-member actor
    const rogueActor = await createTestActor();
    setActiveUserToken(rogueActor.token);

    await assert.rejects(
      async () => {
        await setNetworkParticipation({
          providerId: cityosOrg.id,
          isParticipant: true,
        });
      },
      (err: any) => err.message.includes('FORBIDDEN') || err.message.includes('UNAUTHORIZED')
    );

    // Rogue actor cannot check in for another driver
    await assert.rejects(
      async () => {
        await checkInRider({
          driverProfileId: cityosDriver1.id,
          latitude: 4.9757,
          longitude: 8.3417,
        });
      },
      (err: any) => err instanceof LogisticsDomainError && err.message.includes('UNAUTHORIZED')
    );

    setActiveUserToken(null);
  });

  // Test 10: Address, pricing, payment, tracking, and operations admin regression suites continue to pass
  await t.test('10. Address, pricing, payment, tracking, and operations admin regression suites continue to pass', async () => {
    // A. Serviceability in Calabar Municipal and Calabar South
    assert.strictEqual(isPointServiceable({ latitude: 4.9757, longitude: 8.3417 }), true); // Marian Road
    assert.strictEqual(isPointServiceable({ latitude: 4.9450, longitude: 8.3250 }), true); // Anantigha, Calabar South
    assert.strictEqual(isPointServiceable({ latitude: 6.4500, longitude: 3.4000 }), false); // Lagos (outside coverage)

    // B. Delivery Quote calculation
    const pricingJob = await db.orm.public.DeliveryJob.create({
      id: uuidv4(),
      providerId: cityosOrg.id,
      status: 'REQUESTED',
      pickupAddress: 'Marian Road, Calabar',
      dropoffAddress: 'State Housing, Calabar',
    });
    const quote = await calculateDeliveryQuote({
      deliveryJobId: pricingJob.id,
      providerId: cityosOrg.id,
      distanceKm: 5.5,
      weightKg: 2.0,
      priority: false,
      idempotencyKey: `quote-idemp-${uuidv4()}`,
    });
    assert.ok(Number(quote.total) > 0);
    assert.strictEqual(quote.pricingVersion, 1);

    // C. Settlement idempotency
    const job = await db.orm.public.DeliveryJob.create({
      id: uuidv4(),
      providerId: cityosOrg.id,
      status: 'COMPLETED',
      pickupAddress: 'Marian Road, Calabar',
      dropoffAddress: 'State Housing, Calabar',
    });
    await db.orm.public.DeliveryQuote.create({
      id: uuidv4(),
      deliveryJobId: job.id,
      providerId: cityosOrg.id,
      status: 'ACCEPTED',
      pricingVersion: 1,
      currency: 'NGN',
      baseCharge: '1000.00' as any,
      distanceCharge: '500.00' as any,
      subtotal: '1500.00' as any,
      total: '1500.00' as any,
    });
    const adminActor = await createTestActor(cityosOrg.id, 'ADMIN');
    setActiveUserToken(adminActor.token);

    const settlementIdemKey = `settle-${uuidv4()}`;
    const s1 = await settleDelivery({
      deliveryJobId: job.id,
      providerId: cityosOrg.id,
      idempotencyKey: settlementIdemKey,
    });
    const s2 = await settleDelivery({
      deliveryJobId: job.id,
      providerId: cityosOrg.id,
      idempotencyKey: settlementIdemKey,
    });
    assert.strictEqual(s1.id, s2.id, 'Settlement creation must be strictly idempotent');
    setActiveUserToken(null);

    // D. Operations Admin Functions
    const audit = await getDeliveryDispatchAudit(job.id);
    assert.strictEqual(audit.deliveryJobId, job.id);
    assert.ok(Array.isArray(audit.dispatches));
    assert.ok(Array.isArray(audit.trackingEvents));

    // E. Operations Escalation
    const issueJob = await db.orm.public.DeliveryJob.create({
      id: uuidv4(),
      providerId: cityosOrg.id,
      status: 'DISPATCHED',
      pickupAddress: 'Marian Road, Calabar',
      dropoffAddress: 'State Housing, Calabar',
    });
    const escalated = await escalateDeliveryIssue({
      deliveryJobId: issueJob.id,
      reason: 'Recipient unreachable after 3 attempts',
      notes: 'Customer phone switched off',
    });
    assert.strictEqual(escalated.success, true);
    assert.strictEqual(escalated.status, 'FAILED');
  });
});
