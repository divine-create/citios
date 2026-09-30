import { db } from '@/src/prisma/db';
import { VoiceIntelligenceEvent } from './types';

export async function publishVoiceEvent(
  personId: string,
  type: string,
  entityType: string,
  entityReference: string,
  payload: any
): Promise<VoiceIntelligenceEvent | null> {
  // Deduplicate: check if this exact event (by type + reference) happened in the last 1 minute
  // For simplicity, we just use the Notification model as a backing store if we don't have a dedicated VoiceEvent table.
  // Wait, I created VoiceEvent? No, I only added VoiceMemory and VoiceReminder.
  // The spec says: "Use existing notification infrastructure if available. Do not build a second event system if one already exists."
  
  // Create a Notification. The Notification table has `personId`, `type`, `title`, `body`, `href`.
  
  const existing = await db.orm.public.Notification.where({
    personId,
    type,
    href: entityReference
  }).all();

  const isDuplicate = existing.some(n => Date.now() - n.createdAt.getTime() < 60000);
  if (isDuplicate) {
    console.log(`[VoiceEvents] Duplicate event suppressed: ${type} for ${entityReference}`);
    return null;
  }

  const notification = await db.orm.public.Notification.create({
    personId,
    type,
    title: payload.title || `New update on ${entityType}`,
    body: payload.body || '',
    href: entityReference,
    isRead: false
  });

  return {
    id: notification.id,
    personId,
    type,
    entityType,
    entityReference,
    occurredAt: notification.createdAt,
    payload
  };
}
