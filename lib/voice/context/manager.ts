import { db } from '@/src/prisma/db';
import { VoiceContextData } from './types';

export async function getVoiceContext(personId: string): Promise<VoiceContextData> {
  const ctx = await db.orm.public.VoiceContext.where({ personId }).first();
  if (!ctx || !ctx.data) return {};
  return ctx.data as VoiceContextData;
}

export async function updateVoiceContext(personId: string, partialData: Partial<VoiceContextData>): Promise<VoiceContextData> {
  const ctx = await db.orm.public.VoiceContext.where({ personId }).first();
  
  const currentData = (ctx?.data as VoiceContextData) || {};
  const newData = { ...currentData, ...partialData };
  
  if (ctx) {
    await db.orm.public.VoiceContext.where({ id: ctx.id }).update({ data: newData as any });
  } else {
    await db.orm.public.VoiceContext.create({
      personId,
      data: newData as any
    });
  }
  
  return newData;
}

export async function clearVoiceContext(personId: string): Promise<void> {
  const ctx = await db.orm.public.VoiceContext.where({ personId }).first();
  if (ctx) {
    await db.orm.public.VoiceContext.where({ id: ctx.id }).delete();
  }
}

export async function pushRecentEntity(personId: string, entity: { type: string; id: string; label: string }) {
  const data = await getVoiceContext(personId);
  const recent = data.recentEntities || [];
  
  // Remove existing entry for same ID if exists
  const filtered = recent.filter(e => e.id !== entity.id);
  // Add to front
  filtered.unshift(entity);
  // Keep max 5
  if (filtered.length > 5) filtered.pop();
  
  await updateVoiceContext(personId, { recentEntities: filtered });
}
