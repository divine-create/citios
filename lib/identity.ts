import { db } from '@/src/prisma/db';
import crypto from 'crypto';

// ============================================================================
// CANONICAL PERSON RESOLUTION
// ----------------------------------------------------------------------------
// Single server-side path from an authenticated session identity (email from
// the NextAuth JWT) to the canonical Person row, via PersonIdentifier.
//
// Rules:
//  - The email always comes from the server session, never from client input.
//  - Person + EMAIL PersonIdentifier are provisioned together, exactly once.
//  - No caller may pass a personId as authoritative; ids are only ever read
//    back from the database.
//
// Consumers: lib/auth.ts (login JWT callback), lib/actions/profile.ts, and any
// server action that needs the canonical Person for the current session.
// ============================================================================

/**
 * Find the canonical Person for an email via PersonIdentifier, or null.
 */
export async function findPersonByEmail(email: string) {
  const normalized = (email || '').trim().toLowerCase();
  if (!normalized) return null;

  const identifier = await db.orm.public.PersonIdentifier
    .where({ type: 'EMAIL', normalizedValue: normalized })
    .all()
    .first();
  if (!identifier) return null;

  return db.orm.public.Person.where({ id: identifier.personId }).all().first();
}

/**
 * Find the canonical Person by either EMAIL or PHONE identifier, or null.
 */
export async function findPersonByIdentifier(raw: string) {
  const normalized = (raw || '').trim().toLowerCase();
  if (!normalized) return null;

  // 1. Try EMAIL
  const emailIdent = await db.orm.public.PersonIdentifier
    .where({ type: 'EMAIL', normalizedValue: normalized })
    .all()
    .first();
  if (emailIdent) {
    return db.orm.public.Person.where({ id: emailIdent.personId }).all().first();
  }

  // 2. Try PHONE (exact match)
  const phoneIdent = await db.orm.public.PersonIdentifier
    .where({ type: 'PHONE', normalizedValue: normalized })
    .all()
    .first();
  if (phoneIdent) {
    return db.orm.public.Person.where({ id: phoneIdent.personId }).all().first();
  }

  // 3. Try stripped PHONE (without +, spaces, dashes)
  const digitsOnly = normalized.replace(/\D/g, '');
  if (digitsOnly.length >= 7) {
    const allPhones = await db.orm.public.PersonIdentifier
      .where({ type: 'PHONE' })
      .all();
    const match = allPhones.find((p) => {
      const pDigits = p.normalizedValue.replace(/\D/g, '');
      return pDigits.endsWith(digitsOnly.slice(-10)) || digitsOnly.endsWith(pDigits.slice(-10));
    });
    if (match) {
      return db.orm.public.Person.where({ id: match.personId }).all().first();
    }
  }

  return null;
}

function splitDisplayName(name: string | null | undefined) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || 'Unknown',
    lastName: parts.slice(1).join(' ') || 'User',
  };
}

/**
 * Resolve the canonical Person for a session email, provisioning Person +
 * PersonIdentifier on first sign-in. Returns null when no email is available.
 */
export async function resolvePersonByEmail(email: string, displayName?: string | null) {
  const normalized = (email || '').trim().toLowerCase();
  if (!normalized) return null;

  const existing = await findPersonByEmail(normalized);
  if (existing) return existing;

  // First sign-in for this email: provision identity atomically with its
  // EMAIL identifier so the pair can never drift apart.
  return await db.transaction(async (tx: any) => {
    const recheckIdent = await tx.orm.public.PersonIdentifier
      .where({ type: 'EMAIL', normalizedValue: normalized })
      .all()
      .first();
    if (recheckIdent) {
      return tx.orm.public.Person.where({ id: recheckIdent.personId }).all().first();
    }

    const { firstName, lastName } = splitDisplayName(displayName);
    const personId = crypto.randomUUID();
    const person = await tx.orm.public.Person.create({ id: personId, firstName, lastName });
    await tx.orm.public.PersonIdentifier.create({
      personId: person.id,
      type: 'EMAIL',
      normalizedValue: normalized,
      isVerified: true,
    });
    return person;
  });
}

/**
 * Normalizes phone numbers to standard E.164 format.
 * Converts local Nigerian numbers (e.g. 080... or 23480...) to +234 format.
 * Validates E.164 pattern: + followed by 8 to 15 digits.
 * Returns null if the number is malformed or invalid.
 */
export function normalizePhoneNumber(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const cleaned = trimmed.replace(/[\s\-\(\)\.]/g, '');
  if (!cleaned) return null;

  let formatted = cleaned;
  if (/^0\d{10}$/.test(formatted)) {
    // 08012345678 -> +2348012345678
    formatted = `+234${formatted.slice(1)}`;
  } else if (/^234\d{10}$/.test(formatted)) {
    // 2348012345678 -> +2348012345678
    formatted = `+${formatted}`;
  } else if (/^\d{10}$/.test(formatted)) {
    // 8012345678 -> +2348012345678
    formatted = `+234${formatted}`;
  }

  // E.164 standard: +[1-9] followed by 7 to 14 digits (8-15 digits total)
  if (/^\+[1-9]\d{7,14}$/.test(formatted)) {
    return formatted;
  }
  return null;
}


/**
 * Standard two-letter initials generator for residents, organizations, and fallback avatars.
 */
export function getTwoLetterInitials(name?: string | null): string {
  if (!name || typeof name !== 'string') return '9L';
  const cleaned = name.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim();
  const words = cleaned.split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    const c1 = Array.from(words[0])[0];
    const c2 = Array.from(words[1])[0];
    if (c1 && c2) return (c1 + c2).toUpperCase();
  }

  if (words.length === 1) {
    const chars = Array.from(words[0]);
    if (chars.length >= 2) return (chars[0] + chars[1]).toUpperCase();
    if (chars.length === 1) return (chars[0] + 'L').toUpperCase();
  }

  return '9L';
}

/**
 * Safely resolves avatar or image assets, normalizing raw asset IDs to /api/assets/[id].
 */
export function resolveAvatarUrl(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/') || trimmed.startsWith('data:')) {
    return trimmed;
  }
  return `/api/assets/${trimmed}`;
}
