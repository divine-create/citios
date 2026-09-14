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

    // Find the user by email.
    let user = await db.orm.public.User.where({ email }).all().first();

    if (!user) {
        // Create user if they don't exist
        user = await db.orm.public.User.create({
            email,
            name,
            image,
        });
    }

    // Ensure wallet exists
    let wallet = await db.orm.public.Wallet.where({ userId: user.id }).all().first();

    if (!wallet) {
        wallet = await db.orm.public.Wallet.create({
            type: 'RESIDENT',
            userId: user.id,
            balance: 50.00 // Give new users $50
        });
    }

    return JSON.parse(JSON.stringify({
        user,
        wallet
    }));
  } catch (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
}

export async function updateProfile(input: { name?: string; image?: string }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return { error: 'Not authenticated' };
  }

  try {
    const data: any = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.image !== undefined) data.image = input.image;

    await db.orm.public.User.where({ email: session.user.email }).update(data);
    return { success: true };
  } catch (error) {
    console.error('Error updating profile:', error);
    return { error: 'Failed to update profile' };
  }
}
