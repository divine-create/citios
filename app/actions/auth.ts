'use server';

import { db } from '@/src/prisma/db';
import { hashPassword, verifyPassword } from '@/lib/password';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
}

export async function registerUser(input: RegisterInput) {
  try {
    const firstName = (input.firstName || '').trim();
    const lastName = (input.lastName || '').trim();
    const email = (input.email || '').trim().toLowerCase();
    const password = input.password || '';
    const phone = (input.phone || '').trim();

    if (!firstName || !lastName) {
      return { error: 'Please enter your first and last name.' };
    }

    if (!email || !email.includes('@')) {
      return { error: 'Please enter a valid email address.' };
    }

    if (password.length < 6) {
      return { error: 'Password must be at least 6 characters.' };
    }

    if (!phone || phone.length < 7) {
      return { error: 'Please enter a valid phone number.' };
    }

    // Check if email already registered
    const existingIdentifier = await db.orm.public.PersonIdentifier
      .where({ type: 'EMAIL', normalizedValue: email })
      .all()
      .first();

    if (existingIdentifier) {
      return { error: 'An account with this email already exists. Please sign in.' };
    }

    const existingPhone = await db.orm.public.PersonIdentifier
      .where({ type: 'PHONE', normalizedValue: phone })
      .all()
      .first();
    if (existingPhone) {
      return { error: 'An account with this phone number already exists.' };
    }

    const passwordHash = await hashPassword(password);

    // Create identity graph atomically
    const person = await db.transaction(async (tx: any) => {
      const newPerson = await tx.orm.public.Person.create({
        firstName,
        lastName,
      });

      await tx.orm.public.PersonIdentifier.create({
        personId: newPerson.id,
        type: 'EMAIL',
        normalizedValue: email,
        isVerified: true,
      });

      if (phone) {
        await tx.orm.public.PersonIdentifier.create({
          personId: newPerson.id,
          type: 'PHONE',
          normalizedValue: phone,
          isVerified: false,
        });
      }

      await tx.orm.public.Account.create({
        personId: newPerson.id,
        passwordHash,
        isActive: true,
      });

      await tx.orm.public.ResidentProfile.create({
        personId: newPerson.id,
        phone: phone || null,
        onboardingComplete: false,
      });

      return newPerson;
    });

    return {
      success: true,
      personId: person.id,
      email,
    };
  } catch (err: any) {
    console.error('Registration failed:', err);
    return { error: err?.message || 'Registration failed. Please try again.' };
  }
}

export async function getUserPasswordStatus() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.personId) {
    return { error: 'Not authenticated' };
  }

  const account = await db.orm.public.Account
    .where({ personId: session.user.personId })
    .all()
    .first();

  return {
    hasPassword: Boolean(account?.passwordHash),
    email: session.user.email,
  };
}

export async function setUserPassword(input: { currentPassword?: string; newPassword: string }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.personId) {
    return { error: 'You must be signed in to manage your password.' };
  }

  const newPassword = input.newPassword || '';
  if (newPassword.length < 6) {
    return { error: 'Password must be at least 6 characters long.' };
  }

  const account = await db.orm.public.Account
    .where({ personId: session.user.personId })
    .all()
    .first();

  if (!account) {
    return { error: 'Account record not found.' };
  }

  // If user already has a password set, require and verify the current password
  if (account.passwordHash) {
    if (!input.currentPassword) {
      return { error: 'Please enter your current password to set a new one.' };
    }
    const isValid = await verifyPassword(input.currentPassword, account.passwordHash);
    if (!isValid) {
      return { error: 'Current password is incorrect.' };
    }
  }

  const newHash = await hashPassword(newPassword);

  await db.orm.public.Account.where({ id: account.id }).update({
    passwordHash: newHash,
  });

  return {
    success: true,
    message: account.passwordHash
      ? 'Password changed successfully.'
      : 'Password set successfully! You can now log in using your email and password.',
  };
}
