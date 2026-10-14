'use server';

import '@js-temporal/polyfill';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/src/prisma/db';
import { normalizePhoneNumber } from '@/lib/identity';

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

  if (!data.homeCityId) {
    throw new Error('Please select your home city.');
  }

  // Verify city exists in canonical registry and is active
  const city = await db.orm.public.City.where({ id: data.homeCityId }).all().first();
  if (!city || !city.isActive) {
    throw new Error('Selected home city is invalid or inactive.');
  }

  if (!data.dateOfBirth) {
    throw new Error('Please enter your date of birth.');
  }

  const dateOfBirth = new Date(data.dateOfBirth);
  if (Number.isNaN(dateOfBirth.getTime())) {
    throw new Error('Please enter a valid date of birth.');
  }

  const normalizedPhone = normalizePhoneNumber(data.phone);
  if (!normalizedPhone) {
    throw new Error('A valid phone number is required (e.g. 08012345678 or +2348012345678).');
  }

  // Anti-hijacking guard: Verify phone does not belong to another Person
  const existingPhoneId = await db.orm.public.PersonIdentifier
    .where({ type: 'PHONE', normalizedValue: normalizedPhone })
    .all()
    .first();

  if (existingPhoneId && existingPhoneId.personId !== personId) {
    throw new Error('This phone number is already linked to another account.');
  }

  await db.transaction(async (tx: any) => {
    // Update Person with DOB + home city
    await tx.orm.public.Person.where({ id: personId }).update({
      homeCityId: data.homeCityId,
      dateOfBirth: toInstant(dateOfBirth),
    });

    // Ensure PHONE PersonIdentifier is registered and belongs to this user
    if (!existingPhoneId) {
      const currentPersonPhone = await tx.orm.public.PersonIdentifier
        .where({ personId, type: 'PHONE' })
        .all()
        .first();

      if (currentPersonPhone) {
        await tx.orm.public.PersonIdentifier.where({ id: currentPersonPhone.id }).update({
          normalizedValue: normalizedPhone,
        });
      } else {
        await tx.orm.public.PersonIdentifier.create({
          personId,
          type: 'PHONE',
          normalizedValue: normalizedPhone,
          isVerified: false,
        });
      }
    }

    // Upsert the ResidentProfile atomically
    const existing = await tx.orm.public.ResidentProfile
      .where({ personId })
      .all()
      .first();

    if (existing) {
      await tx.orm.public.ResidentProfile.where({ personId }).update({
        phone: normalizedPhone,
        interests: JSON.stringify(data.interests || []),
        onboardingComplete: true,
      });
    } else {
      await tx.orm.public.ResidentProfile.create({
        personId,
        phone: normalizedPhone,
        interests: JSON.stringify(data.interests || []),
        onboardingComplete: true,
      });
    }
  });

  return { success: true };
}
