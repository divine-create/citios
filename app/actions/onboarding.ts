'use server';

import '@js-temporal/polyfill';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/src/prisma/db';

function toInstant(date: Date) {
  return (globalThis as any).Temporal.Instant.fromEpochMilliseconds(date.getTime());
}

export async function completeOnboarding(data: {
  homeCityId: string;
  dateOfBirth: string;
  phone: string;
  interests: string[];
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.personId) throw new Error('Unauthorized');

  const personId = session.user.personId;
  const cleanPhone = (data.phone || '').trim();

  if (!data.homeCityId) {
    throw new Error('Please select your home city.');
  }

  if (!data.dateOfBirth) {
    throw new Error('Please enter your date of birth.');
  }

  const dateOfBirth = new Date(data.dateOfBirth);
  if (Number.isNaN(dateOfBirth.getTime())) {
    throw new Error('Please enter a valid date of birth.');
  }

  if (!cleanPhone || cleanPhone.length < 7) {
    throw new Error('A valid phone number is required.');
  }

  // Update Person with DOB + home city
  await db.orm.public.Person.where({ id: personId }).update({
    homeCityId: data.homeCityId,
    dateOfBirth: toInstant(dateOfBirth),
  });

  // Ensure PHONE PersonIdentifier is registered if not already present
  const existingPhoneId = await db.orm.public.PersonIdentifier
    .where({ type: 'PHONE', normalizedValue: cleanPhone })
    .all()
    .first();

  if (!existingPhoneId) {
    await db.orm.public.PersonIdentifier.create({
      personId,
      type: 'PHONE',
      normalizedValue: cleanPhone,
      isVerified: false,
    });
  }

  // Upsert the ResidentProfile
  const existing = await db.orm.public.ResidentProfile
    .where({ personId })
    .all()
    .first();

  if (existing) {
    await db.orm.public.ResidentProfile.where({ personId }).update({
      phone: cleanPhone,
      interests: JSON.stringify(data.interests),
      onboardingComplete: true,
    });
  } else {
    await db.orm.public.ResidentProfile.create({
      personId,
      phone: cleanPhone,
      interests: JSON.stringify(data.interests),
      onboardingComplete: true,
    });
  }

  return { success: true };
}
