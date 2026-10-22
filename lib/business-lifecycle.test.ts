import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'module';
import { encode } from 'next-auth/jwt';
import { db } from '../src/prisma/db';
import { authOptions } from './auth';
import {
  getBusinessClosureEligibility,
  closeOrDeleteOrganization,
  reopenOrganization,
} from './actions/business';

const require = createRequire(import.meta.url);
const nextHeaders = require('next/headers');
const mockCookies: Record<string, string> = {};
nextHeaders.headers = () => new Map();
nextHeaders.cookies = () => ({
  get: (name: string) => (mockCookies[name] ? { name, value: mockCookies[name] } : undefined),
  getAll: () => Object.entries(mockCookies).map(([name, value]) => ({ name, value })),
  has: (name: string) => Boolean(mockCookies[name]),
});

async function setupAndSignInAs(person: { id: string; firstName: string; lastName: string }) {
  const email = `lifecycle-${person.id.slice(0, 8)}@cityos.test`.toLowerCase();

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
      name: `${person.firstName} ${person.lastName}`,
    },
    secret: (authOptions.secret as string) || 'cityos-jwt-secret-key-2026',
  });

  const cookieName =
    process.env.NODE_ENV === 'production' ? '__Secure-next-auth.session-token' : 'next-auth.session-token';
  mockCookies[cookieName] = token;
}

test('Business Lifecycle: Option 3 (Two-Tier Deletion and Closure)', async (t) => {
  const owner = await db.orm.public.Person.create({
    firstName: 'Amaka',
    lastName: 'Eze',
  });
  await setupAndSignInAs(owner);

  const city = (await db.orm.public.City.where({ slug: 'calabar' }).all().first()) ||
    (await db.orm.public.City.all().first());

  assert.ok(city, 'Default test city must exist');

  let operatingOrgId: string = '';

  await t.test('1. Tier 1 (Fast Purge): Zero-activity organization is purged completely without FK violations', async () => {
    await setupAndSignInAs(owner);

    // Create zero-activity organization
    const org = await db.orm.public.Organization.create({
      name: `Amaka Test Pop-Up Shop ${Date.now()}`,
      type: 'RETAIL',
      address: 'Marian Road, Calabar',
    });

    const location = await db.orm.public.Location.create({
      organizationId: org.id,
      name: 'Main Store',
      address: 'Marian Road, Calabar',
      cityId: city.id,
    });

    const membership = await db.orm.public.Membership.create({
      personId: owner.id,
      organizationId: org.id,
    });

    await db.orm.public.MembershipRole.create({
      membershipId: membership.id,
      role: 'OWNER',
    });

    await db.orm.public.MembershipLocation.create({
      membershipId: membership.id,
      locationId: location.id,
    });

    // Create wallet (note: Wallet has onDelete: Restrict)
    await db.orm.public.Wallet.create({
      organizationId: org.id,
      balance: 0.0,
      currency: 'NGN',
    });

    // Create discovery listing
    const listingSlug = `amaka-test-shop-${org.id.slice(0, 8)}`;
    await db.orm.public.DiscoveryListing.create({
      organizationId: org.id,
      locationId: location.id,
      cityId: city.id,
      vertical: 'RETAIL',
      slug: listingSlug,
      title: 'Amaka Test Pop-Up Shop',
      isActive: true,
    });

    // 1. Inspect eligibility
    const eligibility = await getBusinessClosureEligibility(org.id);
    assert.equal(eligibility.success, true);
    assert.equal(eligibility.tier, 'PURGE');
    assert.equal(eligibility.hasActivity, false);
    assert.equal(eligibility.eligible, true);
    assert.equal(eligibility.reasons.length, 0);

    // 2. Execute Tier 1 Purge
    const purgeRes = await closeOrDeleteOrganization(org.id);
    assert.equal(purgeRes.success, true);
    assert.equal(purgeRes.action, 'PURGED');

    // 3. Verify database rows deleted
    const checkOrg = await db.orm.public.Organization.where({ id: org.id }).all().first();
    assert.equal(checkOrg, null, 'Organization must be completely deleted');

    const checkWallet = await db.orm.public.Wallet.where({ organizationId: org.id }).all().first();
    assert.equal(checkWallet, null, 'Wallet must be deleted');

    const checkListing = await db.orm.public.DiscoveryListing.where({ organizationId: org.id }).all().first();
    assert.equal(checkListing, null, 'DiscoveryListing must be deleted');
  });

  await t.test('2. Tier 2 (Archival / Close): Operating organization with order history is blocked if wallet balance > 0 or orders unfulfilled', async () => {
    await setupAndSignInAs(owner);

    // Create operating organization
    const org = await db.orm.public.Organization.create({
      name: `Amaka Real Boutique ${Date.now()}`,
      type: 'RETAIL',
      address: 'NDDC Road, Calabar',
    });
    operatingOrgId = org.id;

    const location = await db.orm.public.Location.create({
      organizationId: org.id,
      name: 'Boutique Branch',
      address: 'NDDC Road, Calabar',
      cityId: city.id,
    });

    const membership = await db.orm.public.Membership.create({
      personId: owner.id,
      organizationId: org.id,
    });

    await db.orm.public.MembershipRole.create({
      membershipId: membership.id,
      role: 'OWNER',
    });

    const wallet = await db.orm.public.Wallet.create({
      organizationId: org.id,
      balance: 15000.0, // Non-zero balance
      currency: 'NGN',
    });

    await db.orm.public.DiscoveryListing.create({
      organizationId: org.id,
      locationId: location.id,
      cityId: city.id,
      vertical: 'RETAIL',
      slug: `amaka-real-boutique-${org.id.slice(0, 8)}`,
      title: 'Amaka Real Boutique',
      isActive: true,
    });

    // Simulate an active pending order
    const pendingOrder = await db.orm.public.RetailOrder.create({
      organizationId: org.id,
      locationId: location.id,
      cashierId: membership.id,
      totalAmount: 15000,
      paymentMethod: 'CASH',
      status: 'PENDING', // Active order!
    });

    // 1. Inspect eligibility
    const eligibility = await getBusinessClosureEligibility(org.id);
    assert.equal(eligibility.success, true);
    assert.equal(eligibility.tier, 'ARCHIVE');
    assert.equal(eligibility.hasActivity, true);
    assert.equal(eligibility.eligible, false, 'Must not be eligible while balance > 0 and order is active');
    assert.ok(eligibility.reasons.some((r: string) => r.includes('remaining balance')));
    assert.ok(eligibility.reasons.some((r: string) => r.includes('unfulfilled or active order')));

    // 2. Direct close attempt must be rejected with informative error
    const blockedRes = await closeOrDeleteOrganization(org.id);
    assert.ok(blockedRes.error, 'Attempt to close must fail when pre-conditions not met');
    assert.ok(blockedRes.error?.includes('remaining wallet balance'));

    // Clean up order and reset balance to 0 for next subtest
    await db.orm.public.RetailOrder.where({ id: pendingOrder.id }).update({ status: 'CONFIRMED' });
    await db.orm.public.Wallet.where({ id: wallet.id }).update({ balance: 0.0 });
  });

  await t.test('3. Tier 2 (Archival / Close): Cleared operating organization is closed safely, delisted from marketplace, and audit log recorded', async () => {
    await setupAndSignInAs(owner);

    assert.ok(operatingOrgId, 'Operating org id must be set from test 2');

    // 1. Re-check eligibility now that balance = 0 and orders are CONFIRMED
    const eligibility = await getBusinessClosureEligibility(operatingOrgId);
    assert.equal(eligibility.success, true);
    assert.equal(eligibility.tier, 'ARCHIVE');
    assert.equal(eligibility.hasActivity, true);
    assert.equal(eligibility.eligible, true, 'Must now be eligible to close safely');
    assert.equal(eligibility.reasons.length, 0);

    // 2. Execute closure
    const closeRes = await closeOrDeleteOrganization(operatingOrgId);
    assert.equal(closeRes.success, true);
    assert.equal(closeRes.action, 'CLOSED');

    // 3. Verify status changed to CLOSED
    const updatedOrg = await db.orm.public.Organization.where({ id: operatingOrgId }).all().first();
    assert.equal(updatedOrg?.status, 'CLOSED');

    // 4. Verify public marketplace listing was deactivated
    const updatedListing = await db.orm.public.DiscoveryListing.where({ organizationId: operatingOrgId }).all().first();
    assert.equal(updatedListing?.isActive, false, 'Listing must be hidden from public discovery');

    // 5. Verify audit event
    const audits = await db.orm.public.HQAuditEvent.where({
      targetId: operatingOrgId,
      action: 'ORGANIZATION_CLOSED',
    }).all();
    assert.ok(audits.length >= 1, 'HQAuditEvent ORGANIZATION_CLOSED must be recorded');
  });

  await t.test('4. Reopening: Closed organization can be reopened by owner, restoring ACTIVE status and marketplace listing', async () => {
    await setupAndSignInAs(owner);

    assert.ok(operatingOrgId, 'Operating org id must be set from test 2');

    // 1. Reopen
    const reopenRes = await reopenOrganization(operatingOrgId);
    assert.equal(reopenRes.success, true);

    // 2. Verify restored to ACTIVE
    const restoredOrg = await db.orm.public.Organization.where({ id: operatingOrgId }).all().first();
    assert.equal(restoredOrg?.status, 'ACTIVE');

    // 3. Verify listing reactivated
    const restoredListing = await db.orm.public.DiscoveryListing.where({ organizationId: operatingOrgId }).all().first();
    assert.equal(restoredListing?.isActive, true, 'Marketplace listing must be live again');

    // 4. Verify audit event
    const audits = await db.orm.public.HQAuditEvent.where({
      targetId: operatingOrgId,
      action: 'ORGANIZATION_REOPENED',
    }).all();
    assert.ok(audits.length >= 1, 'HQAuditEvent ORGANIZATION_REOPENED must be recorded');
  });

  await t.test('5. Security: Non-owner callers are rejected with FORBIDDEN', async () => {
    assert.ok(operatingOrgId, 'Operating org id must be set from test 2');

    // Create a staff member with CASHIER role only
    const cashier = await db.orm.public.Person.create({
      firstName: 'Sunday',
      lastName: 'Cashier',
    });
    const cashierMembership = await db.orm.public.Membership.create({
      personId: cashier.id,
      organizationId: operatingOrgId,
    });
    await db.orm.public.MembershipRole.create({
      membershipId: cashierMembership.id,
      role: 'CASHIER',
    });

    await setupAndSignInAs(cashier);

    // Cashier attempting to close must be rejected
    const closeAttempt = await closeOrDeleteOrganization(operatingOrgId);
    assert.ok(closeAttempt.error);
    assert.ok(closeAttempt.error.includes('FORBIDDEN') || closeAttempt.error.includes('required roles'));

    // Cashier attempting to reopen must be rejected
    const reopenAttempt = await reopenOrganization(operatingOrgId);
    assert.ok(reopenAttempt.error);
    assert.ok(reopenAttempt.error.includes('FORBIDDEN') || reopenAttempt.error.includes('required roles'));
  });
});
