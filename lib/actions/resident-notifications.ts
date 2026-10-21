'use server';

import '@js-temporal/polyfill';
import { db } from '@/src/prisma/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pusherServer } from '@/lib/pusher';
import { requirePersonId } from '@/app/actions/notifications';

/**
 * Fetch resident notifications.
 */

export async function getNotificationsForPerson(
  personId: string,
  input: { limit?: number; cursor?: string; unreadOnly?: boolean }
) {
  const limit = Math.min(input.limit ?? 20, 50);

  let query = db.orm.public.Notification.where({ personId });
  if (input.unreadOnly) {
    query = query.where({ isRead: false });
  }

  if (input.cursor) {
    query = query.where((n) =>
      n.createdAt.lt((globalThis as any).Temporal.Instant.from(new Date(input.cursor!).toISOString()))
    );
  }

  const items = await query
    .orderBy((n: any) => n.createdAt.desc())
    .limit(limit + 1)
    .all();

  let nextCursor: string | null = null;
  if (items.length > limit) {
    const nextItem = items.pop();
    nextCursor = nextItem!.createdAt.toString();
  }

  return { items, nextCursor };
}

export async function fetchResidentNotifications(input: {
  limit?: number;
  cursor?: string;
  unreadOnly?: boolean;
}) {
  const personId = await requirePersonId();
  if (!personId) throw new Error('Unauthorized');
  return getNotificationsForPerson(personId, input);
}

export async function countUnreadNotificationsForPerson(personId: string) {
  return await db.orm.public.Notification.where({ personId, isRead: false })
    .all()
    .then((items) => items.length);
}

export async function getUnreadNotificationCount() {
  const personId = await requirePersonId();
  if (!personId) return 0;
  return countUnreadNotificationsForPerson(personId);
}

/**
 * Mark specific notifications as read.
 */

export async function markPersonNotificationsRead(personId: string, notificationIds: string[]) {
  if (!notificationIds.length) return;
  await db.orm.public.Notification
    .where((n) => n.id.in(notificationIds))
    .where({ personId, isRead: false })
    .updateAndCount({
      isRead: true,
      readAt: (globalThis as any).Temporal.Now.instant(),
    });

  pusherServer
    .trigger(`private-user-${personId}`, 'notifications-read', {
      notificationIds,
    })
    .catch((e) => console.error('Pusher notification-read error:', e));
}

export async function markNotificationsRead(notificationIds: string[]) {
  const personId = await requirePersonId();
  if (!personId) throw new Error('Unauthorized');
  await markPersonNotificationsRead(personId, notificationIds);
}

export async function markAllPersonNotificationsRead(personId: string) {
  // update() only touches the first matching row; updateAndCount() updates all.
  await db.orm.public.Notification.where({
    personId,
    isRead: false,
  }).updateAndCount({
    isRead: true,
    readAt: (globalThis as any).Temporal.Now.instant(),
  });

  pusherServer
    .trigger(`private-user-${personId}`, 'notifications-read', {
      all: true,
    })
    .catch((e) => console.error('Pusher notification-read error:', e));
}

export async function markAllNotificationsRead() {
  const personId = await requirePersonId();
  if (!personId) throw new Error('Unauthorized');
  await markAllPersonNotificationsRead(personId);
}
