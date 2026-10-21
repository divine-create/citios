'use server';

import '@js-temporal/polyfill';

import { db } from '@/src/prisma/db';
import { hashPassword, verifyPassword } from '@/lib/password';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { normalizePhoneNumber } from '@/lib/identity';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { sendResendEmail, buildPasswordResetEmailHtml } from '@/lib/email/resend';

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
    const normalizedPhone = normalizePhoneNumber(input.phone);

    if (!firstName || !lastName) {
      return { error: 'Please enter your first and last name.' };
    }

    if (!email || !email.includes('@')) {
      return { error: 'Please enter a valid email address.' };
    }

    if (password.length < 6) {
      return { error: 'Password must be at least 6 characters.' };
    }

    if (!normalizedPhone) {
      return { error: 'Please enter a valid phone number (e.g. 08012345678 or +2348012345678).' };
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
      .where({ type: 'PHONE', normalizedValue: normalizedPhone })
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

      await tx.orm.public.PersonIdentifier.create({
        personId: newPerson.id,
        type: 'PHONE',
        normalizedValue: normalizedPhone,
        isVerified: false,
      });

      await tx.orm.public.Account.create({
        personId: newPerson.id,
        passwordHash,
        isActive: true,
      });

      await tx.orm.public.ResidentProfile.create({
        personId: newPerson.id,
        phone: normalizedPhone,
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
  const session = await getServerSession(authOptions).catch(() => null);
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
  const session = await getServerSession(authOptions).catch(() => null);
  if (!session?.user?.personId) {
    return { error: 'You must be signed in to manage your password.' };
  }

  const newPassword = input.newPassword || '';
  if (newPassword.length < 6) {
    return { error: 'Password must be at least 6 characters long.' };
  }

  let account = await db.orm.public.Account
    .where({ personId: session.user.personId })
    .all()
    .first();

  // Resilience: ensure Account record exists if user joined via external provider
  if (!account) {
    account = await db.orm.public.Account.create({
      personId: session.user.personId,
      isActive: true,
    });
  }

  // If user already has a password set, require and verify the current password
  const hadPassword = Boolean(account.passwordHash);
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
    hasPassword: true,
    message: hadPassword
      ? 'Password changed successfully.'
      : 'Password set successfully! You can now log in using your email and password.',
  };
}



function toTemporalInstant(d: Date | number) {
  const ms = typeof d === 'number' ? d : d.getTime();
  return (globalThis as any).Temporal.Instant.fromEpochMilliseconds(ms);
}

function getEpochMs(val: any): number {
  if (!val) return 0;
  if (typeof val.epochMilliseconds === 'number') return val.epochMilliseconds;
  return new Date(val).getTime();
}

/**
 * Initiates a password reset flow by verifying email, creating a secure token,
 * and dispatching a branded email via Resend.
 */
export async function requestPasswordReset(input: { email: string }) {
  try {
    const rawEmail = (input?.email || '').trim().toLowerCase();
    if (!rawEmail || !rawEmail.includes('@')) {
      return { error: 'Please enter a valid email address.' };
    }

    // Generic success message to prevent account enumeration
    const genericSuccess = {
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link shortly.',
    };

    // 1. Look up PersonIdentifier for this email
    const emailIdent = await db.orm.public.PersonIdentifier
      .where({ type: 'EMAIL', normalizedValue: rawEmail })
      .all()
      .first();

    if (!emailIdent?.personId) {
      return genericSuccess;
    }

    const person = await db.orm.public.Person
      .where({ id: emailIdent.personId })
      .all()
      .first();

    if (!person) {
      return genericSuccess;
    }

    // Check if account has an existing password or is an OAuth-first user
    const account = await db.orm.public.Account
      .where({ personId: person.id })
      .all()
      .first();

    const isOAuthUser = !account?.passwordHash;

    // 2. Generate cryptographically secure token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = toTemporalInstant(Date.now() + 30 * 60 * 1000); // 30 minutes validity

    // 3. Invalidate old unused tokens for this person
    const oldTokens = await db.orm.public.PasswordResetToken
      .where({ personId: person.id })
      .all();

    for (const oldToken of oldTokens) {
      if (!oldToken.usedAt) {
        await db.orm.public.PasswordResetToken.where({ id: oldToken.id }).update({
          usedAt: toTemporalInstant(Date.now()),
        });
      }
    }

    // 4. Record new token hash
    await db.orm.public.PasswordResetToken.create({
      id: uuidv4(),
      personId: person.id,
      email: rawEmail,
      tokenHash,
      expiresAt,
    });

    // 5. Construct reset URL
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl.replace(/\/$/, '')}/reset-password?token=${token}`;

    // 6. Send email via Resend
    const recipientName = person.firstName ? `${person.firstName} ${person.lastName}`.trim() : '';
    const emailHtml = buildPasswordResetEmailHtml({
      recipientName,
      resetUrl,
      isOAuthUser,
    });

    await sendResendEmail({
      to: rawEmail,
      subject: 'Reset Your 9jaLive Password',
      html: emailHtml,
      text: `Reset your 9jaLive password by visiting: ${resetUrl} (Valid for 30 minutes)`,
    });

    return genericSuccess;
  } catch (err: any) {
    console.error('Password reset request error:', err);
    return { error: 'Unable to process password reset request. Please try again.' };
  }
}

/**
 * Validates a password reset token from URL query params before rendering the reset form.
 */
export async function verifyResetToken(token: string) {
  try {
    const cleanToken = (token || '').trim();
    if (cleanToken.length !== 64) {
      return { valid: false, error: 'This password reset link is invalid or malformed.' };
    }

    const tokenHash = crypto.createHash('sha256').update(cleanToken).digest('hex');

    const resetRecord = await db.orm.public.PasswordResetToken
      .where({ tokenHash })
      .all()
      .first();

    if (!resetRecord) {
      return { valid: false, error: 'This password reset link is invalid or has expired.' };
    }

    if (resetRecord.usedAt) {
      return { valid: false, error: 'This password reset link has already been used. Please request a new one.' };
    }

    if (getEpochMs(resetRecord.expiresAt) < Date.now()) {
      return { valid: false, error: 'This password reset link has expired. Please request a new one.' };
    }

    // Partially mask email for user visual confirmation (e.g., e***e@example.com)
    const email = resetRecord.email;
    const atIndex = email.indexOf('@');
    const maskedEmail = atIndex > 2
      ? `${email[0]}***${email[atIndex - 1]}${email.slice(atIndex)}`
      : email;

    return {
      valid: true,
      email: maskedEmail,
    };
  } catch (err: any) {
    console.error('Verify reset token error:', err);
    return { valid: false, error: 'Failed to verify reset token.' };
  }
}

/**
 * Applies a new password given a valid, unexpired reset token.
 */
export async function resetPasswordWithToken(input: { token: string; newPassword: string }) {
  try {
    const cleanToken = (input?.token || '').trim();
    const newPassword = input?.newPassword || '';

    if (cleanToken.length !== 64) {
      return { error: 'This password reset link is invalid or malformed.' };
    }

    if (newPassword.length < 6) {
      return { error: 'Password must be at least 6 characters long.' };
    }

    const tokenHash = crypto.createHash('sha256').update(cleanToken).digest('hex');

    return await db.transaction(async (tx: any) => {
      const resetRecord = await tx.orm.public.PasswordResetToken
        .where({ tokenHash })
        .all()
        .first();

      if (!resetRecord) {
        return { error: 'This password reset link is invalid or has expired.' };
      }

      if (resetRecord.usedAt) {
        return { error: 'This password reset link has already been used. Please request a new one.' };
      }

      if (getEpochMs(resetRecord.expiresAt) < Date.now()) {
        return { error: 'This password reset link has expired. Please request a new one.' };
      }

      // Ensure Account exists for OAuth users who never had an explicit Account record
      let account = await tx.orm.public.Account
        .where({ personId: resetRecord.personId })
        .all()
        .first();

      if (!account) {
        account = await tx.orm.public.Account.create({
          id: uuidv4(),
          personId: resetRecord.personId,
          isActive: true,
        });
      }

      // Hash new password using scrypt
      const newHash = await hashPassword(newPassword);

      // Update password
      await tx.orm.public.Account.where({ id: account.id }).update({
        passwordHash: newHash,
      });

      // Mark token as used
      await tx.orm.public.PasswordResetToken.where({ id: resetRecord.id }).update({
        usedAt: toTemporalInstant(Date.now()),
      });

      return {
        success: true,
        message: 'Your password has been successfully reset! You can now log in with your new password.',
      };
    });
  } catch (err: any) {
    console.error('Reset password error:', err);
    return { error: 'Failed to reset password. Please try again or request a new reset link.' };
  }
}
