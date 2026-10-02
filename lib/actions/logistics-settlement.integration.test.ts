import { test } from 'node:test';
import * as assert from 'node:assert';
import { db } from '../../src/prisma/db';
import { LogisticsDomainError } from './logistics-domain';

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
    platformFeeRate: 0.15
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
    pickupAddress: 'A', dropoffAddress: 'B', idempotencyKey: generateId()
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
      pickupAddress: 'A', dropoffAddress: 'B'
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
      /isolation violation/
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
