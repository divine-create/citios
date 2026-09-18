import { db } from '@/src/prisma/db';

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
  const { firstName, lastName } = splitDisplayName(displayName);
  const person = await db.orm.public.Person.create({ firstName, lastName });
  await db.orm.public.PersonIdentifier.create({
    personId: person.id,
    type: 'EMAIL',
    normalizedValue: normalized,
    isVerified: true,
  });
  return person;
}
