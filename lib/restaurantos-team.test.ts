import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'module';
import { encode } from 'next-auth/jwt';
import { db } from '../src/prisma/db';
import { authOptions } from './auth';
import { getTeamMembers, inviteTeamMember, removeTeamMember } from './actions/tenant';

// Setup mock headers/cookies for Next.js 15 test runner
const require = createRequire(import.meta.url);
const nextHeaders = require('next/headers');
const mockCookies: Record<string, string> = {};
nextHeaders.headers = () => new Map();
nextHeaders.cookies = () => ({
  get: (name: string) => (mockCookies[name] ? { name, value: mockCookies[name] } : undefined),
  getAll: () => Object.entries(mockCookies).map(([name, value]) => ({ name, value })),
  has: (name: string) => Boolean(mockCookies[name]),
});

async function setupAndSignInAs(person: { id: string; firstName?: string; lastName?: string }) {
  const email = `team-${person.id.slice(0, 8)}@cityos.test`.toLowerCase();

  const existingIdent = await db.orm.public.PersonIdentifier
    .where({ personId: person.id, type: 'EMAIL' })
    .all()
    .first();
  if (!existingIdent) {
    await db.orm.public.PersonIdentifier.create({
      personId: person.id,
      type: 'EMAIL',
      normalizedValue: email,
      isVerified: true,
    });
  }

  const existingAcct = await db.orm.public.Account
    .where({ personId: person.id })
    .all()
    .first();
  if (!existingAcct) {
    await db.orm.public.Account.create({ personId: person.id, isActive: true });
  }

  const token = await encode({
    token: {
      personId: person.id,
      email,
      name: `${person.firstName || 'Manager'} ${person.lastName || 'Team'}`,
    },
    secret: (authOptions.secret as string) || 'cityos-jwt-secret-key-2026',
  });

  const cookieName =
    process.env.NODE_ENV === 'production' ? '__Secure-next-auth.session-token' : 'next-auth.session-token';
  mockCookies[cookieName] = token;
}

test('RestaurantOS Team & Roles Management Suite', async (t) => {
  const suffix = Math.random().toString(36).substring(2, 8);
  const orgName = `Flavors Team Hub ${suffix}`;

  // 1. Create Owner Person
  const owner = await db.orm.public.Person.create({
    firstName: 'Chef',
    lastName: `Owner${suffix}`,
  });
  await setupAndSignInAs(owner);

  // 2. Create Restaurant Organization
  const org = await db.orm.public.Organization.create({
    name: orgName,
    type: 'RESTAURANT',
  });

  // 3. Create Membership as OWNER
  const ownerMembership = await db.orm.public.Membership.create({
    personId: owner.id,
    organizationId: org.id,
  });
  await db.orm.public.MembershipRole.create({
    membershipId: ownerMembership.id,
    role: 'OWNER',
  });

  // 4. Create another registered Person to be invited
  const staffEmail = `staff-${suffix}@cityos.test`.toLowerCase();
  const staff = await db.orm.public.Person.create({
    firstName: 'Amara',
    lastName: `Cook${suffix}`,
  });
  await db.orm.public.PersonIdentifier.create({
    personId: staff.id,
    type: 'EMAIL',
    normalizedValue: staffEmail,
    isVerified: true,
  });
  await db.orm.public.Account.create({
    personId: staff.id,
    isActive: true,
  });

  await t.test('1. getTeamMembers returns initial owner membership', async () => {
    const team = await getTeamMembers(org.id);
    assert.ok(Array.isArray(team), 'Team should be an array');
    assert.ok(team.length >= 1, 'Should contain at least 1 member');
    const ownerMember = team.find((m: any) => m.personId === owner.id);
    assert.ok(ownerMember, 'Owner must be present in team members');
    assert.strictEqual(ownerMember.firstName, 'Chef');
    assert.ok(ownerMember.roles.includes('OWNER'), 'Owner should have OWNER role');
  });

  let invitedMembershipId = '';

  await t.test('2. inviteTeamMember adds staff with designated role', async () => {
    const res: any = await inviteTeamMember({
      organizationId: org.id,
      email: staffEmail,
      roles: ['CHEF', 'CASHIER'],
    });

    assert.ok(res, 'Should return response');
    assert.strictEqual(res.error, undefined, `Unexpected invite error: ${res.error}`);
    assert.strictEqual(res.success, true);
    assert.ok(res.membershipId, 'Should return membershipId');
    invitedMembershipId = res.membershipId;

    // Verify team members now has 2 members
    const teamAfter = await getTeamMembers(org.id);
    const invited = teamAfter.find((m: any) => m.personId === staff.id);
    assert.ok(invited, 'Invited member should appear in getTeamMembers');
    assert.strictEqual(invited.firstName, 'Amara');
    assert.ok(invited.roles.includes('CHEF'), 'Should include CHEF role');
    assert.ok(invited.roles.includes('CASHIER'), 'Should include CASHIER role');
  });

  await t.test('3. removeTeamMember successfully removes staff member', async () => {
    const res: any = await removeTeamMember({
      organizationId: org.id,
      membershipId: invitedMembershipId,
    });

    assert.ok(res, 'Should return response');
    assert.strictEqual(res.error, undefined, `Unexpected remove error: ${res.error}`);
    assert.strictEqual(res.success, true);

    // Verify member is gone
    const teamAfterRemove = await getTeamMembers(org.id);
    const found = teamAfterRemove.find((m: any) => m.membershipId === invitedMembershipId);
    assert.strictEqual(found, undefined, 'Removed member should no longer appear');
  });
});
