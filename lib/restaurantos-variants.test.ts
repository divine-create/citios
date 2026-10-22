import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'module';
import { encode } from 'next-auth/jwt';
import { db } from '../src/prisma/db';
import { authOptions } from './auth';
import {
  createVariant,
  updateVariant,
  deleteVariant,
  toggleVariantAvailability,
} from './actions/restaurantos';

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
  const email = `variant-${person.id.slice(0, 8)}@cityos.test`.toLowerCase();

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
      name: `${person.firstName || 'Chef'} ${person.lastName || 'Tester'}`,
    },
    secret: (authOptions.secret as string) || 'cityos-jwt-secret-key-2026',
  });

  const cookieName =
    process.env.NODE_ENV === 'production' ? '__Secure-next-auth.session-token' : 'next-auth.session-token';
  mockCookies[cookieName] = token;
}

test('RestaurantOS Variant Management Suite', async (t) => {
  // Create isolated test fixtures
  const owner = await db.orm.public.Person.create({
    firstName: 'Chef',
    lastName: 'EateryOwner',
  });

  const org = await db.orm.public.Organization.create({
    name: `Variant Test Eatery ${Date.now()}`,
    type: 'RESTAURANT',
    status: 'ACTIVE',
  });

  const membership = await db.orm.public.Membership.create({
    personId: owner.id,
    organizationId: org.id,
  });

  await db.orm.public.MembershipRole.create({
    membershipId: membership.id,
    role: 'OWNER',
  });

  const menuItem = await db.orm.public.MenuItem.create({
    organizationId: org.id,
    name: 'Jollof Rice Special',
    price: 3500,
    category: 'Rice Dishes',
    isAvailable: true,
  });

  // Sign in as restaurant owner
  await setupAndSignInAs(owner);

  let createdVariantId: string | null = null;

  await t.test('1. createVariant validates input and creates variant linked to menu item', async () => {
    // Empty name rejection
    const emptyNameRes = await createVariant({
      organizationId: org.id,
      menuItemId: menuItem.id,
      name: '',
      price: 2500,
    });
    assert.ok('error' in emptyNameRes, 'Should reject empty name');

    // Negative price rejection
    const negPriceRes = await createVariant({
      organizationId: org.id,
      menuItemId: menuItem.id,
      name: 'Small Plate',
      price: -500,
    });
    assert.ok('error' in negPriceRes, 'Should reject negative price');

    // Valid creation
    const validRes = await createVariant({
      organizationId: org.id,
      menuItemId: menuItem.id,
      name: 'Small Plate',
      price: 2500,
    });

    assert.ok(validRes.success, 'Variant creation should succeed');
    assert.ok(validRes.variant?.id, 'Should return created variant with ID');
    assert.equal(validRes.variant.name, 'Small Plate');
    assert.equal(validRes.variant.price, 2500);
    assert.equal(validRes.variant.isAvailable, true);
    assert.equal(validRes.variant.menuItemId, menuItem.id);

    createdVariantId = validRes.variant.id;

    // Verify in database
    const dbRecord = await db.orm.public.MenuItemVariant.where({ id: createdVariantId! }).all().first();
    assert.ok(dbRecord, 'Variant must be persisted in database');
    assert.equal(dbRecord.price, 2500);
  });

  await t.test('2. updateVariant updates name and price accurately', async () => {
    assert.ok(createdVariantId, 'Must have a created variant ID');

    const updateRes = await updateVariant(createdVariantId!, {
      name: 'Small Plate (Special)',
      price: 2700,
    });

    assert.ok(updateRes.success, 'Update should succeed');

    const updated = await db.orm.public.MenuItemVariant.where({ id: createdVariantId! }).all().first();
    assert.equal(updated?.name, 'Small Plate (Special)');
    assert.equal(updated?.price, 2700);
  });

  await t.test('3. toggleVariantAvailability flips availability (86 status)', async () => {
    assert.ok(createdVariantId, 'Must have a created variant ID');

    // Toggle to unavailable (86'd)
    const toggle1 = await toggleVariantAvailability(createdVariantId!);
    assert.ok(toggle1.success);
    assert.equal(toggle1.isAvailable, false);

    let record = await db.orm.public.MenuItemVariant.where({ id: createdVariantId! }).all().first();
    assert.equal(record?.isAvailable, false);

    // Toggle back to available
    const toggle2 = await toggleVariantAvailability(createdVariantId!);
    assert.ok(toggle2.success);
    assert.equal(toggle2.isAvailable, true);

    record = await db.orm.public.MenuItemVariant.where({ id: createdVariantId! }).all().first();
    assert.equal(record?.isAvailable, true);
  });

  await t.test('4. IDOR / Cross-Tenant guard: rejects unauthorized modifications', async () => {
    assert.ok(createdVariantId, 'Must have a created variant ID');

    // Create unauthorized outsider person and sign in
    const outsider = await db.orm.public.Person.create({
      firstName: 'Outsider',
      lastName: 'Attacker',
    });

    await setupAndSignInAs(outsider);

    // Attempt to update variant
    const updateAttempt = await updateVariant(createdVariantId!, {
      name: 'Hacked Variant',
      price: 1,
    });
    assert.ok('error' in updateAttempt, 'Outsider should be rejected with error');

    // Attempt to delete variant
    const deleteAttempt = await deleteVariant(createdVariantId!);
    assert.ok('error' in deleteAttempt, 'Outsider should be rejected from deletion');

    // Restore owner session
    await setupAndSignInAs(owner);
  });

  await t.test('5. deleteVariant removes variant cleanly', async () => {
    assert.ok(createdVariantId, 'Must have a created variant ID');

    const deleteRes = await deleteVariant(createdVariantId!);
    assert.ok(deleteRes.success, 'Deletion should succeed');

    const check = await db.orm.public.MenuItemVariant.where({ id: createdVariantId! }).all().first();
    assert.equal(check, null, 'Deleted variant must no longer exist in database');
  });
});
