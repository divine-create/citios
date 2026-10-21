'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { findPersonByEmail } from '@/lib/identity';
import { db } from '@/src/prisma/db';
import { Temporal } from '@js-temporal/polyfill';
import { pusherServer } from '@/lib/pusher';

/**
 * Resident notification surface.
 *
 * Identity resolution prioritizes canonical email -> Person resolution,
 * with a safe fallback to session.user.personId (verified against the database)
 * to support phone-only or token-stored resident accounts.
 *
 * All queries are person-scoped server-side; markRead operations are ownership-guarded
 * by construction (where({ id, personId })).
 */

export type ResidentNotification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  isRead: boolean;
  createdAt: string;
};

const PAGE_SIZE = 30;

export async function requirePersonId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  // 1. Canonical email resolution
  if (session.user.email) {
    const person = await findPersonByEmail(session.user.email);
    if (person?.id) return person.id;
  }

  // 2. Direct session personId verification against the database
  if (session.user.personId) {
    const direct = await db.orm.public.Person.where({ id: session.user.personId }).all().first();
    if (direct?.id) return direct.id;
  }

  return null;
}

export async function getMyNotifications(options?: {
  unreadOnly?: boolean;
  limit?: number;
}): Promise<{
  notifications: ResidentNotification[];
  unreadCount: number;
}> {
  const personId = await requirePersonId();
  if (!personId) return { notifications: [], unreadCount: 0 };

  const limit = Math.min(options?.limit ?? PAGE_SIZE, 50);

  const query = options?.unreadOnly
    ? db.orm.public.Notification.where({ personId, isRead: false })
    : db.orm.public.Notification.where({ personId });

  const rows = await query.all();

  rows.sort((a: any, b: any) => {
    const aMs = typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : a.createdAt.epochMilliseconds;
    const bMs = typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : b.createdAt.epochMilliseconds;
    return bMs - aMs;
  });

  const allUnread = await db.orm.public.Notification.where({ personId, isRead: false }).all();

  const notifications: ResidentNotification[] = rows.slice(0, limit).map((n: any) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body ?? null,
    href: n.href ?? null,
    isRead: n.isRead,
    createdAt: typeof n.createdAt === 'string' ? n.createdAt : n.createdAt.toString(),
  }));

  return {
    notifications,
    unreadCount: allUnread.length,
  };
}

export async function getUnreadNotificationCount(): Promise<number> {
  const personId = await requirePersonId();
  if (!personId) return 0;
  const unread = await db.orm.public.Notification.where({ personId, isRead: false }).all();
  return unread.length;
}

/** Mark one notification read. Ownership-guarded: a foreign id matches nothing. */
export async function markNotificationRead(notificationId: string): Promise<{ success: boolean }> {
  const personId = await requirePersonId();
  if (!personId) return { success: false };

  await db.orm.public.Notification.where({ id: notificationId, personId }).update({
    isRead: true,
    readAt: Temporal.Now.instant(),
  });

  pusherServer
    .trigger(`private-user-${personId}`, 'notifications-read', {
      notificationIds: [notificationId],
    })
    .catch((e) => console.error('Pusher notification-read error:', e));

  return { success: true };
}

/** Mark specific notifications as read. Ownership-guarded. */
export async function markNotificationsRead(notificationIds: string[]): Promise<{ success: boolean }> {
  const personId = await requirePersonId();
  if (!personId || !notificationIds.length) return { success: false };

  await db.orm.public.Notification
    .where((n) => n.id.in(notificationIds))
    .where({ personId, isRead: false })
    .updateAndCount({
      isRead: true,
      readAt: Temporal.Now.instant(),
    });

  pusherServer
    .trigger(`private-user-${personId}`, 'notifications-read', {
      notificationIds,
    })
    .catch((e) => console.error('Pusher notification-read error:', e));

  return { success: true };
}

/** Mark every notification for the authenticated resident read. */
export async function markAllNotificationsRead(): Promise<{ success: boolean }> {
  const personId = await requirePersonId();
  if (!personId) return { success: false };

  await db.orm.public.Notification.where({ personId, isRead: false }).updateAndCount({
    isRead: true,
    readAt: Temporal.Now.instant(),
  });

  pusherServer
    .trigger(`private-user-${personId}`, 'notifications-read', {
      all: true,
    })
    .catch((e) => console.error('Pusher notification-read error:', e));

  return { success: true };
}
