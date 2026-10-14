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
  if (!account.isActive) {
    throw new Error('FORBIDDEN: Account is deactivated or suspended');
  }

  return { session, person, account };
}

export async function requireMembership(organizationId: string, allowedRoles?: string[], locationId?: string | null) {
  const { session, person, account } = await requireAuthenticatedAccount();

  
  const org = await db.orm.public.Organization.where({ id: organizationId }).all().first();
  if (org && org.status === 'SUSPENDED') {
    throw new Error('FORBIDDEN: Organization has been suspended by the platform.');
  }

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

  if (locationId) {
    const loc = await db.orm.public.Location.where({ id: locationId }).all().first();
    if (!loc) {
      throw new Error(`NOT_FOUND: Location ${locationId} not found`);
    }
    if (loc.organizationId !== organizationId) {
      throw new Error(`FORBIDDEN: Location ${locationId} does not belong to organization ${organizationId}`);
    }

    const isGlobalAdmin = roles.some(r => ['OWNER', 'ADMIN', 'MANAGER'].includes(r.role));
    if (!isGlobalAdmin) {
      const memLoc = await db.orm.public.MembershipLocation.where({ membershipId: membership.id, locationId }).all().first();
      if (!memLoc) {
        throw new Error(`FORBIDDEN: Membership does not have access to location ${locationId}`);
      }
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

export async function getTeamMembers(organizationId: string) {
  const { membership } = await requireMembership(organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
  
  const memberships = await db.orm.public.Membership.where({ organizationId }).all();
  const members = [];
  
  for (const m of memberships) {
    const person = await db.orm.public.Person.where({ id: m.personId }).all().first();
    const roles = await db.orm.public.MembershipRole.where({ membershipId: m.id }).all();
    const locations = await db.orm.public.MembershipLocation.where({ membershipId: m.id }).all();
    
    if (person) {
      members.push({
        membershipId: m.id,
        personId: person.id,
        firstName: person.firstName,
        lastName: person.lastName,
        email: (await db.orm.public.PersonIdentifier.where({ personId: person.id, type: 'EMAIL' }).all().first())?.normalizedValue || '',
        roles: roles.map(r => r.role),
        locations: locations.map(l => l.locationId),
        joinedAt: m.createdAt,
      });
    }
  }
  
  return members;
}

export async function inviteTeamMember(input: {
  organizationId: string;
  email: string;
  roles: string[];
  locationId?: string;
}) {
  await requireMembership(input.organizationId, ['OWNER', 'ADMIN']);

  if (!input.roles || input.roles.length === 0) {
    return { error: 'At least one role must be assigned.' };
  }
  
  // Try to find the person by email
  const person = await findPersonByEmail(input.email);
  if (!person) {
    return { error: 'No user found with that email. They must sign up for CityOS first.' };
  }

  // Handle location verification before writing anything
  if (input.locationId) {
    const loc = await db.orm.public.Location.where({ id: input.locationId }).all().first();
    if (!loc) {
      return { error: 'Location not found.' };
    }
    if (loc.organizationId !== input.organizationId) {
      return { error: 'FORBIDDEN: Location does not belong to this organization.' };
    }
  }

  return await db.transaction(async (tx: any) => {
    // Acquire exclusive row lock on Organization to serialize role changes and prevent concurrency races
    await tx.execute(
      db.raw.sql`SELECT id FROM "organization" WHERE id = ${input.organizationId} FOR UPDATE`.affectedCount().build()
    );

    // Check if they are already a member
    let mem = await tx.orm.public.Membership.where({ personId: person.id, organizationId: input.organizationId }).all().first();
    
    if (mem) {
      // Check if existing member has OWNER role and if the new roles omit OWNER (demotion)
      const existingRoles = await tx.orm.public.MembershipRole.where({ membershipId: mem.id }).all();
      const isCurrentlyOwner = existingRoles.some((r: { role: string }) => r.role === 'OWNER');
      const isDemotingOwner = isCurrentlyOwner && !input.roles.includes('OWNER');

      if (isDemotingOwner) {
        const orgMembers = await tx.orm.public.Membership.where({ organizationId: input.organizationId }).all();
        let orgOwnerCount = 0;
        for (const m of orgMembers) {
          const ownerRole = await tx.orm.public.MembershipRole.where({ membershipId: m.id, role: 'OWNER' }).all().first();
          if (ownerRole) orgOwnerCount++;
        }
        if (orgOwnerCount <= 1) {
          return { error: 'FORBIDDEN: Cannot demote the last OWNER of this organization.' };
        }
      }

      // Clear existing roles
      for (const r of existingRoles) {
        await tx.orm.public.MembershipRole.where({ id: r.id }).delete();
      }
    } else {
      mem = await tx.orm.public.Membership.create({
        personId: person.id,
        organizationId: input.organizationId,
      });
    }
    
    // Add new roles
    for (const role of input.roles) {
      await tx.orm.public.MembershipRole.create({
        membershipId: mem.id,
        role
      });
    }
    
    // Handle location binding
    if (input.locationId) {
      const existingLocs = await tx.orm.public.MembershipLocation.where({ membershipId: mem.id }).all();
      for (const l of existingLocs) {
        await tx.orm.public.MembershipLocation.where({ id: l.id }).delete();
      }
      await tx.orm.public.MembershipLocation.create({
        membershipId: mem.id,
        locationId: input.locationId
      });
    }
    
    return { success: true };
  });
}

export async function removeTeamMember(input: {
  organizationId: string;
  membershipId: string;
}) {
  await requireMembership(input.organizationId, ['OWNER', 'ADMIN']);
  
  return await db.transaction(async (tx: any) => {
    // Acquire exclusive row lock on Organization to serialize concurrent removals/role updates
    await tx.execute(
      db.raw.sql`SELECT id FROM "organization" WHERE id = ${input.organizationId} FOR UPDATE`.affectedCount().build()
    );

    const mem = await tx.orm.public.Membership.where({ id: input.membershipId }).all().first();
    if (!mem || mem.organizationId !== input.organizationId) {
      return { error: 'Membership not found in this organization.' };
    }
    
    // Prevent removing the last owner of THIS organization under the lock
    const isOwner = await tx.orm.public.MembershipRole.where({ membershipId: mem.id, role: 'OWNER' }).all().first();
    if (isOwner) {
      const orgMembers = await tx.orm.public.Membership.where({ organizationId: input.organizationId }).all();
      let orgOwnerCount = 0;
      for (const m of orgMembers) {
        const ownerRole = await tx.orm.public.MembershipRole.where({ membershipId: m.id, role: 'OWNER' }).all().first();
        if (ownerRole) orgOwnerCount++;
      }
      if (orgOwnerCount <= 1) {
        return { error: 'FORBIDDEN: Cannot remove the last OWNER of this organization.' };
      }
    }
    
    // Delete roles and location bindings first to ensure clean cascade
    const roles = await tx.orm.public.MembershipRole.where({ membershipId: input.membershipId }).all();
    for (const r of roles) {
      await tx.orm.public.MembershipRole.where({ id: r.id }).delete();
    }
    const locs = await tx.orm.public.MembershipLocation.where({ membershipId: input.membershipId }).all();
    for (const l of locs) {
      await tx.orm.public.MembershipLocation.where({ id: l.id }).delete();
    }
    await tx.orm.public.Membership.where({ id: input.membershipId }).delete();

    return { success: true };
  });
}
