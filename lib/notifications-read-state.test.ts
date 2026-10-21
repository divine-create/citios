import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'module';
import { encode } from 'next-auth/jwt';
import { db } from '../src/prisma/db';
import { authOptions } from './auth';
import { notifyPerson } from './notify';
import {
  countUnreadNotificationsForPerson,
  markAllPersonNotificationsRead,
  markPersonNotificationsRead,
} from './actions/resident-notifications';
import {
  getMyNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
} from '../app/actions/notifications';

const require = createRequire(import.meta.url);
const nextHeaders = require('next/headers');
const mockCookies: Record<string, string> = {};
nextHeaders.headers = () => new Map();
nextHeaders.cookies = () => ({
  get: (name: string) => (mockCookies[name] ? { name, value: mockCookies[name] } : undefined),
  getAll: () => Object.entries(mockCookies).map(([name, value]) => ({ name, value })),
  has: (name: string) => Boolean(mockCookies[name]),
});

async function signInAs(person: { id: string; firstName: string; lastName: string }) {
  const email = `notif-${person.id.slice(0, 8)}@cityos.test`;
  await db.orm.public.PersonIdentifier.create({
    personId: person.id,
    type: 'EMAIL',
    normalizedValue: email,
    isVerified: true,
  });
  await db.orm.public.Account.create({ personId: person.id, isActive: true });
  const token = await encode({
    token: { email, name: `${person.firstName} ${person.lastName}`, personId: person.id },
    secret: (authOptions.secret as string) || 'cityos-jwt-secret-key-2026',
  });
  const cookieName =
    process.env.NODE_ENV === 'production' ? '__Secure-next-auth.session-token' : 'next-auth.session-token';
  mockCookies[cookieName] = token;
}

// Regression: app/actions/notifications.ts wrote `readAt: new Date()`, which the
// timestamptz-temporal codec rejects (RUNTIME.ENCODE_FAILED). The update threw,
// the bell swallowed the error, and the notification stayed unread server-side
// -- reappearing as unread on the next 25s poll / dropdown open.
test('Resident bell notification read-state persists server-side', async (t) => {
  const resident = await db.orm.public.Person.create({ firstName: 'Bell', lastName: 'Reader' });
  const other = await db.orm.public.Person.create({ firstName: 'Other', lastName: 'Resident' });
  await signInAs(resident);

  await notifyPerson(resident.id, { type: 'SYSTEM', title: 'one' });
  await notifyPerson(resident.id, { type: 'SYSTEM', title: 'two' });
  await notifyPerson(resident.id, { type: 'SYSTEM', title: 'three' });
  await notifyPerson(other.id, { type: 'SYSTEM', title: 'not yours' });

  await t.test('markNotificationRead persists isRead + readAt and survives a refetch', async () => {
    const before = await getMyNotifications();
    assert.equal(before.unreadCount, 3);

    await markNotificationRead(before.notifications[0].id);

    const after = await getMyNotifications();
    assert.equal(after.unreadCount, 2, 'read notification must not count as unread after refetch');
    assert.equal(after.notifications.find((n) => n.id === before.notifications[0].id)?.isRead, true);

    const row = await db.orm.public.Notification.where({ id: before.notifications[0].id }).all().first();
    assert.ok(row?.readAt, 'readAt must be recorded');
    assert.equal(await getUnreadNotificationCount(), 2);
  });

  await t.test('markAllNotificationsRead clears the caller only', async () => {
    await markAllNotificationsRead();
    assert.equal((await getMyNotifications()).unreadCount, 0);
    assert.equal(await getUnreadNotificationCount(), 0);

    const otherUnread = await db.orm.public.Notification.where({ personId: other.id, isRead: false }).all();
    assert.equal(otherUnread.length, 1, "another resident's notification must stay unread");
  });

  await t.test('markNotificationRead cannot mark another resident\'s notification', async () => {
    const foreign = await db.orm.public.Notification.where({ personId: other.id }).all().first();
    assert.ok(foreign);
    await markNotificationRead(foreign.id);
    const still = await db.orm.public.Notification.where({ id: foreign.id }).all().first();
    assert.equal(still?.isRead, false);
  });
});

// Regression: update() mutates only the first matching row, so bulk "mark read"
// with more than one unread notification left the rest unread.
test('Bulk mark-read updates every matching notification (lib/actions path)', async (t) => {
  const a = await db.orm.public.Person.create({ firstName: 'Bulk', lastName: 'A' });
  const b = await db.orm.public.Person.create({ firstName: 'Bulk', lastName: 'B' });
  for (const title of ['1', '2', '3', '4']) await notifyPerson(a.id, { type: 'SYSTEM', title });
  await notifyPerson(b.id, { type: 'SYSTEM', title: 'b1' });

  await t.test('markPersonNotificationsRead with multiple ids', async () => {
    const rows = await db.orm.public.Notification.where({ personId: a.id }).all();
    await markPersonNotificationsRead(a.id, rows.slice(0, 3).map((r) => r.id));
    assert.equal(await countUnreadNotificationsForPerson(a.id), 1);
  });

  await t.test('markAllPersonNotificationsRead clears all of one person only', async () => {
    await markAllPersonNotificationsRead(a.id);
    assert.equal(await countUnreadNotificationsForPerson(a.id), 0);
    assert.equal(await countUnreadNotificationsForPerson(b.id), 1);
  });
});
