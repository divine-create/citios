'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { findPersonByEmail } from '@/lib/identity';
import { db } from '@/src/prisma/db';

/**
 * Resident notification surface.
 *
 * Identity comes from the canonical helper (session email → Person), never
 * from a client-supplied personId — consistent with the identity foundation.
 * All queries are person-scoped server-side; markRead is ownership-guarded by
 * construction (where({ id, personId })).
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

async function requirePersonId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  const person = await findPersonByEmail(session.user.email);
  return person?.id ?? null;
}

export async function getMyNotifications(): Promise<{
  notifications: ResidentNotification[];
  unreadCount: number;
}> {
  const personId = await requirePersonId();
  if (!personId) return { notifications: [], unreadCount: 0 };

  const rows = await db.orm.public.Notification.where({ personId }).all();
  rows.sort(
    (a: any, b: any) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const notifications: ResidentNotification[] = rows.slice(0, PAGE_SIZE).map((n: any) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body ?? null,
    href: n.href ?? null,
    isRead: n.isRead,
    createdAt: typeof n.createdAt === 'string' ? n.createdAt : new Date(n.createdAt).toISOString(),
  }));

  return {
    notifications,
    unreadCount: rows.filter((n: any) => !n.isRead).length,
  };
}

export async function getUnreadNotificationCount(): Promise<number> {
  const personId = await requirePersonId();
  if (!personId) return 0;
  const unread = await db.orm.public.Notification.where({ personId, isRead: false }).all();
  return unread.length;
}

/** Mark one notification read. Ownership-guarded: a foreign id matches nothing. */
export async function markNotificationRead(notificationId: string): Promise<void> {
  const personId = await requirePersonId();
  if (!personId) return;
  await db.orm.public.Notification.where({ id: notificationId, personId }).update({
    isRead: true,
    readAt: new Date(),
  });
}

/** Mark every notification for the authenticated resident read. */
export async function markAllNotificationsRead(): Promise<void> {
  const personId = await requirePersonId();
  if (!personId) return;
  const unread = await db.orm.public.Notification.where({ personId, isRead: false }).all();
  const now = new Date();
  for (const n of unread) {
    await db.orm.public.Notification.where({ id: n.id }).update({ isRead: true, readAt: now });
  }
}
