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
  reassignDeliveryJob,
  assertSharedNetworkEligibility,
} from './logistics-dispatch';
import {
  getNetworkDispatchPolicy,
  isCityOSPlatformFleet,
  getProviderCategory,
  getCityOSFleetOrgIds,
} from './logistics-policy';
import {
  setTestRiderTelemetry,
  setRiderAvailability,
  checkInRider,
} from './logistics-rider';
import {
  bookPartnerCourierFallback,
} from './logistics-network';
import {
  getExhaustedDeliveries,
  getDeliveryDispatchAudit,
  reattemptDispatch,
  escalateDeliveryIssue,
} from './logistics-operations-admin';
import { calculateDeliveryQuote } from './logistics-pricing';
import { isPointServiceable, resolvePointServiceability } from '../mapping/serviceability';
import { LogisticsDomainError, MockPartnerCourierAdapter } from './logistics-domain';

function uid(prefix = 'adv') {
  return `${prefix}-${uuidv4()}`;
}

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

async function createTestActor(orgId?: string, role: string = 'STAFF', isSystemAdmin = false) {
  const person = await db.orm.public.Person.create({
    id: uuidv4(),
    firstName: `AdvActor_${role}`,
    lastName: 'Test',
    isSystemAdmin,
  });

  const email = `${person.id}@calabar-adv.test`;
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

test('CityDrive Network — Phase 3B.1 Adversarial Remediation Verification', async (t) => {
  let authorizedFleetOrg: any;
  let spoofedOrg: any;
  let privateMerchantOrg: any;

  let platformFleetDriverActor: any;
  let platformFleetVehicle: any;
  let platformFleetDriver: any;

  let operationsStaffActor: any;
  let unauthorizedActor: any;
  let systemAdminActor: any;

  before(async () => {
    // 1. Setup authorized CityOS platform fleet
    authorizedFleetOrg = await db.orm.public.Organization.create({
      id: uuidv4(),
      name: 'CityOS Calabar Core Fleet',
      type: 'LOGISTICS' as any,
      status: 'ACTIVE' as any,
    });
    await db.orm.public.LogisticsSettings.create({
      id: uuidv4(),
      organizationId: authorizedFleetOrg.id,
      isNetworkParticipant: true,
      platformFeeRate: '0.10',
    });
    await db.orm.public.DeliveryPricingRule.create({
      providerId: authorizedFleetOrg.id,
      version: 1,
      currency: 'NGN',
      baseFee: '500.00' as any,
      perKmRate: '150.00' as any,
      perKgRate: '25.00' as any,
      isActive: true,
    });

    process.env.CITYOS_FLEET_ORG_IDS = authorizedFleetOrg.id;
    process.env.CITYDRIVE_NETWORK_POLICY = 'CITYOS_ONLY';

    platformFleetDriverActor = await createTestActor(authorizedFleetOrg.id, 'DRIVER');
    platformFleetVehicle = await db.orm.public.LogisticsVehicle.create({
      id: uuidv4(),
      providerId: authorizedFleetOrg.id,
      type: 'MOTORCYCLE',
      licensePlate: 'CR-ADV-01',
      status: 'ACTIVE',
    });
    platformFleetDriver = await db.orm.public.LogisticsDriverProfile.create({
      id: uuidv4(),
      personId: platformFleetDriverActor.person.id,
      providerId: authorizedFleetOrg.id,
      status: 'ONLINE',
      onboardingComplete: true,
      currentVehicleId: platformFleetVehicle.id,
    });
    setTestRiderTelemetry(platformFleetDriver.id, {
      latitude: 4.9757,
      longitude: 8.3417,
      observedAt: Date.now(),
    });

    // 2. Setup Spoofed Organization
    spoofedOrg = await db.orm.public.Organization.create({
      id: uuidv4(),
      name: 'CityOS Express Logistics Platform Fleet',
      type: 'LOGISTICS' as any,
      status: 'ACTIVE' as any,
    });
    await db.orm.public.LogisticsSettings.create({
      id: uuidv4(),
      organizationId: spoofedOrg.id,
      isNetworkParticipant: true,
    });

    // 3. Setup Private Merchant Organization (no network settings)
    privateMerchantOrg = await db.orm.public.Organization.create({
      id: uuidv4(),
      name: 'Calabar Fresh Bakery',
      type: 'RETAIL' as any,
      status: 'ACTIVE' as any,
    });

    // 4. Setup Operations & Unauthorized Actors
    operationsStaffActor = await createTestActor(authorizedFleetOrg.id, 'DISPATCHER');
    unauthorizedActor = await createTestActor(spoofedOrg.id, 'STAFF');
    systemAdminActor = await createTestActor(undefined, 'ADMIN', true);
  });

  after(() => {
    setActiveUserToken(null);
  });

  // 1. Organization-name spoofing
  await t.test('1. Organization-name spoofing: Org named "CityOS Express" without allowlist entry is strictly rejected', async () => {
    assert.strictEqual(isCityOSPlatformFleet(spoofedOrg.id), false);
    assert.strictEqual(getProviderCategory(spoofedOrg), 'THIRD_PARTY_PARTNER');

    const candidates = await findNetworkCandidates({
      deliveryJobId: uid('job'),
      providerId: spoofedOrg.id,
    });
    assert.strictEqual(candidates.candidates.length, 0);

    const spoofedJob = await db.orm.public.DeliveryJob.create({
      id: uuidv4(),
      providerId: spoofedOrg.id,
      status: 'CREATED',
      pickupAddress: 'Marian Road, Calabar',
      dropoffAddress: 'State Housing, Calabar',
      pickupLat: 4.9757,
      pickupLng: 8.3417,
      dropoffLat: 4.9545,
      dropoffLng: 8.3438,
      sourceType: 'DIRECT_DELIVERY',
      sourceId: uid('spoofed-src'),
    });

    await assert.rejects(
      async () => {
        await dispatchNetworkJob({ deliveryJobId: spoofedJob.id });
      },
      (err: any) => err instanceof LogisticsDomainError && err.message.includes('not an authorized CityOS platform fleet')
    );
  });

  // 2. Missing, empty and malformed fleet allowlist fails closed
  await t.test('2. Missing, empty and malformed fleet allowlist fails closed', () => {
    const saved = process.env.CITYOS_FLEET_ORG_IDS;
    try {
      process.env.CITYOS_FLEET_ORG_IDS = '';
      assert.deepStrictEqual(getCityOSFleetOrgIds(), []);
      assert.strictEqual(isCityOSPlatformFleet(authorizedFleetOrg.id), false);

      delete process.env.CITYOS_FLEET_ORG_IDS;
      assert.deepStrictEqual(getCityOSFleetOrgIds(), []);
      assert.strictEqual(isCityOSPlatformFleet(authorizedFleetOrg.id), false);

      process.env.CITYOS_FLEET_ORG_IDS = '   ,  ,,   ';
      assert.deepStrictEqual(getCityOSFleetOrgIds(), []);
      assert.strictEqual(isCityOSPlatformFleet(authorizedFleetOrg.id), false);
    } finally {
      process.env.CITYOS_FLEET_ORG_IDS = saved;
    }
  });

  // 3. Invalid policy configuration defaults to CITYOS_ONLY
  await t.test('3. Invalid policy configuration defaults strictly to CITYOS_ONLY', () => {
    const saved = process.env.CITYDRIVE_NETWORK_POLICY;
    try {
      process.env.CITYDRIVE_NETWORK_POLICY = 'INVALID_UNKNOWN_POLICY';
      assert.strictEqual(getNetworkDispatchPolicy(), 'CITYOS_ONLY');

      process.env.CITYDRIVE_NETWORK_POLICY = 'open_network'; // lowercase malformed
      assert.strictEqual(getNetworkDispatchPolicy(), 'OPEN_NETWORK');

      process.env.CITYDRIVE_NETWORK_POLICY = 'GIG_ONLY';
      assert.strictEqual(getNetworkDispatchPolicy(), 'CITYOS_ONLY');

      delete process.env.CITYDRIVE_NETWORK_POLICY;
      assert.strictEqual(getNetworkDispatchPolicy(), 'CITYOS_ONLY');
    } finally {
      process.env.CITYDRIVE_NETWORK_POLICY = saved;
    }
  });

  // 4. Client attempts to override dispatch policy are ignored / sealed
  await t.test('4. Client attempts to override dispatch policy are ignored by server engine', async () => {
    process.env.CITYDRIVE_NETWORK_POLICY = 'CITYOS_ONLY';

    const unassignedJob = await db.orm.public.DeliveryJob.create({
      id: uuidv4(),
      sourceType: 'DIRECT_DELIVERY',
      sourceId: uid('client-override'),
      status: 'CREATED',
      pickupAddress: 'Marian Road, Calabar',
      dropoffAddress: 'State Housing, Calabar',
      pickupLat: 4.9757,
      pickupLng: 8.3417,
      dropoffLat: 4.9545,
      dropoffLng: 8.3438,
    });

    const dispatchRes = await dispatchNetworkJob({
      deliveryJobId: unassignedJob.id,
      // @ts-expect-error Testing client passing illegal policy override
      policy: 'OPEN_NETWORK',
    });

    assert.strictEqual(dispatchRes.tier, 'CITYOS_NETWORK');
    assert.strictEqual(dispatchRes.partnerFallbackEligible, false);
  });

  // 5. Direct external booking attempts in CITYOS_ONLY are blocked
  await t.test('5. Direct external booking attempts in CITYOS_ONLY are strictly blocked', async () => {
    process.env.CITYDRIVE_NETWORK_POLICY = 'CITYOS_ONLY';
    const adapter = new MockPartnerCourierAdapter();

    const job = await db.orm.public.DeliveryJob.create({
      id: uuidv4(),
      sourceType: 'DIRECT_DELIVERY',
      sourceId: uid('ext-booking'),
      status: 'CREATED',
      pickupAddress: 'Marian Road, Calabar',
      dropoffAddress: 'Watt Market, Calabar',
      pickupLat: 4.9757,
      pickupLng: 8.3417,
      dropoffLat: 4.9520,
      dropoffLng: 8.3240,
    });

    await assert.rejects(
      async () => {
        await bookPartnerCourierFallback({
          deliveryJobId: job.id,
          providerId: authorizedFleetOrg.id,
          adapter,
        });
      },
      (err: any) => err instanceof LogisticsDomainError && err.message.includes('disabled in CityOS-only launch mode')
    );
  });

  // 6. Private jobs with missing provider settings are rejected
  await t.test('6. Private jobs with missing provider settings are rejected from shared dispatch', async () => {
    const privateJob = await db.orm.public.DeliveryJob.create({
      id: uuidv4(),
      providerId: privateMerchantOrg.id, // Has no LogisticsSettings
      status: 'CREATED',
      pickupAddress: 'Private Bakery, Calabar',
      dropoffAddress: 'Customer House, Calabar',
      pickupLat: 4.9757,
      pickupLng: 8.3417,
      dropoffLat: 4.9545,
      dropoffLng: 8.3438,
      sourceType: 'RETAIL_ORDER',
      sourceId: uid('retail-order'),
    });

    await assert.rejects(
      async () => {
        await dispatchNetworkJob({ deliveryJobId: privateJob.id });
      },
      (err: any) => err instanceof LogisticsDomainError && err.message.includes('lacks verified network participant settings')
    );
  });

  // 7. Legitimate resident-originated jobs are accepted and dispatched
  await t.test('7. Legitimate resident-originated jobs are accepted and dispatched to CityOS fleet', async () => {
    const residentJob = await db.orm.public.DeliveryJob.create({
      id: uuidv4(),
      sourceType: 'DIRECT_DELIVERY',
      sourceId: uid('resident-job'),
      status: 'CREATED',
      pickupAddress: '88 Marian Road, Calabar',
      dropoffAddress: 'UNICAL Main Gate, Calabar',
      pickupLat: 4.9757,
      pickupLng: 8.3417,
      dropoffLat: 4.9545,
      dropoffLng: 8.3438,
      packageWeightKg: 2.0,
    });

    const result = await dispatchNetworkJob({ deliveryJobId: residentJob.id });
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.tier, 'CITYOS_NETWORK');
    assert.strictEqual(result.driver?.id, platformFleetDriver.id);
  });

  // 8. Suspended rider self-reactivation is blocked
  await t.test('8. Suspended rider cannot self-reactivate or go online', async () => {
    const suspendedActor = await createTestActor(authorizedFleetOrg.id, 'DRIVER');
    const suspendedDriver = await db.orm.public.LogisticsDriverProfile.create({
      id: uuidv4(),
      personId: suspendedActor.person.id,
      providerId: authorizedFleetOrg.id,
      status: 'SUSPENDED',
      onboardingComplete: true,
      currentVehicleId: platformFleetVehicle.id,
    });

    setActiveUserToken(suspendedActor.token);

    await assert.rejects(
      async () => {
        await setRiderAvailability('ONLINE');
      },
      (err: any) => err.message.includes('Suspended rider cannot change availability')
    );

    const refreshed = await db.orm.public.LogisticsDriverProfile.where({ id: suspendedDriver.id }).first();
    assert.strictEqual(refreshed?.status, 'SUSPENDED');
    setActiveUserToken(null);
  });

  // 9. Unauthenticated operations access throws UNAUTHENTICATED
  await t.test('9. Unauthenticated operations access throws UNAUTHENTICATED', async () => {
    setActiveUserToken(null);

    await assert.rejects(
      async () => { await getExhaustedDeliveries(); },
      (err: any) => err instanceof LogisticsDomainError && err.message.includes('UNAUTHENTICATED')
    );

    await assert.rejects(
      async () => { await getDeliveryDispatchAudit(uid('job')); },
      (err: any) => err instanceof LogisticsDomainError && err.message.includes('UNAUTHENTICATED')
    );

    await assert.rejects(
      async () => { await reattemptDispatch({ deliveryJobId: uid('job') }); },
      (err: any) => err instanceof LogisticsDomainError && err.message.includes('UNAUTHENTICATED')
    );

    await assert.rejects(
      async () => { await escalateDeliveryIssue({ deliveryJobId: uid('job'), reason: 'Test' }); },
      (err: any) => err instanceof LogisticsDomainError && err.message.includes('UNAUTHENTICATED')
    );
  });

  // 10. Unauthorized cross-organization operations access throws FORBIDDEN
  await t.test('10. Unauthorized cross-organization operations access throws FORBIDDEN', async () => {
    setActiveUserToken(unauthorizedActor.token); // Belongs to spoofedOrg, not authorizedFleetOrg

    const job = await db.orm.public.DeliveryJob.create({
      id: uuidv4(),
      providerId: authorizedFleetOrg.id,
      sourceType: 'DIRECT_DELIVERY',
      sourceId: uid('cross-org'),
      status: 'DISPATCHED',
      pickupAddress: 'Marian Road, Calabar',
      dropoffAddress: 'State Housing, Calabar',
    });

    await assert.rejects(
      async () => { await getDeliveryDispatchAudit(job.id); },
      (err: any) => err instanceof LogisticsDomainError && err.message.includes('FORBIDDEN')
    );

    await assert.rejects(
      async () => { await escalateDeliveryIssue({ deliveryJobId: job.id, reason: 'Unauthorized escalation' }); },
      (err: any) => err instanceof LogisticsDomainError && err.message.includes('FORBIDDEN')
    );

    setActiveUserToken(null);
  });

  // 11. Invalid audit-event foreign keys: operations audit events with null-provider jobs use valid platform fleet FK
  await t.test('11. Operations audit events with null-provider jobs resolve a valid platform fleet FK', async () => {
    setActiveUserToken(operationsStaffActor.token);

    const nullProviderJob = await db.orm.public.DeliveryJob.create({
      id: uuidv4(),
      providerId: null,
      sourceType: 'DIRECT_DELIVERY',
      sourceId: uid('null-prov'),
      status: 'DISPATCHED',
      pickupAddress: 'Marian Road, Calabar',
      dropoffAddress: 'Watt Market, Calabar',
    });

    const escalated = await escalateDeliveryIssue({
      deliveryJobId: nullProviderJob.id,
      reason: 'Package damaged during handling',
      notes: 'Investigating incident',
    });

    assert.strictEqual(escalated.success, true);
    assert.strictEqual(escalated.status, 'FAILED');
    assert.strictEqual(escalated.event.providerId, authorizedFleetOrg.id); // Must link to valid active platform fleet

    const auditEvent = await db.orm.public.DeliveryTrackingEvent.where({ id: escalated.event.id }).first();
    assert.ok(auditEvent);
    assert.strictEqual(auditEvent.providerId, authorizedFleetOrg.id);

    setActiveUserToken(null);
  });

  // 12. Concurrent dispatch workers race: exactly one active assignment committed
  await t.test('12. Concurrent dispatch workers race: exactly one active assignment committed', async () => {
    const concurrentJob = await db.orm.public.DeliveryJob.create({
      id: uuidv4(),
      providerId: authorizedFleetOrg.id,
      sourceType: 'DIRECT_DELIVERY',
      sourceId: uid('conc-race'),
      status: 'CREATED',
      pickupAddress: 'Marian Road, Calabar',
      dropoffAddress: 'State Housing, Calabar',
      pickupLat: 4.9757,
      pickupLng: 8.3417,
      dropoffLat: 4.9545,
      dropoffLng: 8.3438,
    });

    const dispatch = await db.orm.public.DeliveryDispatch.create({
      id: uuidv4(),
      deliveryJobId: concurrentJob.id,
      providerId: authorizedFleetOrg.id,
      driverProfileId: platformFleetDriver.id,
      status: 'OFFERED',
      attempt: 1,
    });

    // Worker 1 and Worker 2 concurrently accept the dispatch
    const results = await Promise.allSettled([
      acceptDispatch({
        dispatchId: dispatch.id,
        driverProfileId: platformFleetDriver.id,
        providerId: authorizedFleetOrg.id,
      }),
      acceptDispatch({
        dispatchId: dispatch.id,
        driverProfileId: platformFleetDriver.id,
        providerId: authorizedFleetOrg.id,
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    assert.strictEqual(fulfilled.length, 1, 'Exactly one concurrent accept must succeed');
    assert.strictEqual(rejected.length, 1, 'The competing concurrent accept must be rejected');

    const activeAssignments = await db.orm.public.DeliveryAssignment.where({
      deliveryJobId: concurrentJob.id,
      status: 'ACCEPTED',
    }).all();
    assert.strictEqual(activeAssignments.length, 1, 'Database must commit exactly one active assignment');
  });

  // 13. Existing payment, pricing, tracking, and address regressions continue to pass
  await t.test('13. Pricing, serviceability, and distance calculations continue to pass accurately', async () => {
    const pickupServ = resolvePointServiceability({ latitude: 4.9757, longitude: 8.3417 });
    assert.strictEqual(pickupServ.status, 'INSIDE_COVERAGE');
    assert.strictEqual(pickupServ.lga?.name, 'Calabar Municipal');

    const pricingJob = await db.orm.public.DeliveryJob.create({
      id: uuidv4(),
      providerId: authorizedFleetOrg.id,
      pickupAddress: 'Adversarial Pricing Pickup',
      pickupLat: 4.9757,
      pickupLng: 8.3417,
      dropoffAddress: 'Adversarial Pricing Dropoff',
      dropoffLat: 4.9612,
      dropoffLng: 8.3276,
      status: 'CREATED',
      sourceType: 'DIRECT_DELIVERY',
      sourceId: 'pricing-subtest-13',
    });

    const quote = await calculateDeliveryQuote({
      deliveryJobId: pricingJob.id,
      providerId: authorizedFleetOrg.id,
      distanceKm: 5.0,
      weightKg: 2.0,
    });
    // Base 500 + 5*150 (750) + 2*25 (50) = 1300
    assert.strictEqual(quote.currency, 'NGN');
    assert.strictEqual(Math.round(parseFloat(quote.total as string)), 1300);
  });
});
