import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'module';
import { encode } from 'next-auth/jwt';
import { db } from '../src/prisma/db';
import { authOptions } from './auth';
import {
  createRecipe,
  deleteRecipe,
  getRecipes,
  createInventoryItem,
  linkRecipeToMenuItem
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
  const email = `recipe-${person.id.slice(0, 8)}@cityos.test`.toLowerCase();

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

test('RestaurantOS Recipe Management & Creation Suite', async (t) => {
  const suffix = Math.random().toString(36).substring(2, 8);
  const orgName = `Test Kitchen ${suffix}`;

  // 1. Create Person
  const person = await db.orm.public.Person.create({
    firstName: 'Chef',
    lastName: `Tester${suffix}`,
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

  // 4. Create Menu Item
  const menuItem = await db.orm.public.MenuItem.create({
    organizationId: org.id,
    name: `Signature Burger ${suffix}`,
    price: 15.0,
    category: 'Mains',
  });

  // 5. Create Inventory Raw Materials
  const beefPatty = await db.orm.public.RestaurantInventoryItem.create({
    organizationId: org.id,
    name: `Beef Patty ${suffix}`,
    unit: 'pcs',
    quantity: 50,
    lowStockLevel: 10,
    cost: 3.5,
    type: 'RAW_MATERIAL',
  });

  const burgerBun = await db.orm.public.RestaurantInventoryItem.create({
    organizationId: org.id,
    name: `Brioche Bun ${suffix}`,
    unit: 'pcs',
    quantity: 60,
    lowStockLevel: 12,
    cost: 1.0,
    type: 'RAW_MATERIAL',
  });

  await t.test('1. createRecipe creates recipe and automatically enables enableRecipes capability', async () => {
    // Initial settings: null or default
    const recipeRes = await createRecipe({
      organizationId: org.id,
      name: `Signature Burger Recipe ${suffix}`,
      yieldQuantity: 1,
      instructions: '1. Toast bun. 2. Grill patty for 4 mins each side. 3. Assemble burger.',
      menuItemId: menuItem.id,
      ingredients: [
        { itemId: beefPatty.id, quantity: 1 },
        { itemId: burgerBun.id, quantity: 1 },
      ],
    });

    assert.ok(recipeRes, 'createRecipe should return a result');
    assert.strictEqual((recipeRes as any).error, undefined, `Unexpected error: ${(recipeRes as any).error}`);
    assert.strictEqual(recipeRes.name, `Signature Burger Recipe ${suffix}`);
    assert.strictEqual(recipeRes.menuItemId, menuItem.id);
    assert.strictEqual(recipeRes.yieldQuantity, 1);

    // Verify capability auto-enabled
    const settings = await db.orm.public.RestaurantSettings.where({ organizationId: org.id }).all().first();
    assert.ok(settings, 'RestaurantSettings should be created');
    assert.strictEqual(settings.enableRecipes, true, 'enableRecipes must be true');
    assert.strictEqual(settings.enableInventory, true, 'enableInventory must be true');

    // Verify ingredients created
    const ingredients = await db.orm.public.RestaurantRecipeIngredient.where({ recipeId: recipeRes.id }).all();
    assert.strictEqual(ingredients.length, 2, 'Should create 2 recipe ingredients');
  });

  await t.test('2. createRecipe prevents duplicate recipe for same menu item', async () => {
    const dupRes = await createRecipe({
      organizationId: org.id,
      name: `Duplicate Burger Recipe ${suffix}`,
      yieldQuantity: 1,
      menuItemId: menuItem.id,
      ingredients: [],
    });

    assert.ok(dupRes, 'Should return response');
    assert.ok((dupRes as any).error, 'Should return error for duplicate menu item recipe');
    assert.match((dupRes as any).error, /already has an assigned recipe/i);
  });

  await t.test('3. createRecipe allows standalone/batch prep recipe without ingredients (draft)', async () => {
    const batchRes = await createRecipe({
      organizationId: org.id,
      name: `House Hot Sauce Batch ${suffix}`,
      yieldQuantity: 10,
      instructions: 'Blend habaneros and vinegar.',
      ingredients: [],
    });

    assert.strictEqual((batchRes as any).error, undefined);
    assert.strictEqual(batchRes.name, `House Hot Sauce Batch ${suffix}`);
    assert.strictEqual(batchRes.yieldQuantity, 10);
    assert.strictEqual(batchRes.menuItemId, null);
  });

  await t.test('4. deleteRecipe removes recipe and cleans up recipe ingredients', async () => {
    const tempRes = await createRecipe({
      organizationId: org.id,
      name: `Temporary Recipe ${suffix}`,
      yieldQuantity: 2,
      ingredients: [{ itemId: beefPatty.id, quantity: 2 }],
    });
    assert.strictEqual((tempRes as any).error, undefined);

    const delRes = await deleteRecipe(org.id, tempRes.id);
    assert.strictEqual((delRes as any).error, undefined);
    assert.strictEqual(delRes.success, true);

    // Check recipe is gone
    const checkRecipe = await db.orm.public.RestaurantRecipe.where({ id: tempRes.id }).all().first();
    assert.strictEqual(checkRecipe, null, 'Recipe should be deleted from DB');

    // Check ingredients are gone
    const checkIngs = await db.orm.public.RestaurantRecipeIngredient.where({ recipeId: tempRes.id }).all();
    assert.strictEqual(checkIngs.length, 0, 'Ingredients should be deleted');
  });

  await t.test('5. Non-members cannot create recipes (security boundary check)', async () => {
    const unauthPerson = await db.orm.public.Person.create({
      firstName: 'Intruder',
      lastName: 'Hacker',
    });
    await setupAndSignInAs(unauthPerson);

    const failRes = await createRecipe({
      organizationId: org.id,
      name: 'Hacked Recipe',
      yieldQuantity: 1,
      ingredients: [],
    });

    assert.ok((failRes as any).error, 'Should reject unauthorized user');
  });

  await t.test('6. Recipe auto-links to menu item with matching name, and linkRecipeToMenuItem links explicitly', async () => {
    await setupAndSignInAs(person);

    // Create a menu item with unique name
    const dishName = `Signature Fried Rice ${suffix}`;
    const menuItem = await db.orm.public.MenuItem.create({
      organizationId: org.id,
      name: dishName,
      price: 3500,
      category: 'Mains',
      isAvailable: true,
    });

    // Create a recipe with the EXACT name without passing menuItemId
    const autoRecipe = await createRecipe({
      organizationId: org.id,
      name: dishName,
      yieldQuantity: 1,
      ingredients: [{ itemId: beefPatty.id, quantity: 1 }],
    });
    assert.strictEqual((autoRecipe as any).error, undefined);
    assert.strictEqual(autoRecipe.menuItemId, menuItem.id, 'Recipe should automatically link to menu item by matching name');

    // Create a standalone recipe
    const standalone = await createRecipe({
      organizationId: org.id,
      name: `Standalone Prep ${suffix}`,
      yieldQuantity: 5,
      ingredients: [],
    });
    assert.strictEqual((standalone as any).error, undefined);

    // Explicitly link it to another menu item
    const dish2 = await db.orm.public.MenuItem.create({
      organizationId: org.id,
      name: `Dish Two ${suffix}`,
      price: 4500,
      category: 'Mains',
      isAvailable: true,
    });

    const linkRes = await linkRecipeToMenuItem({
      organizationId: org.id,
      recipeId: standalone.id,
      menuItemId: dish2.id,
    });
    assert.strictEqual((linkRes as any).error, undefined);
    assert.strictEqual(linkRes.success, true);

    const updatedStandalone = await db.orm.public.RestaurantRecipe.where({ id: standalone.id }).all().first();
    assert.strictEqual(updatedStandalone?.menuItemId, dish2.id, 'Explicit link should update recipe menuItemId');
  });
});
