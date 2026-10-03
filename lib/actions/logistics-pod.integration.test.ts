import { test } from 'node:test';
import * as assert from 'node:assert';
import { db } from '../../src/prisma/db';
import { LogisticsDomainError } from './logistics-domain';
import { completeDelivery } from './logistics-operations';

// Reusing test utilities
import { createDeliveryJob, assignDelivery } from './logistics-domain';
import { dispatchDelivery, acceptDispatch } from './logistics-dispatch';
import { arriveAtPickup, confirmPickup, enterTransit, arriveAtDropoff } from './logistics-operations';

function generateId() {
  return crypto.randomUUID();
}

async function setupProviderAndDriver() {
  const providerId = generateId();
  await db.orm.public.Organization.create({ id: providerId, name: 'POD Logistics', type: 'LOGISTICS' });

  const fleetId = generateId();
  await db.orm.public.LogisticsFleet.create({ id: fleetId, providerId, name: 'POD Fleet' });

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

async function setupDeliveryToDropoff() {
  const { providerId, fleetId, driverProfileId } = await setupProviderAndDriver();
  
  const job = await createDeliveryJob({
    providerId, sourceType: 'RESTAURANT_ORDER', sourceId: generateId(),
    dropoffAddress: 'B', idempotencyKey: generateId()
  });

  const dispatch = await dispatchDelivery({ deliveryJobId: job.id, providerId, idempotencyKey: generateId() });
  console.log('DISPATCH providerId:', dispatch.providerId, 'PARAMS providerId:', providerId); await acceptDispatch({ dispatchId: dispatch.id, providerId, driverProfileId });
  // removed assignDelivery

  await arriveAtPickup({ deliveryJobId: job.id, providerId, driverProfileId });
  await confirmPickup({ deliveryJobId: job.id, providerId, driverProfileId });
  await enterTransit({ deliveryJobId: job.id, providerId, driverProfileId });
  await arriveAtDropoff({ deliveryJobId: job.id, providerId, driverProfileId });

  return { providerId, driverProfileId, job };
}

test('LogisticsOS Phase 4.1 POD Integration Tests', async (t) => {
  
  await t.test('Test 1 — POD Creation & Lifecycle', async () => {
    const { providerId, driverProfileId, job } = await setupDeliveryToDropoff();

    const result = await completeDelivery({
      deliveryJobId: job.id,
      providerId,
      driverProfileId,
      type: 'SIGNATURE',
      recipientName: 'John Doe',
      notes: 'Left at front door'
    });

    assert.strictEqual(result.job.status, 'DELIVERED');
    assert.ok(result.proofOfDelivery);
    assert.strictEqual(result.proofOfDelivery.type, 'SIGNATURE');
    assert.strictEqual(result.proofOfDelivery.recipientName, 'John Doe');
    
    const dbPod = await db.orm.public.ProofOfDelivery.where({ deliveryJobId: job.id }).all();
    assert.strictEqual(dbPod.length, 1);
    assert.strictEqual(dbPod[0].providerId, providerId);

    const tracking = await db.orm.public.DeliveryTrackingEvent.where({ deliveryJobId: job.id, eventType: 'DELIVERED' }).all();
    assert.strictEqual(tracking.length, 1);
  });

  await t.test('Test 2 — POD Duplicate Protection & Idempotency', async () => {
    const { providerId, driverProfileId, job } = await setupDeliveryToDropoff();
    const idemKey = generateId();

    const r1 = await completeDelivery({
      deliveryJobId: job.id, providerId, driverProfileId,
      type: 'PHOTO', idempotencyKey: idemKey
    });

    // Idempotent retry succeeds and returns same record
    const r2 = await completeDelivery({
      deliveryJobId: job.id, providerId, driverProfileId,
      type: 'PHOTO', idempotencyKey: idemKey
    });
    
    assert.strictEqual(r1.proofOfDelivery!.id, r2.proofOfDelivery!.id);

    // Concurrent exact duplicate using new key will hit state check or unique constraint
    await assert.rejects(
      completeDelivery({
        deliveryJobId: job.id, providerId, driverProfileId,
        type: 'PIN', idempotencyKey: generateId()
      }),
      /Cannot perform DELIVERED/
    );

    const dbPod = await db.orm.public.ProofOfDelivery.where({ deliveryJobId: job.id }).all();
    assert.strictEqual(dbPod.length, 1); // Exactly one POD in DB
  });

  await t.test('Test 3 — POD Authorization & Provider Isolation', async () => {
    const { providerId, driverProfileId, job } = await setupDeliveryToDropoff();
    const { providerId: provider2Id, driverProfileId: driver2Id } = await setupProviderAndDriver();

    // Wrong provider
    await assert.rejects(
      completeDelivery({
        deliveryJobId: job.id, providerId: provider2Id, driverProfileId, type: 'SIGNATURE'
      }),
      /(mismatch|not authorized)/
    );

    // Wrong driver
    await assert.rejects(
      completeDelivery({
        deliveryJobId: job.id, providerId, driverProfileId: driver2Id, type: 'SIGNATURE'
      }),
      /(mismatch|not authorized)/
    );
  });

  await t.test('Test 4 — Concurrency / OCC', async () => {
    const { providerId, driverProfileId, job } = await setupDeliveryToDropoff();

    const p1 = completeDelivery({ deliveryJobId: job.id, providerId, driverProfileId, type: 'SIG_1' });
    const p2 = completeDelivery({ deliveryJobId: job.id, providerId, driverProfileId, type: 'SIG_2' });

    const results = await Promise.allSettled([p1, p2]);
    const succeeded = results.filter(r => r.status === 'fulfilled');
    const failed = results.filter(r => r.status === 'rejected');

    assert.strictEqual(succeeded.length, 1);
    assert.strictEqual(failed.length, 1);

    const dbPod = await db.orm.public.ProofOfDelivery.where({ deliveryJobId: job.id }).all();
    assert.strictEqual(dbPod.length, 1);
  });

});
