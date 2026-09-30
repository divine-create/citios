import { db } from '@/src/prisma/db';

export type MemoryCategory = 
  | 'PREFERENCE' 
  | 'ROUTINE' 
  | 'ACCESSIBILITY' 
  | 'FOOD_PREFERENCE' 
  | 'SHOPPING_PREFERENCE' 
  | 'LOCATION_PREFERENCE' 
  | 'NOTIFICATION_PREFERENCE';

const ALLOWED_CATEGORIES: MemoryCategory[] = [
  'PREFERENCE', 'ROUTINE', 'ACCESSIBILITY', 'FOOD_PREFERENCE', 
  'SHOPPING_PREFERENCE', 'LOCATION_PREFERENCE', 'NOTIFICATION_PREFERENCE'
];

export async function rememberPreference(personId: string, category: string, key: string, value: string) {
  if (!ALLOWED_CATEGORIES.includes(category as MemoryCategory)) {
    return { ok: false, error: 'Invalid memory category' };
  }

  // Prevent injection or massive payloads
  if (key.length > 100 || value.length > 500) {
    return { ok: false, error: 'Memory too large' };
  }

  // Upsert the memory using Prisma ORM
  const existing = await db.orm.public.VoiceMemory.where({ personId, category, key }).first();
  if (existing) {
    await db.orm.public.VoiceMemory.where({ id: existing.id }).update({ value, updatedAt: (globalThis as any).Temporal.Instant.fromEpochMilliseconds(Date.now()) });
    return { ok: true, data: { id: existing.id, category, key, value } };
  }

  const mem = await db.orm.public.VoiceMemory.create({
    personId,
    category,
    key,
    value,
    source: 'VOICE'
  });

  return { ok: true, data: mem };
}

export async function forgetPreference(personId: string, category: string, key: string) {
  const existing = await db.orm.public.VoiceMemory.where({ personId, category, key }).first();
  if (!existing) return { ok: false, error: 'Memory not found' };

  await db.orm.public.VoiceMemory.where({ id: existing.id }).delete();
  return { ok: true, data: { deleted: true } };
}

export async function forgetAllPreferences(personId: string) {
  await db.orm.public.VoiceMemory.where({ personId }).delete();
  return { ok: true, data: { deleted: true } };
}

export async function listPreferences(personId: string, category?: string) {
  const filter: any = { personId };
  if (category) filter.category = category;
  
  const memories = await db.orm.public.VoiceMemory.where(filter).all();
  return { 
    ok: true, 
    data: memories.map(m => ({ category: m.category, key: m.key, value: m.value })) 
  };
}
