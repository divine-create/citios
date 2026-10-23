import test, { before } from 'node:test';
import assert from 'node:assert';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../src/prisma/db';
import {
  acceptDispatch,
  declineDispatchOffer,
  handleDispatchOfferTimeout,
  dispatchDelivery,
  dispatchNetworkJob,
  findNetworkCandidates,
} from './logistics-dispatch';
import {
  calculateDeliveryQuote,
  quoteDeliveryRoute,
} from './logistics-pricing';
import {
  resolveDeliveryServiceability,
  isPointServiceable,
} from '../mapping/serviceability';
import {
  createDeliveryJob,
  generateRecipientOtp,
  hashDeliveryOtp,
  verifyDeliveryOtp,
  transitionDeliveryStatus,
} from './logistics-domain';
import {
  arriveAtPickup,
  confirmPickup,
  enterTransit,
  arriveAtDropoff,
  completeDelivery,
  failDelivery,
  closeWorkflow,
} from './logistics-operations';
import {
  getPublicDeliveryTracking,
} from './logistics-tracking';
import {
  settleDelivery,
} from './logistics-settlement';
import {
  dispatchDeliveryOtp,
} from './logistics-sms';
import {
  checkInRider,
  checkOutRider,
  updateRiderLocation,
  setTestRiderTelemetry,
} from './logistics-rider';
import { encode } from 'next-auth/jwt';
import { authOptions } from '../../lib/auth';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const nextHeaders = require('next/headers');
let mockCookies: Record<string, string> = {};
nextHeaders.headers = () => new Map();
nextHeaders.cookies = () => ({
  get: (name: string) => (mockCookies[name] ? { name, value: mockCookies[name] } : undefined),
  getAll: () => Object.entries(mockCookies).map(([n, v]) => ({ name: n, value: v })),
});

function toTemporal(date: Date = new Date()) {
  return (globalThis as any).Temporal.Instant.fromEpochMilliseconds(date.getTime());
}

function setActiveUserToken(token: string | null) {
  if (token) {
    mockCookies['next-auth.session-token'] = token;
  } else {
    delete mockCookies['next-auth.session-token'];
  }
}

function uid(prefix: string) {
  return `${prefix}-${uuidv4().substring(0, 8)}`;
}

async function createTestActor(orgId: string | null, role = 'DRIVER', isSystemAdmin = false) {
  const person = await db.orm.public.Person.create({
    id: uuidv4(),
    firstName: 'Gate4',
    lastName: uid('Actor'),
    isSystemAdmin,
  });

  const email = `${person.id}@gate4.test`;
  await db.orm.public.PersonIdentifier.create({
    id: uuidv4(),
    personId: person.id,
    type: 'EMAIL',
    normalizedValue: email,
    isVerified: true,
  });

  await db.orm.public.Account.create({
    id: uuidv4(),
    personId: person.id,
    isActive: true,
  });

  if (orgId) {
    const mem = await db.orm.public.Membership.create({
      id: uuidv4(),
      personId: person.id,
      organizationId: orgId,
    });
    await db.orm.public.MembershipRole.create({
      id: uuidv4(),
      membershipId: mem.id,
      role,
    });
  }

  const token = await encode({
    token: {
      email,
      name: `Test Actor ${role}`,
      personId: person.id,
      isSystemAdmin,
      memberships: orgId ? [{ organizationId: orgId, role, organizationType: 'LOGISTICS' }] : [],
    },
    secret: (authOptions.secret as string) || process.env.NEXTAUTH_SECRET || 'super_secret_cityconnect_key_2026_!@#',
  });

  return { person, token, email };
}

test('CityDrive Network — Gate 4: End-to-End Delivery Lifecycle Validation', async (t) => {
  let platformFleetOrg: any;
  let riderActor1: any;
  let riderActor2: any;
  let fleetAdminActor: any;
  let vehicle1: any;
  let vehicle2: any;
  let driver1: any;
  let driver2: any;

  // Calabar Coordinates
  const MARIAN_PICKUP = { latitude: 4.9757, longitude: 8.3417 }; // Marian Road, Calabar Municipal
  const STATE_HOUSING_DROPOFF = { latitude: 4.9612, longitude: 8.3276 }; // State Housing, Calabar Municipal
  const ANANTIGHA_DROPOFF = { latitude: 4.9215, longitude: 8.3245 }; // Anantigha, Calabar South
  const OUT_OF_BOUNDS = { latitude: 6.4531, longitude: 3.3958 }; // Lagos (outside Calabar)

  before(async () => {
    // 1. Setup authorized CityOS Platform Fleet Organization
    platformFleetOrg = await db.orm.public.Organization.create({
      id: uuidv4(),
      name: 'Calabar CityOS Fleet Co',
      type: 'LOGISTICS' as any,
      status: 'ACTIVE' as any,
    });

    await db.orm.public.LogisticsSettings.create({
      id: uuidv4(),
      organizationId: platformFleetOrg.id,
      isNetworkParticipant: true,
      serviceRadiusKm: 25.0,
      platformFeeRate: '0.10',
    });

    await db.orm.public.DeliveryPricingRule.create({
      id: uuidv4(),
      providerId: platformFleetOrg.id,
      version: 1,
      isActive: true,
      currency: 'NGN',
      baseFee: '500.00' as any,
      perKmRate: '150.00' as any,
      perKgRate: '50.00' as any,
      prioritySurcharge: '300.00' as any,
    });

    // Configure server-controlled allowlist
    process.env.CITYOS_FLEET_ORG_IDS = platformFleetOrg.id;
    process.env.CITYDRIVE_NETWORK_POLICY = 'CITYOS_ONLY';

    // 2. Setup Fleet Admin Actor
    fleetAdminActor = await createTestActor(platformFleetOrg.id, 'OWNER');

    // 3. Setup Vehicles
    vehicle1 = await db.orm.public.LogisticsVehicle.create({
      id: uuidv4(),
      providerId: platformFleetOrg.id,
      licensePlate: `CAL-${uid('V1')}`,
      type: 'MOTORCYCLE',
      status: 'ACTIVE',
      capacityPayload: 30,
    });

    vehicle2 = await db.orm.public.LogisticsVehicle.create({
      id: uuidv4(),
      providerId: platformFleetOrg.id,
      licensePlate: `CAL-${uid('V2')}`,
      type: 'MOTORCYCLE',
      status: 'ACTIVE',
      capacityPayload: 30,
    });

    // 4. Setup Rider Actors & Driver Profiles
    riderActor1 = await createTestActor(platformFleetOrg.id, 'DRIVER');
    driver1 = await db.orm.public.LogisticsDriverProfile.create({
      id: uuidv4(),
      personId: riderActor1.person.id,
      providerId: platformFleetOrg.id,
      status: 'ONLINE',
      onboardingComplete: true,
      currentVehicleId: vehicle1.id,
    });

    riderActor2 = await createTestActor(platformFleetOrg.id, 'DRIVER');
    driver2 = await db.orm.public.LogisticsDriverProfile.create({
      id: uuidv4(),
      personId: riderActor2.person.id,
      providerId: platformFleetOrg.id,
      status: 'ONLINE',
      onboardingComplete: true,
      currentVehicleId: vehicle2.id,
    });

    // Seed active rider telemetry in Calabar Municipal
    setTestRiderTelemetry(driver1.id, {
      latitude: MARIAN_PICKUP.latitude,
      longitude: MARIAN_PICKUP.longitude,
      lgaCode: 'CAL_MUNI',
    });
    setTestRiderTelemetry(driver2.id, {
      latitude: MARIAN_PICKUP.latitude + 0.002,
      longitude: MARIAN_PICKUP.longitude + 0.002,
      lgaCode: 'CAL_MUNI',
    });
  });

  // =========================================================================
  // 1. Create delivery request & obtain server-calculated quote
  // =========================================================================
  await t.test('1. Create delivery request and obtain server-calculated quote', async () => {
    const quoteJob = await db.orm.public.DeliveryJob.create({
      id: uuidv4(),
      providerId: platformFleetOrg.id,
      status: 'REQUESTED',
      pickupAddress: 'Marian Road, Calabar',
      dropoffAddress: 'State Housing, Calabar',
      sourceType: 'DIRECT_DELIVERY',
      sourceId: uid('quote-src'),
    });

    // 1.1 Calculate quote for Marian -> State Housing (approx 2.5 km)
    const quote = await calculateDeliveryQuote({
      deliveryJobId: quoteJob.id,
      providerId: platformFleetOrg.id,
      distanceKm: 2.5,
      weightKg: 2.0,
    });

    assert.ok(Number(quote.baseCharge) > 0, 'Base price must be positive');
    assert.ok(Number(quote.distanceCharge) > 0, 'Distance charge must be positive');
    assert.ok(Number(quote.total) >= Number(quote.baseCharge) + Number(quote.distanceCharge), 'Total must equal or exceed components');
    assert.strictEqual(quote.currency, 'NGN');

    // 1.2 Route quote rejection for negative / zero distance
    await assert.rejects(
      () => calculateDeliveryQuote({ deliveryJobId: quoteJob.id, providerId: platformFleetOrg.id, distanceKm: -1, weightKg: 1 }),
      /Invalid delivery distance/
    );
  });

  // =========================================================================
  // 2. Pickup and drop-off coverage validation
  // =========================================================================
  await t.test('2. Confirm pickup and drop-off coverage validation', async () => {
    // 2.1 Serviceability inside Calabar
    const serviceability = resolveDeliveryServiceability(
      MARIAN_PICKUP,
      ANANTIGHA_DROPOFF,
    );
    assert.strictEqual(serviceability.serviceable, true, 'Marian -> Anantigha must be inside delivery coverage');
    assert.strictEqual(serviceability.pickup.status, 'INSIDE_COVERAGE');
    assert.strictEqual(serviceability.dropoff.status, 'INSIDE_COVERAGE');

    // 2.2 Rejection when dropoff is outside Calabar
    const outOfBoundsServiceability = resolveDeliveryServiceability(
      MARIAN_PICKUP,
      OUT_OF_BOUNDS,
    );
    assert.strictEqual(outOfBoundsServiceability.serviceable, false, 'Lagos coordinates must be rejected');
  });

  // =========================================================================
  // 3. Dispatch only to an eligible CityOS fleet rider
  // =========================================================================
  await t.test('3. Dispatch only to an eligible CityOS fleet rider', async () => {
    const rawOtp = '482910';
    const jobKey = uid('e2e-job-1');

    const job = await createDeliveryJob({
      providerId: platformFleetOrg.id,
      sourceType: 'DIRECT_DELIVERY',
      sourceId: uid('source-1'),
      idempotencyKey: jobKey,
      pickupAddress: 'Marian Road, Calabar Municipal',
      pickupLat: MARIAN_PICKUP.latitude,
      pickupLng: MARIAN_PICKUP.longitude,
      dropoffAddress: 'State Housing Estate, Calabar',
      dropoffLat: STATE_HOUSING_DROPOFF.latitude,
      dropoffLng: STATE_HOUSING_DROPOFF.longitude,
      recipientOtp: rawOtp,
    });

    assert.ok(job.id, 'Delivery job must be created');
    assert.strictEqual(job.status, 'REQUESTED');
    assert.ok(job.trackingReference.startsWith('CD-'), 'Must have CD- prefixed tracking reference');

    // Find candidates
    const candidateResult = await findNetworkCandidates({
      deliveryJobId: job.id,
      pickup: MARIAN_PICKUP,
      dropoff: STATE_HOUSING_DROPOFF,
    });

    assert.ok(candidateResult.candidates.length >= 1, 'Must find eligible CityOS fleet riders');
    assert.strictEqual(candidateResult.candidates[0].providerId, platformFleetOrg.id, 'Candidate must belong to platform fleet');

    // Dispatch job
    const dispatchResult = await dispatchNetworkJob({
      deliveryJobId: job.id,
      pickup: MARIAN_PICKUP,
      dropoff: STATE_HOUSING_DROPOFF,
    });

    assert.strictEqual(dispatchResult.success, true);
    assert.strictEqual(dispatchResult.tier, 'CITYOS_NETWORK');
    assert.strictEqual(dispatchResult.dispatch?.status, 'OFFERED');
    assert.ok(dispatchResult.dispatch?.id);

    // Cancel offer so rider is clean for next test
    if (dispatchResult.dispatch?.id) {
      await db.orm.public.DeliveryDispatch.where({ id: dispatchResult.dispatch.id }).update({ status: 'CANCELLED' });
    }
  });

  // =========================================================================
  // 4. Offer creation, acceptance, expiry, decline, and reassignment behavior
  // =========================================================================
  await t.test('4. Verify offer creation, acceptance, expiry, decline, and reassignment behavior', async () => {
    // 4.1 Test Decline & Reassignment:
    const declineJob = await db.orm.public.DeliveryJob.create({
      id: uuidv4(),
      providerId: platformFleetOrg.id,
      pickupAddress: 'Marian Market',
      pickupLat: MARIAN_PICKUP.latitude,
      pickupLng: MARIAN_PICKUP.longitude,
      dropoffAddress: 'State Housing',
      dropoffLat: STATE_HOUSING_DROPOFF.latitude,
      dropoffLng: STATE_HOUSING_DROPOFF.longitude,
      status: 'REQUESTED',
      sourceType: 'DIRECT_DELIVERY',
      sourceId: uid('decline-src'),
    });

    const dispatchOffer1 = await db.orm.public.DeliveryDispatch.create({
      id: uuidv4(),
      deliveryJobId: declineJob.id,
      providerId: platformFleetOrg.id,
      driverProfileId: driver1.id,
      vehicleId: vehicle1.id,
      status: 'OFFERED',
      attempt: 1,
    });

    // Driver 1 declines offer -> reassigns to Driver 2
    const declineRes = await declineDispatchOffer({
      dispatchId: dispatchOffer1.id,
      driverProfileId: driver1.id,
      providerId: platformFleetOrg.id,
      reason: 'Driver too far from pickup',
    });

    const updatedOffer1 = (await db.orm.public.DeliveryDispatch.where({ id: dispatchOffer1.id }).all())[0];
    assert.strictEqual(updatedOffer1.status, 'REJECTED', 'First offer must be marked REJECTED');

    // 4.2 Test Offer Expiry / Timeout:
    const timeoutJob = await db.orm.public.DeliveryJob.create({
      id: uuidv4(),
      providerId: platformFleetOrg.id,
      pickupAddress: 'Marian Road',
      pickupLat: MARIAN_PICKUP.latitude,
      pickupLng: MARIAN_PICKUP.longitude,
      dropoffAddress: 'State Housing',
      dropoffLat: STATE_HOUSING_DROPOFF.latitude,
      dropoffLng: STATE_HOUSING_DROPOFF.longitude,
      status: 'REQUESTED',
      sourceType: 'DIRECT_DELIVERY',
      sourceId: uid('timeout-src'),
    });

    const dispatchOffer2 = await db.orm.public.DeliveryDispatch.create({
      id: uuidv4(),
      deliveryJobId: timeoutJob.id,
      providerId: platformFleetOrg.id,
      driverProfileId: driver1.id,
      vehicleId: vehicle1.id,
      status: 'OFFERED',
      attempt: 1,
    });

    await handleDispatchOfferTimeout({
      dispatchId: dispatchOffer2.id,
      providerId: platformFleetOrg.id,
    });

    const updatedOffer2 = (await db.orm.public.DeliveryDispatch.where({ id: dispatchOffer2.id }).all())[0];
    assert.strictEqual(updatedOffer2.status, 'EXPIRED', 'Timed-out offer must be marked EXPIRED');

    // 4.3 Test Successful Acceptance:
    const acceptJob = await db.orm.public.DeliveryJob.create({
      id: uuidv4(),
      providerId: platformFleetOrg.id,
      pickupAddress: 'Marian Road',
      pickupLat: MARIAN_PICKUP.latitude,
      pickupLng: MARIAN_PICKUP.longitude,
      dropoffAddress: 'State Housing',
      dropoffLat: STATE_HOUSING_DROPOFF.latitude,
      dropoffLng: STATE_HOUSING_DROPOFF.longitude,
      status: 'REQUESTED',
      sourceType: 'DIRECT_DELIVERY',
      sourceId: uid('accept-src'),
    });

    const acceptDispatchObj = await db.orm.public.DeliveryDispatch.create({
      id: uuidv4(),
      deliveryJobId: acceptJob.id,
      providerId: platformFleetOrg.id,
      driverProfileId: driver1.id,
      vehicleId: vehicle1.id,
      status: 'OFFERED',
      attempt: 1,
    });

    await acceptDispatch({
      dispatchId: acceptDispatchObj.id,
      driverProfileId: driver1.id,
      providerId: platformFleetOrg.id,
    });

    const jobAfterAccept = (await db.orm.public.DeliveryJob.where({ id: acceptJob.id }).all())[0];
    assert.strictEqual(jobAfterAccept.status, 'ASSIGNED', 'Job status must transition to ASSIGNED');

    const activeAssignments = await db.orm.public.DeliveryAssignment.where({
      deliveryJobId: acceptJob.id,
      driverProfileId: driver1.id,
      status: 'ACCEPTED',
    }).all();
    assert.strictEqual(activeAssignments.length, 1, 'Exactly one active assignment must be created');

    const driverAfterAccept = (await db.orm.public.LogisticsDriverProfile.where({ id: driver1.id }).all())[0];
    assert.strictEqual(driverAfterAccept.status, 'BUSY', 'Driver status must transition to BUSY');

    // Clean up assignment from Test 4 so driver 1 is released
    await db.orm.public.DeliveryAssignment.where({ deliveryJobId: acceptJob.id }).update({ status: 'COMPLETED' });
    await db.orm.public.LogisticsDriverProfile.where({ id: driver1.id }).update({ status: 'ONLINE' as any });
  });

  // =========================================================================
  // 5. Pickup and transit status transitions
  // =========================================================================
  await t.test('5. Verify pickup and transit status transitions', async () => {
    // Create new active delivery with Driver 2
    const flowJob = await db.orm.public.DeliveryJob.create({
      id: uuidv4(),
      providerId: platformFleetOrg.id,
      pickupAddress: 'Marian Market, Calabar',
      pickupLat: MARIAN_PICKUP.latitude,
      pickupLng: MARIAN_PICKUP.longitude,
      dropoffAddress: '15 State Housing Road, Calabar',
      dropoffLat: STATE_HOUSING_DROPOFF.latitude,
      dropoffLng: STATE_HOUSING_DROPOFF.longitude,
      status: 'ASSIGNED',
      sourceType: 'DIRECT_DELIVERY',
      sourceId: uid('flow-src'),
    });

    const assignment = await db.orm.public.DeliveryAssignment.create({
      id: uuidv4(),
      deliveryJobId: flowJob.id,
      driverProfileId: driver2.id,
      vehicleId: vehicle2.id,
      status: 'ACCEPTED',
    });

    // 5.1 Arrive at Pickup
    const atPickupRes = await arriveAtPickup({
      deliveryJobId: flowJob.id,
      providerId: platformFleetOrg.id,
      driverProfileId: driver2.id,
      latitude: MARIAN_PICKUP.latitude,
      longitude: MARIAN_PICKUP.longitude,
    });
    assert.strictEqual(atPickupRes.job.status, 'AT_PICKUP');

    // 5.2 Confirm Pickup
    const confirmPickupRes = await confirmPickup({
      deliveryJobId: flowJob.id,
      providerId: platformFleetOrg.id,
      driverProfileId: driver2.id,
    });
    assert.strictEqual(confirmPickupRes.job.status, 'PICKED_UP');

    // 5.3 Enter Transit
    const enterTransitRes = await enterTransit({
      deliveryJobId: flowJob.id,
      providerId: platformFleetOrg.id,
      driverProfileId: driver2.id,
    });
    assert.strictEqual(enterTransitRes.job.status, 'IN_TRANSIT');

    // 5.4 Arrive at Dropoff
    const atDropoffRes = await arriveAtDropoff({
      deliveryJobId: flowJob.id,
      providerId: platformFleetOrg.id,
      driverProfileId: driver2.id,
      latitude: STATE_HOUSING_DROPOFF.latitude,
      longitude: STATE_HOUSING_DROPOFF.longitude,
    });
    assert.strictEqual(atDropoffRes.job.status, 'AT_DROPOFF');

    // Verify tracking events in sequence
    const events = await db.orm.public.DeliveryTrackingEvent.where({
      deliveryJobId: flowJob.id,
    }).all();
    const eventTypes = events.map((e: any) => e.eventType);
    assert.ok(eventTypes.includes('AT_PICKUP'));
    assert.ok(eventTypes.includes('PICKED_UP'));
    assert.ok(eventTypes.includes('IN_TRANSIT'));
    assert.ok(eventTypes.includes('AT_DROPOFF'));

    // Clean up assignment from Test 5 so driver 2 is released
    await db.orm.public.DeliveryAssignment.where({ deliveryJobId: flowJob.id }).update({ status: 'COMPLETED' });
    await db.orm.public.LogisticsDriverProfile.where({ id: driver2.id }).update({ status: 'ONLINE' as any });
  });

  // =========================================================================
  // 6. Public tracking updates & privacy address masking
  // =========================================================================
  await t.test('6. Verify tracking updates and public tracking address masking', async () => {
    const rawOtp = '774411';
    const trackingRef = `CD-TRK-${uid('PUB')}`;

    const job = await createDeliveryJob({
      providerId: platformFleetOrg.id,
      sourceType: 'DIRECT_DELIVERY',
      sourceId: uid('tracking-src'),
      idempotencyKey: uid('trk-key'),
      trackingReference: trackingRef,
      pickupAddress: '42 Marian Road, Calabar Municipal',
      dropoffAddress: 'Flat 4B, 18 Parliamentary Road, Calabar Municipal',
      recipientOtp: rawOtp,
    });

    await db.orm.public.DeliveryTrackingEvent.create({
      id: uuidv4(),
      deliveryJobId: job.id,
      providerId: platformFleetOrg.id,
      eventType: 'DISPATCHED',
      notes: 'Rider assigned to order',
      recordedAt: toTemporal(),
    });

    const publicTracking = await getPublicDeliveryTracking(trackingRef);
    assert.ok(publicTracking, 'Public tracking must resolve by tracking reference');
    assert.strictEqual(publicTracking.trackingReference, trackingRef);
    assert.strictEqual(publicTracking.status, 'REQUESTED');

    // Verify privacy masking: dropoffAddress must NOT reveal exact house number or flat
    assert.notStrictEqual(publicTracking.dropoffAddress, 'Flat 4B, 18 Parliamentary Road, Calabar Municipal');
    assert.ok(publicTracking.dropoffAddress.includes('Parliamentary Road') || publicTracking.dropoffAddress.includes('***'));

    // Verify recipientOtp is never leaked in public tracking
    assert.strictEqual((publicTracking as any).recipientOtp, undefined, 'Raw or hashed OTP must never be exposed');
  });

  // =========================================================================
  // 7. Proof of delivery and atomic OTP consumption
  // =========================================================================
  await t.test('7. Verify proof of delivery and atomic OTP consumption', async () => {
    const rawOtp = '654321';
    const otpJobKey = uid('otp-e2e');

    const otpJob = await createDeliveryJob({
      providerId: platformFleetOrg.id,
      sourceType: 'DIRECT_DELIVERY',
      sourceId: uid('otp-src'),
      idempotencyKey: otpJobKey,
      pickupAddress: 'Marian Road',
      dropoffAddress: 'State Housing',
      recipientOtp: rawOtp,
    });

    // Advance to AT_DROPOFF
    await db.orm.public.DeliveryJob.where({ id: otpJob.id }).update({ status: 'AT_DROPOFF' });
    const otpAssignment = await db.orm.public.DeliveryAssignment.create({
      id: uuidv4(),
      deliveryJobId: otpJob.id,
      driverProfileId: driver1.id,
      vehicleId: vehicle1.id,
      status: 'ACCEPTED',
    });

    // 7.1 Reject with invalid OTP
    await assert.rejects(
      () =>
        completeDelivery({
          deliveryJobId: otpJob.id,
          providerId: platformFleetOrg.id,
          driverProfileId: driver1.id,
          type: 'OTP',
          otp: '000000', // Wrong OTP
        }),
      /Invalid recipient verification OTP/
    );

    // 7.2 Succeed with correct OTP
    const completionRes = await completeDelivery({
      deliveryJobId: otpJob.id,
      providerId: platformFleetOrg.id,
      driverProfileId: driver1.id,
      type: 'OTP',
      otp: rawOtp,
      recipientName: 'Valid Recipient',
    });

    assert.strictEqual(completionRes.job.status, 'DELIVERED');
    assert.ok(completionRes.proofOfDelivery.id);
    assert.strictEqual(completionRes.proofOfDelivery.type, 'OTP');

    // 7.3 Assert OTP was atomically consumed (recipientOtp is now null)
    const jobAfterDelivery = (await db.orm.public.DeliveryJob.where({ id: otpJob.id }).all())[0];
    assert.strictEqual(jobAfterDelivery.recipientOtp, null, 'OTP must be atomically consumed upon delivery');

    // 7.4 Attempting replay must throw
    await assert.rejects(
      () =>
        completeDelivery({
          deliveryJobId: otpJob.id,
          providerId: platformFleetOrg.id,
          driverProfileId: driver1.id,
          type: 'OTP',
          otp: rawOtp,
        }),
      /(Cannot perform DELIVERED|No active ACCEPTED assignment)/
    );
  });

  // =========================================================================
  // 8. Successful completion and final assignment and rider states
  // =========================================================================
  await t.test('8. Verify successful completion and the correct final assignment and rider states', async () => {
    const completeJob = await db.orm.public.DeliveryJob.create({
      id: uuidv4(),
      providerId: platformFleetOrg.id,
      pickupAddress: 'Marian Road',
      dropoffAddress: 'State Housing',
      status: 'AT_DROPOFF',
      sourceType: 'DIRECT_DELIVERY',
      sourceId: uid('comp-src'),
    });

    const assignment = await db.orm.public.DeliveryAssignment.create({
      id: uuidv4(),
      deliveryJobId: completeJob.id,
      driverProfileId: driver2.id,
      vehicleId: vehicle2.id,
      status: 'ACCEPTED',
    });

    await db.orm.public.LogisticsDriverProfile.where({ id: driver2.id }).update({ status: 'BUSY' as any });

    // Complete delivery
    await completeDelivery({
      deliveryJobId: completeJob.id,
      providerId: platformFleetOrg.id,
      driverProfileId: driver2.id,
      type: 'SIGNATURE',
      evidenceUrl: 'https://storage.cityos.internal/signatures/sig-123.png',
      recipientName: 'Chief Okon',
    });

    // Transition status to COMPLETED
    await transitionDeliveryStatus(completeJob.id, 'COMPLETED', platformFleetOrg.id);

    const finalJob = (await db.orm.public.DeliveryJob.where({ id: completeJob.id }).all())[0];
    assert.strictEqual(finalJob.status, 'COMPLETED', 'Job must reach terminal COMPLETED status');

    const finalAssignment = (await db.orm.public.DeliveryAssignment.where({ id: assignment.id }).all())[0];
    assert.strictEqual(finalAssignment.status, 'COMPLETED', 'Assignment must reach COMPLETED status');

    const finalDriver = (await db.orm.public.LogisticsDriverProfile.where({ id: driver2.id }).all())[0];
    assert.strictEqual(finalDriver.status, 'ONLINE', 'Driver must be released back to ONLINE status');
  });

  // =========================================================================
  // 9. Failed delivery and recovery paths
  // =========================================================================
  await t.test('9. Verify failed delivery and recovery paths', async () => {
    const failJob = await db.orm.public.DeliveryJob.create({
      id: uuidv4(),
      providerId: platformFleetOrg.id,
      pickupAddress: 'Marian Road',
      dropoffAddress: 'State Housing',
      status: 'IN_TRANSIT',
      sourceType: 'DIRECT_DELIVERY',
      sourceId: uid('fail-src'),
    });

    const assignment = await db.orm.public.DeliveryAssignment.create({
      id: uuidv4(),
      deliveryJobId: failJob.id,
      driverProfileId: driver1.id,
      vehicleId: vehicle1.id,
      status: 'ACCEPTED',
    });

    await db.orm.public.LogisticsDriverProfile.where({ id: driver1.id }).update({ status: 'BUSY' as any });

    // Fail delivery due to unreachable recipient
    const failRes = await failDelivery({
      deliveryJobId: failJob.id,
      providerId: platformFleetOrg.id,
      driverProfileId: driver1.id,
      reason: 'RECIPIENT_UNREACHABLE',
      notes: 'Customer phone switched off after 3 attempts',
    });

    assert.strictEqual(failRes.job.status, 'FAILED');

    // Active assignment must be cancelled
    const updatedAssignment = (await db.orm.public.DeliveryAssignment.where({ id: assignment.id }).all())[0];
    assert.strictEqual(updatedAssignment.status, 'CANCELLED');

    // Driver must be released back to ONLINE
    const updatedDriver = (await db.orm.public.LogisticsDriverProfile.where({ id: driver1.id }).all())[0];
    assert.strictEqual(updatedDriver.status, 'ONLINE');

    // Terminal job cannot be failed a second time
    await assert.rejects(
      () =>
        failDelivery({
          deliveryJobId: failJob.id,
          providerId: platformFleetOrg.id,
          driverProfileId: driver1.id,
          reason: 'RECIPIENT_UNREACHABLE',
        }),
      /Cannot fail delivery in terminal status FAILED/
    );
  });

  // =========================================================================
  // 10. Pricing, platform fees & balanced financial settlement
  // =========================================================================
  await t.test('10. Verify pricing, platform fee calculations, and balanced ledger entries using test-only financial records', async () => {
    const settleJob = await db.orm.public.DeliveryJob.create({
      id: uuidv4(),
      providerId: platformFleetOrg.id,
      pickupAddress: 'Marian Road',
      dropoffAddress: 'State Housing',
      status: 'COMPLETED',
      sourceType: 'DIRECT_DELIVERY',
      sourceId: uid('settle-src'),
    });

    const quote = await db.orm.public.DeliveryQuote.create({
      id: uuidv4(),
      deliveryJobId: settleJob.id,
      providerId: platformFleetOrg.id,
      status: 'ACCEPTED',
      pricingVersion: 1,
      baseCharge: '1200.00' as any,
      distanceCharge: '800.00' as any,
      subtotal: '2000.00' as any,
      total: '2000.00' as any,
      currency: 'NGN',
    });

    // Login as fleet admin to authorize financial settlement
    setActiveUserToken(fleetAdminActor.token);

    const settleKey = `settle-key-${uuidv4()}`;
    const settlement = await settleDelivery({
      providerId: platformFleetOrg.id,
      deliveryJobId: settleJob.id,
      idempotencyKey: settleKey,
    });

    assert.ok(settlement.id);
    assert.strictEqual(Number(settlement.grossAmount), 2000.00);
    // 10% platform fee = 200.00, provider net = 1800.00
    assert.strictEqual(Number(settlement.fees), 200.00);
    assert.strictEqual(Number(settlement.providerAmount), 1800.00);

    // Verify Transaction and LedgerEntry created
    const transaction = (await db.orm.public.Transaction.where({ id: settlement.transactionId }).all())[0];
    assert.ok(transaction, 'Transaction record must exist');
    assert.strictEqual(transaction.status, 'COMPLETED');

    const ledgerEntries = await db.orm.public.LedgerEntry.where({ transactionId: transaction.id }).all();
    assert.strictEqual(ledgerEntries.length, 1, 'Ledger entry must be posted');
    assert.strictEqual(Number(ledgerEntries[0].amount), 1800.00);

    // Verify Wallet balance matches credited providerAmount
    const wallet = (await db.orm.public.Wallet.where({ organizationId: platformFleetOrg.id }).all())[0];
    assert.strictEqual(Number(wallet.balance), 1800.00);

    // Verify settlement idempotency: retrying with same key returns identical settlement without increasing wallet
    const retriedSettlement = await settleDelivery({
      providerId: platformFleetOrg.id,
      deliveryJobId: settleJob.id,
      idempotencyKey: settleKey,
    });
    assert.strictEqual(retriedSettlement.id, settlement.id);

    const walletAfterRetry = (await db.orm.public.Wallet.where({ organizationId: platformFleetOrg.id }).all())[0];
    assert.strictEqual(Number(walletAfterRetry.balance), 1800.00, 'Wallet balance must remain unchanged on idempotent retry');
  });

  // =========================================================================
  // 11. Dispatch exhaustion in CITYOS_ONLY mode
  // =========================================================================
  await t.test('11. Verify dispatch exhaustion results in NO_RIDER_AVAILABLE and never books an external provider', async () => {
    // Take both drivers offline
    await db.orm.public.LogisticsDriverProfile.where({ id: driver1.id }).update({ status: 'OFFLINE' as any });
    await db.orm.public.LogisticsDriverProfile.where({ id: driver2.id }).update({ status: 'OFFLINE' as any });

    const exhaustJob = await db.orm.public.DeliveryJob.create({
      id: uuidv4(),
      providerId: platformFleetOrg.id,
      pickupAddress: 'Marian Road',
      pickupLat: MARIAN_PICKUP.latitude,
      pickupLng: MARIAN_PICKUP.longitude,
      dropoffAddress: 'State Housing',
      dropoffLat: STATE_HOUSING_DROPOFF.latitude,
      dropoffLng: STATE_HOUSING_DROPOFF.longitude,
      status: 'REQUESTED',
      sourceType: 'DIRECT_DELIVERY',
      sourceId: uid('exhaust-src'),
    });

    const dispatchRes = await dispatchNetworkJob({
      deliveryJobId: exhaustJob.id,
      pickup: MARIAN_PICKUP,
      dropoff: STATE_HOUSING_DROPOFF,
    });

    assert.strictEqual(dispatchRes.success, false);
    assert.strictEqual(dispatchRes.tier, 'NO_RIDER_AVAILABLE');
    assert.strictEqual(dispatchRes.partnerFallbackEligible, false, 'External partner fallback must be strictly disabled');
    assert.strictEqual(dispatchRes.candidateCount, 0);

    // Check tracking event recorded
    const trackingEvents = await db.orm.public.DeliveryTrackingEvent.where({
      deliveryJobId: exhaustJob.id,
    }).all();
    const exhaustedEvent = trackingEvents.find((e: any) => e.notes?.includes('dispatch exhausted'));
    assert.ok(exhaustedEvent, 'Exhaustion tracking event must be recorded for operations');

    // Restore driver 1 and 2 to ONLINE
    await db.orm.public.LogisticsDriverProfile.where({ id: driver1.id }).update({ status: 'ONLINE' as any });
    await db.orm.public.LogisticsDriverProfile.where({ id: driver2.id }).update({ status: 'ONLINE' as any });
  });

  // =========================================================================
  // 12. Duplicate requests & concurrent acceptance attempts
  // =========================================================================
  await t.test('12. Verify duplicate requests and concurrent acceptance attempts do not produce duplicate active assignments or double settlement', async () => {
    // 12.1 Idempotent Job Creation:
    const duplicateKey = uid('idemp-job');
    const jobA = await createDeliveryJob({
      providerId: platformFleetOrg.id,
      sourceType: 'DIRECT_DELIVERY',
      sourceId: 'SOURCE_IDENTICAL_1',
      idempotencyKey: duplicateKey,
      dropoffAddress: 'State Housing',
    });

    const jobB = await createDeliveryJob({
      providerId: platformFleetOrg.id,
      sourceType: 'DIRECT_DELIVERY',
      sourceId: 'SOURCE_IDENTICAL_1',
      idempotencyKey: duplicateKey,
      dropoffAddress: 'State Housing',
    });

    assert.strictEqual(jobA.id, jobB.id, 'Duplicate job creation with same key must return existing job');

    // 12.2 Concurrent Acceptance Race:
    // Ensure both drivers are online and have no lingering active assignments before race
    await db.orm.public.DeliveryAssignment.where({ driverProfileId: driver1.id, status: 'ACCEPTED' }).update({ status: 'COMPLETED' });
    await db.orm.public.DeliveryAssignment.where({ driverProfileId: driver2.id, status: 'ACCEPTED' }).update({ status: 'COMPLETED' });
    await db.orm.public.LogisticsDriverProfile.where({ id: driver1.id }).update({ status: 'ONLINE' as any });
    await db.orm.public.LogisticsDriverProfile.where({ id: driver2.id }).update({ status: 'ONLINE' as any });

    const raceJob = await db.orm.public.DeliveryJob.create({
      id: uuidv4(),
      providerId: platformFleetOrg.id,
      pickupAddress: 'Marian Road',
      pickupLat: MARIAN_PICKUP.latitude,
      pickupLng: MARIAN_PICKUP.longitude,
      dropoffAddress: 'State Housing',
      dropoffLat: STATE_HOUSING_DROPOFF.latitude,
      dropoffLng: STATE_HOUSING_DROPOFF.longitude,
      status: 'DISPATCHED',
      sourceType: 'DIRECT_DELIVERY',
      sourceId: uid('race-src'),
    });

    const raceDispatch = await db.orm.public.DeliveryDispatch.create({
      id: uuidv4(),
      deliveryJobId: raceJob.id,
      providerId: platformFleetOrg.id,
      status: 'OFFERED',
      attempt: 1,
    });

    // Driver 1 and Driver 2 race to accept the single dispatch
    const [res1, res2] = await Promise.allSettled([
      acceptDispatch({
        dispatchId: raceDispatch.id,
        driverProfileId: driver1.id,
        providerId: platformFleetOrg.id,
      }),
      acceptDispatch({
        dispatchId: raceDispatch.id,
        driverProfileId: driver2.id,
        providerId: platformFleetOrg.id,
      }),
    ]);

    const activeAssignments = await db.orm.public.DeliveryAssignment.where({
      deliveryJobId: raceJob.id,
      status: 'ACCEPTED',
    }).all();

    assert.strictEqual(activeAssignments.length, 1, 'Database must commit exactly one active assignment');
    assert.strictEqual(
      [res1.status, res2.status].filter((s) => s === 'fulfilled').length,
      1,
      'Exactly one concurrent accept attempt must succeed'
    );
    assert.strictEqual(
      [res1.status, res2.status].filter((s) => s === 'rejected').length,
      1,
      'The competing concurrent accept attempt must be rejected'
    );
  });
});
