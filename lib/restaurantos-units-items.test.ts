import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'module';
import { encode } from 'next-auth/jwt';
import { db } from '../src/prisma/db';
import { authOptions } from './auth';
import {
  getOrganizationUnits,
  createUnitOfMeasure,
  updateUnitOfMeasure,
  deleteUnitOfMeasure,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  createRecipe,
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
  const email = `units-${person.id.slice(0, 8)}@cityos.test`.toLowerCase();

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
      name: `${person.firstName || 'Manager'} ${person.lastName || 'Units'}`,
    },
    secret: (authOptions.secret as string) || 'cityos-jwt-secret-key-2026',
  });

  const cookieName =
    process.env.NODE_ENV === 'production' ? '__Secure-next-auth.session-token' : 'next-auth.session-token';
  mockCookies[cookieName] = token;
}

test('RestaurantOS Item & Unit of Measurement Management Suite', async (t) => {
  const suffix = Math.random().toString(36).substring(2, 8);
  const orgName = `Kitchen Units Hub ${suffix}`;

  // 1. Create Person
  const person = await db.orm.public.Person.create({
    firstName: 'Inventory',
    lastName: `Lead${suffix}`,
  });
  await setupAndSignInAs(person);

  // 2. Create Organization
  const org = await db.orm.public.Organization.create({
    name: orgName,
    type: 'RESTAURANT',
  });

  // 3. Create Membership as OWNER
  const membership = await db.orm.public.Membership.create({
    personId: person.id,
    organizationId: org.id,
  });
  await db.orm.public.MembershipRole.create({
    membershipId: membership.id,
    role: 'OWNER',
  });

  // 4. Ensure settings with enableInventory
  await db.orm.public.RestaurantSettings.create({
    organizationId: org.id,
    enableInventory: true,
    enableRecipes: true,
  });

  const customUnitName = `crate_${suffix}`;
  const renamedUnitName = `box_${suffix}`;

  await t.test('1. createUnitOfMeasure creates a new custom unit of measurement', async () => {
    const res = await createUnitOfMeasure(org.id, customUnitName);
    assert.ok(res, 'Should return response');
    assert.strictEqual(res.error, undefined, `Unexpected error: ${res.error}`);
    assert.strictEqual(res.success, true);
    assert.ok(res.units?.includes(customUnitName), 'Created unit should be in the list');

    // Verify it is returned by getOrganizationUnits
    const allUnits = await getOrganizationUnits(org.id);
    assert.ok(allUnits.includes(customUnitName), 'getOrganizationUnits must return custom unit');
  });

  let createdItemId = '';

  await t.test('2. createInventoryItem creates an item with the custom unit', async () => {
    const itemRes: any = await createInventoryItem({
      organizationId: org.id,
      name: `Fresh Bell Peppers ${suffix}`,
      unit: customUnitName,
      quantity: 25,
      lowStockLevel: 5,
      cost: 4.5,
      type: 'RAW_MATERIAL',
    });

    assert.ok(itemRes, 'Item should be created');
    assert.strictEqual(itemRes.error, undefined, `Error creating item: ${itemRes.error}`);
    assert.strictEqual(itemRes.name, `Fresh Bell Peppers ${suffix}`);
    assert.strictEqual(itemRes.unit, customUnitName);
    assert.strictEqual(itemRes.quantity, 25);
    createdItemId = itemRes.id;
  });

  await t.test('3. updateInventoryItem updates item name, cost, lowStock, and type', async () => {
    const updateRes: any = await updateInventoryItem(createdItemId, {
      name: `Organic Bell Peppers ${suffix}`,
      cost: 5.25,
      lowStockLevel: 8,
      type: 'RAW_MATERIAL',
    });

    assert.ok(updateRes, 'Should return response');
    assert.strictEqual(updateRes.error, undefined, `Error updating item: ${updateRes.error}`);
    assert.strictEqual(updateRes.item?.name, `Organic Bell Peppers ${suffix}`);
    assert.strictEqual(updateRes.item?.cost, 5.25);
    assert.strictEqual(updateRes.item?.lowStockLevel, 8);
  });

  await t.test('4. updateUnitOfMeasure renames unit and cascades to inventory items', async () => {
    const renameRes = await updateUnitOfMeasure(org.id, customUnitName, renamedUnitName);
    assert.strictEqual(renameRes.error, undefined, `Error renaming unit: ${renameRes.error}`);
    assert.strictEqual(renameRes.success, true);
    assert.ok(renameRes.updatedItemsCount && renameRes.updatedItemsCount >= 1, 'Should cascade to items');

    // Verify inventory item was cascaded to the new unit
    const itemInDb = await db.orm.public.RestaurantInventoryItem.where({ id: createdItemId }).all().first();
    assert.strictEqual(itemInDb?.unit, renamedUnitName, 'Item unit must be cascaded to new unit name');
  });

  await t.test('5. deleteUnitOfMeasure rejects deletion if an item still uses the unit', async () => {
    const delFail = await deleteUnitOfMeasure(org.id, renamedUnitName);
    assert.ok(delFail.error, 'Should reject delete when unit is in use');
    assert.match(delFail.error, /assigned to/i);
  });

  await t.test('6. deleteInventoryItem rejects deletion if item is used in a recipe', async () => {
    // Create a recipe using this item
    const recipe = await createRecipe({
      organizationId: org.id,
      name: `Salad Recipe ${suffix}`,
      yieldQuantity: 1,
      ingredients: [{ itemId: createdItemId, quantity: 2 }],
    });
    assert.strictEqual((recipe as any).error, undefined);

    // Attempt to delete item
    const delFail: any = await deleteInventoryItem(createdItemId);
    assert.ok(delFail.error, 'Should block item deletion when used in recipe');
    assert.match(delFail.error, /used in \d+ recipe/i);

    // Clean up recipe ingredient to allow next test
    const ings = await db.orm.public.RestaurantRecipeIngredient.where({ itemId: createdItemId }).all();
    for (const ing of ings) {
      await db.orm.public.RestaurantRecipeIngredient.where({ id: ing.id }).delete();
    }
  });

  await t.test('7. deleteInventoryItem deletes item when free from recipe constraints', async () => {
    const delRes: any = await deleteInventoryItem(createdItemId);
    assert.strictEqual(delRes.error, undefined, `Delete error: ${delRes.error}`);
    assert.strictEqual(delRes.success, true);

    const check = await db.orm.public.RestaurantInventoryItem.where({ id: createdItemId }).all().first();
    assert.strictEqual(check, null, 'Item should be removed from database');
  });

  await t.test('8. deleteUnitOfMeasure succeeds now that no item uses it', async () => {
    const delSuccess = await deleteUnitOfMeasure(org.id, renamedUnitName);
    assert.strictEqual(delSuccess.error, undefined, `Delete unit error: ${delSuccess.error}`);
    assert.strictEqual(delSuccess.success, true);

    const unitsNow = await getOrganizationUnits(org.id);
    assert.ok(!unitsNow.includes(renamedUnitName), 'Unit should be deleted');
  });
});
