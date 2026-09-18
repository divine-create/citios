'use server'

import { db } from '@/src/prisma/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { findPersonByEmail } from '@/lib/identity';

export async function requireAuthenticatedAccount() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.personId) {
    throw new Error('UNAUTHORIZED: No active session or unlinked person');
  }

  // Canonical Person resolution: derive identity from the session email via
  // PersonIdentifier instead of trusting the JWT personId claim alone. The
  // personId is still cross-checked below as an integrity guard.
  const person = session.user.email
    ? await findPersonByEmail(session.user.email)
    : null;
  if (!person) {
    throw new Error('UNAUTHORIZED: Person record not found');
  }
  if (session.user.personId !== person.id) {
    throw new Error('UNAUTHORIZED: Session identity mismatch');
  }

  const account = await db.orm.public.Account.where({ personId: person.id }).all().first();
  if (!account) {
    throw new Error('UNAUTHORIZED: Account record not found');
  }

  return { session, person, account };
}

export async function requireMembership(organizationId: string, allowedRoles?: string[]) {
  const { session, person, account } = await requireAuthenticatedAccount();

  const membership = await db.orm.public.Membership.where({ 
    personId: person.id, 
    organizationId 
  }).all().first();

  if (!membership) {
    throw new Error(`FORBIDDEN: User does not have a membership at organization ${organizationId}`);
  }

  const roles = await db.orm.public.MembershipRole.where({ membershipId: membership.id }).all();
  
  if (allowedRoles && allowedRoles.length > 0) {
    const hasRole = roles.some(r => allowedRoles.includes(r.role));
    if (!hasRole) {
      throw new Error(`FORBIDDEN: Membership does not possess any of the required roles: ${allowedRoles.join(', ')}`);
    }
  }

  return { session, person, account, membership, roles };
}

export async function findStudentRelationship(organizationId: string, studentDataId: string) {
  const studentData = await db.orm.public.StudentData.where({ id: studentDataId }).all().first();
  if (!studentData) {
      throw new Error(`NOT_FOUND: StudentData ${studentDataId} not found`);
  }

  const relationship = await db.orm.public.Relationship.where({ 
      id: studentData.relationshipId 
  }).all().first();

  if (!relationship || relationship.organizationId !== organizationId) {
      throw new Error(`FORBIDDEN: Student does not belong to the requested organization`);
  }

  return { studentData, relationship };
}

export async function requireGuardianAuthorization(studentRelationshipId: string) {
  const { person } = await requireAuthenticatedAccount();

  const auth = await db.orm.public.GuardianAuthorization.where({
      guardianPersonId: person.id,
      wardRelationshipId: studentRelationshipId
  }).all().first();

  if (!auth) {
      throw new Error('FORBIDDEN: Missing explicit GuardianAuthorization for this student');
  }

  return { person, authorization: auth };
}
