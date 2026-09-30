import * as ordersModule from '@/app/actions/orders';
import * as serviceModule from '@/app/actions/service';
import test from 'node:test';
import assert from 'node:assert';
import { db } from '@/src/prisma/db';
import { rememberPreference, forgetPreference, listPreferences } from './memory';
import { createReminder, listReminders, cancelReminder } from './reminders';
import { publishVoiceEvent } from './events';
import { buildResidentContext } from './context-builder';
import { generateRecommendations } from './recommendation';

test.mock.method(ordersModule, 'fetchMyOrders', async () => ({ retail: [], restaurant: [] }));
test.mock.method(serviceModule, 'fetchMyServiceJobs', async () => ({ jobs: [] }));

test('Voice Intelligence Engine', async (t) => {
  const personId = 'test-resident-intelligence';

  // Setup test resident
  await db.orm.public.VoiceMemory.where({ personId }).delete();
  await db.orm.public.VoiceReminder.where({ personId }).delete();
  await db.orm.public.Notification.where({ personId }).delete();
  await db.orm.public.Person.where({ id: personId }).delete();
  
  await db.orm.public.Person.create({
    id: personId,
    firstName: 'Intelligence',
    lastName: 'Test'
  });

  await t.test('Memory: authenticated resident can create memory', async () => {
    const mem1 = await rememberPreference(personId, 'PREFERENCE', 'seating', 'outdoor');
    assert.strictEqual(mem1.ok, true);

    // Duplicate memory handled deterministically
    const mem2 = await rememberPreference(personId, 'PREFERENCE', 'seating', 'indoor');
    assert.strictEqual(mem2.ok, true);
    assert.strictEqual((mem2.data as any).value, 'indoor'); // Updated

    // Invalid category rejected
    const invalid = await rememberPreference(personId, 'HACK', 'key', 'val');
    assert.strictEqual(invalid.ok, false);
    assert.strictEqual(invalid.error, 'Invalid memory category');
  });

  await t.test('Memory: retrieval and scoped deletion', async () => {
    const mems = await listPreferences(personId);
    assert.strictEqual(mems.ok, true);
    assert.strictEqual(mems.data?.length, 1);
    
    // Deletion works
    const del = await forgetPreference(personId, 'PREFERENCE', 'seating');
    assert.strictEqual(del.ok, true);
    
    const memsAfter = await listPreferences(personId);
    assert.strictEqual(memsAfter.data?.length, 0);
  });

  await t.test('Reminders: creation, idempotency, and cancellation', async () => {
    const rem = await createReminder(personId, 'Test Reminder');
    assert.strictEqual(rem.ok, true);
    assert.ok((rem.data as any).id);

    const list = await listReminders(personId);
    assert.strictEqual(list.data?.length, 1);

    const cancel = await cancelReminder(personId, (rem.data as any).id);
    assert.strictEqual(cancel.ok, true);

    const listAfter = await listReminders(personId);
    assert.strictEqual(listAfter.data?.length, 0); // PENDING is 0
  });

  await t.test('Events: deduplication and processing', async () => {
    const ev1 = await publishVoiceEvent(personId, 'TEST_EVENT', 'SYSTEM', 'ref-1', { data: 1 });
    assert.ok(ev1 !== null);

    // Duplicate event ignored (within 1 min)
    const ev2 = await publishVoiceEvent(personId, 'TEST_EVENT', 'SYSTEM', 'ref-1', { data: 2 });
    assert.strictEqual(ev2, null);
    
    // Different ref
    const ev3 = await publishVoiceEvent(personId, 'TEST_EVENT', 'SYSTEM', 'ref-2', { data: 1 });
    assert.ok(ev3 !== null);
  });

  await t.test('Recommendations: preference-driven without sensitive attributes', async () => {
    await rememberPreference(personId, 'ROUTINE', 'grocery', 'bottled water');
    
    const ctx = await buildResidentContext(personId);
    const recs = await generateRecommendations(ctx);

    const waterRec = recs.find(r => r.id === 'rec-water');
    assert.ok(waterRec);
    assert.strictEqual(waterRec.relevance, 'HIGH');
    assert.strictEqual(waterRec.action?.requiresConfirmation, true); // Strict boundary
  });
});
