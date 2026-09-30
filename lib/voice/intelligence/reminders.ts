import { db } from '@/src/prisma/db';

export async function createReminder(
  personId: string, 
  title: string, 
  description?: string, 
  dueAt?: Date, 
  entityType?: string, 
  entityReference?: string
) {
  // Bounded check for excessive reminders
  const count = await db.orm.public.VoiceReminder.where({ personId, status: 'PENDING' }).all().then((res: any[]) => res.length);
  if (count > 50) return { ok: false, error: 'Too many active reminders.' };

  const reminder = await db.orm.public.VoiceReminder.create({
    personId,
    title,
    description,
    dueAt,
    entityType,
    entityReference,
    status: 'PENDING',
    source: 'VOICE'
  });

  return { ok: true, data: reminder };
}

export async function cancelReminder(personId: string, reminderId: string) {
  const existing = await db.orm.public.VoiceReminder.where({ id: reminderId, personId }).first();
  if (!existing) return { ok: false, error: 'Reminder not found or already processed.' };

  await db.orm.public.VoiceReminder.where({ id: reminderId }).update({ status: 'CANCELLED' });
  return { ok: true, data: { status: 'CANCELLED' } };
}

export async function listReminders(personId: string, status: string = 'PENDING') {
  const reminders = await db.orm.public.VoiceReminder.where({ personId, status }).all();
  return { ok: true, data: reminders };
}
