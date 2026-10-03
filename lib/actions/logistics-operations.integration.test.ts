import test from 'node:test';
import assert from 'node:assert';
import { db } from '@/src/prisma/db';
import { createDeliveryJob } from './logistics-domain';
import { dispatchDelivery, acceptDispatch } from './logistics-dispatch';
import { 
  arriveAtPickup, confirmPickup, enterTransit, arriveAtDropoff, 
  completeDelivery, closeWorkflow, logLocation, getDeliveryState 
} from './logistics-operations';

function generateId() {
  return crypto.randomUUID();
}

async function setupTestProviderAndResources() {
  const provider = await db.orm.public.Organization.create({
    name: `Test Provider ${generateId()}`,
    type: 'LOGISTICS'
  });
  const providerId = provider.id;

  const fleetId = generateId();
  await db.orm.public.LogisticsFleet.create({
    id: fleetId,
    providerId,
    name: 'Test Fleet'
  });

  const personId = generateId();
  await db.orm.public.Person.create({
    id: personId,
    firstName: 'Test',
    lastName: 'Driver'
  });

  const driverProfileId = generateId();
  await db.orm.public.LogisticsDriverProfile.create({
    id: driverProfileId,
    providerId,
    status: 'ONLINE',
    personId
  });

  const vehicleId = generateId();
  await db.orm.public.LogisticsVehicle.create({
    id: vehicleId,
    providerId,
    fleetId,
    type: 'CAR',
    status: 'ACTIVE',
    licensePlate: `TEST-${Math.floor(Math.random() * 1000)}`
  });

  return { providerId, fleetId, driverProfileId, vehicleId };
}

async function setupAssignedDelivery() {
  const { providerId, driverProfileId, vehicleId } = await setupTestProviderAndResources();
  
  const job = await createDeliveryJob({
    providerId,
    sourceType: 'DIRECT_DELIVERY',
    sourceId: generateId(),
    dropoffAddress: 'Test Dropoff Address',
    idempotencyKey: generateId()
  });
  console.log("CREATED JOB:", job);

  const dispatch = await dispatchDelivery({
    deliveryJobId: job.id,
    providerId,
    driverProfileId,
    vehicleId,
    idempotencyKey: generateId()
  });

  await acceptDispatch({
    dispatchId: dispatch.id,
    providerId,
    driverProfileId
  });

  return { providerId, job, driverProfileId, vehicleId };
}

test('LogisticsOS Phase 3 Operations Integration Tests', async (t) => {

  await t.test('Test 1 — Full Valid Lifecycle', async () => {
    const { providerId, job, driverProfileId } = await setupAssignedDelivery();

    // 1. Arrive at pickup
    const r1 = await arriveAtPickup({ deliveryJobId: job.id, providerId, driverProfileId });
    assert.strictEqual(r1.job.status, 'AT_PICKUP');
    assert.strictEqual(r1.event.eventType, 'AT_PICKUP');

    // 2. Picked up
    const r2 = await confirmPickup({ deliveryJobId: job.id, providerId, driverProfileId });
    assert.strictEqual(r2.job.status, 'PICKED_UP');

    // 3. In Transit
    const r3 = await enterTransit({ deliveryJobId: job.id, providerId, driverProfileId });
    assert.strictEqual(r3.job.status, 'IN_TRANSIT');

    // 4. Arrive at dropoff
    const r4 = await arriveAtDropoff({ deliveryJobId: job.id, providerId, driverProfileId });
    assert.strictEqual(r4.job.status, 'AT_DROPOFF');

    // 5. Complete Delivery
    const r5 = await completeDelivery({ deliveryJobId: job.id, providerId, driverProfileId, type: 'SIGNATURE', recipientName: 'Jane Doe' });
    assert.strictEqual(r5.job.status, 'DELIVERED');

    // 6. Close workflow (can be done by provider operator without driverProfileId)
    const r6 = await closeWorkflow({ deliveryJobId: job.id, providerId });
    assert.strictEqual(r6.job.status, 'COMPLETED');

    // Verify final state
    const state = await getDeliveryState(job.id, providerId);
    assert.strictEqual(state.currentStatus, 'COMPLETED');
    assert.strictEqual(state.latestTrackingEvent?.eventType, 'COMPLETED');
  });

  await t.test('Test 2 — Invalid Transitions are Rejected', async () => {
    const { providerId, job, driverProfileId } = await setupAssignedDelivery();

    // Attempting to skip states
    await assert.rejects(
      confirmPickup({ deliveryJobId: job.id, providerId, driverProfileId }),
      /Cannot perform/
    );

    await assert.rejects(
      completeDelivery({ deliveryJobId: job.id, providerId, driverProfileId, type: 'SIGNATURE', recipientName: 'Jane Doe' }),
      /Cannot perform/
    );

    // Go to AT_PICKUP
    await arriveAtPickup({ deliveryJobId: job.id, providerId, driverProfileId });

    // Try skipping to DELIVERED
    await assert.rejects(
      completeDelivery({ deliveryJobId: job.id, providerId, driverProfileId, type: 'SIGNATURE', recipientName: 'Jane Doe' }),
      /Cannot perform/
    );
  });

  await t.test('Test 3 — Authorization and Cross-Provider Checks', async () => {
    const { providerId, job, driverProfileId } = await setupAssignedDelivery();
    const otherProvider = await setupTestProviderAndResources();

    // Wrong provider operator
    await assert.rejects(
      arriveAtPickup({ deliveryJobId: job.id, providerId: otherProvider.providerId, driverProfileId }),
      /Provider mismatch/
    );

    // Wrong driver
    await assert.rejects(
      arriveAtPickup({ deliveryJobId: job.id, providerId, driverProfileId: otherProvider.driverProfileId }),
      /Driver not authorized/
    );
  });

  await t.test('Test 4 — Event Idempotency and Duplication', async () => {
    const { providerId, job, driverProfileId } = await setupAssignedDelivery();
    const idempotencyKey = generateId();

    const p1 = arriveAtPickup({ deliveryJobId: job.id, providerId, driverProfileId, idempotencyKey });
    const p2 = arriveAtPickup({ deliveryJobId: job.id, providerId, driverProfileId, idempotencyKey });

    const [r1, r2] = await Promise.all([p1, p2]);

    assert.strictEqual(r1.event.id, r2.event.id);
    assert.strictEqual(r1.job.status, 'AT_PICKUP');

    const state = await getDeliveryState(job.id, providerId);
    const events = await db.orm.public.DeliveryTrackingEvent.where({ deliveryJobId: job.id, eventType: 'AT_PICKUP' }).all();
    assert.strictEqual(events.length, 1);
  });

  await t.test('Test 5 — Concurrency: Same operation race', async () => {
    const { providerId, job, driverProfileId } = await setupAssignedDelivery();

    // Two simultaneous identical requests (without idempotency key)
    // One should succeed, one should fail (Cannot perform from AT_PICKUP)
    const p1 = arriveAtPickup({ deliveryJobId: job.id, providerId, driverProfileId });
    const p2 = arriveAtPickup({ deliveryJobId: job.id, providerId, driverProfileId });

    const results = await Promise.allSettled([p1, p2]);
    const succeeded = results.filter(r => r.status === 'fulfilled');
    const failed = results.filter(r => r.status === 'rejected');

    assert.strictEqual(succeeded.length, 1);
    assert.strictEqual(failed.length, 1);
  });

  await t.test('Test 6 — Location Tracking', async () => {
    const { providerId, job, driverProfileId } = await setupAssignedDelivery();

    await logLocation({
      deliveryJobId: job.id, providerId, driverProfileId, latitude: 10, longitude: 20
    });

    await arriveAtPickup({ deliveryJobId: job.id, providerId, driverProfileId });

    await logLocation({
      deliveryJobId: job.id, providerId, driverProfileId, latitude: 10.1, longitude: 20.1
    });

    const state = await getDeliveryState(job.id, providerId);
    // Should have 1 DISPATCHED, 1 ASSIGNED, 2 LOCATION_UPDATE, 1 AT_PICKUP
    // However, exact count might vary if dispatch has retries, but we expect at least 2 locations.
    const locationEvents = await db.orm.public.DeliveryTrackingEvent.where({ deliveryJobId: job.id, eventType: 'LOCATION_UPDATE' }).all();
    assert.strictEqual(locationEvents.length, 2);
  });

});
