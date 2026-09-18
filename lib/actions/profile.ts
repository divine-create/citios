'use server'

import { db } from '@/src/prisma/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { resolvePersonByEmail } from '@/lib/identity';

export async function getProfileAndWallet() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return null;
  }

  try {
    const email = session.user.email;
    const name = session.user.name || 'Resident';
    const image = session.user.image || null;

    // Canonical Person resolution (provisions Person + PersonIdentifier on
    // first sign-in). No client-supplied ids are trusted here.
    const person = await resolvePersonByEmail(email, name);
    if (!person) return null;

    // Ensure the wallet exists. New wallets start at balance 0 — money is
    // only ever created through real ledger events (see lib/actions/retail.ts,
    // lib/actions/hotel.ts), never by gifting a starting balance.
    let wallet = await db.orm.public.Wallet.where({ personId: person.id }).all().first();

    if (!wallet) {
      wallet = await db.orm.public.Wallet.create({
        personId: person.id,
        balance: 0,
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
      // Guard: the session personId must match the canonical Person resolved
      // from the session email, so a stale/forged personId cannot update
      // someone else's identity.
      const person = await resolvePersonByEmail(session.user.email);
      if (!person || person.id !== session.user.personId) {
        return { error: 'Not authorized' };
      }
      await db.orm.public.Person.where({ id: person.id }).update(data);
    }

    if (input.image !== undefined) {
      const person = await resolvePersonByEmail(session.user.email);
      if (!person) return { error: 'Not authenticated' };

      let profile = await db.orm.public.ResidentProfile.where({ personId: person.id }).all().first();
      if (!profile) {
        await db.orm.public.ResidentProfile.create({ personId: person.id, avatarUrl: input.image });
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
