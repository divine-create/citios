'use server';

import { db } from '@/src/prisma/db';
import { hashPassword } from '@/lib/password';

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

    // Check if email already registered
    const existingIdentifier = await db.orm.public.PersonIdentifier
      .where({ type: 'EMAIL', normalizedValue: email })
      .all()
      .first();

    if (existingIdentifier) {
      return { error: 'An account with this email already exists. Please sign in.' };
    }

    if (phone) {
      const existingPhone = await db.orm.public.PersonIdentifier
        .where({ type: 'PHONE', normalizedValue: phone })
        .all()
        .first();
      if (existingPhone) {
        return { error: 'An account with this phone number already exists.' };
      }
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
