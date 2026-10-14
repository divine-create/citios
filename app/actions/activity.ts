'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { composeResidentActivity, getResidentActivityDetail } from '@/lib/resident-activity/compose';
import { getResidentDelivery } from '@/lib/resident-logistics';

export async function fetchResidentActivity(opts: { limit?: number; cursor?: string | null } = {}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.personId) {
      return { items: [], nextCursor: null, unavailable: [] };
  }
  return composeResidentActivity(session.user.personId, opts);
}

export async function fetchResidentActivityDetail(sourceType: unknown, sourceId: unknown) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.personId) {
        return null;
    }
    return getResidentActivityDetail(session.user.personId, sourceType, sourceId);
}

/** Resident-facing delivery for an owned order (used for refresh). Identity comes from the session only. */
export async function fetchResidentDelivery(sourceType: unknown, sourceId: unknown) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.personId) {
        return null;
    }
    return getResidentDelivery(session.user.personId, sourceType, sourceId);
}
