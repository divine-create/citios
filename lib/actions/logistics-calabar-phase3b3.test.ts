import test, { before } from 'node:test';
import assert from 'node:assert';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../src/prisma/db';
import {
  acceptDispatch,
  dispatchDelivery,
  dispatchNetworkJob,
  findNetworkCandidates,
  expireDispatch,
} from './logistics-dispatch';
import {
  checkInRider,
  checkOutRider,
  updateRiderLocation,
  getRiderTelemetry,
  setTestRiderTelemetry,
} from './logistics-rider';
import {
  requireOperationsStaff,
  getExhaustedDeliveries,
  getDeliveryDispatchAudit,
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
    firstName: 'Phase3B3',
    lastName: uid('Actor'),
    isSystemAdmin,
  });

  const email = `${person.id}@phase3b3.test`;
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

test('CityDrive Network — Phase 3B.3 Security Remediation & Regression Suite', async (t) => {
  let platformFleetA: any;
  let privateMerchantB: any;

  let riderActor1: any;
  let riderActor2: any;
  let fleetAdminActor: any;
  let systemAdminActor: any;

  let vehicle1: any;
  let vehicle2: any;
  let maintenanceVehicle: any;

  let driver1: any;
  let driver2: any;

  before(async () => {
    platformFleetA = await db.orm.public.Organization.create({
      id: uuidv4(),
      name: 'CityOS Platform Fleet A',
      type: 'LOGISTICS' as any,
      status: 'ACTIVE' as any,
    });

    privateMerchantB = await db.orm.public.Organization.create({
      id: uuidv4(),
      name: 'Private Merchant B Express',
      type: 'LOGISTICS' as any,
      status: 'ACTIVE' as any,
    });

    await db.orm.public.LogisticsSettings.create({
      id: uuidv4(),
      organizationId: platformFleetA.id,
      isNetworkParticipant: true,
      platformFeeRate: '0.10',
    });

    process.env.CITYOS_FLEET_ORG_IDS = platformFleetA.id;
    process.env.CITYDRIVE_NETWORK_POLICY = 'CITYOS_ONLY';

    riderActor1 = await createTestActor(platformFleetA.id, 'DRIVER');
    riderActor2 = await createTestActor(platformFleetA.id, 'DRIVER');
    fleetAdminActor = await createTestActor(platformFleetA.id, 'MANAGER');
    systemAdminActor = await createTestActor(null, 'ADMIN', true);

    vehicle1 = await db.orm.public.LogisticsVehicle.create({
      id: uuidv4(),
      providerId: platformFleetA.id,
      type: 'MOTORCYCLE',
      licensePlate: 'CR-P3B3-01',
      status: 'ACTIVE',
    });

    vehicle2 = await db.orm.public.LogisticsVehicle.create({
      id: uuidv4(),
      providerId: platformFleetA.id,
      type: 'MOTORCYCLE',
      licensePlate: 'CR-P3B3-02',
      status: 'ACTIVE',
    });

    maintenanceVehicle = await db.orm.public.LogisticsVehicle.create({
      id: uuidv4(),
      providerId: platformFleetA.id,
      type: 'MOTORCYCLE',
      licensePlate: 'CR-P3B3-MNT',
      status: 'MAINTENANCE',
    });

    driver1 = await db.orm.public.LogisticsDriverProfile.create({
      id: uuidv4(),
      personId: riderActor1.person.id,
      providerId: platformFleetA.id,
      status: 'OFFLINE',
      onboardingComplete: true,
      currentVehicleId: vehicle1.id,
    });

    driver2 = await db.orm.public.LogisticsDriverProfile.create({
      id: uuidv4(),
      personId: riderActor2.person.id,
      providerId: platformFleetA.id,
      status: 'OFFLINE',
      onboardingComplete: true,
      currentVehicleId: vehicle2.id,
    });
  });

  // ==========================================
  // STAGE 2 — SEC-10: Rider Authentication
  // ==========================================
  await t.test('SEC-10.1: Missing session is explicitly rejected and leaves no state change', async () => {
    setActiveUserToken(null);

    // checkInRider without session
    await assert.rejects(
      checkInRider({
        driverProfileId: driver1.id,
        latitude: 4.9757,
        longitude: 8.3417,
      }),
      (err: any) => err.message.includes('UNAUTHENTICATED')
    );

    // Assert driver DB status unchanged (remains OFFLINE)
    const dCheck = (await db.orm.public.LogisticsDriverProfile.where({ id: driver1.id }).all())[0];
    assert.strictEqual(dCheck?.status, 'OFFLINE');

    // checkOutRider without session
    await assert.rejects(
      checkOutRider({ driverProfileId: driver1.id }),
      (err: any) => err.message.includes('UNAUTHENTICATED')
    );

    // updateRiderLocation without session
    await assert.rejects(
      updateRiderLocation({
        driverProfileId: driver1.id,
        latitude: 4.9757,
        longitude: 8.3417,
      }),
      (err: any) => err.message.includes('UNAUTHENTICATED')
    );

    // Assert telemetry cache empty
    const telemetry = getRiderTelemetry(driver1.id);
    assert.strictEqual(telemetry, null);
  });

  await t.test('SEC-10.2: Rider A cannot mutate Rider B profile (unauthorized substitution)', async () => {
    // Log in as Rider 1
    setActiveUserToken(riderActor1.token);

    // Attempt to check in Rider 2
    await assert.rejects(
      checkInRider({
        driverProfileId: driver2.id,
        latitude: 4.9757,
        longitude: 8.3417,
      }),
      (err: any) => err.message.includes('UNAUTHORIZED') || err.message.includes('FORBIDDEN')
    );

    const d2Check = (await db.orm.public.LogisticsDriverProfile.where({ id: driver2.id }).all())[0];
    assert.strictEqual(d2Check?.status, 'OFFLINE');

    setActiveUserToken(null);
  });

  await t.test('SEC-10.3: Authenticated rider can check in, update location, and check out', async () => {
    setActiveUserToken(riderActor1.token);

    const checkInRes = await checkInRider({
      driverProfileId: driver1.id,
      latitude: 4.9757,
      longitude: 8.3417,
    });
    assert.strictEqual(checkInRes.status, 'ONLINE');

    const d1Check = (await db.orm.public.LogisticsDriverProfile.where({ id: driver1.id }).all())[0];
    assert.strictEqual(d1Check?.status, 'ONLINE');

    const locRes = await updateRiderLocation({
      driverProfileId: driver1.id,
      latitude: 4.9760,
      longitude: 8.3420,
    });
    assert.strictEqual(locRes.success, true);

    const checkOutRes = await checkOutRider({ driverProfileId: driver1.id });
    assert.strictEqual(checkOutRes.status, 'OFFLINE');

    const d1After = (await db.orm.public.LogisticsDriverProfile.where({ id: driver1.id }).all())[0];
    assert.strictEqual(d1After?.status, 'OFFLINE');

    setActiveUserToken(null);
  });

  // ==========================================
  // STAGE 3 — SEC-11: Operations Backlog Tenant Isolation
  // ==========================================
  await t.test('SEC-11.1: getExhaustedDeliveries strictly isolates tenant backlogs', async () => {
    // Create an exhausted delivery for Fleet A
    const exhaustedJobA = await db.orm.public.DeliveryJob.create({
      id: uuidv4(),
      providerId: platformFleetA.id,
      pickupAddress: 'Exhausted Job A Pickup',
      pickupLat: 4.9757,
      pickupLng: 8.3417,
      dropoffAddress: 'Exhausted Job A Dropoff',
      dropoffLat: 4.9612,
      dropoffLng: 8.3276,
      status: 'DISPATCHED',
      sourceType: 'DIRECT_DELIVERY',
      sourceId: uid('exhaust-a'),
    });
    await db.orm.public.DeliveryDispatch.create({
      id: uuidv4(),
      deliveryJobId: exhaustedJobA.id,
      providerId: platformFleetA.id,
      status: 'REJECTED',
      attempt: 1,
    });

    // Create an exhausted delivery for Merchant B
    const exhaustedJobB = await db.orm.public.DeliveryJob.create({
      id: uuidv4(),
      providerId: privateMerchantB.id,
      pickupAddress: 'Exhausted Job B Pickup',
      pickupLat: 4.9757,
      pickupLng: 8.3417,
      dropoffAddress: 'Exhausted Job B Dropoff',
      dropoffLat: 4.9612,
      dropoffLng: 8.3276,
      status: 'DISPATCHED',
      sourceType: 'DIRECT_DELIVERY',
      sourceId: uid('exhaust-b'),
    });
    await db.orm.public.DeliveryDispatch.create({
      id: uuidv4(),
      deliveryJobId: exhaustedJobB.id,
      providerId: privateMerchantB.id,
      status: 'REJECTED',
      attempt: 1,
    });

    // 1. Fleet A operator requests default backlog
    setActiveUserToken(fleetAdminActor.token);
    const fleetABacklog = await getExhaustedDeliveries({});
    const hasJobA = fleetABacklog.some(j => j.id === exhaustedJobA.id);
    const hasJobB = fleetABacklog.some(j => j.id === exhaustedJobB.id);

    assert.strictEqual(hasJobA, true, 'Fleet A operator must see Fleet A exhausted delivery');
    assert.strictEqual(hasJobB, false, 'Fleet A operator MUST NOT see Merchant B exhausted delivery');

    // 2. Fleet A operator requests Fleet B explicitly -> FORBIDDEN
    await assert.rejects(
      getExhaustedDeliveries({ providerId: privateMerchantB.id }),
      (err: any) => err.message.includes('FORBIDDEN')
    );

    // 3. System admin requests backlog -> Sees both
    setActiveUserToken(systemAdminActor.token);
    const adminBacklog = await getExhaustedDeliveries({});
    assert.strictEqual(adminBacklog.some(j => j.id === exhaustedJobA.id), true);
    assert.strictEqual(adminBacklog.some(j => j.id === exhaustedJobB.id), true);

    setActiveUserToken(null);
  });

  // ==========================================
  // STAGE 4 — SEC-12: Fail-Closed Operations Authorization
  // ==========================================
  await t.test('SEC-12.1: Empty or missing fleet allowlist fails closed', async () => {
    const saved = process.env.CITYOS_FLEET_ORG_IDS;
    try {
      // 1. Missing allowlist
      delete process.env.CITYOS_FLEET_ORG_IDS;
      setActiveUserToken(fleetAdminActor.token);

      await assert.rejects(
        requireOperationsStaff(),
        (err: any) => err.message.includes('FORBIDDEN')
      );

      // 2. Empty allowlist
      process.env.CITYOS_FLEET_ORG_IDS = '   ';
      await assert.rejects(
        requireOperationsStaff(),
        (err: any) => err.message.includes('FORBIDDEN')
      );
    } finally {
      process.env.CITYOS_FLEET_ORG_IDS = saved;
      setActiveUserToken(null);
    }
  });

  // ==========================================
  // STAGE 5 — SEC-13: Inactive Vehicle Candidate Exclusion
  // ==========================================
  await t.test('SEC-13.1: Rider with inactive or maintenance vehicle is excluded before dispatch', async () => {
    // Put driver1 online with active vehicle
    setActiveUserToken(riderActor1.token);
    await checkInRider({
      driverProfileId: driver1.id,
      latitude: 4.9757,
      longitude: 8.3417,
    });
    setActiveUserToken(null);

    // Reassign driver1 to maintenance vehicle
    await db.orm.public.LogisticsDriverProfile.where({ id: driver1.id }).update({
      currentVehicleId: maintenanceVehicle.id,
    });

    const candidateJob = await db.orm.public.DeliveryJob.create({
      id: uuidv4(),
      providerId: platformFleetA.id,
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

    const candidatesRes = await findNetworkCandidates({
      deliveryJobId: candidateJob.id,
      pickup: { latitude: 4.9757, longitude: 8.3417 },
      dropoff: { latitude: 4.9612, longitude: 8.3276 },
    });

    // Driver 1 must NOT be in candidate list because vehicle is in MAINTENANCE
    assert.strictEqual(candidatesRes.candidates.length, 0, 'Driver with maintenance vehicle must be excluded');

    const dispatchRes = await dispatchNetworkJob({
      deliveryJobId: candidateJob.id,
      pickup: { latitude: 4.9757, longitude: 8.3417 },
      dropoff: { latitude: 4.9612, longitude: 8.3276 },
    });

    assert.strictEqual(dispatchRes.success, false);
    assert.strictEqual(dispatchRes.outcome, 'NO_RIDER_AVAILABLE');
    assert.strictEqual(dispatchRes.partnerFallbackEligible, false);

    // Restore vehicle1
    await db.orm.public.LogisticsDriverProfile.where({ id: driver1.id }).update({
      currentVehicleId: vehicle1.id,
    });
  });

  // ==========================================
  // STAGE 6 — SEC-14: Concurrency Hardening
  // ==========================================
  await t.test('SEC-14.1: Competing concurrent accepts on same job serialize on row lock', async () => {
    const raceJob = await db.orm.public.DeliveryJob.create({
      id: uuidv4(),
      providerId: platformFleetA.id,
      pickupAddress: 'Race Pickup',
      pickupLat: 4.9757,
      pickupLng: 8.3417,
      dropoffAddress: 'Race Dropoff',
      dropoffLat: 4.9612,
      dropoffLng: 8.3276,
      status: 'DISPATCHED',
      sourceType: 'DIRECT_DELIVERY',
      sourceId: uid('race-1'),
    });

    const raceDispatch = await db.orm.public.DeliveryDispatch.create({
      id: uuidv4(),
      deliveryJobId: raceJob.id,
      providerId: platformFleetA.id,
      status: 'OFFERED',
      attempt: 1,
    });

    // Driver 1 and Driver 2 race to accept
    const [res1, res2] = await Promise.allSettled([
      acceptDispatch({
        dispatchId: raceDispatch.id,
        driverProfileId: driver1.id,
        providerId: platformFleetA.id,
      }),
      acceptDispatch({
        dispatchId: raceDispatch.id,
        driverProfileId: driver2.id,
        providerId: platformFleetA.id,
      }),
    ]);

    const activeAssignments = await db.orm.public.DeliveryAssignment.where({
      deliveryJobId: raceJob.id,
      status: 'ACCEPTED',
    }).all();

    assert.strictEqual(activeAssignments.length, 1, 'Database must commit exactly one active assignment');
    assert.strictEqual(
      [res1.status, res2.status].filter(s => s === 'fulfilled').length,
      1,
      'Exactly one accept call must succeed'
    );
  });

  await t.test('SEC-14.2: Simultaneous dispatch attempts on job with existing providerId acquire row lock', async () => {
    const dispatchJob = await db.orm.public.DeliveryJob.create({
      id: uuidv4(),
      providerId: platformFleetA.id, // providerId is ALREADY populated
      pickupAddress: 'Concurrent Dispatch Pickup',
      pickupLat: 4.9757,
      pickupLng: 8.3417,
      dropoffAddress: 'Concurrent Dispatch Dropoff',
      dropoffLat: 4.9612,
      dropoffLng: 8.3276,
      status: 'CREATED',
      sourceType: 'DIRECT_DELIVERY',
      sourceId: uid('disp-race'),
    });

    const [disp1, disp2] = await Promise.allSettled([
      dispatchDelivery({
        deliveryJobId: dispatchJob.id,
        providerId: platformFleetA.id,
        driverProfileId: driver1.id,
        vehicleId: vehicle1.id,
      }),
      dispatchDelivery({
        deliveryJobId: dispatchJob.id,
        providerId: platformFleetA.id,
        driverProfileId: driver2.id,
        vehicleId: vehicle2.id,
      }),
    ]);

    const dispatches = await db.orm.public.DeliveryDispatch.where({
      deliveryJobId: dispatchJob.id,
    }).all();

    const activeDispatches = dispatches.filter((d: any) => ['PENDING', 'OFFERED'].includes(d.status));
    assert.strictEqual(activeDispatches.length, 1, 'Database must commit exactly one active dispatch');
    assert.strictEqual(
      [disp1.status, disp2.status].filter(s => s === 'fulfilled').length,
      1,
      'Exactly one dispatch call must succeed'
    );
  });
});
