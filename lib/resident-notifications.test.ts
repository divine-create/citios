import { describe, it } from 'node:test';
import assert from 'node:assert';
import { db } from '@/src/prisma/db';
import { getNotificationsForPerson, countUnreadNotificationsForPerson, markAllPersonNotificationsRead } from '@/lib/actions/resident-notifications';
import { notifyPerson } from '@/lib/notify';
import { randomUUID } from 'node:crypto';

describe('Resident Notifications', () => {
  it('event generation and idempotency - sequential duplicate', async () => {
    const personA = randomUUID();
    await db.orm.public.Person.create({ id: personA, firstName: 'Resident', lastName: 'A' });

    const idempotencyKey = `payment_123_${Date.now()}`;
    
    await notifyPerson(personA, { type: 'PAYMENT_SUCCEEDED', title: 'Payment Successful', idempotencyKey });
    const notifs1 = await db.orm.public.Notification.where({ personId: personA }).all();
    assert.strictEqual(notifs1.length, 1);

    await notifyPerson(personA, { type: 'PAYMENT_SUCCEEDED', title: 'Payment Successful', idempotencyKey });
    const notifs2 = await db.orm.public.Notification.where({ personId: personA }).all();
    assert.strictEqual(notifs2.length, 1, 'Duplicate event with same idempotencyKey should be ignored');
  });

  it('event generation and idempotency - concurrent duplicate', async () => {
    const personA = randomUUID();
    await db.orm.public.Person.create({ id: personA, firstName: 'Resident', lastName: 'A' });

    const idempotencyKey = `payment_concurrent_${Date.now()}`;
    
    await Promise.all([
      notifyPerson(personA, { type: 'PAYMENT_SUCCEEDED', title: 'Payment Successful', idempotencyKey }),
      notifyPerson(personA, { type: 'PAYMENT_SUCCEEDED', title: 'Payment Successful', idempotencyKey }),
      notifyPerson(personA, { type: 'PAYMENT_SUCCEEDED', title: 'Payment Successful', idempotencyKey })
    ]);

    const notifs = await db.orm.public.Notification.where({ personId: personA }).all();
    assert.strictEqual(notifs.length, 1, 'Concurrent duplicates must result in exactly 1 row due to unique constraint');
  });

  it('event generation and idempotency - same key, different resident', async () => {
    const personA = randomUUID();
    const personB = randomUUID();
    await db.orm.public.Person.create({ id: personA, firstName: 'Resident', lastName: 'A' });
    await db.orm.public.Person.create({ id: personB, firstName: 'Resident', lastName: 'B' });

    const idempotencyKey = `global_event_${Date.now()}`;
    
    await notifyPerson(personA, { type: 'SYSTEM', title: 'Sys', idempotencyKey });
    await notifyPerson(personB, { type: 'SYSTEM', title: 'Sys', idempotencyKey });

    assert.strictEqual(await db.orm.public.Notification.where({ personId: personA }).all().then(items => items.length), 1);
    assert.strictEqual(await db.orm.public.Notification.where({ personId: personB }).all().then(items => items.length), 1);
  });

  it('event generation and idempotency - null idempotency allows multiple', async () => {
    const personA = randomUUID();
    await db.orm.public.Person.create({ id: personA, firstName: 'Resident', lastName: 'A' });

    await notifyPerson(personA, { type: 'SYSTEM', title: 'Alert 1' }); // no key
    await notifyPerson(personA, { type: 'SYSTEM', title: 'Alert 2' }); // no key

    assert.strictEqual(await db.orm.public.Notification.where({ personId: personA }).all().then(items => items.length), 2);
  });

  it('ownership boundary - fetch', async () => {
    const personA = randomUUID();
    const personB = randomUUID();
    await db.orm.public.Person.create({ id: personA, firstName: 'Resident', lastName: 'A' });
    await db.orm.public.Person.create({ id: personB, firstName: 'Resident', lastName: 'B' });

    await notifyPerson(personB, { type: 'SYSTEM', title: 'Welcome B' });

    const result = await getNotificationsForPerson(personA, {});
    assert.strictEqual(result.items.length, 0, 'Person A should not see B notifications');

    const resultB = await getNotificationsForPerson(personB, {});
    assert.strictEqual(resultB.items.length, 1, 'Person B sees their own notification');
  });

  it('mark as read boundary', async () => {
    const personA = randomUUID();
    const personB = randomUUID();
    await db.orm.public.Person.create({ id: personA, firstName: 'Resident', lastName: 'A' });
    await db.orm.public.Person.create({ id: personB, firstName: 'Resident', lastName: 'B' });

    await notifyPerson(personA, { type: 'SYSTEM', title: 'A notif' });
    await notifyPerson(personB, { type: 'SYSTEM', title: 'B notif' });
    
    assert.strictEqual(await countUnreadNotificationsForPerson(personA), 1);
    assert.strictEqual(await countUnreadNotificationsForPerson(personB), 1);

    await markAllPersonNotificationsRead(personA);

    assert.strictEqual(await countUnreadNotificationsForPerson(personA), 0);
    assert.strictEqual(await countUnreadNotificationsForPerson(personB), 1, 'Person A should not mark Person B notifications as read');
  });
});


