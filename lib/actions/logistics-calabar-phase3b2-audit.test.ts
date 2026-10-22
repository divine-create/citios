import test, { before } from 'node:test';
import assert from 'node:assert';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../src/prisma/db';
import {
  acceptDispatch,
  dispatchDelivery,
  findNetworkCandidates,
  expireDispatch,
  handleDispatchOfferTimeout,
} from './logistics-dispatch';
import {
  checkInRider,
  checkOutRider,
  updateRiderLocation,
  setTestRiderTelemetry,
} from './logistics-rider';
import {
  requireOperationsStaff,
  getExhaustedDeliveries,
} from './logistics-operations-admin';
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
    firstName: 'AuditActor',
    lastName: uid('User'),
    isSystemAdmin,
  });

  const email = `${person.id}@calabar-audit3b2.test`;
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

test('CityDrive Network — Phase 3B.2 Independent Security Audit & Concurrency Verification', async (t) => {
  let fleetOrgA: any;
  let fleetOrgB: any;
  let driverA: any;
  let vehicleA: any;

  before(async () => {
    fleetOrgA = await db.orm.public.Organization.create({
      id: uuidv4(),
      name: 'CityOS Audit Fleet A',
      type: 'LOGISTICS' as any,
      status: 'ACTIVE' as any,
    });

    fleetOrgB = await db.orm.public.Organization.create({
      id: uuidv4(),
      name: 'Private Merchant Logistics Org B',
      type: 'LOGISTICS' as any,
      status: 'ACTIVE' as any,
    });

    await db.orm.public.LogisticsSettings.create({
      id: uuidv4(),
      organizationId: fleetOrgA.id,
      isNetworkParticipant: true,
      platformFeeRate: '0.10',
    });

    vehicleA = await db.orm.public.LogisticsVehicle.create({
      id: uuidv4(),
      providerId: fleetOrgA.id,
      type: 'MOTORCYCLE',
      licensePlate: 'CR-AUDIT-01',
      status: 'ACTIVE',
    });

    const actorA = await createTestActor(fleetOrgA.id, 'DRIVER');
    driverA = await db.orm.public.LogisticsDriverProfile.create({
      id: uuidv4(),
      personId: actorA.person.id,
      providerId: fleetOrgA.id,
      status: 'ONLINE',
      onboardingComplete: true,
      currentVehicleId: vehicleA.id,
    });

    setTestRiderTelemetry(driverA.id, {
      latitude: 4.9757,
      longitude: 8.3417,
      observedAt: Date.now(),
    });
  });

  // 1. Concurrency: One rider accepting two incompatible deliveries concurrently
  await t.test('1. Concurrency: One rider accepting two incompatible deliveries concurrently', async () => {
    const job1 = await db.orm.public.DeliveryJob.create({
      id: uuidv4(),
      providerId: fleetOrgA.id,
      pickupAddress: 'Pickup 1',
      pickupLat: 4.9757,
      pickupLng: 8.3417,
      dropoffAddress: 'Dropoff 1',
      dropoffLat: 4.9612,
      dropoffLng: 8.3276,
      status: 'DISPATCHED',
      sourceType: 'DIRECT_DELIVERY',
      sourceId: uid('job1'),
    });

    const job2 = await db.orm.public.DeliveryJob.create({
      id: uuidv4(),
      providerId: fleetOrgA.id,
      pickupAddress: 'Pickup 2',
      pickupLat: 4.9757,
      pickupLng: 8.3417,
      dropoffAddress: 'Dropoff 2',
      dropoffLat: 4.9612,
      dropoffLng: 8.3276,
      status: 'DISPATCHED',
      sourceType: 'DIRECT_DELIVERY',
      sourceId: uid('job2'),
    });

    const dispatch1 = await db.orm.public.DeliveryDispatch.create({
      id: uuidv4(),
      deliveryJobId: job1.id,
      providerId: fleetOrgA.id,
      driverProfileId: driverA.id,
      vehicleId: vehicleA.id,
      status: 'OFFERED',
      attempt: 1,
    });

    const dispatch2 = await db.orm.public.DeliveryDispatch.create({
      id: uuidv4(),
      deliveryJobId: job2.id,
      providerId: fleetOrgA.id,
      driverProfileId: driverA.id,
      vehicleId: vehicleA.id,
      status: 'OFFERED',
      attempt: 1,
    });

    // Competing concurrent accepts by the same driver
    const results = await Promise.allSettled([
      acceptDispatch({
        dispatchId: dispatch1.id,
        driverProfileId: driverA.id,
        providerId: fleetOrgA.id,
      }),
      acceptDispatch({
        dispatchId: dispatch2.id,
        driverProfileId: driverA.id,
        providerId: fleetOrgA.id,
      }),
    ]);

    const activeAssignments = await db.orm.public.DeliveryAssignment.where({
      driverProfileId: driverA.id,
      status: 'ACCEPTED',
    }).all();

    console.log('[CONCURRENCY TEST 1] Results status:', results.map(r => r.status));
    const rejectedReason = results.find(r => r.status === 'rejected') as PromiseRejectedResult | undefined;
    if (rejectedReason) {
      console.log('[CONCURRENCY TEST 1] Rejected error message:', rejectedReason.reason?.message);
    }
    console.log('[CONCURRENCY TEST 1] Active assignments in DB:', activeAssignments.length);

    // If both committed, then one rider was able to accept two deliveries concurrently!
    return {
      fulfilledCount: results.filter(r => r.status === 'fulfilled').length,
      activeAssignmentsCount: activeAssignments.length,
    };
  });

  // 2. Concurrency: Offer timeout racing with rider acceptance
  await t.test('2. Concurrency: Offer timeout racing with rider acceptance', async () => {
    const jobTimeout = await db.orm.public.DeliveryJob.create({
      id: uuidv4(),
      providerId: fleetOrgA.id,
      pickupAddress: 'Pickup Timeout',
      pickupLat: 4.9757,
      pickupLng: 8.3417,
      dropoffAddress: 'Dropoff Timeout',
      dropoffLat: 4.9612,
      dropoffLng: 8.3276,
      status: 'DISPATCHED',
      sourceType: 'DIRECT_DELIVERY',
      sourceId: uid('job-timeout'),
    });

    const dispatchTimeout = await db.orm.public.DeliveryDispatch.create({
      id: uuidv4(),
      deliveryJobId: jobTimeout.id,
      providerId: fleetOrgA.id,
      driverProfileId: driverA.id,
      vehicleId: vehicleA.id,
      status: 'OFFERED',
      attempt: 1,
    });

    const results = await Promise.allSettled([
      acceptDispatch({
        dispatchId: dispatchTimeout.id,
        driverProfileId: driverA.id,
        providerId: fleetOrgA.id,
      }),
      expireDispatch({
        dispatchId: dispatchTimeout.id,
        providerId: fleetOrgA.id,
      }),
    ]);

    const finalDispatch = (await db.orm.public.DeliveryDispatch.where({ id: dispatchTimeout.id }).all())[0];
    console.log('[CONCURRENCY TEST 2] Final dispatch status:', finalDispatch?.status);
    console.log('[CONCURRENCY TEST 2] Race results:', results.map(r => r.status));
  });

  // 3. Security: checkInRider without session allows unauthenticated state change
  await t.test('3. Security: checkInRider called without session allows unauthenticated state change', async () => {
    // Unauthenticated caller attempting check-in for driverA
    let unauthenticatedCheckInAllowed = false;
    try {
      const res = await checkInRider({
        driverProfileId: driverA.id,
        latitude: 4.9757,
        longitude: 8.3417,
      });
      unauthenticatedCheckInAllowed = res.status === 'ONLINE';
      console.log('[SECURITY TEST 3] CRITICAL: checkInRider succeeded without session! Status:', res.status);
    } catch (err: any) {
      console.log('[SECURITY TEST 3] checkInRider threw:', err.message);
    }
    // We document the finding: unauthenticatedCheckInAllowed is true
    assert.strictEqual(unauthenticatedCheckInAllowed, true, 'Confirmed vulnerability: unauthenticated caller can check in driver');
  });

  // 4. Security: checkOutRider without session
  await t.test('4. Security: checkOutRider called without session', async () => {
    // Create an idle driver with no active assignments
    const idleActor = await createTestActor(fleetOrgA.id, 'DRIVER');
    const idleVehicle = await db.orm.public.LogisticsVehicle.create({
      id: uuidv4(),
      providerId: fleetOrgA.id,
      type: 'MOTORCYCLE',
      licensePlate: 'CR-IDLE-01',
      status: 'ACTIVE',
    });
    const idleDriver = await db.orm.public.LogisticsDriverProfile.create({
      id: uuidv4(),
      personId: idleActor.person.id,
      providerId: fleetOrgA.id,
      status: 'ONLINE',
      onboardingComplete: true,
      currentVehicleId: idleVehicle.id,
    });

    let unauthenticatedCheckOutAllowed = false;
    try {
      const res = await checkOutRider({
        driverProfileId: idleDriver.id,
      });
      unauthenticatedCheckOutAllowed = res.status === 'OFFLINE';
      console.log('[SECURITY TEST 4] CRITICAL: checkOutRider succeeded without session! Status:', res.status);
    } catch (err: any) {
      console.log('[SECURITY TEST 4] checkOutRider threw:', err.message);
    }
    assert.strictEqual(unauthenticatedCheckOutAllowed, true, 'Confirmed vulnerability: unauthenticated caller can check out driver');
  });

  // 5. Security: updateRiderLocation without session allows unauthenticated telemetry spoofing
  await t.test('5. Security: updateRiderLocation called without session allows spoofing', async () => {
    let unauthenticatedLocationAllowed = false;
    try {
      const res = await updateRiderLocation({
        driverProfileId: driverA.id,
        latitude: 4.9757,
        longitude: 8.3417,
      });
      unauthenticatedLocationAllowed = res.success === true;
      console.log('[SECURITY TEST 5] CRITICAL: updateRiderLocation succeeded without session! Result:', res.success);
    } catch (err: any) {
      console.log('[SECURITY TEST 5] updateRiderLocation threw:', err.message);
    }
    assert.strictEqual(unauthenticatedLocationAllowed, true, 'Confirmed vulnerability: unauthenticated caller can update rider location');
  });

  // 6. Security: requireOperationsStaff with empty allowlist fails open or closed?
  await t.test('6. Security: requireOperationsStaff with empty allowlist', async () => {
    const saved = process.env.CITYOS_FLEET_ORG_IDS;
    try {
      delete process.env.CITYOS_FLEET_ORG_IDS;
      process.env.CITYDRIVE_NETWORK_POLICY = 'CITYOS_ONLY';

      // Merchant actor (not platform fleet)
      const merchantActor = await createTestActor(fleetOrgB.id, 'MANAGER');
      
      // When CITYOS_FLEET_ORG_IDS is missing/empty, can a merchant manager pass requireOperationsStaff?
      // Notice: In a real request, getServerSession reads next-auth cookie. Here we check getCityOSFleetOrgIds()
      const allowlist = (await import('./logistics-policy')).getCityOSFleetOrgIds();
      assert.strictEqual(allowlist.length, 0);
    } finally {
      process.env.CITYOS_FLEET_ORG_IDS = saved;
    }
  });

  // 7. Security: Candidate ranking with inactive vehicle
  await t.test('7. Security: findNetworkCandidates with inactive vehicle', async () => {
    // Put vehicle in maintenance
    await db.orm.public.LogisticsVehicle.where({ id: vehicleA.id }).update({
      status: 'MAINTENANCE',
    });

    const testJob = await db.orm.public.DeliveryJob.create({
      id: uuidv4(),
      providerId: fleetOrgA.id,
      pickupAddress: 'Candidate Test Pickup',
      pickupLat: 4.9757,
      pickupLng: 8.3417,
      dropoffAddress: 'Candidate Test Dropoff',
      dropoffLat: 4.9612,
      dropoffLng: 8.3276,
      status: 'REQUESTED',
      sourceType: 'DIRECT_DELIVERY',
      sourceId: uid('cand-test'),
    });

    const { candidates } = await findNetworkCandidates({
      deliveryJobId: testJob.id,
      pickup: { latitude: 4.9757, longitude: 8.3417 },
      dropoff: { latitude: 4.9612, longitude: 8.3276 },
    });

    const candidateDriver = candidates.find((c: any) => c.id === driverA.id);
    console.log('[SECURITY TEST 7] Candidate driver with maintenance vehicle selected?:', !!candidateDriver);

    // Restore vehicle status
    await db.orm.public.LogisticsVehicle.where({ id: vehicleA.id }).update({
      status: 'ACTIVE',
    });
  });

  // 8. Security: getExhaustedDeliveries cross-tenant leakage when providerId is omitted
  await t.test('8. Security: getExhaustedDeliveries cross-tenant leakage', async () => {
    process.env.CITYOS_FLEET_ORG_IDS = fleetOrgA.id;
    process.env.CITYDRIVE_NETWORK_POLICY = 'CITYOS_ONLY';

    const managerActorA = await createTestActor(fleetOrgA.id, 'MANAGER');
    setActiveUserToken(managerActorA.token);

    // Create an exhausted delivery for Org B (private merchant)
    const exhaustedJobB = await db.orm.public.DeliveryJob.create({
      id: uuidv4(),
      providerId: fleetOrgB.id,
      pickupAddress: 'Exhausted Org B Pickup',
      pickupLat: 4.9757,
      pickupLng: 8.3417,
      dropoffAddress: 'Exhausted Org B Dropoff',
      dropoffLat: 4.9612,
      dropoffLng: 8.3276,
      status: 'DISPATCHED',
      sourceType: 'DIRECT_DELIVERY',
      sourceId: uid('exhausted-b'),
    });

    await db.orm.public.DeliveryDispatch.create({
      id: uuidv4(),
      deliveryJobId: exhaustedJobB.id,
      providerId: fleetOrgB.id,
      status: 'REJECTED',
      attempt: 1,
      failureReason: 'No riders available in merchant fleet',
    });

    try {
      const allExhausted = await getExhaustedDeliveries({});
      const leakedJob = allExhausted.find(j => j.id === exhaustedJobB.id);
      console.log('[SECURITY TEST 8] Cross-tenant leaked job from Org B found?:', !!leakedJob);
      assert.ok(leakedJob, 'Confirmed vulnerability: getExhaustedDeliveries({}) leaks cross-tenant jobs when providerId is omitted');
    } finally {
      setActiveUserToken(null);
    }
  });
});
