import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../src/prisma/db';
import { encode } from 'next-auth/jwt';
import { authOptions } from './auth';
import {
  createMenuItem,
  updateMenuItem,
  toggleMenuItemAvailability,
  deleteMenuItem,
} from './actions/restaurantos';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const nextHeaders = require('next/headers');
const mockCookies: Record<string, string> = {};
nextHeaders.headers = () => new Map();
nextHeaders.cookies = () => ({
  get: (name: string) => (mockCookies[name] ? { name, value: mockCookies[name] } : undefined),
  getAll: () => Object.entries(mockCookies).map(([name, value]) => ({ name, value })),
  has: (name: string) => Boolean(mockCookies[name]),
});

async function createTestSession(person: any) {
  const email = `test-menu-${person.id.slice(0, 8)}@cityos.test`;
  const existingIdent = await db.orm.public.PersonIdentifier.where({ personId: person.id, type: 'EMAIL' }).all().first();
  if (!existingIdent) {
    await db.orm.public.PersonIdentifier.create({
      personId: person.id,
      type: 'EMAIL',
      normalizedValue: email,
      isVerified: true,
    });
  }
  const existingAccount = await db.orm.public.Account.where({ personId: person.id }).all().first();
  if (!existingAccount) {
    await db.orm.public.Account.create({
      personId: person.id,
      isActive: true,
    });
  }

  const token = await encode({
    token: {
      email,
      name: `${person.firstName} ${person.lastName}`,
      personId: person.id,
    },
    secret: (authOptions.secret as string) || 'cityos-jwt-secret-key-2026',
  });
  return token;
}

test('RestaurantOS: Menu Item Editing, Validation & Tenant Isolation', async (t) => {
  // Setup: Owner person and organization
  const ownerPerson = await db.orm.public.Person.create({
    firstName: 'Chef',
    lastName: 'Owner',
  });
  const ownerToken = await createTestSession(ownerPerson);

  const restOrg = await db.orm.public.Organization.create({
    name: `Taste of Calabar Kitchen ${Date.now()}`,
    type: 'RESTAURANT',
    status: 'ACTIVE',
  });

  const ownerMembership = await db.orm.public.Membership.create({
    personId: ownerPerson.id,
    organizationId: restOrg.id,
  });

  await db.orm.public.MembershipRole.create({
    membershipId: ownerMembership.id,
    role: 'OWNER',
  });

  // Outsider person and organization
  const outsiderPerson = await db.orm.public.Person.create({
    firstName: 'Stranger',
    lastName: 'Danger',
  });
  const outsiderToken = await createTestSession(outsiderPerson);

  const outsiderOrg = await db.orm.public.Organization.create({
    name: `Competitor Diner ${Date.now()}`,
    type: 'RESTAURANT',
    status: 'ACTIVE',
  });

  const outsiderMembership = await db.orm.public.Membership.create({
    personId: outsiderPerson.id,
    organizationId: outsiderOrg.id,
  });

  await db.orm.public.MembershipRole.create({
    membershipId: outsiderMembership.id,
    role: 'OWNER',
  });

  let testMenuItemId = '';

  await t.test('1. Create initial menu item for testing', async () => {
    mockCookies['next-auth.session-token'] = ownerToken;

    const created = await createMenuItem({
      organizationId: restOrg.id,
      name: 'Fisherman Soup Special',
      description: 'Fresh seafood from Calabar river',
      price: 6500,
      category: 'Soups & Swallow',
      kitchenStation: 'Main Kitchen',
      imageUrl: '/images/menu/fisherman-soup.jpg',
    });

    assert.ok(created && !created.error, `Failed to create menu item: ${created?.error}`);
    assert.equal(created.name, 'Fisherman Soup Special');
    assert.equal(created.price, 6500);
    testMenuItemId = created.id;
  });

  await t.test('2. updateMenuItem: updates name, price, description, category, and kitchen station', async () => {
    mockCookies['next-auth.session-token'] = ownerToken;

    const updated = await updateMenuItem(testMenuItemId, {
      name: 'Deluxe Fisherman Soup',
      price: 7500,
      description: 'Loaded with jumbo prawns and fresh periwinkle',
      category: 'Specialties',
      kitchenStation: 'Grill & Soup Station',
      imageUrl: '/images/menu/fisherman-soup.jpg',
    });

    assert.ok(updated && !updated.error, `Update failed: ${updated?.error}`);
    assert.equal(updated.name, 'Deluxe Fisherman Soup');
    assert.equal(updated.price, 7500);
    assert.equal(updated.category, 'Specialties');
    assert.equal(updated.kitchenStation, 'Grill & Soup Station');
    assert.equal(updated.description, 'Loaded with jumbo prawns and fresh periwinkle');
  });

  await t.test('3. updateMenuItem: accepts string price and coerces safely', async () => {
    mockCookies['next-auth.session-token'] = ownerToken;

    const updated = await updateMenuItem(testMenuItemId, {
      price: '8200.50' as any,
    });

    assert.ok(updated && !updated.error);
    assert.equal(updated.price, 8200.50);
  });

  await t.test('4. updateMenuItem: validates against negative price or empty name/category', async () => {
    mockCookies['next-auth.session-token'] = ownerToken;

    const negRes = await updateMenuItem(testMenuItemId, { price: -500 });
    assert.ok(negRes.error, 'Negative price must be rejected');

    const emptyNameRes = await updateMenuItem(testMenuItemId, { name: '   ' });
    assert.ok(emptyNameRes.error, 'Empty name must be rejected');

    const emptyCatRes = await updateMenuItem(testMenuItemId, { category: '   ' });
    assert.ok(emptyCatRes.error, 'Empty category must be rejected');
  });

  await t.test('5. updateMenuItem: rejects unauthorized outsider (tenant isolation)', async () => {
    mockCookies['next-auth.session-token'] = outsiderToken;

    const unauthRes = await updateMenuItem(testMenuItemId, {
      name: 'Hacked Menu Item',
      price: 1,
    });

    assert.ok(unauthRes.error, 'Outsider must be forbidden from editing menu item');
    assert.match(unauthRes.error, /FORBIDDEN/i);
  });

  await t.test('6. toggleMenuItemAvailability: toggles availability status accurately', async () => {
    mockCookies['next-auth.session-token'] = ownerToken;

    // Toggle to 86'd (false)
    const toggle1 = await toggleMenuItemAvailability(testMenuItemId);
    assert.ok(toggle1.success);
    assert.equal(toggle1.isAvailable, false);

    const check1 = await db.orm.public.MenuItem.where({ id: testMenuItemId }).all().first();
    assert.equal(check1?.isAvailable, false);

    // Toggle back to available (true)
    const toggle2 = await toggleMenuItemAvailability(testMenuItemId);
    assert.ok(toggle2.success);
    assert.equal(toggle2.isAvailable, true);
  });

  await t.test('7. deleteMenuItem: deletes item and rejects outsider', async () => {
    // Outsider cannot delete
    mockCookies['next-auth.session-token'] = outsiderToken;
    const outsiderDel = await deleteMenuItem(testMenuItemId);
    assert.ok(outsiderDel.error, 'Outsider cannot delete');

    // Owner can delete
    mockCookies['next-auth.session-token'] = ownerToken;
    const ownerDel = await deleteMenuItem(testMenuItemId);
    assert.ok(ownerDel.success, 'Owner should delete successfully');

    const deletedItem = await db.orm.public.MenuItem.where({ id: testMenuItemId }).all().first();
    assert.equal(deletedItem, null, 'Item must no longer exist in DB');
  });

  // Teardown
  await db.orm.public.MembershipRole.where({ membershipId: ownerMembership.id }).delete();
  await db.orm.public.Membership.where({ id: ownerMembership.id }).delete();
  await db.orm.public.Organization.where({ id: restOrg.id }).delete();

  await db.orm.public.Membership.where({ id: outsiderMembership.id }).delete();
  await db.orm.public.Organization.where({ id: outsiderOrg.id }).delete();

  await db.orm.public.PersonIdentifier.where({ personId: ownerPerson.id }).delete();
  await db.orm.public.Account.where({ personId: ownerPerson.id }).delete();
  await db.orm.public.Person.where({ id: ownerPerson.id }).delete();

  await db.orm.public.PersonIdentifier.where({ personId: outsiderPerson.id }).delete();
  await db.orm.public.Account.where({ personId: outsiderPerson.id }).delete();
  await db.orm.public.Person.where({ id: outsiderPerson.id }).delete();
});
