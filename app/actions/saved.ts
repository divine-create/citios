'use server';

import { db } from '@/src/prisma/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function toggleSavedItem(kind: 'PRODUCT' | 'RESTAURANT' | 'HOTEL' | 'SCHOOL' | 'JOB' | 'EVENT', entityId: string, cityId?: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.personId) return { error: 'Not logged in' };

  const personId = session.user.personId;

  const existing = await db.orm.public.SavedItem.where({
    personId,
    kind,
    entityId
  }).all().first();

  if (existing) {
    await db.orm.public.SavedItem.where({ id: existing.id }).delete();
    return { saved: false };
  } else {
    await db.orm.public.SavedItem.create({
      personId,
      kind,
      entityId,
      cityId
    });
    return { saved: true };
  }
}

export async function getSavedItemsForPerson() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.personId) return [];

  return await db.orm.public.SavedItem.where({ personId: session.user.personId }).all();
}
