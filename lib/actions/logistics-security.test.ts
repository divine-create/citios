import test from 'node:test';
import assert from 'node:assert';
import { createRequire } from 'module';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

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

import { db } from '../../src/prisma/db';
import { authOptions } from '../auth';
import { encode } from 'next-auth/jwt';
import { updatePricingRule, getProviderPricingRules } from './logistics-pricing';
import { settleDelivery, getProviderSettlementSummary } from './logistics-settlement';
import { createDeliveryJob, transitionDeliveryStatus } from './logistics-domain';
import { completeDelivery } from './logistics-operations';
import { getPublicDeliveryTracking, maskPublicAddress } from './logistics-tracking';
import { verifyPartnerWebhookSignature } from './logistics-network';
import { syncLogisticsStatusToRestaurantOS } from './restaurant-logistics';

async function createAuthenticatedUser(orgId: string, role = 'OWNER') {
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

  await db.orm.public.Account.create({
    personId: person.id,
    isActive: true,
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
          organizationType: 'LOGISTICS' as any,
          role: role as any,
        },
      ],
    },
    secret: (authOptions.secret as string) || process.env.NEXTAUTH_SECRET || 'super_secret_cityconnect_key_2026_!@#',
  });

  return { person, membership, token, email };
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

  const userA = await createAuthenticatedUser(orgA.id, 'OWNER');
  const userB = await createAuthenticatedUser(orgB.id, 'OWNER');

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

  await t.test('SEC-03: Proof-of-Delivery OTP Bypass & Brute-Force Rate Limiting', async () => {
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

    // Create job with recipient OTP '839210'
    const secretOtp = '839210';
    const otpJob = await createDeliveryJob({
      providerId: orgA.id,
      sourceType: 'DIRECT_DELIVERY',
      sourceId: uuidv4(),
      idempotencyKey: `otp-test-${uuidv4()}`,
      dropoffAddress: 'House 14, Federal Housing Estate, Calabar',
      recipientOtp: secretOtp,
    });

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
  });

  await t.test('SEC-04: Public Tracking Address Masking & Milestone Scrubbing', async () => {
    // 1. Direct unit test of maskPublicAddress
    assert.strictEqual(
      maskPublicAddress('Flat 4B, 12 Marina Road, Victoria Island, Lagos'),
      '***, 12 Marina Road, Victoria Island, Lagos'
    );
    assert.strictEqual(
      maskPublicAddress('42 Palm Avenue, Calabar'),
      '***, Calabar'
    );
    assert.strictEqual(
      maskPublicAddress('Airport Road'),
      '*** Road'
    );

    // 2. Integration test via getPublicDeliveryTracking
    const jobWithAddress = await createDeliveryJob({
      providerId: orgA.id,
      sourceType: 'DIRECT_DELIVERY',
      sourceId: uuidv4(),
      idempotencyKey: `addr-test-${uuidv4()}`,
      dropoffAddress: 'Plot 88, Trans Amadi Industrial Layout, Port Harcourt',
    });

    const publicTracking = await getPublicDeliveryTracking(jobWithAddress.trackingReference!);
    assert.ok(publicTracking);
    assert.strictEqual(publicTracking.dropoffAddress, '***, Trans Amadi Industrial Layout, Port Harcourt');
    assert.ok(!publicTracking.dropoffAddress.includes('Plot 88'), 'Raw plot/unit number must be masked');
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

  await t.test('SEC-06: RestaurantOS Delivery Status Lifecycle Sync on Failure', async () => {
    // Create restaurant org & order
    const restOrg = await db.orm.public.Organization.create({
      id: uuidv4(),
      name: `Spice Garden ${uuidv4().slice(0, 6)}`,
      type: 'RESTAURANT' as any,
      status: 'ACTIVE',
    });

    const restOrder = await db.orm.public.RestaurantOrder.create({
      id: uuidv4(),
      organizationId: restOrg.id,
      status: 'DELIVERING' as any,
      type: 'DELIVERY' as any,
      totalAmount: 3200,
      orderNumber: 202,
    });

    // Create delivery job linked to restaurant order that failed
    const failedJob = await createDeliveryJob({
      providerId: orgA.id,
      sourceType: 'RESTAURANT_ORDER',
      sourceId: restOrder.id,
      idempotencyKey: `rest-sync-fail-${restOrder.id}`,
      dropoffAddress: '15 Target Road, Calabar',
    });

    await transitionDeliveryStatus(failedJob.id, 'CREATED', orgA.id);
    await transitionDeliveryStatus(failedJob.id, 'DISPATCHED', orgA.id);
    await transitionDeliveryStatus(failedJob.id, 'FAILED', orgA.id);

    // Sync status back to RestaurantOS
    await syncLogisticsStatusToRestaurantOS(failedJob.id);

    const updatedOrder = await db.orm.public.RestaurantOrder.where({ id: restOrder.id }).first();
    assert.ok(updatedOrder);
    assert.strictEqual(updatedOrder.status, 'CANCELLED', 'Failed delivery must transition RestaurantOrder to CANCELLED');
  });
});
