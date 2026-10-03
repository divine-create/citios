/**
 * LogisticsOS Phase 1 Integration Tests
 *
 * Pattern: follows hotelos-concurrency.integration.test.ts exactly.
 * - Requires DATABASE_URL environment variable.
 * - Uses db.orm.public.* for data setup.
 * - Uses real concurrent Promise.all for race tests.
 * - Asserts final database state after each concurrency test.
 */
import test from 'node:test';
import assert from 'node:assert';
import { v4 as uuidv4 } from 'uuid';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set to run integration tests.');
}

import { db } from '../../src/prisma/db';
import {
  createDeliveryJob,
  assignDelivery,
  transitionDeliveryStatus,
  LogisticsDomainError,
} from './logistics-domain';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uid(prefix: string) {
  return `${prefix}_${uuidv4().substring(0, 8)}`;
}

async function makeProvider(name: string) {
  return db.orm.public.Organization.create({ name, type: 'LOGISTICS' });
}

async function makePerson(firstName: string) {
  return db.orm.public.Person.create({ firstName, lastName: 'Test' });
}

async function makeDriver(providerId: string, personId: string) {
  return db.orm.public.LogisticsDriverProfile.create({ providerId, personId });
}

async function makeVehicle(providerId: string, fleetId?: string) {
  return db.orm.public.LogisticsVehicle.create({
    providerId,
    fleetId,
    type: 'VAN',
    licensePlate: `LP-${uuidv4().substring(0, 6).toUpperCase()}`,
    status: 'ACTIVE',
  });
}

async function makeFleet(providerId: string, name: string) {
  return db.orm.public.LogisticsFleet.create({ providerId, name });
}

async function makeJob(providerId: string, idempotencyKey: string, sourceId = 'src-1') {
  return createDeliveryJob({
    providerId,
    sourceType: 'RETAIL_ORDER',
    sourceId,
    idempotencyKey,
    dropoffAddress: '123 Test St',
  });
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

test('LogisticsOS Phase 1 Integration Tests', async (t) => {
  // -------------------------------------------------------------------------
  // Test 1: Competing drivers for one job
  // -------------------------------------------------------------------------
  await t.test('Test 1 — Competing drivers race for the same DeliveryJob', async () => {
    const prov = await makeProvider('Provider-T1');
    const p1 = await makePerson('Driver1A');
    const p2 = await makePerson('Driver1B');
    const d1 = await makeDriver(prov.id, p1.id);
    const d2 = await makeDriver(prov.id, p2.id);
    const job = await makeJob(prov.id, uid('idem'));

    const r1 = assignDelivery({ deliveryJobId: job.id, driverProfileId: d1.id, providerId: prov.id })
      .catch((e: any) => ({ error: e.message }));
    const r2 = assignDelivery({ deliveryJobId: job.id, driverProfileId: d2.id, providerId: prov.id })
      .catch((e: any) => ({ error: e.message }));

    const results = await Promise.all([r1, r2]);
    const successes = results.filter((r: any) => r.id);
    const errors = results.filter((r: any) => r.error);

    assert.strictEqual(successes.length, 1, 'Exactly 1 assignment must succeed');
    assert.strictEqual(errors.length, 1, 'Exactly 1 assignment must fail');

    // DB state assertion — count active assignments (filter in-memory; 'in' operator not supported)
    const allAssignments = await db.orm.public.DeliveryAssignment
      .where({ deliveryJobId: job.id })
      .all();
    const activeAssignments = allAssignments.filter((a: any) => ['PENDING', 'ACCEPTED'].includes(a.status));
    assert.strictEqual(activeAssignments.length, 1, 'Exactly 1 active assignment in DB for the job');
  });

  // -------------------------------------------------------------------------
  // Test 2: Same driver competing for two jobs
  // -------------------------------------------------------------------------
  await t.test('Test 2 — Same driver races for two simultaneous DeliveryJobs', async () => {
    const prov = await makeProvider('Provider-T2');
    const p1 = await makePerson('Driver2A');
    const d1 = await makeDriver(prov.id, p1.id);
    const jobA = await makeJob(prov.id, uid('idem'), 'srcA');
    const jobB = await makeJob(prov.id, uid('idem'), 'srcB');

    const r1 = assignDelivery({ deliveryJobId: jobA.id, driverProfileId: d1.id, providerId: prov.id })
      .catch((e: any) => ({ error: e.message }));
    const r2 = assignDelivery({ deliveryJobId: jobB.id, driverProfileId: d1.id, providerId: prov.id })
      .catch((e: any) => ({ error: e.message }));

    const results = await Promise.all([r1, r2]);
    const successes = results.filter((r: any) => r.id);
    const errors = results.filter((r: any) => r.error);

    assert.strictEqual(successes.length, 1, 'Exactly 1 assignment must succeed');
    assert.strictEqual(errors.length, 1, 'Exactly 1 must be rejected');

    // DB state assertion
    const allDriver = await db.orm.public.DeliveryAssignment
      .where({ driverProfileId: d1.id })
      .all();
    const activeDriver = allDriver.filter((a: any) => ['PENDING', 'ACCEPTED'].includes(a.status));
    assert.strictEqual(activeDriver.length, 1, 'Driver must have exactly 1 active assignment');
  });

  // -------------------------------------------------------------------------
  // Test 3: Same vehicle competing for two jobs
  // -------------------------------------------------------------------------
  await t.test('Test 3 — Same vehicle races for two simultaneous DeliveryJobs', async () => {
    const prov = await makeProvider('Provider-T3');
    const p1 = await makePerson('Driver3A');
    const p2 = await makePerson('Driver3B');
    const d1 = await makeDriver(prov.id, p1.id);
    const d2 = await makeDriver(prov.id, p2.id);
    const veh = await makeVehicle(prov.id);
    const jobA = await makeJob(prov.id, uid('idem'), 'src3A');
    const jobB = await makeJob(prov.id, uid('idem'), 'src3B');

    const r1 = assignDelivery({ deliveryJobId: jobA.id, driverProfileId: d1.id, vehicleId: veh.id, providerId: prov.id })
      .catch((e: any) => ({ error: e.message }));
    const r2 = assignDelivery({ deliveryJobId: jobB.id, driverProfileId: d2.id, vehicleId: veh.id, providerId: prov.id })
      .catch((e: any) => ({ error: e.message }));

    const results = await Promise.all([r1, r2]);
    const successes = results.filter((r: any) => r.id);
    const errors = results.filter((r: any) => r.error);

    assert.strictEqual(successes.length, 1, 'Exactly 1 vehicle assignment must succeed');
    assert.strictEqual(errors.length, 1, 'Exactly 1 vehicle assignment must fail');

    // DB state assertion
    const allVehicle = await db.orm.public.DeliveryAssignment
      .where({ vehicleId: veh.id })
      .all();
    const activeVehicle = allVehicle.filter((a: any) => ['PENDING', 'ACCEPTED'].includes(a.status));
    assert.strictEqual(activeVehicle.length, 1, 'Vehicle must have exactly 1 active assignment in DB');
  });


  // -------------------------------------------------------------------------
  // Test 4: Provider isolation — cross-provider assignment rejected
  // -------------------------------------------------------------------------
  await t.test('Test 4 — Cross-provider assignment is rejected', async () => {
    const provA = await makeProvider('Provider-A-T4');
    const provB = await makeProvider('Provider-B-T4');
    const p1 = await makePerson('DriverB');
    const driverB = await makeDriver(provB.id, p1.id);
    const job = await makeJob(provA.id, uid('idem'));

    await assert.rejects(
      assignDelivery({ deliveryJobId: job.id, driverProfileId: driverB.id, providerId: provA.id }),
      (err: any) => {
        assert.ok(err instanceof LogisticsDomainError);
        assert.match(err.message, /Provider isolation violation/);
        return true;
      },
    );

    // DB state assertion — no assignment should exist
    const assignments = await db.orm.public.DeliveryAssignment
      .where({ deliveryJobId: job.id })
      .all();
    assert.strictEqual(assignments.length, 0, 'No assignment must exist after rejected cross-provider attempt');
  });

  // -------------------------------------------------------------------------
  // Test 5: Vehicle/fleet isolation — cross-provider fleet rejected at DB level
  // -------------------------------------------------------------------------
  await t.test('Test 5 — Vehicle cannot reference a fleet from a different provider', async () => {
    const provA = await makeProvider('Provider-A-T5');
    const provB = await makeProvider('Provider-B-T5');
    const fleetB = await makeFleet(provB.id, 'Fleet-B');

    // Attempt to create a vehicle for Provider A that references Provider B's fleet.
    // The composite FK (fleetId + providerId) enforced by the schema must reject this.
    await assert.rejects(
      db.orm.public.LogisticsVehicle.create({
        providerId: provA.id,
        fleetId: fleetB.id, // belongs to provB — should fail composite FK
        type: 'VAN',
        licensePlate: `LP-XPROV`,
        status: 'ACTIVE',
      }),
      (err: any) => {
        // Should throw a foreign key violation or a constraint error
        assert.ok(
          err.code === '23503' ||
          err.message?.toLowerCase().includes('foreign key') ||
          err.message?.toLowerCase().includes('constraint') ||
          err.code?.includes('CONSTRAINT'),
          `Expected FK violation, got: ${err.message}`,
        );
        return true;
      },
    );
  });

  // -------------------------------------------------------------------------
  // Test 6: Concurrent idempotent creation — both succeed, same job returned
  // -------------------------------------------------------------------------
  await t.test('Test 6 — Concurrent idempotent creation returns same job, no raw P2002', async () => {
    const prov = await makeProvider('Provider-T6');
    const key = uid('idem-key');

    const r1 = createDeliveryJob({
      providerId: prov.id, sourceType: 'RETAIL_ORDER', sourceId: 'src-6',
      idempotencyKey: key, dropoffAddress: '6 Main St',
    });
    const r2 = createDeliveryJob({
      providerId: prov.id, sourceType: 'RETAIL_ORDER', sourceId: 'src-6',
      idempotencyKey: key, dropoffAddress: '6 Main St',
    });

    const [job1, job2] = await Promise.all([r1, r2]);

    assert.ok(job1.id, 'First request must return a job');
    assert.ok(job2.id, 'Second request must return a job');
    assert.strictEqual(job1.id, job2.id, 'Both concurrent requests must return the same DeliveryJob ID');

    // DB state assertion
    const jobs = await db.orm.public.DeliveryJob
      .where({ providerId: prov.id, idempotencyKey: key })
      .all();
    assert.strictEqual(jobs.length, 1, 'Exactly 1 DeliveryJob must exist in DB');
  });

  // -------------------------------------------------------------------------
  // Test 7: Idempotency conflict — same key, different payload is rejected
  // -------------------------------------------------------------------------
  await t.test('Test 7 — Same key with different payload is rejected with idempotency error', async () => {
    const prov = await makeProvider('Provider-T7');
    const key = uid('idem-conflict');

    await createDeliveryJob({
      providerId: prov.id, sourceType: 'RETAIL_ORDER', sourceId: 'src-7-original',
      idempotencyKey: key, dropoffAddress: '7 Main St',
    });

    await assert.rejects(
      createDeliveryJob({
        providerId: prov.id, sourceType: 'HOTEL_REQUEST', sourceId: 'src-7-conflict',
        idempotencyKey: key, dropoffAddress: '7 Different St',
      }),
      (err: any) => {
        assert.ok(err instanceof LogisticsDomainError);
        assert.match(err.message, /Idempotency conflict/);
        return true;
      },
    );

    // DB state assertion — only 1 job must exist
    const jobs = await db.orm.public.DeliveryJob
      .where({ providerId: prov.id, idempotencyKey: key })
      .all();
    assert.strictEqual(jobs.length, 1, 'No duplicate job must be created on conflict');
  });

  // -------------------------------------------------------------------------
  // Test 8: Provider-scoped idempotency — same key across providers succeeds
  // -------------------------------------------------------------------------
  await t.test('Test 8 — Same idempotency key is provider-scoped; different providers do not collide', async () => {
    const provA = await makeProvider('Provider-A-T8');
    const provB = await makeProvider('Provider-B-T8');
    const sharedKey = 'shared-key-test-8';

    const jobA = await createDeliveryJob({
      providerId: provA.id, sourceType: 'RETAIL_ORDER', sourceId: 'src-8-a',
      idempotencyKey: sharedKey, dropoffAddress: '8A Main St',
    });
    const jobB = await createDeliveryJob({
      providerId: provB.id, sourceType: 'RETAIL_ORDER', sourceId: 'src-8-b',
      idempotencyKey: sharedKey, dropoffAddress: '8B Main St',
    });

    assert.ok(jobA.id, 'Provider A job must be created');
    assert.ok(jobB.id, 'Provider B job must be created');
    assert.notStrictEqual(jobA.id, jobB.id, 'Both providers must receive distinct DeliveryJob IDs');

    // DB state assertion
    const jobsA = await db.orm.public.DeliveryJob
      .where({ providerId: provA.id, idempotencyKey: sharedKey }).all();
    const jobsB = await db.orm.public.DeliveryJob
      .where({ providerId: provB.id, idempotencyKey: sharedKey }).all();
    assert.strictEqual(jobsA.length, 1, 'Exactly 1 job for Provider A');
    assert.strictEqual(jobsB.length, 1, 'Exactly 1 job for Provider B');
  });

  // -------------------------------------------------------------------------
  // Test 9: State machine — valid transitions
  // -------------------------------------------------------------------------
  await t.test('Test 9 — Valid state transitions succeed', async () => {
    const prov = await makeProvider('Provider-T9');
    const job = await makeJob(prov.id, uid('idem-sm'));

    const priced = await transitionDeliveryStatus(job.id, 'PRICED', prov.id);
    assert.strictEqual(priced.status, 'PRICED');

    const created = await transitionDeliveryStatus(job.id, 'CREATED', prov.id);
    assert.strictEqual(created.status, 'CREATED');
  });

  // -------------------------------------------------------------------------
  // Test 10: State machine — invalid transitions rejected
  // -------------------------------------------------------------------------
  await t.test('Test 10 — Invalid state transitions are rejected', async () => {
    const prov = await makeProvider('Provider-T10');
    const job = await makeJob(prov.id, uid('idem-sm2'));

    await assert.rejects(
      transitionDeliveryStatus(job.id, 'COMPLETED', prov.id),
      (err: any) => {
        assert.ok(err instanceof LogisticsDomainError);
        assert.match(err.message, /Invalid transition from REQUESTED to COMPLETED/);
        return true;
      },
    );

    // Terminal state protection
    await transitionDeliveryStatus(job.id, 'CANCELLED', prov.id);
    await assert.rejects(
      transitionDeliveryStatus(job.id, 'REQUESTED', prov.id),
      (err: any) => {
        assert.ok(err instanceof LogisticsDomainError);
        assert.match(err.message, /Invalid transition from CANCELLED to REQUESTED/);
        return true;
      },
    );
  });

  await db.close();
});
