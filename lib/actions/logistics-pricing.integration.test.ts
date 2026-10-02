import test from 'node:test';
import assert from 'node:assert';
import { db } from '../../src/prisma/db';
import { LogisticsDomainError } from './logistics-domain';
import { calculateDeliveryQuote, offerQuote, acceptQuote, expireQuote, Money } from './logistics-pricing';
import { Temporal } from '@js-temporal/polyfill';

// Helper to clean db and setup test providers
async function setupTestEnvironment() {
  
  
  
  
  
  const providerA = await db.orm.public.Organization.create({
    name: 'Test Pricing Provider A', type: 'LOGISTICS'
  });
  
  const providerB = await db.orm.public.Organization.create({
    name: 'Test Pricing Provider B', type: 'LOGISTICS'
  });
  
  // Set up Pricing Rules for A
  await db.orm.public.DeliveryPricingRule.create({
    providerId: providerA.id,
    version: 1,
    currency: 'NGN',
    baseFee: '500.00',
    perKmRate: '150.50',
    perKgRate: '20.00',
    prioritySurcharge: '1000.00'
  });

  // Set up Pricing Rules for B
  await db.orm.public.DeliveryPricingRule.create({
    providerId: providerB.id,
    version: 1,
    currency: 'NGN',
    baseFee: '600.00',
    perKmRate: '120.00',
    perKgRate: '0.00',
    prioritySurcharge: '500.00'
  });

  return { providerA, providerB };
}

test('LogisticsOS Phase 4 Pricing Integration Tests', async (t) => {
  const { providerA, providerB } = await setupTestEnvironment();

  await t.test('Test 1 — Money Precision & Determinism', async () => {
    // ₦1250.50 should not become 1250.49999999
    const m = Money.fromMajor('1250.50');
    assert.strictEqual(m.toMajorString(), '1250.50');
    
    // float rounding test
    // 150.50 * 3.3 = 496.65
    const distanceMoney = Money.fromMajor('150.50').multiply(3.3);
    assert.strictEqual(distanceMoney.toMajorString(), '496.65');
  });

  await t.test('Test 2 — Basic Pricing Calculation & Determinism', async () => {
    const job = await db.orm.public.DeliveryJob.create({
      dropoffAddress: 'Test Dropoff',
      status: 'REQUESTED'
    });

    const quote1 = await calculateDeliveryQuote({
      deliveryJobId: job.id,
      providerId: providerA.id,
      distanceKm: 3.3, // 150.50 * 3.3 = 496.65
      weightKg: 2, // 20.00 * 2 = 40.00
      priority: false
    });

    // Subtotal: 500 (base) + 496.65 (dist) + 40.00 (weight) + 0 (priority) = 1036.65
    assert.strictEqual(quote1.status, 'CALCULATED');
    assert.strictEqual(quote1.baseCharge, '500.00');
    assert.strictEqual(quote1.distanceCharge, '496.65');
    assert.strictEqual(quote1.weightCharge, '40.00');
    assert.strictEqual(quote1.serviceCharge, '0.00');
    assert.strictEqual(quote1.subtotal, '1036.65');
    assert.strictEqual(quote1.total, '1036.65');

    const quote2 = await calculateDeliveryQuote({
      deliveryJobId: job.id,
      providerId: providerA.id,
      distanceKm: 3.3,
      weightKg: 2,
      priority: false
    });
    // Determinism - should be exact same outputs
    assert.strictEqual(quote1.total, quote2.total);
  });

  await t.test('Test 3 — Quote Idempotency & Provider Isolation', async () => {
    const job = await db.orm.public.DeliveryJob.create({ dropoffAddress: 'A', status: 'REQUESTED' });
    const key = `idem-${job.id}`;

    // Request quote from Provider A
    const quoteA1 = await calculateDeliveryQuote({
      deliveryJobId: job.id,
      providerId: providerA.id,
      distanceKm: 5,
      idempotencyKey: key
    });

    // Request again with same key -> should return existing
    const quoteA2 = await calculateDeliveryQuote({
      deliveryJobId: job.id,
      providerId: providerA.id,
      distanceKm: 999, // Conflicts in input should be ignored if idempotency hits and it doesn't do deep equality, wait, in implementation I throw if jobId mismatch, but otherwise return existing.
      idempotencyKey: key
    });
    
    assert.strictEqual(quoteA1.id, quoteA2.id);

    // Request quote from Provider B with same key -> should create new one isolated
    const quoteB1 = await calculateDeliveryQuote({
      deliveryJobId: job.id,
      providerId: providerB.id,
      distanceKm: 5,
      idempotencyKey: key
    });
    assert.notStrictEqual(quoteA1.id, quoteB1.id);

    // Idempotency conflict: Same key but different DeliveryJob
    const job2 = await db.orm.public.DeliveryJob.create({ dropoffAddress: 'B', status: 'REQUESTED' });
    await assert.rejects(
      calculateDeliveryQuote({
        deliveryJobId: job2.id,
        providerId: providerA.id,
        distanceKm: 5,
        idempotencyKey: key
      }),
      /Quote conflict/
    );
  });

  await t.test('Test 4 — Lifecycle & Validation', async () => {
    const job = await db.orm.public.DeliveryJob.create({ dropoffAddress: 'Test', status: 'REQUESTED' });
    const quote = await calculateDeliveryQuote({
      deliveryJobId: job.id,
      providerId: providerA.id,
      distanceKm: 1
    });

    // CALCULATED -> ACCEPTED directly (Invalid)
    await assert.rejects(acceptQuote(quote.id, providerA.id), /Invalid transition/);

    // CALCULATED -> OFFERED
    const offered = await offerQuote(quote.id, providerA.id);
    assert.strictEqual(offered?.status, 'OFFERED');

    // OFFERED -> ACCEPTED
    const accepted = await acceptQuote(quote.id, providerA.id);
    assert.strictEqual(accepted?.status, 'ACCEPTED');

    // Job should be PRICED
    const updatedJob = (await db.orm.public.DeliveryJob.where({ id: job.id }).all())[0];
    assert.strictEqual(updatedJob?.status, 'PRICED');

    // ACCEPTED -> EXPIRED (Invalid)
    await assert.rejects(expireQuote(quote.id, providerA.id), /Invalid transition/);
  });

  await t.test('Test 5 — Expired Quotes', async () => {
    const job = await db.orm.public.DeliveryJob.create({ dropoffAddress: 'Test', status: 'REQUESTED' });
    const quote = await calculateDeliveryQuote({
      deliveryJobId: job.id,
      providerId: providerA.id,
      distanceKm: 1
    });

    await expireQuote(quote.id, providerA.id);
    const expired = (await db.orm.public.DeliveryQuote.where({ id: quote.id }).all())[0];
    assert.strictEqual(expired?.status, 'EXPIRED');

    // Cannot accept expired
    await assert.rejects(acceptQuote(quote.id, providerA.id), /expired quote/);
  });

  await t.test('Test 6 — Concurrency (Optimistic Concurrency Control)', async () => {
    const job = await db.orm.public.DeliveryJob.create({ dropoffAddress: 'Test', status: 'REQUESTED' });
    const quote = await calculateDeliveryQuote({
      deliveryJobId: job.id,
      providerId: providerA.id,
      distanceKm: 1
    });

    await offerQuote(quote.id, providerA.id);

    // Concurrent accept vs expire
    const results = await Promise.allSettled([
      acceptQuote(quote.id, providerA.id),
      expireQuote(quote.id, providerA.id)
    ]);

    const successes = results.filter(r => r.status === 'fulfilled');
    const failures = results.filter(r => r.status === 'rejected');

    assert.strictEqual(successes.length, 1);
    assert.strictEqual(failures.length, 1);
    assert.match((failures[0] as PromiseRejectedResult).reason.message, /Invalid transition/);
  });
});
