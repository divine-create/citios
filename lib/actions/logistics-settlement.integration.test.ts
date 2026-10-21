import { test } from 'node:test';
import * as assert from 'node:assert';
import { createRequire } from 'module';
import { encode } from 'next-auth/jwt';
import { authOptions } from '../auth';
import { db } from '../../src/prisma/db';
import { LogisticsDomainError } from './logistics-domain';

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

// Reusing test utilities
import { createDeliveryJob } from './logistics-domain';
import { dispatchDelivery, acceptDispatch } from './logistics-dispatch';
import { arriveAtPickup, confirmPickup, enterTransit, arriveAtDropoff, completeDelivery, closeWorkflow } from './logistics-operations';
import { calculateDeliveryQuote, offerQuote, acceptQuote } from './logistics-pricing';
import { settleDelivery } from './logistics-settlement';

function generateId() {
  return crypto.randomUUID();
}

async function setupProviderAndDriver() {
  const providerId = generateId();
  await db.orm.public.Organization.create({ id: providerId, name: 'Settlement Logistics', type: 'LOGISTICS' });

  // Create authenticated user with membership
  const person = await db.orm.public.Person.create({
    id: generateId(),
    firstName: 'Admin',
    lastName: 'User',
  });
  await db.orm.public.PersonIdentifier.create({
    personId: person.id,
    type: 'EMAIL',
    normalizedValue: `admin-${person.id.slice(0, 8)}@test.com`,
    isVerified: true,
  });
  await db.orm.public.Account.create({
    personId: person.id,
    isActive: true,
  });
  const membership = await db.orm.public.Membership.create({
    personId: person.id,
    organizationId: providerId,
  });
  await db.orm.public.MembershipRole.create({
    membershipId: membership.id,
    role: 'OWNER',
  });
  const token = await encode({
    token: {
      email: `admin-${person.id.slice(0, 8)}@test.com`,
      name: 'Admin User',
      personId: person.id,
      memberships: [{ organizationId: providerId, organizationType: 'LOGISTICS' as any, role: 'OWNER' as any }],
    },
    secret: (authOptions.secret as string) || process.env.NEXTAUTH_SECRET || 'super_secret_cityconnect_key_2026_!@#',
  });
  setActiveUserToken(token);

  // Add pricing rule so calculateDeliveryQuote works
  await db.orm.public.DeliveryPricingRule.create({
    providerId,
    version: 1,
    currency: 'USD',
    baseFee: '5.00',
    perKmRate: '1.50',
    perKgRate: '0.00',
    prioritySurcharge: '1.25',
    isActive: true,
  });

  // Add platform fee to 15%
  await db.orm.public.LogisticsSettings.create({
    organizationId: providerId,
    platformFeeRate: "0.15"
  });

  const fleetId = generateId();
  await db.orm.public.LogisticsFleet.create({ id: fleetId, providerId, name: 'Settlement Fleet' });

  const personId = generateId();
  await db.orm.public.Person.create({ id: personId, firstName: 'Test', lastName: 'Driver' });
  
  const driverProfileId = generateId();
  await db.orm.public.LogisticsDriverProfile.create({
    id: driverProfileId,
    providerId,
    personId,
    status: 'ONLINE',
    onboardingComplete: true
  });

  return { providerId, fleetId, driverProfileId };
}

async function setupCompletedDelivery() {
  const { providerId, driverProfileId } = await setupProviderAndDriver();
  
  const job = await createDeliveryJob({
    providerId, sourceType: 'RESTAURANT_ORDER', sourceId: generateId(),
    dropoffAddress: 'B', idempotencyKey: generateId()
  });

  const quote = await calculateDeliveryQuote({
    deliveryJobId: job.id,
    providerId,
    distanceKm: 5.5
  });
  await offerQuote(quote.id, providerId);
  await acceptQuote(quote.id, providerId);
  await db.orm.public.DeliveryJob.where({ id: job.id }).update({ status: 'CREATED' });

  const dispatch = await dispatchDelivery({ deliveryJobId: job.id, providerId, idempotencyKey: generateId() });
  await acceptDispatch({ dispatchId: dispatch.id, providerId, driverProfileId });

  await arriveAtPickup({ deliveryJobId: job.id, providerId, driverProfileId });
  await confirmPickup({ deliveryJobId: job.id, providerId, driverProfileId });
  await enterTransit({ deliveryJobId: job.id, providerId, driverProfileId });
  await arriveAtDropoff({ deliveryJobId: job.id, providerId, driverProfileId });
  await completeDelivery({ deliveryJobId: job.id, providerId, driverProfileId, type: 'SIGNATURE' });
  await closeWorkflow({ deliveryJobId: job.id, providerId });

  return { providerId, driverProfileId, job, quoteId: quote.id };
}

test('LogisticsOS Phase 5 Settlement Integration Tests', async (t) => {
  await t.test('Test 1 — Successful Settlement & Ledger Entry', async () => {
    const { providerId, job, quoteId } = await setupCompletedDelivery();
    
    const settlement = await settleDelivery({ providerId, deliveryJobId: job.id });
    
    assert.strictEqual(settlement.status, 'SETTLED');
    assert.ok(settlement.transactionId);
    
    // Check fee calculation (15% platform fee)
    // base charge = 5.00, distance = 5.5 * 1.50 = 8.25. total = 13.25
    // 15% of 13.25 = 1.9875 -> 1.99
    // provider amount = 13.25 - 1.99 = 11.26
    
    assert.strictEqual(Number(settlement.grossAmount).toFixed(2), '13.25');
    assert.strictEqual(Number(settlement.fees).toFixed(2), '1.99');
    assert.strictEqual(Number(settlement.providerAmount).toFixed(2), '11.26');

    // Ledger checks
    const wallet = await db.orm.public.Wallet.where({ organizationId: providerId }).all();
    assert.strictEqual(wallet.length, 1);
    assert.strictEqual(wallet[0].balance, 11.26);

    const entries = await db.orm.public.LedgerEntry.where({ walletId: wallet[0].id }).all();
    assert.strictEqual(entries.length, 1);
    assert.strictEqual(entries[0].amount, 11.26);
  });

  await t.test('Test 2 — Cannot settle uncompleted delivery', async () => {
    const { providerId, driverProfileId } = await setupProviderAndDriver();
    const job = await createDeliveryJob({
      providerId, sourceType: 'RESTAURANT_ORDER', sourceId: generateId(),
      dropoffAddress: 'B', idempotencyKey: 'idem123'
    });

    await assert.rejects(
      settleDelivery({ providerId, deliveryJobId: job.id }),
      /Cannot settle DeliveryJob/
    );
  });

  await t.test('Test 3 — Idempotency prevents duplicate side effects', async () => {
    const { providerId, job } = await setupCompletedDelivery();
    const idemKey = generateId();

    const s1 = await settleDelivery({ providerId, deliveryJobId: job.id, idempotencyKey: idemKey });
    const s2 = await settleDelivery({ providerId, deliveryJobId: job.id, idempotencyKey: idemKey });

    assert.strictEqual(s1.id, s2.id);

    const wallet = await db.orm.public.Wallet.where({ organizationId: providerId }).all();
    assert.strictEqual(wallet[0].balance, 11.26); // Balance shouldn't double
  });

  await t.test('Test 4 — Reject different idempotency key for same job', async () => {
    const { providerId, job } = await setupCompletedDelivery();
    await settleDelivery({ providerId, deliveryJobId: job.id, idempotencyKey: generateId() });

    await assert.rejects(
      settleDelivery({ providerId, deliveryJobId: job.id, idempotencyKey: generateId() }),
      /already settled/
    );
  });

  await t.test('Test 5 — Provider isolation enforcement', async () => {
    const { job } = await setupCompletedDelivery();
    const badProvider = generateId();
    await db.orm.public.Organization.create({ id: badProvider, name: 'Bad Logistics', type: 'LOGISTICS' });

    await assert.rejects(
      settleDelivery({ providerId: badProvider, deliveryJobId: job.id }),
      /isolation violation|FORBIDDEN/
    );
  });

  await t.test('Test 6 — Concurrent OCC Race', async () => {
    const { providerId, job } = await setupCompletedDelivery();

    const results = await Promise.allSettled([
      settleDelivery({ providerId, deliveryJobId: job.id }),
      settleDelivery({ providerId, deliveryJobId: job.id })
    ]);

    const successes = results.filter(r => r.status === 'fulfilled');
    const failures = results.filter(r => r.status === 'rejected');

    assert.strictEqual(successes.length, 1);
    assert.strictEqual(failures.length, 1);
  });
});
