import { test } from 'node:test';
import assert from 'node:assert';
import { db } from '../../src/prisma/db';
import { dispatchDelivery, rejectDispatch, expireDispatch, acceptDispatch } from './logistics-dispatch';
import { 
  findStuckDeliveries, 
  reconcileLogisticsSettlements, 
  getProviderDeliveryOverview, 
  getLogisticsHealthCheck 
} from './logistics-intelligence';

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

async function makeProvider(name: string) {
  return await db.orm.public.Organization.create({
    name,
    type: 'LOGISTICS' as any,
    status: 'ACTIVE',
  });
}

async function makePerson(name: string) {
  return await db.orm.public.Person.create({
    firstName: name,
    lastName: 'Test',
  });
}

async function makeDriver(provId: string, personId: string) {
  return await db.orm.public.LogisticsDriverProfile.create({
    providerId: provId,
    personId,
    status: 'ONLINE' as any,
  });
}

async function makeJob(provId: string) {
  return await db.orm.public.DeliveryJob.create({
    providerId: provId,
    status: 'CREATED' as any,
    dropoffAddress: '123 St',
  });
}

test('LogisticsOS Phase 7 Intelligence & Hardening Tests', async (t) => {

  await t.test('Test 1 - Dispatch Recovery (Reject -> Redispatch -> Accept)', async () => {
    const prov = await makeProvider(uid('Prov'));
    const p1 = await makePerson('D1');
    const p2 = await makePerson('D2');
    const driver1 = await makeDriver(prov.id, p1.id);
    const driver2 = await makeDriver(prov.id, p2.id);
    const job = await makeJob(prov.id);

    // 1. Dispatch to Driver 1
    const d1 = await dispatchDelivery({ deliveryJobId: job.id, providerId: prov.id, driverProfileId: driver1.id });
    
    // 2. Reject
    await rejectDispatch({ dispatchId: d1.id, providerId: prov.id, driverProfileId: driver1.id });
    
    // 3. Redispatch to Driver 2
    const d2 = await dispatchDelivery({ deliveryJobId: job.id, providerId: prov.id, driverProfileId: driver2.id });
    assert.notStrictEqual(d1.id, d2.id);

    // 4. Accept
    const { assignment } = await acceptDispatch({ dispatchId: d2.id, providerId: prov.id, driverProfileId: driver2.id });
    assert.strictEqual(assignment.driverProfileId, driver2.id);
  });

  await t.test('Test 2 - Dispatch Recovery (Expire -> Redispatch -> Accept)', async () => {
    const prov = await makeProvider(uid('Prov'));
    const p1 = await makePerson('D1');
    const driver1 = await makeDriver(prov.id, p1.id);
    const job = await makeJob(prov.id);

    // 1. Dispatch
    const d1 = await dispatchDelivery({ deliveryJobId: job.id, providerId: prov.id, driverProfileId: driver1.id });
    
    // 2. Expire
    await expireDispatch({ dispatchId: d1.id, providerId: prov.id });
    
    // 3. Redispatch
    const d2 = await dispatchDelivery({ deliveryJobId: job.id, providerId: prov.id });
    assert.strictEqual(d2.status, 'PENDING');
    
    // 4. Accept
    const { assignment } = await acceptDispatch({ dispatchId: d2.id, providerId: prov.id, driverProfileId: driver1.id });
    assert.strictEqual(assignment.driverProfileId, driver1.id);
  });

  await t.test('Test 3 - Stuck Delivery Detection', async () => {
    const prov = await makeProvider(uid('Prov'));
    const job1 = await makeJob(prov.id);
    const job2 = await makeJob(prov.id);
    
    // Fake job1 as DISPATCHED and very old
    await db.orm.public.DeliveryJob.where({ id: job1.id }).update({ status: 'DISPATCHED' });
    // Prisma Next doesn't easily let us update `createdAt` due to @default(now()), 
    // but let's test it by passing criteria with negative thresholds just for the test
    const stuck = await findStuckDeliveries({
      maxDispatchPendingMinutes: -1, // will flag anything older than future
    });
    
    const found = stuck.find(s => s.deliveryId === job1.id);
    assert.ok(found);
    assert.strictEqual(found.currentStatus, 'DISPATCHED');
  });

  await t.test('Test 4 - Settlement Reconciliation Service', async () => {
    // Just ensure it doesn't crash, we won't mock a full settlement failure state
    const discrepancies = await reconcileLogisticsSettlements();
    assert.ok(Array.isArray(discrepancies));
  });

  await t.test('Test 5 - Provider Analytics Intelligence', async () => {
    const prov = await makeProvider(uid('Prov'));
    const stats = await getProviderDeliveryOverview(prov.id);
    
    assert.strictEqual(stats.providerId, prov.id);
    assert.strictEqual(stats.deliveries.total, 0);
    assert.strictEqual(stats.dispatches.total, 0);
  });

  await t.test('Test 6 - Health Checks', async () => {
    const health = await getLogisticsHealthCheck();
    assert.strictEqual(health.databaseConnected, true);
    assert.strictEqual(health.schemaAccessible, true);
  });
});
