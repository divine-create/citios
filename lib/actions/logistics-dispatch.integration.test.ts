/**
 * LogisticsOS Phase 2 Integration Tests
 */
import test from 'node:test';
import assert from 'node:assert';
import { v4 as uuidv4 } from 'uuid';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set to run integration tests.');
}

import { db } from '../../src/prisma/db';
import { createDeliveryJob } from './logistics-domain';
import {
  dispatchDelivery,
  acceptDispatch,
  rejectDispatch,
  expireDispatch,
  findEligibleCandidates
} from './logistics-dispatch';

const uid = (p: string) => `${p}_${uuidv4().substring(0, 8)}`;

async function makeProvider(name: string) {
  return await db.orm.public.Organization.create({ name, type: 'LOGISTICS' });
}
async function makePerson(firstName: string) {
  return await db.orm.public.Person.create({ firstName, lastName: 'Test' });
}
async function makeDriver(providerId: string, personId: string) {
  return await db.orm.public.LogisticsDriverProfile.create({
    providerId,
    personId,
    status: 'ONLINE',
    onboardingComplete: true
  });
}
async function makeVehicle(providerId: string) {
  return await db.orm.public.LogisticsVehicle.create({
    providerId,
    type: 'VAN',
    licensePlate: uid('VEH'),
    status: 'ACTIVE'
  });
}
async function makeJob(providerId: string, idempotencyKey: string) {
  return await createDeliveryJob({
    providerId,
    sourceType: 'RETAIL_ORDER',
    sourceId: uid('src'),
    idempotencyKey,
    dropoffAddress: '123 Test St',
  });
}

test('LogisticsOS Phase 2 Dispatch Integration Tests', async (t) => {

  await t.test('Test 1 — Dispatch creation, lifecycle, and idempotency', async () => {
    const prov = await makeProvider('Prov-D1');
    const job = await makeJob(prov.id, uid('idem'));
    
    // Create dispatch
    const dispatch1 = await dispatchDelivery({
      deliveryJobId: job.id,
      providerId: prov.id,
      idempotencyKey: 'idem-1'
    });
    assert.strictEqual(dispatch1.status, 'PENDING');
    assert.strictEqual(dispatch1.attempt, 1);
    
    // Idempotency check
    const dispatch2 = await dispatchDelivery({
      deliveryJobId: job.id,
      providerId: prov.id,
      idempotencyKey: 'idem-1'
    });
    assert.strictEqual(dispatch1.id, dispatch2.id, 'Idempotency returns same dispatch');
    
    // Concurrent dispatch for same job without idempotency key should throw
    const r = await dispatchDelivery({
      deliveryJobId: job.id,
      providerId: prov.id
    }).catch(e => ({ error: e.message }));
    assert.ok(r.error?.includes('active dispatch'), 'Cannot create second active dispatch');
    
    // Check job status
    const updatedJob = await db.orm.public.DeliveryJob.where({ id: job.id }).all().first();
    assert.strictEqual(updatedJob.status, 'DISPATCHED');
  });

  await t.test('Test 2 — Find eligible candidates and Accept dispatch', async () => {
    const prov = await makeProvider('Prov-D2');
    const p1 = await makePerson('D2');
    const driver = await makeDriver(prov.id, p1.id);
    const job = await makeJob(prov.id, uid('idem'));
    
    // Find candidates
    const candidates = await findEligibleCandidates({ deliveryJobId: job.id, providerId: prov.id });
    assert.ok(candidates.drivers.find((d: any) => d.id === driver.id), 'Driver should be eligible');
    
    // Dispatch
    const dispatch = await dispatchDelivery({
      deliveryJobId: job.id,
      providerId: prov.id,
      driverProfileId: driver.id
    });
    assert.strictEqual(dispatch.status, 'OFFERED');
    
    // Accept
    const { dispatch: acceptedDispatch, assignment } = await acceptDispatch({
      dispatchId: dispatch.id,
      driverProfileId: driver.id,
      providerId: prov.id
    });
    assert.strictEqual(acceptedDispatch.status, 'ACCEPTED');
    assert.strictEqual(assignment.driverProfileId, driver.id);
    
    const updatedJob = await db.orm.public.DeliveryJob.where({ id: job.id }).all().first();
    assert.strictEqual(updatedJob.status, 'ASSIGNED');
    
    // Find candidates again - driver should be excluded
    const candidates2 = await findEligibleCandidates({ deliveryJobId: job.id, providerId: prov.id });
    assert.ok(!candidates2.drivers.find((d: any) => d.id === driver.id), 'Driver is now excluded because they have an active assignment');
  });

  await t.test('Test 3 — Reject and expire', async () => {
    const prov = await makeProvider('Prov-D3');
    const p1 = await makePerson('D3');
    const driver = await makeDriver(prov.id, p1.id);
    const job1 = await makeJob(prov.id, uid('idem'));
    const job2 = await makeJob(prov.id, uid('idem'));
    
    const d1 = await dispatchDelivery({ deliveryJobId: job1.id, providerId: prov.id, driverProfileId: driver.id });
    const rejected = await rejectDispatch({ dispatchId: d1.id, providerId: prov.id, driverProfileId: driver.id });
    assert.strictEqual(rejected.status, 'REJECTED');
    
    const d2 = await dispatchDelivery({ deliveryJobId: job2.id, providerId: prov.id });
    const expired = await expireDispatch({ dispatchId: d2.id, providerId: prov.id });
    assert.strictEqual(expired.status, 'EXPIRED');
    
    // Redispatch job1 (Attempt 2)
    const redispatch = await dispatchDelivery({ deliveryJobId: job1.id, providerId: prov.id });
    assert.strictEqual(redispatch.attempt, 2);
  });

  await t.test('Test 4 — Provider isolation', async () => {
    const provA = await makeProvider('Prov-A');
    const provB = await makeProvider('Prov-B');
    const p1 = await makePerson('D-A');
    const driverA = await makeDriver(provA.id, p1.id);
    const jobA = await makeJob(provA.id, uid('idem'));
    
    const dispatch = await dispatchDelivery({ deliveryJobId: jobA.id, providerId: provA.id, driverProfileId: driverA.id });
    
    const r1 = await acceptDispatch({
      dispatchId: dispatch.id,
      driverProfileId: driverA.id,
      providerId: provB.id // Wrong provider
    }).catch(e => ({ error: e.message }));
    
    assert.ok(r1.error?.includes('Provider isolation violation'), 'Cross provider accept rejected');
  });

  await t.test('Test 5 — Concurrent Accept (Driver Contention)', async () => {
    // 2 drivers try to accept the same dispatch offer simultaneously
    // Actually, dispatch is either OFFERED to one driver, or PENDING for any driver.
    // Let's create a PENDING dispatch, both try to accept.
    const prov = await makeProvider('Prov-D5');
    const p1 = await makePerson('D5A');
    const p2 = await makePerson('D5B');
    const driver1 = await makeDriver(prov.id, p1.id);
    const driver2 = await makeDriver(prov.id, p2.id);
    const job = await makeJob(prov.id, uid('idem'));
    
    const dispatch = await dispatchDelivery({ deliveryJobId: job.id, providerId: prov.id });
    
    const accept1 = acceptDispatch({ dispatchId: dispatch.id, driverProfileId: driver1.id, providerId: prov.id })
      .catch((e: any) => ({ error: e.message }));
    const accept2 = acceptDispatch({ dispatchId: dispatch.id, driverProfileId: driver2.id, providerId: prov.id })
      .catch((e: any) => ({ error: e.message }));
      
    const results = await Promise.all([accept1, accept2]);
    const successes = results.filter((r: any) => !r.error);
    const errors = results.filter((r: any) => r.error);
    
    assert.strictEqual(successes.length, 1, 'Only one driver can accept');
    assert.strictEqual(errors.length, 1, 'One driver must fail');
  });

  await t.test('Test 6 — Concurrent Dispatch Creation (Race condition)', async () => {
    // 2 dispatch requests for the same job (without idempotency keys)
    const prov = await makeProvider('Prov-D6');
    const job = await makeJob(prov.id, uid('idem'));
    
    const d1 = dispatchDelivery({ deliveryJobId: job.id, providerId: prov.id })
      .catch((e: any) => ({ error: e.message }));
    const d2 = dispatchDelivery({ deliveryJobId: job.id, providerId: prov.id })
      .catch((e: any) => ({ error: e.message }));
      
    const results = await Promise.all([d1, d2]);
    const successes = results.filter((r: any) => !r.error);
    const errors = results.filter((r: any) => r.error);
    
    assert.strictEqual(successes.length, 1, 'Only one active dispatch can be created');
    assert.strictEqual(errors.length, 1, 'One must fail');
    
    // Verify only one active dispatch in DB
    const allDispatches = await db.orm.public.DeliveryDispatch.where({ deliveryJobId: job.id }).all();
    const active = allDispatches.filter((d: any) => ['PENDING', 'OFFERED'].includes(d.status));
    assert.strictEqual(active.length, 1, 'DB must have exactly 1 active dispatch');
  });

  await t.test('Cleanup', async () => {
    await db.close();
  });
});
