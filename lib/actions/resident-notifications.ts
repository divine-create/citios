'use server';

import { db } from '@/src/prisma/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * Fetch resident notifications.
 */

export async function getNotificationsForPerson(personId: string, input: { limit?: number; cursor?: string; unreadOnly?: boolean; }) {
  const limit = Math.min(input.limit ?? 20, 50);

  let query = db.orm.public.Notification.where({ personId });
  if (input.unreadOnly) {
    query = query.where({ isRead: false });
  }

  if (input.cursor) {
    query = query.where((n) => n.createdAt.lt((globalThis as any).Temporal.Instant.from(new Date(input.cursor!).toISOString())));
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

export async function fetchResidentNotifications(input: { limit?: number; cursor?: string; unreadOnly?: boolean; }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.personId) throw new Error('Unauthorized');
  return getNotificationsForPerson(session.user.personId, input);
}

export async function countUnreadNotificationsForPerson(personId: string) {
  return await db.orm.public.Notification.where({ personId, isRead: false }).all().then(items => items.length);
}

export async function getUnreadNotificationCount() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.personId) return 0;
  return countUnreadNotificationsForPerson(session.user.personId);
}

/**
 * Mark specific notifications as read.
 */

export async function markPersonNotificationsRead(personId: string, notificationIds: string[]) {
  await db.orm.public.Notification
    .where((n) => n.id.in(notificationIds))
    .where({ personId })
    .update({
      isRead: true,
      readAt: (globalThis as any).Temporal.Now.instant(),
    });
}

export async function markNotificationsRead(notificationIds: string[]) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.personId) throw new Error('Unauthorized');
  await markPersonNotificationsRead(session.user.personId, notificationIds);
}

export async function markAllPersonNotificationsRead(personId: string) {
  await db.orm.public.Notification.where({
    personId,
    isRead: false,
  }).update({
    isRead: true,
    readAt: (globalThis as any).Temporal.Now.instant(),
  });
}

export async function markAllNotificationsRead() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.personId) throw new Error('Unauthorized');
  await markAllPersonNotificationsRead(session.user.personId);
}



