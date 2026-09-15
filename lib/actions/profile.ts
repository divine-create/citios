'use server'

import { db } from '@/src/prisma/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function getProfileAndWallet() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return null;
  }
  
  try {
    const email = session.user.email;
    const name = session.user.name || 'Resident';
    const image = session.user.image || null;

    // Find the person by email.
    const emailLower = email.toLowerCase();
    let identifier = await db.orm.public.PersonIdentifier.where({ type: "EMAIL", normalizedValue: emailLower }).all().first();
    let person;

    if (!identifier) {
        // Create person if they don't exist
        const firstName = name.split(' ')[0] || 'Unknown';
        const lastName = name.split(' ').slice(1).join(' ') || 'User';
        person = await db.orm.public.Person.create({
            firstName,
            lastName,
        });
        identifier = await db.orm.public.PersonIdentifier.create({
            personId: person.id,
            type: "EMAIL",
            normalizedValue: emailLower,
            isVerified: true
        });
    } else {
        person = await db.orm.public.Person.where({ id: identifier.personId }).all().first();
    }

    if (!person) return null;

    // Ensure wallet exists
    let wallet = await db.orm.public.Wallet.where({ personId: person.id }).all().first();

    if (!wallet) {
        wallet = await db.orm.public.Wallet.create({
            personId: person.id,
            balance: 50.00 // Give new users $50
        });
    }

    return JSON.parse(JSON.stringify({
        user: { ...person, email, image, name: `${person.firstName} ${person.lastName}` },
        wallet
    }));
  } catch (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
}

export async function updateProfile(input: { name?: string; image?: string }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !session?.user?.personId) {
    return { error: 'Not authenticated' };
  }

  try {
    const data: any = {};
    if (input.name !== undefined) {
      data.firstName = input.name.split(' ')[0] || 'Unknown';
      data.lastName = input.name.split(' ').slice(1).join(' ') || 'User';
    }

    if (Object.keys(data).length > 0) {
      await db.orm.public.Person.where({ id: session.user.personId }).update(data);
    }

    if (input.image !== undefined) {
      let profile = await db.orm.public.ResidentProfile.where({ personId: session.user.personId }).all().first();
      if (!profile) {
        await db.orm.public.ResidentProfile.create({ personId: session.user.personId, avatarUrl: input.image });
      } else {
        await db.orm.public.ResidentProfile.where({ id: profile.id }).update({ avatarUrl: input.image });
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating profile:', error);
    return { error: 'Failed to update profile' };
  }
}
