import { db } from '@/src/prisma/db';
import { VoiceContextData } from './types';

export async function getVoiceContext(personId: string): Promise<VoiceContextData> {
  const ctx = await db.orm.public.VoiceContext.where({ personId }).first();
  if (!ctx || !ctx.data) return {};

  // Enforce global 30-minute TTL for short-lived conversational context
  const updatedEpochMs = typeof ctx.updatedAt.getTime === 'function' ? ctx.updatedAt.getTime() : (ctx.updatedAt as any).epochMilliseconds;
  if (Date.now() - updatedEpochMs > 30 * 60 * 1000) {
    return {};
  }

  return ctx.data as VoiceContextData;
}

export async function updateVoiceContext(personId: string, partialData: Partial<VoiceContextData>): Promise<VoiceContextData> {
  const currentData = await getVoiceContext(personId);
  const newData = { ...currentData, ...partialData };
  
  const ctx = await db.orm.public.VoiceContext.where({ personId }).first();
  if (ctx) {
    await db.orm.public.VoiceContext.where({ id: ctx.id }).update({ data: newData as any, updatedAt: (globalThis as any).Temporal.Instant.fromEpochMilliseconds(Date.now()) });
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


export async function startWorkflow(personId: string, workflowId: string, workflowData: any) {
  const data = await getVoiceContext(personId);
  const activeWorkflows = data.activeWorkflows || {};
  activeWorkflows[workflowId] = workflowData;
  await updateVoiceContext(personId, { activeWorkflows });
}

export async function endWorkflow(personId: string, workflowId: string) {
  const data = await getVoiceContext(personId);
  if (data.activeWorkflows && data.activeWorkflows[workflowId]) {
    delete data.activeWorkflows[workflowId];
    await updateVoiceContext(personId, { activeWorkflows: data.activeWorkflows });
  }
}
