import test from 'node:test';
import assert from 'node:assert';
import { createRequire } from 'module';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import '@js-temporal/polyfill';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set to run integration tests.');
}
process.env.NEXTAUTH_URL = 'http://localhost:3000';

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

function toTemporal(date: Date) {
  return (globalThis as any).Temporal.Instant.fromEpochMilliseconds(date.getTime());
}

import { db } from '../../src/prisma/db';
import { authOptions } from '../auth';
import { encode } from 'next-auth/jwt';
import { resolveLogisticsTenant, assertProviderAccess } from './logistics-tenant';
import { updatePricingRule, getProviderPricingRules } from './logistics-pricing';
import { settleDelivery, getProviderSettlementSummary } from './logistics-settlement';
import { createDeliveryJob, transitionDeliveryStatus } from './logistics-domain';
import { completeDelivery } from './logistics-operations';
import { isDeliveryOtpExpired } from './logistics-otp';
import { getPublicDeliveryTracking, maskPublicAddress } from './logistics-tracking';
import { verifyPartnerWebhookSignature, processPartnerWebhook } from './logistics-network';
import { syncLogisticsStatusToRestaurantOS } from './restaurant-logistics';

async function createAuthenticatedUser(orgId: string, role = 'OWNER', orgType: 'LOGISTICS' | 'RESTAURANT' = 'LOGISTICS', isActive = true) {
  const testId = uuidv4().substring(0, 8);
  const email = `security-audit-${testId}@example.com`;

  const person = await db.orm.public.Person.create({
    id: uuidv4(),
    firstName: 'SecTest',
    lastName: `User-${testId}`,
  });

  await db.orm.public.PersonIdentifier.create({
    personId: person.id,
    type: 'EMAIL',
    normalizedValue: email,
    isVerified: true,
  });

  const account = await db.orm.public.Account.create({
    personId: person.id,
    isActive,
  });

  const membership = await db.orm.public.Membership.create({
    personId: person.id,
    organizationId: orgId,
  });

  await db.orm.public.MembershipRole.create({
    membershipId: membership.id,
    role,
  });

  const token = await encode({
    token: {
      email,
      name: `SecTest User ${testId}`,
      personId: person.id,
      memberships: [
        {
          organizationId: orgId,
          organizationType: orgType as any,
          role: role as any,
        },
      ],
    },
    secret: (authOptions.secret as string) || process.env.NEXTAUTH_SECRET || 'super_secret_cityconnect_key_2026_!@#',
  });

  return { person, account, membership, token, email };
}

test('CityDrive Security & Production Hardening Suite', async (t) => {
  // 1. Setup isolated Organizations A & B
  const orgA = await db.orm.public.Organization.create({
    id: uuidv4(),
    name: `SecureCarrier Alpha ${uuidv4().slice(0, 6)}`,
    type: 'LOGISTICS' as any,
    status: 'ACTIVE',
  });

  const orgB = await db.orm.public.Organization.create({
    id: uuidv4(),
    name: `Infiltrator Logistics ${uuidv4().slice(0, 6)}`,
    type: 'LOGISTICS' as any,
    status: 'ACTIVE',
  });

  const nonLogisticsOrg = await db.orm.public.Organization.create({
    id: uuidv4(),
    name: `Non Logistics Bakery ${uuidv4().slice(0, 6)}`,
    type: 'RESTAURANT' as any,
    status: 'ACTIVE',
  });

  const userA = await createAuthenticatedUser(orgA.id, 'OWNER');
  const userB = await createAuthenticatedUser(orgB.id, 'OWNER');

  await t.test('SEC-00: Strict Tenant Authorization & resolveLogisticsTenant Boundaries', async () => {
    // 1. Unauthenticated request must return UNAUTHENTICATED
    setActiveUserToken(null);
    const unauthRes = await resolveLogisticsTenant();
    assert.strictEqual(unauthRes.authorized, false);
    if (!unauthRes.authorized) {
      assert.strictEqual(unauthRes.error, 'UNAUTHENTICATED');
    }

    // 2. Unauthenticated assertProviderAccess must throw UNAUTHORIZED
    await assert.rejects(
      async () => {
        await assertProviderAccess(orgA.id);
      },
      /UNAUTHORIZED/,
      'Unauthenticated caller must be rejected by assertProviderAccess'
    );

    // 3. User with only non-logistics membership must return NO_LOGISTICS_MEMBERSHIP
    const nonLogisticsUser = await createAuthenticatedUser(nonLogisticsOrg.id, 'OWNER', 'RESTAURANT');
    setActiveUserToken(nonLogisticsUser.token);
    const noLogRes = await resolveLogisticsTenant();
    assert.strictEqual(noLogRes.authorized, false);
    if (!noLogRes.authorized) {
      assert.strictEqual(noLogRes.error, 'NO_LOGISTICS_MEMBERSHIP');
    }

    // 4. Inactive account must be denied
    const inactiveUser = await createAuthenticatedUser(orgA.id, 'OWNER', 'LOGISTICS', false);
    setActiveUserToken(inactiveUser.token);
    const inactiveRes = await resolveLogisticsTenant();
    assert.strictEqual(inactiveRes.authorized, false);
    if (!inactiveRes.authorized) {
      assert.strictEqual(inactiveRes.error, 'UNAUTHENTICATED');
    }

    // 5. User A requesting Org B (not their membership) must return FORBIDDEN_ORGANIZATION
    setActiveUserToken(userA.token);
    const forbiddenOrgRes = await resolveLogisticsTenant(orgB.id);
    assert.strictEqual(forbiddenOrgRes.authorized, false);
    if (!forbiddenOrgRes.authorized) {
      assert.strictEqual(forbiddenOrgRes.error, 'FORBIDDEN_ORGANIZATION');
    }

    // 6. User A accessing own Org A must succeed with exact provider object
    const validRes = await resolveLogisticsTenant(orgA.id);
    assert.strictEqual(validRes.authorized, true);
    if (validRes.authorized) {
      assert.strictEqual(validRes.provider.id, orgA.id);
      assert.ok(validRes.allLogisticsMemberships.length > 0);
    }

    // 7. assertProviderAccess enforces membership role boundary strictly
    const providerAccessRes = await assertProviderAccess(orgA.id);
    assert.ok(providerAccessRes.person);
    assert.strictEqual(providerAccessRes.person.id, userA.person.id);

    // User B trying to assert access on Org A must throw FORBIDDEN
    setActiveUserToken(userB.token);
    await assert.rejects(
      async () => {
        await assertProviderAccess(orgA.id);
      },
      /FORBIDDEN: User does not have a membership at organization/,
      'User B must never gain access to Org A via assertProviderAccess'
    );
  });

  await t.test('SEC-01: Multi-Tenant Pricing Rule Boundary Enforcement', async () => {
    // User A configures pricing for Org A
    setActiveUserToken(userA.token);
    const ruleA = await updatePricingRule({
      providerId: orgA.id,
      baseFee: 500,
      perKmRate: 100,
    });
    assert.strictEqual(ruleA.providerId, orgA.id);

    // User B attempts to tamper with Org A pricing -> MUST FAIL
    setActiveUserToken(userB.token);
    await assert.rejects(
      async () => {
        await updatePricingRule({
          providerId: orgA.id,
          baseFee: 10,
          perKmRate: 5,
        });
      },
      /FORBIDDEN: User does not have a membership at organization/,
      'Company B user must NOT be permitted to modify Company A pricing'
    );

    // User B attempts to query Org A pricing rules -> MUST FAIL
    await assert.rejects(
      async () => {
        await getProviderPricingRules(orgA.id);
      },
      /FORBIDDEN: User does not have a membership at organization/,
      'Company B user must NOT be permitted to inspect Company A pricing'
    );
  });

  await t.test('SEC-02: Multi-Tenant Settlement & Financial Isolation', async () => {
    // Org A setup wallet and job
    await db.orm.public.Wallet.create({
      id: uuidv4(),
      organizationId: orgA.id,
      currency: 'NGN',
      balance: 1000,
    });

    // User B attempts to view Org A settlement ledger -> MUST FAIL
    setActiveUserToken(userB.token);
    await assert.rejects(
      async () => {
        await getProviderSettlementSummary(orgA.id);
      },
      /FORBIDDEN: User does not have a membership at organization/,
      'Company B user must NOT access Company A settlement ledger'
    );

    // User A can view own settlement ledger
    setActiveUserToken(userA.token);
    const summaryA = await getProviderSettlementSummary(orgA.id);
    assert.ok(summaryA);
    assert.strictEqual(summaryA.currency, 'NGN');
  });

  await t.test('SEC-03: Proof-of-Delivery OTP Protection, At-Rest Hashing & Replay Defense', async () => {
    setActiveUserToken(userA.token);

    // Setup driver for Org A
    const driverPerson = await db.orm.public.Person.create({
      id: uuidv4(),
      firstName: 'Rider',
      lastName: 'Security',
    });
    const driver = await db.orm.public.LogisticsDriverProfile.create({
      id: uuidv4(),
      personId: driverPerson.id,
      providerId: orgA.id,
      status: 'ONLINE',
      onboardingComplete: true,
    });

    // 1. Create job with recipient OTP '839210'
    const secretOtp = '839210';
    const otpJob = await createDeliveryJob({
      providerId: orgA.id,
      sourceType: 'DIRECT_DELIVERY',
      sourceId: uuidv4(),
      idempotencyKey: `otp-test-${uuidv4()}`,
      dropoffAddress: 'House 14, Federal Housing Estate, Calabar',
      recipientOtp: secretOtp,
    });

    // Verify OTP is hashed at rest in the database
    const storedJob = await db.orm.public.DeliveryJob.where({ id: otpJob.id }).first();
    assert.ok(storedJob?.recipientOtp?.startsWith('sha256:'), 'OTP must be hashed at rest with sha256 prefix');
    assert.notStrictEqual(storedJob?.recipientOtp, secretOtp, 'Plaintext OTP must never reside in database');

    // Advance job to AT_DROPOFF
    await transitionDeliveryStatus(otpJob.id, 'CREATED', orgA.id);
    await transitionDeliveryStatus(otpJob.id, 'DISPATCHED', orgA.id);
    await db.orm.public.DeliveryAssignment.create({
      deliveryJobId: otpJob.id,
      driverProfileId: driver.id,
      status: 'ACCEPTED',
    });
    await transitionDeliveryStatus(otpJob.id, 'ASSIGNED', orgA.id);
    await transitionDeliveryStatus(otpJob.id, 'AT_PICKUP', orgA.id);
    await transitionDeliveryStatus(otpJob.id, 'PICKED_UP', orgA.id);
    await transitionDeliveryStatus(otpJob.id, 'IN_TRANSIT', orgA.id);
    await transitionDeliveryStatus(otpJob.id, 'AT_DROPOFF', orgA.id);

    // Test 1: Bypassing OTP by omitting otp param -> MUST FAIL
    await assert.rejects(
      async () => {
        await completeDelivery({
          deliveryJobId: otpJob.id,
          providerId: orgA.id,
          driverProfileId: driver.id,
          type: 'OTP',
          // otp intentionally omitted
        });
      },
      /Recipient OTP is required to complete this delivery/,
      'Omitting OTP on OTP-protected delivery must be rejected'
    );

    // Test 2: Bypassing OTP by sending whitespace -> MUST FAIL
    await assert.rejects(
      async () => {
        await completeDelivery({
          deliveryJobId: otpJob.id,
          providerId: orgA.id,
          driverProfileId: driver.id,
          type: 'OTP',
          otp: '   ',
        });
      },
      /Recipient OTP is required to complete this delivery/,
      'Whitespace OTP must be rejected'
    );

    // Test 3: Brute-force rate limiting: 5 failed attempts allowed, 6th locked out
    for (let attempt = 1; attempt <= 5; attempt++) {
      await assert.rejects(
        async () => {
          await completeDelivery({
            deliveryJobId: otpJob.id,
            providerId: orgA.id,
            driverProfileId: driver.id,
            type: 'OTP',
            otp: `00000${attempt}`,
          });
        },
        /Invalid recipient verification OTP/,
        `Attempt ${attempt} must be rejected with invalid OTP`
      );
    }

    // 6th attempt (even with the correct OTP) must be locked out
    await assert.rejects(
      async () => {
        await completeDelivery({
          deliveryJobId: otpJob.id,
          providerId: orgA.id,
          driverProfileId: driver.id,
          type: 'OTP',
          otp: secretOtp,
        });
      },
      /Maximum OTP verification attempts exceeded\. Delivery locked for security\./,
      'Account must be locked out from further OTP attempts after 5 failures'
    );

    // Test 4: OTP Consumption & Replay Prevention
    const replayDriverPerson = await db.orm.public.Person.create({
      id: uuidv4(),
      firstName: 'ReplayDriver',
      lastName: 'Security',
    });
    const replayDriver = await db.orm.public.LogisticsDriverProfile.create({
      id: uuidv4(),
      personId: replayDriverPerson.id,
      providerId: orgA.id,
      status: 'ONLINE',
      onboardingComplete: true,
    });

    const replaySecretOtp = '741258';
    const replayJob = await createDeliveryJob({
      providerId: orgA.id,
      sourceType: 'DIRECT_DELIVERY',
      sourceId: uuidv4(),
      idempotencyKey: `otp-replay-${uuidv4()}`,
      dropoffAddress: 'Plot 5, Marian Road, Calabar',
      recipientOtp: replaySecretOtp,
    });

    await transitionDeliveryStatus(replayJob.id, 'CREATED', orgA.id);
    await transitionDeliveryStatus(replayJob.id, 'DISPATCHED', orgA.id);
    await db.orm.public.DeliveryAssignment.create({
      deliveryJobId: replayJob.id,
      driverProfileId: replayDriver.id,
      status: 'ACCEPTED',
    });
    await transitionDeliveryStatus(replayJob.id, 'ASSIGNED', orgA.id);
    await transitionDeliveryStatus(replayJob.id, 'AT_PICKUP', orgA.id);
    await transitionDeliveryStatus(replayJob.id, 'PICKED_UP', orgA.id);
    await transitionDeliveryStatus(replayJob.id, 'IN_TRANSIT', orgA.id);
    await transitionDeliveryStatus(replayJob.id, 'AT_DROPOFF', orgA.id);

    // Complete successfully with correct OTP
    const completionRes = await completeDelivery({
      deliveryJobId: replayJob.id,
      providerId: orgA.id,
      driverProfileId: replayDriver.id,
      type: 'OTP',
      otp: replaySecretOtp,
    });
    assert.strictEqual(completionRes.job.status, 'DELIVERED');

    // Confirm recipientOtp is atomically cleared in DB
    const consumedJob = await db.orm.public.DeliveryJob.where({ id: replayJob.id }).first();
    assert.strictEqual(consumedJob?.recipientOtp, null, 'OTP must be atomically consumed upon successful completion');

    // Replay attempt must be rejected
    await assert.rejects(
      async () => {
        await completeDelivery({
          deliveryJobId: replayJob.id,
          providerId: orgA.id,
          driverProfileId: replayDriver.id,
          type: 'OTP',
          otp: replaySecretOtp,
        });
      },
      /Cannot perform DELIVERED from state DELIVERED|Proof of Delivery already exists/,
      'Replay of completed OTP delivery must fail'
    );

    // Test 5: OTP Expiry check logic
    const oldDate = new Date(Date.now() - 26 * 60 * 60 * 1000); // 26h ago
    assert.strictEqual(isDeliveryOtpExpired(oldDate, 24), true, 'OTP older than 24h must be expired');
    const recentDate = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2h ago
    assert.strictEqual(isDeliveryOtpExpired(recentDate, 24), false, 'Recent OTP must not be expired');
  });

  await t.test('SEC-04: Public Tracking Address Masking & Milestone Scrubbing', async () => {
    // 1. Direct unit test of maskPublicAddress across Nigerian address variations
    assert.strictEqual(
      maskPublicAddress('Flat 4B, 12 Marina Road, Victoria Island, Lagos'),
      '***, Marina Road, Victoria Island, Lagos'
    );
    assert.strictEqual(
      maskPublicAddress('42 Palm Avenue, Calabar'),
      '***, Palm Avenue, Calabar'
    );
    assert.strictEqual(
      maskPublicAddress('Airport Road'),
      '***, Airport Road'
    );
    assert.strictEqual(
      maskPublicAddress('House 14, Federal Housing Estate, Calabar'),
      '***, Federal Housing Estate, Calabar'
    );
    assert.strictEqual(
      maskPublicAddress('Suite 203, Block B, Silverbird Galleria, Central Area, Abuja'),
      '***, Silverbird Galleria, Central Area, Abuja'
    );
    assert.strictEqual(
      maskPublicAddress('Plot 88, Trans Amadi Industrial Layout, Port Harcourt'),
      '***, Trans Amadi Industrial Layout, Port Harcourt'
    );

    // 2. Integration test via getPublicDeliveryTracking DTO
    const jobWithAddress = await createDeliveryJob({
      providerId: orgA.id,
      sourceType: 'DIRECT_DELIVERY',
      sourceId: uuidv4(),
      idempotencyKey: `addr-test-${uuidv4()}`,
      dropoffAddress: 'Plot 88, Trans Amadi Industrial Layout, Port Harcourt',
      recipientPhone: '+2348011223344',
      recipientOtp: '998877',
    });

    const publicTracking = await getPublicDeliveryTracking(jobWithAddress.trackingReference!);
    assert.ok(publicTracking);
    assert.strictEqual(publicTracking.dropoffAddress, '***, Trans Amadi Industrial Layout, Port Harcourt');
    assert.ok(!publicTracking.dropoffAddress.includes('Plot 88'), 'Raw plot number must be masked');

    // Confirm public DTO strictly omits sensitive fields
    assert.strictEqual((publicTracking as any).recipientPhone, undefined, 'Recipient phone must never be in public DTO');
    assert.strictEqual((publicTracking as any).recipientOtp, undefined, 'Recipient OTP must never be in public DTO');
    assert.strictEqual((publicTracking as any).baseFee, undefined, 'Financial information must not be in public DTO');
  });

  await t.test('SEC-05: Webhook HMAC Signature Verification', async () => {
    const secret = 'super-secure-partner-webhook-key-2026';
    const payload = JSON.stringify({
      providerId: orgA.id,
      deliveryJobId: 'job-123',
      eventType: 'IN_TRANSIT',
    });

    const validSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    const tamperedPayload = JSON.stringify({
      providerId: orgA.id,
      deliveryJobId: 'job-123',
      eventType: 'DELIVERED', // tampered
    });

    // Valid signature passes
    assert.strictEqual(await verifyPartnerWebhookSignature(payload, validSig, secret), true);
    assert.strictEqual(await verifyPartnerWebhookSignature(payload, `sha256=${validSig}`, secret), true);

    // Tampered payload fails
    assert.strictEqual(await verifyPartnerWebhookSignature(tamperedPayload, validSig, secret), false);

    // Wrong secret fails
    assert.strictEqual(await verifyPartnerWebhookSignature(payload, validSig, 'wrong-secret'), false);

    // Empty signature fails
    assert.strictEqual(await verifyPartnerWebhookSignature(payload, '', secret), false);
  });

  await t.test('SEC-06: Webhook Monotonicity & Out-of-Order Regression Prevention', async () => {
    // Create delivery job and advance to DELIVERED
    const monoJob = await createDeliveryJob({
      providerId: orgA.id,
      sourceType: 'DIRECT_DELIVERY',
      sourceId: uuidv4(),
      idempotencyKey: `mono-test-${uuidv4()}`,
      dropoffAddress: 'Plot 10, Boundary Road, Calabar',
    });

    await transitionDeliveryStatus(monoJob.id, 'CREATED', orgA.id);
    await transitionDeliveryStatus(monoJob.id, 'DISPATCHED', orgA.id);
    await transitionDeliveryStatus(monoJob.id, 'ASSIGNED', orgA.id);
    await transitionDeliveryStatus(monoJob.id, 'AT_PICKUP', orgA.id);
    await transitionDeliveryStatus(monoJob.id, 'PICKED_UP', orgA.id);
    await transitionDeliveryStatus(monoJob.id, 'IN_TRANSIT', orgA.id);
    await transitionDeliveryStatus(monoJob.id, 'AT_DROPOFF', orgA.id);
    await transitionDeliveryStatus(monoJob.id, 'DELIVERED', orgA.id);

    // Incoming out-of-order partner webhook with event 'IN_TRANSIT'
    const outOfOrderResult = await processPartnerWebhook({
      providerId: orgA.id,
      deliveryJobId: monoJob.id,
      eventType: 'IN_TRANSIT',
      externalReference: 'EXT-LATE-123',
      notes: 'Delayed in-transit ping',
      idempotencyKey: `webhook-late-ping-${uuidv4()}`,
    });

    assert.strictEqual(outOfOrderResult.success, true);
    assert.strictEqual(outOfOrderResult.duplicate, false);

    // Ensure status remains DELIVERED (no regression to IN_TRANSIT)
    const refreshedJob = await db.orm.public.DeliveryJob.where({ id: monoJob.id }).first();
    assert.strictEqual(refreshedJob?.status, 'DELIVERED', 'Late IN_TRANSIT webhook must not regress DELIVERED status');

    // Duplicate webhook with same idempotencyKey returns duplicate: true
    const dupResult = await processPartnerWebhook({
      providerId: orgA.id,
      deliveryJobId: monoJob.id,
      eventType: 'IN_TRANSIT',
      externalReference: 'EXT-LATE-123',
      idempotencyKey: outOfOrderResult.event.idempotencyKey,
    });
    assert.strictEqual(dupResult.duplicate, true, 'Duplicate webhook idempotency key must be recognized');
  });

  await t.test('SEC-07: RestaurantOS Lifecycle Sync, Refund Handling & Monotonicity', async () => {
    // Create restaurant org & paid order
    const restOrg = await db.orm.public.Organization.create({
      id: uuidv4(),
      name: `Spice Garden ${uuidv4().slice(0, 6)}`,
      type: 'RESTAURANT' as any,
      status: 'ACTIVE',
    });

    const paidRestOrder = await db.orm.public.RestaurantOrder.create({
      id: uuidv4(),
      organizationId: restOrg.id,
      status: 'DELIVERING' as any,
      type: 'DELIVERY' as any,
      paymentStatus: 'COMPLETED' as any,
      totalAmount: 4500,
      orderNumber: 303,
    });

    // Create delivery job linked to restaurant order that failed
    const failedJob = await createDeliveryJob({
      providerId: orgA.id,
      sourceType: 'RESTAURANT_ORDER',
      sourceId: paidRestOrder.id,
      idempotencyKey: `rest-sync-fail-${paidRestOrder.id}`,
      dropoffAddress: '15 Target Road, Calabar',
    });

    await transitionDeliveryStatus(failedJob.id, 'CREATED', orgA.id);
    await transitionDeliveryStatus(failedJob.id, 'DISPATCHED', orgA.id);
    await transitionDeliveryStatus(failedJob.id, 'FAILED', orgA.id);

    // Sync status back to RestaurantOS
    await syncLogisticsStatusToRestaurantOS(failedJob.id);

    const updatedOrder = await db.orm.public.RestaurantOrder.where({ id: paidRestOrder.id }).first();
    assert.ok(updatedOrder);
    assert.strictEqual(updatedOrder.status, 'CANCELLED', 'Failed delivery must transition RestaurantOrder to CANCELLED');
    assert.strictEqual(updatedOrder.paymentStatus, 'REFUNDED', 'Paid order must transition paymentStatus to REFUNDED upon delivery failure');

    // Test completed order monotonicity: if order was COMPLETED, late failure cannot regress it
    const completedRestOrder = await db.orm.public.RestaurantOrder.create({
      id: uuidv4(),
      organizationId: restOrg.id,
      status: 'COMPLETED' as any,
      type: 'DELIVERY' as any,
      paymentStatus: 'COMPLETED' as any,
      totalAmount: 2000,
      orderNumber: 304,
    });

    const completedDeliveryJob = await createDeliveryJob({
      providerId: orgA.id,
      sourceType: 'RESTAURANT_ORDER',
      sourceId: completedRestOrder.id,
      idempotencyKey: `rest-sync-completed-${completedRestOrder.id}`,
      dropoffAddress: '16 Target Road, Calabar',
    });

    await transitionDeliveryStatus(completedDeliveryJob.id, 'CREATED', orgA.id);
    await transitionDeliveryStatus(completedDeliveryJob.id, 'DISPATCHED', orgA.id);
    await transitionDeliveryStatus(completedDeliveryJob.id, 'FAILED', orgA.id);

    await syncLogisticsStatusToRestaurantOS(completedDeliveryJob.id);

    const checkOrder = await db.orm.public.RestaurantOrder.where({ id: completedRestOrder.id }).first();
    assert.strictEqual(checkOrder?.status, 'COMPLETED', 'Already COMPLETED order must not regress to CANCELLED');
  });
});
