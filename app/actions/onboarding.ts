'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/src/prisma/db';

const INTEREST_OPTIONS = [
  'Foodie', 'Nightlife', 'Fitness & Outdoors', 'Arts & Culture',
  'Live Music', 'Families & Kids', 'Tech & Startups', 'Volunteering',
  'Shopping', 'Pets', 'Gaming', 'Wellness',
];

export async function completeOnboarding(data: {
  homeCityId: string;
  dateOfBirth: string;
  phone?: string;
  interests: string[];
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.personId) throw new Error('Unauthorized');

  const personId = session.user.personId;

  // Update Person with DOB + home city
  await db.orm.public.Person.where({ id: personId }).update({
    homeCityId: data.homeCityId,
    dateOfBirth: new Date(data.dateOfBirth),
  });

  // Upsert the ResidentProfile
  const existing = await db.orm.public.ResidentProfile
    .where({ personId })
    .all()
    .first();

  if (existing) {
    await db.orm.public.ResidentProfile.where({ personId }).update({
      phone: data.phone,
      interests: JSON.stringify(data.interests),
      onboardingComplete: true,
    });
  } else {
    await db.orm.public.ResidentProfile.create({
      personId,
      phone: data.phone,
      interests: JSON.stringify(data.interests),
      onboardingComplete: true,
    });
  }

  return { success: true };
}
