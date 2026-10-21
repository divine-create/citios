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

import { db } from '../../src/prisma/db';
import { authOptions } from '../auth';
import { encode } from 'next-auth/jwt';
import { resolveLogisticsTenant, assertProviderAccess } from './logistics-tenant';
import { createDeliveryJob, transitionDeliveryStatus } from './logistics-domain';
import { generateDeliveryOtp } from './logistics-otp';
import {
  arriveAtPickup,
  confirmPickup,
  enterTransit,
  arriveAtDropoff,
  completeDelivery,
  closeWorkflow,
  getDeliveryState,
} from './logistics-operations';
import { getPublicDeliveryTracking } from './logistics-tracking';
import { verifyPartnerWebhookSignature, processPartnerWebhook } from './logistics-network';
import { syncLogisticsStatusToRestaurantOS } from './restaurant-logistics';

async function createSmokeTenantUser(orgName: string) {
  const org = await db.orm.public.Organization.create({
    id: uuidv4(),
    name: orgName,
    type: 'LOGISTICS' as any,
    status: 'ACTIVE',
  });

  const testId = uuidv4().substring(0, 8);
  const email = `staging-smoke-${testId}@example.com`;

  const person = await db.orm.public.Person.create({
    id: uuidv4(),
    firstName: 'Smoke',
    lastName: `Operator-${testId}`,
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

  const membership = await db.orm.public.Membership.create({
    personId: person.id,
    organizationId: org.id,
  });

  await db.orm.public.MembershipRole.create({
    membershipId: membership.id,
    role: 'OWNER',
  });

  const token = await encode({
    token: {
      email,
      name: `Smoke Operator ${testId}`,
      personId: person.id,
      memberships: [
        {
          organizationId: org.id,
          organizationType: 'LOGISTICS' as any,
          role: 'OWNER' as any,
        },
      ],
    },
    secret: (authOptions.secret as string) || process.env.NEXTAUTH_SECRET || 'super_secret_cityconnect_key_2026_!@#',
  });

  return { org, person, membership, token, email };
}

test('CityDrive Controlled Staging Smoke Test Suite', async (t) => {
  // Setup 2 isolated staging tenants
  const tenantAlpha = await createSmokeTenantUser(`Staging Express Alpha ${uuidv4().slice(0, 6)}`);
  const tenantBeta = await createSmokeTenantUser(`Staging Express Beta ${uuidv4().slice(0, 6)}`);

  // Setup driver and fleet for Tenant Alpha
  const driverPerson = await db.orm.public.Person.create({
    id: uuidv4(),
    firstName: 'Staging',
    lastName: 'Rider',
  });
  const driverAlpha = await db.orm.public.LogisticsDriverProfile.create({
    id: uuidv4(),
    personId: driverPerson.id,
    providerId: tenantAlpha.org.id,
    status: 'ONLINE',
    onboardingComplete: true,
  });

  let smokeJobId: string;
  let smokeTrackingRef: string;
  const rawOtp = generateDeliveryOtp();

  await t.test('Smoke 1: Tenant-Bound Job Creation & Multi-Tenant Access Control', async () => {
    setActiveUserToken(tenantAlpha.token);

    // 1. Authorized user creates a job for Tenant Alpha
    const job = await createDeliveryJob({
      providerId: tenantAlpha.org.id,
      sourceType: 'DIRECT_DELIVERY',
      sourceId: uuidv4(),
      idempotencyKey: `smoke-job-${uuidv4()}`,
      pickupAddress: 'Plot 10, Murtala Mohammed Highway, Calabar',
      dropoffAddress: 'House 5, Marina Resort Road, Calabar',
      recipientOtp: rawOtp,
      recipientPhone: '+2348039998877',
      packageDescription: 'Medical Supplies Package',
      packageWeightKg: 2.5,
    });

    assert.ok(job.id);
    assert.strictEqual(job.providerId, tenantAlpha.org.id);
    assert.strictEqual(job.status, 'REQUESTED');
    smokeJobId = job.id;
    smokeTrackingRef = job.trackingReference!;

    // 2. Tenant Alpha authorized operator can inspect delivery state
    const alphaState = await getDeliveryState(smokeJobId, tenantAlpha.org.id);
    assert.strictEqual(alphaState.currentStatus, 'REQUESTED');
    assert.strictEqual(alphaState.job.providerId, tenantAlpha.org.id);

    // 3. Unauthorized Tenant Beta CANNOT access Tenant Alpha job (IDOR / Provider isolation)
    setActiveUserToken(tenantBeta.token);
    await assert.rejects(
      async () => {
        await getDeliveryState(smokeJobId, tenantBeta.org.id);
      },
      /Provider mismatch/,
      'Tenant Beta must not access Tenant Alpha job via provider mismatch'
    );

    // 4. Tenant Beta cannot assert access on Tenant Alpha
    await assert.rejects(
      async () => {
        await assertProviderAccess(tenantAlpha.org.id);
      },
      /FORBIDDEN/,
      'Tenant Beta cannot assert provider access on Tenant Alpha'
    );
  });

  await t.test('Smoke 2: End-to-End Operational Lifecycle & OTP Proof of Delivery', async () => {
    setActiveUserToken(tenantAlpha.token);

    // 1. Progress to CREATED and DISPATCHED
    await transitionDeliveryStatus(smokeJobId, 'CREATED', tenantAlpha.org.id);
    await transitionDeliveryStatus(smokeJobId, 'DISPATCHED', tenantAlpha.org.id);

    // 2. Assign driver
    await db.orm.public.DeliveryAssignment.create({
      deliveryJobId: smokeJobId,
      driverProfileId: driverAlpha.id,
      status: 'ACCEPTED',
    });
    await transitionDeliveryStatus(smokeJobId, 'ASSIGNED', tenantAlpha.org.id);

    // 3. Pickup -> In Transit -> Dropoff
    await arriveAtPickup({ deliveryJobId: smokeJobId, providerId: tenantAlpha.org.id, driverProfileId: driverAlpha.id });
    await confirmPickup({ deliveryJobId: smokeJobId, providerId: tenantAlpha.org.id, driverProfileId: driverAlpha.id });
    await enterTransit({ deliveryJobId: smokeJobId, providerId: tenantAlpha.org.id, driverProfileId: driverAlpha.id });
    await arriveAtDropoff({ deliveryJobId: smokeJobId, providerId: tenantAlpha.org.id, driverProfileId: driverAlpha.id });

    // 4. Attempt completion with wrong OTP -> MUST FAIL
    await assert.rejects(
      async () => {
        await completeDelivery({
          deliveryJobId: smokeJobId,
          providerId: tenantAlpha.org.id,
          driverProfileId: driverAlpha.id,
          type: 'OTP',
          otp: '999999',
        });
      },
      /Invalid recipient verification OTP/,
      'Invalid OTP must be rejected server-side'
    );

    // 5. Complete with valid OTP -> MUST SUCCEED
    const completionRes = await completeDelivery({
      deliveryJobId: smokeJobId,
      providerId: tenantAlpha.org.id,
      driverProfileId: driverAlpha.id,
      type: 'OTP',
      otp: rawOtp,
      recipientName: 'Recipient Verified',
    });
    assert.strictEqual(completionRes.job.status, 'DELIVERED');

    // 6. Verify OTP is atomically cleared from DB to prevent replay
    const completedJob = await db.orm.public.DeliveryJob.where({ id: smokeJobId }).first();
    assert.strictEqual(completedJob?.recipientOtp, null, 'OTP must be cleared from DB upon delivery');

    // 7. Close operational workflow
    const closedWorkflow = await closeWorkflow({
      deliveryJobId: smokeJobId,
      providerId: tenantAlpha.org.id,
    });
    assert.strictEqual(closedWorkflow.job.status, 'COMPLETED');
  });

  await t.test('Smoke 3: Public Tracking Privacy & Address Masking Verification', async () => {
    // Query public tracking endpoint by human-readable reference
    const tracking = await getPublicDeliveryTracking(smokeTrackingRef);
    assert.ok(tracking, 'Tracking reference must resolve public tracking DTO');
    assert.strictEqual(tracking.trackingReference, smokeTrackingRef);
    assert.strictEqual(tracking.status, 'COMPLETED');
    assert.strictEqual(tracking.isDelivered, true);

    // Verify address masking scrubs house number
    assert.strictEqual(tracking.dropoffAddress, '***, Marina Resort Road, Calabar');
    assert.ok(!tracking.dropoffAddress.includes('House 5'), 'House number must be masked');

    // Verify private recipient data is strictly omitted
    assert.strictEqual((tracking as any).recipientPhone, undefined, 'Phone must not leak in public tracking');
    assert.strictEqual((tracking as any).recipientOtp, undefined, 'OTP must not leak in public tracking');
    assert.strictEqual((tracking as any).notes, undefined, 'Private notes must not leak in public tracking');
  });

  await t.test('Smoke 4: Partner Webhook Authenticity, Idempotency & Freshness', async () => {
    const webhookSecret = 'smoke-test-webhook-secret-2026';
    const payload = JSON.stringify({
      providerId: tenantAlpha.org.id,
      deliveryJobId: smokeJobId,
      eventType: 'IN_TRANSIT',
    });

    const signature = crypto.createHmac('sha256', webhookSecret).update(payload).digest('hex');

    // 1. Signature validation
    const isValidSig = await verifyPartnerWebhookSignature(payload, signature, webhookSecret);
    assert.strictEqual(isValidSig, true, 'HMAC signature must verify');

    // 2. Tampered signature rejected
    const isTamperedSig = await verifyPartnerWebhookSignature(payload, 'bad-signature', webhookSecret);
    assert.strictEqual(isTamperedSig, false, 'Tampered HMAC signature must fail');

    // 3. Monotonicity: late IN_TRANSIT webhook does NOT regress COMPLETED job
    const webhookResult = await processPartnerWebhook({
      providerId: tenantAlpha.org.id,
      deliveryJobId: smokeJobId,
      eventType: 'IN_TRANSIT',
      externalReference: 'MOCK-COURIER-77',
      idempotencyKey: `smoke-webhook-${uuidv4()}`,
    });

    assert.strictEqual(webhookResult.success, true);
    assert.strictEqual(webhookResult.duplicate, false);

    const refreshedJob = await db.orm.public.DeliveryJob.where({ id: smokeJobId }).first();
    assert.strictEqual(refreshedJob?.status, 'COMPLETED', 'Completed job must never regress to IN_TRANSIT');
  });

  await t.test('Smoke 5: Diagnostic Error Logging & Redaction', async () => {
    // Ensure domain errors do not leak secrets or private data in error messages
    try {
      await getDeliveryState('non-existent-job', tenantAlpha.org.id);
      assert.fail('Expected error was not thrown');
    } catch (error: any) {
      assert.strictEqual(error.message, 'DeliveryJob not found');
      assert.ok(!error.message.includes('password'));
      assert.ok(!error.message.includes('secret'));
    }
  });
});
