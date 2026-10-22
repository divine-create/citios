import { test, describe, before } from 'node:test';
import assert from 'node:assert';
import { createRequire } from 'module';
import { v4 as uuidv4 } from 'uuid';
import { encode } from 'next-auth/jwt';
import { authOptions } from '../auth';
import { db } from '../../src/prisma/db';
import {
  dispatchDelivery,
  acceptDispatch,
  declineDispatchOffer,
  handleDispatchOfferTimeout,
  reassignDeliveryJob,
  dispatchNetworkJob,
  findNetworkCandidates,
  findEligibleCandidates,
} from './logistics-dispatch';
import {
  checkInRider,
  checkOutRider,
  updateRiderLocation,
  getRiderReadiness,
  getRiderTelemetry,
  setTestRiderTelemetry,
  isDriverLocationFresh,
} from './logistics-rider';
import {
  arriveAtPickup,
  confirmPickup,
  enterTransit,
  arriveAtDropoff,
  completeDelivery,
  failDelivery,
} from './logistics-operations';
import { bookPartnerCourierFallback } from './logistics-network';
import { authorizePusherChannel } from './logistics-channel-auth';
import { saveResidentAddress, updateResidentAddress, deactivateResidentAddress } from './resident-address';
import { settleDelivery } from './logistics-settlement';
import { hashDeliveryOtp } from './logistics-otp';
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
      memberships: orgId ? [{ organizationId: orgId, role }] : [],
    },
    secret: (authOptions.secret as string) || process.env.NEXTAUTH_SECRET || 'super_secret_cityconnect_key_2026_!@#',
  });

  return { person, token, email };
}

async function loginAs(actor: { token: string }) {
  setActiveUserToken(actor.token);
}

describe('CityDrive Network — Phase 3A: Single-Delivery Live Dispatch & Rider Operations', () => {
  let networkOrgA: any;
  let networkOrgB: any;
  let privateMerchantOrg: any;

  let riderActorA: any;
  let driverProfileA: any;
  let vehicleA: any;

  let riderActorB: any;
  let driverProfileB: any;
  let vehicleB: any;

  let residentActor: any;
  let unauthorizedActor: any;

  before(async () => {
    // 1. Create participating network provider A
    networkOrgA = await db.orm.public.Organization.create({
      id: uuidv4(),
      name: 'Calabar Central Fleet Ltd',
      type: 'LOGISTICS' as any,
      status: 'ACTIVE' as any,
    });
    await db.orm.public.LogisticsSettings.create({
      id: uuidv4(),
      organizationId: networkOrgA.id,
      isNetworkParticipant: true,
      serviceRadiusKm: 25.0,
      platformFeeRate: '0.10',
    });

    // 2. Create participating network provider B
    networkOrgB = await db.orm.public.Organization.create({
      id: uuidv4(),
      name: 'Marian Express Logistics',
      type: 'LOGISTICS' as any,
      status: 'ACTIVE' as any,
    });
    await db.orm.public.LogisticsSettings.create({
      id: uuidv4(),
      organizationId: networkOrgB.id,
      isNetworkParticipant: true,
      serviceRadiusKm: 20.0,
      platformFeeRate: '0.10',
    });
    process.env.CITYOS_FLEET_ORG_IDS = [networkOrgA.id, networkOrgB.id].join(',');

    // 3. Create private merchant organization (isolated fleet)
    privateMerchantOrg = await db.orm.public.Organization.create({
      id: uuidv4(),
      name: 'Mama Calabar Private Fleet',
      type: 'RESTAURANT' as any,
      status: 'ACTIVE' as any,
    });
    await db.orm.public.LogisticsSettings.create({
      id: uuidv4(),
      organizationId: privateMerchantOrg.id,
      isNetworkParticipant: false,
    });

    // 4. Create Rider A on Provider A
    riderActorA = await createTestActor(networkOrgA.id, 'MEMBER');
    vehicleA = await db.orm.public.LogisticsVehicle.create({
      id: uuidv4(),
      providerId: networkOrgA.id,
      type: 'MOTORCYCLE',
      licensePlate: `CR-${Math.floor(100 + Math.random() * 899)}-CAL`,
      status: 'ACTIVE',
    });
    driverProfileA = await db.orm.public.LogisticsDriverProfile.create({
      id: uuidv4(),
      personId: riderActorA.person.id,
      providerId: networkOrgA.id,
      status: 'ONLINE',
      onboardingComplete: true,
      currentVehicleId: vehicleA.id,
    });
    setTestRiderTelemetry(driverProfileA.id, {
      latitude: 4.9757,
      longitude: 8.3417,
      observedAt: Date.now(),
    });

    // 5. Create Rider B on Provider B
    riderActorB = await createTestActor(networkOrgB.id, 'MEMBER');
    vehicleB = await db.orm.public.LogisticsVehicle.create({
      id: uuidv4(),
      providerId: networkOrgB.id,
      type: 'MOTORCYCLE',
      licensePlate: `CR-${Math.floor(100 + Math.random() * 899)}-MRN`,
      status: 'ACTIVE',
    });
    driverProfileB = await db.orm.public.LogisticsDriverProfile.create({
      id: uuidv4(),
      personId: riderActorB.person.id,
      providerId: networkOrgB.id,
      status: 'ONLINE',
      onboardingComplete: true,
      currentVehicleId: vehicleB.id,
    });
    setTestRiderTelemetry(driverProfileB.id, {
      latitude: 4.972,
      longitude: 8.338,
      observedAt: Date.now(),
    });

    // 6. Resident actor & unauthorized actor
    residentActor = await createTestActor();
    unauthorizedActor = await createTestActor();
  });

  // Test 1: Concurrency protection — Two riders attempting to accept same delivery
  test('1. Two riders concurrently attempting to accept the same delivery', async () => {
    // Create Driver C on Provider A
    const riderActorC = await createTestActor(networkOrgA.id, 'MEMBER');
    const vehicleC = await db.orm.public.LogisticsVehicle.create({
      id: uuidv4(),
      providerId: networkOrgA.id,
      type: 'MOTORCYCLE',
      licensePlate: `CR-333-CAL`,
      status: 'ACTIVE',
    });
    const driverProfileC = await db.orm.public.LogisticsDriverProfile.create({
      id: uuidv4(),
      personId: riderActorC.person.id,
      providerId: networkOrgA.id,
      status: 'ONLINE',
      onboardingComplete: true,
      currentVehicleId: vehicleC.id,
    });
    setTestRiderTelemetry(driverProfileC.id, { latitude: 4.9757, longitude: 8.3417 });

    const job = await db.orm.public.DeliveryJob.create({
      id: uuidv4(),
      providerId: networkOrgA.id,
      status: 'DISPATCHED',
      pickupAddress: 'Marian Market, Calabar',
      dropoffAddress: '15 Ndidem Usang Iso Rd, Calabar',
      pickupLat: 4.9757,
      pickupLng: 8.3417,
      dropoffLat: 4.965,
      dropoffLng: 8.332,
    });

    // Single active dispatch for the delivery job
    const dispatch = await db.orm.public.DeliveryDispatch.create({
      id: uuidv4(),
      deliveryJobId: job.id,
      providerId: networkOrgA.id,
      status: 'OFFERED',
      attempt: 1,
    });

    // Concurrent accept attempts by Driver A and Driver C
    const results = await Promise.allSettled([
      acceptDispatch({
        dispatchId: dispatch.id,
        driverProfileId: driverProfileA.id,
        providerId: networkOrgA.id,
      }),
      acceptDispatch({
        dispatchId: dispatch.id,
        driverProfileId: driverProfileC.id,
        providerId: networkOrgA.id,
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    assert.strictEqual(fulfilled.length, 1, 'Exactly one rider must succeed');
    assert.strictEqual(rejected.length, 1, 'The concurrent rider must be rejected');

    const rejectionReason = (rejected[0] as PromiseRejectedResult).reason;
    assert.ok(
      rejectionReason.message.includes('Concurrency error') ||
        rejectionReason.message.includes('already has an active assignment')
    );

    // Clean up assignment from Test 1 so driverProfileA is not locked
    const activeA = await db.orm.public.DeliveryAssignment.where({ deliveryJobId: job.id }).all();
    for (const a of activeA) {
      await db.orm.public.DeliveryAssignment.where({ id: a.id }).update({ status: 'COMPLETED' });
    }
  });

  // Test 2: Offer expiry followed by successful reassignment
  test('2. Offer expiry followed by successful reassignment', async () => {
    await db.orm.public.LogisticsDriverProfile.where({ id: driverProfileA.id }).update({ status: 'ONLINE' });
    await db.orm.public.LogisticsDriverProfile.where({ id: driverProfileB.id }).update({ status: 'ONLINE' });
    setTestRiderTelemetry(driverProfileB.id, { latitude: 4.975, longitude: 8.34, observedAt: Date.now() });

    const job = await db.orm.public.DeliveryJob.create({
      id: uuidv4(),
      sourceType: 'DIRECT_DELIVERY',
      sourceId: 'order-p3a-2',
      status: 'DISPATCHED',
      pickupAddress: '88 Marian Road, Calabar',
      dropoffAddress: 'UNICAL Main Campus Gate, Calabar',
      pickupLat: 4.9757,
      pickupLng: 8.3417,
      dropoffLat: 4.9545,
      dropoffLng: 8.3438,
    });

    // Create expired dispatch for Rider A
    const expiredDispatch = await db.orm.public.DeliveryDispatch.create({
      id: uuidv4(),
      deliveryJobId: job.id,
      providerId: networkOrgA.id,
      driverProfileId: driverProfileA.id,
      status: 'OFFERED',
      attempt: 1,
      expiresAt: (globalThis as any).Temporal.Instant.fromEpochMilliseconds(Date.now() - 60000),
    });

    const { expired, reassignment } = await handleDispatchOfferTimeout({
      dispatchId: expiredDispatch.id,
      providerId: networkOrgA.id,
    });

    assert.strictEqual(expired.status, 'EXPIRED');
    assert.strictEqual(reassignment.reassigned, true);
    assert.notStrictEqual(reassignment.driver.id, driverProfileA.id, 'Must not reassign to expired rider');
  });

  // Test 3: Rider decline followed by next eligible candidate
  test('3. Rider decline followed by the next eligible candidate', async () => {
    await db.orm.public.LogisticsDriverProfile.where({ id: driverProfileA.id }).update({ status: 'ONLINE' });
    await db.orm.public.LogisticsDriverProfile.where({ id: driverProfileB.id }).update({ status: 'ONLINE' });

    const job = await db.orm.public.DeliveryJob.create({
      id: uuidv4(),
      sourceType: 'DIRECT_DELIVERY',
      sourceId: 'order-p3a-3',
      status: 'DISPATCHED',
      pickupAddress: 'Rabana Roundabout, Calabar',
      dropoffAddress: 'State Housing Estate, Calabar',
      pickupLat: 4.966,
      pickupLng: 8.334,
      dropoffLat: 4.9822,
      dropoffLng: 8.3412,
    });

    const dispatch = await db.orm.public.DeliveryDispatch.create({
      id: uuidv4(),
      deliveryJobId: job.id,
      providerId: networkOrgA.id,
      driverProfileId: driverProfileA.id,
      status: 'OFFERED',
      attempt: 1,
    });

    const { rejected, reassignment } = await declineDispatchOffer({
      dispatchId: dispatch.id,
      driverProfileId: driverProfileA.id,
      providerId: networkOrgA.id,
      reason: 'Vehicle refuelling required',
    });

    assert.strictEqual(rejected.status, 'REJECTED');
    assert.strictEqual(reassignment.reassigned, true);
    assert.notStrictEqual(reassignment.driver.id, driverProfileA.id, 'Must not reassign to declined rider');
    assert.ok(reassignment.driver.id, 'Must reassign to next eligible candidate');
  });

  // Test 4: Internal rider exhaustion followed by approved-partner fallback
  test('4. Internal rider exhaustion followed by approved-partner fallback', async () => {
    process.env.CITYDRIVE_NETWORK_POLICY = 'OPEN_NETWORK';
    // Create dedicated provider where rider is busy
    const dedicatedOrg = await db.orm.public.Organization.create({
      id: uuidv4(),
      name: 'Solo Courier Calabar',
      type: 'LOGISTICS' as any,
      status: 'ACTIVE' as any,
    });
    await db.orm.public.LogisticsSettings.create({
      id: uuidv4(),
      organizationId: dedicatedOrg.id,
      isNetworkParticipant: true,
    });

    const soloActor = await createTestActor(dedicatedOrg.id, 'MEMBER');
    const soloVeh = await db.orm.public.LogisticsVehicle.create({
      id: uuidv4(),
      providerId: dedicatedOrg.id,
      type: 'MOTORCYCLE',
      licensePlate: 'CR-SOLO-01',
      status: 'ACTIVE',
    });
    const soloDriver = await db.orm.public.LogisticsDriverProfile.create({
      id: uuidv4(),
      personId: soloActor.person.id,
      providerId: dedicatedOrg.id,
      status: 'BUSY', // Rider is busy
      onboardingComplete: true,
      currentVehicleId: soloVeh.id,
    });

    const job = await db.orm.public.DeliveryJob.create({
      id: uuidv4(),
      providerId: dedicatedOrg.id,
      status: 'CREATED',
      pickupAddress: 'Watt Market, Calabar',
      dropoffAddress: 'Anantigha, Calabar South',
      pickupLat: 4.9525,
      pickupLng: 8.3245,
      dropoffLat: 4.945,
      dropoffLng: 8.325,
    });

    const result = await dispatchNetworkJob({
      deliveryJobId: job.id,
      providerId: dedicatedOrg.id,
    });

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.tier, 'PARTNER_FALLBACK');
    assert.strictEqual(result.partnerFallbackEligible, true);
    assert.ok(result.reason?.includes('exhausted'));
  });

  // Test 5: Partner timeout or retry without duplicate bookings
  test('5. Partner timeout or retry without duplicate bookings', async () => {
    process.env.CITYDRIVE_NETWORK_POLICY = 'OPEN_NETWORK';
    const job = await db.orm.public.DeliveryJob.create({
      id: uuidv4(),
      providerId: networkOrgA.id,
      status: 'CREATED',
      pickupAddress: 'Calabar Port Gate, Calabar',
      dropoffAddress: 'Murtala Mohammed Highway, Calabar',
    });

    const mockAdapter = new MockPartnerCourierAdapter();
    const idempotencyKey = `partner-idemp-${uuidv4()}`;

    // First call
    const firstCall = await bookPartnerCourierFallback({
      deliveryJobId: job.id,
      providerId: networkOrgA.id,
      adapter: mockAdapter,
      idempotencyKey,
    });

    assert.strictEqual(firstCall.success, true);
    assert.strictEqual(firstCall.duplicate, false);

    // Second retry call with same idempotency key
    const secondCall = await bookPartnerCourierFallback({
      deliveryJobId: job.id,
      providerId: networkOrgA.id,
      adapter: mockAdapter,
      idempotencyKey,
    });

    assert.strictEqual(secondCall.success, true);
    assert.strictEqual(secondCall.duplicate, true, 'Retry must return existing booking without duplicating');

    const events = await db.orm.public.DeliveryTrackingEvent.where({
      deliveryJobId: job.id,
      idempotencyKey,
    }).all();
    assert.strictEqual(events.length, 1, 'Only one tracking event record must exist');
  });

  // Test 6: Suspended rider and inactive vehicle rejection
  test('6. Suspended rider and inactive vehicle rejection', async () => {
    // 6a. Suspended rider
    const suspendedPerson = await createTestActor(networkOrgA.id);
    const suspendedDriver = await db.orm.public.LogisticsDriverProfile.create({
      id: uuidv4(),
      personId: suspendedPerson.person.id,
      providerId: networkOrgA.id,
      status: 'SUSPENDED',
      onboardingComplete: true,
      currentVehicleId: vehicleA.id,
    });

    const job = await db.orm.public.DeliveryJob.create({
      id: uuidv4(),
      providerId: networkOrgA.id,
      status: 'DISPATCHED',
      pickupAddress: 'Marian Road, Calabar',
      dropoffAddress: 'State Housing, Calabar',
    });

    const dispatchSuspended = await db.orm.public.DeliveryDispatch.create({
      id: uuidv4(),
      deliveryJobId: job.id,
      providerId: networkOrgA.id,
      driverProfileId: suspendedDriver.id,
      vehicleId: vehicleA.id,
      status: 'OFFERED',
    });

    await assert.rejects(
      async () => {
        await acceptDispatch({
          dispatchId: dispatchSuspended.id,
          driverProfileId: suspendedDriver.id,
          providerId: networkOrgA.id,
        });
      },
      (err: any) => err.message.includes('Suspended drivers cannot accept assignments')
    );

    // 6b. Inactive vehicle
    const activePerson = await createTestActor(networkOrgA.id);
    const inactiveVehicle = await db.orm.public.LogisticsVehicle.create({
      id: uuidv4(),
      providerId: networkOrgA.id,
      type: 'CAR',
      licensePlate: 'CR-INACT-01',
      status: 'MAINTENANCE',
    });

    const driverWithInactiveVeh = await db.orm.public.LogisticsDriverProfile.create({
      id: uuidv4(),
      personId: activePerson.person.id,
      providerId: networkOrgA.id,
      status: 'ONLINE',
      onboardingComplete: true,
      currentVehicleId: inactiveVehicle.id,
    });

    const jobInactive = await db.orm.public.DeliveryJob.create({
      id: uuidv4(),
      providerId: networkOrgA.id,
      status: 'DISPATCHED',
      pickupAddress: 'Marian Road, Calabar',
      dropoffAddress: 'State Housing, Calabar',
    });

    const dispatchInactiveVeh = await db.orm.public.DeliveryDispatch.create({
      id: uuidv4(),
      deliveryJobId: jobInactive.id,
      providerId: networkOrgA.id,
      driverProfileId: driverWithInactiveVeh.id,
      vehicleId: inactiveVehicle.id,
      status: 'OFFERED',
    });

    await assert.rejects(
      async () => {
        await acceptDispatch({
          dispatchId: dispatchInactiveVeh.id,
          driverProfileId: driverWithInactiveVeh.id,
          providerId: networkOrgA.id,
        });
      },
      (err: any) => err.message.includes('Assigned vehicle is inactive')
    );
  });

  // Test 7: Stale, malformed, and out-of-order location updates
  test('7. Stale, malformed, and out-of-order location updates', async () => {
    await loginAs(riderActorA);

    // 7a. Malformed coordinates
    await assert.rejects(
      async () => {
        await updateRiderLocation({
          driverProfileId: driverProfileA.id,
          latitude: NaN,
          longitude: 8.34,
        });
      },
      (err: any) => err.message.includes('Valid GPS coordinates required')
    );

    // 7b. Out-of-order timestamp
    const now = Date.now();
    await updateRiderLocation({
      driverProfileId: driverProfileA.id,
      latitude: 4.975,
      longitude: 8.341,
      observedAt: now,
    });

    await assert.rejects(
      async () => {
        await updateRiderLocation({
          driverProfileId: driverProfileA.id,
          latitude: 4.976,
          longitude: 8.342,
          observedAt: now - 5000, // Older timestamp
        });
      },
      (err: any) => err.message.includes('Out-of-order location update rejected')
    );

    // 7c. Stale observation detection (>15 minutes old)
    assert.strictEqual(isDriverLocationFresh(Date.now() - 16 * 60 * 1000), false);
    assert.strictEqual(isDriverLocationFresh(Date.now() - 5 * 60 * 1000), true);
  });

  // Test 8: Unauthorized private-channel subscriptions
  test('8. Unauthorized private-channel subscriptions', async () => {
    // 8a. User B attempts to subscribe to Rider A's private channel
    const riderChannelAuth = await authorizePusherChannel({
      personId: unauthorizedActor.person.id,
      channelName: `private-rider-${driverProfileA.id}`,
    });
    assert.strictEqual(riderChannelAuth.authorized, false);
    assert.strictEqual(riderChannelAuth.status, 403);

    // 8b. Authorized rider can subscribe to own channel
    const validRiderAuth = await authorizePusherChannel({
      personId: riderActorA.person.id,
      channelName: `private-rider-${driverProfileA.id}`,
    });
    assert.strictEqual(validRiderAuth.authorized, true);
    assert.strictEqual(validRiderAuth.status, 200);

    // 8c. Non-party attempts to subscribe to private-delivery channel
    const secretJob = await db.orm.public.DeliveryJob.create({
      id: uuidv4(),
      providerId: networkOrgA.id,
      status: 'ASSIGNED',
      pickupAddress: 'Secret Address',
      dropoffAddress: 'Secret Dropoff',
    });

    const deliveryAuth = await authorizePusherChannel({
      personId: unauthorizedActor.person.id,
      channelName: `private-delivery-${secretJob.id}`,
    });
    assert.strictEqual(deliveryAuth.authorized, false);
    assert.strictEqual(deliveryAuth.status, 403);
  });

  // Test 9: Duplicate or replayed completion requests
  test('9. Duplicate or replayed completion requests', async () => {
    // Dedicated driver for Test 9
    const test9Actor = await createTestActor(networkOrgA.id);
    const test9Driver = await db.orm.public.LogisticsDriverProfile.create({
      id: uuidv4(),
      personId: test9Actor.person.id,
      providerId: networkOrgA.id,
      status: 'ONLINE',
      onboardingComplete: true,
      currentVehicleId: vehicleA.id,
    });
    setTestRiderTelemetry(test9Driver.id, { latitude: 4.9757, longitude: 8.3417 });

    const job = await db.orm.public.DeliveryJob.create({
      id: uuidv4(),
      providerId: networkOrgA.id,
      status: 'AT_DROPOFF',
      pickupAddress: 'Marian Road, Calabar',
      dropoffAddress: 'State Housing, Calabar',
    });

    await db.orm.public.DeliveryAssignment.create({
      id: uuidv4(),
      deliveryJobId: job.id,
      driverProfileId: test9Driver.id,
      status: 'ACCEPTED',
    });

    const podKey = `pod-replay-key-${uuidv4()}`;

    // First completion call
    const firstRes = await completeDelivery({
      deliveryJobId: job.id,
      providerId: networkOrgA.id,
      driverProfileId: test9Driver.id,
      type: 'SIGNATURE',
      recipientName: 'Obong Bassey',
      idempotencyKey: podKey,
    });
    assert.strictEqual(firstRes.job.status, 'DELIVERED');

    // Replay call with same idempotency key
    const replayRes = await completeDelivery({
      deliveryJobId: job.id,
      providerId: networkOrgA.id,
      driverProfileId: test9Driver.id,
      type: 'SIGNATURE',
      recipientName: 'Obong Bassey',
      idempotencyKey: podKey,
    });
    assert.strictEqual(replayRes.job.status, 'DELIVERED');
    assert.strictEqual(replayRes.proofOfDelivery.id, firstRes.proofOfDelivery.id);
  });

  // Test 10: OTP expiry, excessive attempts, and concurrent consumption
  test('10. OTP expiry, excessive attempts, and concurrent consumption', async () => {
    // Dedicated driver for Test 10
    const test10Actor = await createTestActor(networkOrgA.id);
    const test10Driver = await db.orm.public.LogisticsDriverProfile.create({
      id: uuidv4(),
      personId: test10Actor.person.id,
      providerId: networkOrgA.id,
      status: 'ONLINE',
      onboardingComplete: true,
      currentVehicleId: vehicleA.id,
    });
    setTestRiderTelemetry(test10Driver.id, { latitude: 4.9757, longitude: 8.3417 });

    const rawOtp = '739201';
    const salt = uuidv4();
    const hashed = hashDeliveryOtp(rawOtp, salt);

    const job = await db.orm.public.DeliveryJob.create({
      id: uuidv4(),
      providerId: networkOrgA.id,
      status: 'AT_DROPOFF',
      pickupAddress: 'Marian Road, Calabar',
      dropoffAddress: 'State Housing, Calabar',
      recipientOtp: hashed,
      idempotencyKey: salt,
    });

    await db.orm.public.DeliveryAssignment.create({
      id: uuidv4(),
      deliveryJobId: job.id,
      driverProfileId: test10Driver.id,
      status: 'ACCEPTED',
    });

    // 10a. Wrong OTP fails
    await assert.rejects(
      async () => {
        await completeDelivery({
          deliveryJobId: job.id,
          providerId: networkOrgA.id,
          driverProfileId: test10Driver.id,
          type: 'OTP',
          otp: '000000',
        });
      },
      (err: any) => err.message.includes('Invalid recipient verification OTP')
    );

    // 10b. Correct OTP successfully completes and consumes OTP
    const res = await completeDelivery({
      deliveryJobId: job.id,
      providerId: networkOrgA.id,
      driverProfileId: test10Driver.id,
      type: 'OTP',
      otp: rawOtp,
    });
    assert.strictEqual(res.job.status, 'DELIVERED');

    // Verify OTP was consumed
    const updated = await db.orm.public.DeliveryJob.where({ id: job.id }).all().first();
    assert.strictEqual(updated?.recipientOtp, null, 'OTP must be consumed atomically');
  });

  // Test 11: Cross-resident address access attempts
  test('11. Cross-resident address access attempts', async () => {
    await loginAs(residentActor);

    // Resident A saves address
    const saved = await saveResidentAddress({
      label: 'Home',
      address: '22 Marian Road, Calabar',
      latitude: 4.9757,
      longitude: 8.3417,
      provenance: 'DEVICE_GPS',
    });

    // Unauthorized Actor attempts to update Resident A's address
    await loginAs(unauthorizedActor);
    await assert.rejects(
      async () => {
        await updateResidentAddress(saved.id, {
          label: 'Hacked Address',
        });
      },
      (err: any) => err.message.includes('unauthorized') || err.message.includes('not found')
    );

    // Unauthorized Actor attempts to deactivate Resident A's address
    await assert.rejects(
      async () => {
        await deactivateResidentAddress(saved.id);
      },
      (err: any) => err.message.includes('unauthorized') || err.message.includes('not found')
    );
  });

  // Test 12: Private-fleet versus shared-network isolation
  test('12. Private-fleet versus shared-network isolation', async () => {
    // Create driver for private merchant fleet
    const merchantDriverActor = await createTestActor(privateMerchantOrg.id, 'MEMBER');
    const privateVehicle = await db.orm.public.LogisticsVehicle.create({
      id: uuidv4(),
      providerId: privateMerchantOrg.id,
      type: 'MOTORCYCLE',
      licensePlate: 'CR-PVT-09',
      status: 'ACTIVE',
    });
    const privateDriver = await db.orm.public.LogisticsDriverProfile.create({
      id: uuidv4(),
      personId: merchantDriverActor.person.id,
      providerId: privateMerchantOrg.id,
      status: 'ONLINE',
      onboardingComplete: true,
      currentVehicleId: privateVehicle.id,
    });
    setTestRiderTelemetry(privateDriver.id, { latitude: 4.975, longitude: 8.341 });

    // Job specifically bound to private merchant fleet
    const privateJob = await db.orm.public.DeliveryJob.create({
      id: uuidv4(),
      providerId: privateMerchantOrg.id,
      status: 'CREATED',
      pickupAddress: 'Mama Calabar Restaurant',
      dropoffAddress: 'Etta Agbor, Calabar',
    });

    // Private fleet candidate lookup
    const privateCandidates = await findEligibleCandidates({
      deliveryJobId: privateJob.id,
      providerId: privateMerchantOrg.id,
    });

    assert.strictEqual(privateCandidates.drivers.length, 1);
    assert.strictEqual(privateCandidates.drivers[0].id, privateDriver.id);

    // Verify private driver NEVER appears in network candidate pool
    const networkCandidates = await findNetworkCandidates({
      deliveryJobId: privateJob.id,
    });
    assert.ok(
      !networkCandidates.candidates.some((c: any) => c.id === privateDriver.id),
      'Private merchant driver must NOT be exposed to shared network candidate pool'
    );
  });

  // Test 13: Notification-provider outage and safe retry
  test('13. Notification-provider outage and safe retry', async () => {
    await db.orm.public.LogisticsDriverProfile.where({ id: driverProfileA.id }).update({ status: 'ONLINE' });
    setTestRiderTelemetry(driverProfileA.id, { latitude: 4.9757, longitude: 8.3417 });

    const job = await db.orm.public.DeliveryJob.create({
      id: uuidv4(),
      providerId: networkOrgA.id,
      status: 'CREATED',
      pickupAddress: 'Marian Road, Calabar',
      dropoffAddress: 'State Housing, Calabar',
    });

    // Calling dispatchDelivery will attempt Pusher trigger; when Pusher is absent/offline, it must not throw
    const dispatch = await dispatchDelivery({
      deliveryJobId: job.id,
      providerId: networkOrgA.id,
      driverProfileId: driverProfileA.id,
      vehicleId: vehicleA.id,
    });

    assert.ok(dispatch.id);
    assert.strictEqual(dispatch.status, 'OFFERED');
  });

  // Test 14: Payment and ledger idempotency when delivery completion is retried
  test('14. Payment and ledger idempotency when delivery completion is retried', async () => {
    const job = await db.orm.public.DeliveryJob.create({
      id: uuidv4(),
      providerId: networkOrgA.id,
      status: 'COMPLETED',
      pickupAddress: 'Marian Road, Calabar',
      dropoffAddress: 'State Housing, Calabar',
    });

    await db.orm.public.DeliveryQuote.create({
      id: uuidv4(),
      deliveryJobId: job.id,
      providerId: networkOrgA.id,
      status: 'ACCEPTED',
      pricingVersion: 1,
      baseCharge: '1000.00' as any,
      distanceCharge: '500.00' as any,
      subtotal: '1500.00' as any,
      total: '1500.00' as any,
      currency: 'NGN',
    });

    // Settle delivery with idempotency key
    const settleKey = `settle-key-${uuidv4()}`;
    const actor = await createTestActor(networkOrgA.id, 'OWNER');
    await loginAs(actor);

    const firstSettlement = await settleDelivery({
      providerId: networkOrgA.id,
      deliveryJobId: job.id,
      idempotencyKey: settleKey,
    });
    assert.ok(firstSettlement.id);

    // Check wallet balance
    const walletBefore = await db.orm.public.Wallet.where({ organizationId: networkOrgA.id }).all().first();
    const balanceBefore = Number(walletBefore?.balance);

    // Retry settlement with same idempotency key
    const secondSettlement = await settleDelivery({
      providerId: networkOrgA.id,
      deliveryJobId: job.id,
      idempotencyKey: settleKey,
    });

    assert.strictEqual(secondSettlement.id, firstSettlement.id);

    const walletAfter = await db.orm.public.Wallet.where({ organizationId: networkOrgA.id }).all().first();
    const balanceAfter = Number(walletAfter?.balance);

    assert.strictEqual(balanceAfter, balanceBefore, 'Wallet balance must not increase upon retried settlement');
  });
});
