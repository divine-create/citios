import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'module';
import { encode } from 'next-auth/jwt';
import { db } from '../src/prisma/db';
import { authOptions } from './auth';
import {
  createRecipe,
  getRecipes,
  createInventoryItem,
  createProductionRun,
  getProductionRuns,
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
  const email = `chef-${person.id.slice(0, 8)}@cityos.test`.toLowerCase();

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
      name: `${person.firstName || 'Chef'} ${person.lastName || 'Producer'}`,
    },
    secret: (authOptions.secret as string) || 'cityos-jwt-secret-key-2026',
  });

  const cookieName =
    process.env.NODE_ENV === 'production' ? '__Secure-next-auth.session-token' : 'next-auth.session-token';
  mockCookies[cookieName] = token;
}

test('RestaurantOS Production Runs & Batch Prep Suite', async (t) => {
  const suffix = Math.random().toString(36).substring(2, 8);
  const orgName = `Bakery Prep ${suffix}`;

  // 1. Create Person & Sign in
  const person = await db.orm.public.Person.create({
    firstName: 'Baker',
    lastName: `Master${suffix}`,
  });
  await setupAndSignInAs(person);

  // 2. Create Restaurant Organization
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

  // 3b. Enable restaurant capabilities
  await db.orm.public.RestaurantSettings.create({
    organizationId: org.id,
    enableInventory: true,
    enableRecipes: true,
    enableProduction: true,
  });

  // 4. Create raw ingredient: Flour (50 kg, cost 2.0 per kg)
  const flour: any = await createInventoryItem({
    organizationId: org.id,
    name: `Baker Flour ${suffix}`,
    unit: 'kg',
    quantity: 50,
    cost: 2.0,
    type: 'RAW_MATERIAL',
  });
  assert.ok(flour.id, 'Flour should be created');

  // 5. Create raw ingredient: Yeast (10 kg, cost 5.0 per kg)
  const yeast: any = await createInventoryItem({
    organizationId: org.id,
    name: `Dry Yeast ${suffix}`,
    unit: 'kg',
    quantity: 10,
    cost: 5.0,
    type: 'RAW_MATERIAL',
  });
  assert.ok(yeast.id, 'Yeast should be created');

  // 6. Create produced item: Pizza Dough (0 balls initially, SUB_ASSEMBLY)
  const pizzaDough: any = await createInventoryItem({
    organizationId: org.id,
    name: `Pizza Dough Ball ${suffix}`,
    unit: 'pcs',
    quantity: 0,
    cost: 0,
    type: 'SUB_ASSEMBLY',
  });
  assert.ok(pizzaDough.id, 'Pizza Dough should be created');

  // 7. Create Recipe: "1 Batch of Pizza Dough" -> yields 20 pcs dough, uses 10kg flour and 1kg yeast, yields pizzaDough
  const recipeRes: any = await createRecipe({
    organizationId: org.id,
    name: `Pizza Dough Recipe ${suffix}`,
    yieldQuantity: 20,
    producedItemId: pizzaDough.id,
    ingredients: [
      { itemId: flour.id, quantity: 10 },
      { itemId: yeast.id, quantity: 1 },
    ],
  });
  assert.strictEqual(recipeRes.error, undefined, `Recipe creation error: ${recipeRes.error}`);
  const recipeId = recipeRes.id || recipeRes.recipe?.id;
  assert.ok(recipeId, 'Recipe ID must exist');

  await t.test('1. getRecipes returns recipe with ingredients and producedItem info', async () => {
    const list = await getRecipes(org.id);
    const found = list.find((r: any) => r.id === recipeId);
    assert.ok(found, 'Recipe should be found in list');
    assert.strictEqual(found.ingredients.length, 2, 'Should have 2 ingredients');
    assert.strictEqual(found.producedItemId, pizzaDough.id, 'Should link to produced item');
    assert.strictEqual(found.producedItemName, `Pizza Dough Ball ${suffix}`);
  });

  await t.test('2. createProductionRun executes batch, deducts raw materials, and adds to produced item stock', async () => {
    // Run a 2x batch: should use 20kg flour, 2kg yeast, and yield 40 pcs dough
    const run: any = await createProductionRun({
      organizationId: org.id,
      recipeId,
      batchMultiplier: 2,
      actualYield: 40,
    });

    assert.ok(run, 'Production run should return record');
    assert.strictEqual(run.batchMultiplier, 2);
    assert.strictEqual(run.expectedYield, 40);
    assert.strictEqual(run.actualYield, 40);
    // Cost: (10kg * 2 * $2) + (1kg * 2 * $5) = $40 + $10 = $50
    assert.strictEqual(run.totalCost, 50);

    // Verify flour stock was reduced: 50 - 20 = 30
    const flourAfter = await db.orm.public.RestaurantInventoryItem.where({ id: flour.id }).all().first();
    assert.strictEqual(flourAfter?.quantity, 30, 'Flour quantity should be 30');

    // Verify yeast stock was reduced: 10 - 2 = 8
    const yeastAfter = await db.orm.public.RestaurantInventoryItem.where({ id: yeast.id }).all().first();
    assert.strictEqual(yeastAfter?.quantity, 8, 'Yeast quantity should be 8');

    // Verify pizza dough stock increased: 0 + 40 = 40, unit cost = $50 / 40 = $1.25
    const doughAfter = await db.orm.public.RestaurantInventoryItem.where({ id: pizzaDough.id }).all().first();
    assert.strictEqual(doughAfter?.quantity, 40, 'Pizza dough quantity should be 40');
    assert.strictEqual(doughAfter?.cost, 1.25, 'Pizza dough cost should be 1.25');

    // Verify production runs list returns the run
    const runs = await getProductionRuns(org.id);
    assert.ok(runs.some((r: any) => r.id === run.id), 'Production run should be present in history');
  });

  await t.test('3. createProductionRun rejects if raw material stock is insufficient', async () => {
    // Current flour is 30kg. A 4x batch needs 40kg flour. Should fail.
    await assert.rejects(
      async () => {
        await createProductionRun({
          organizationId: org.id,
          recipeId,
          batchMultiplier: 4,
          actualYield: 80,
        });
      },
      /Not enough stock/i
    );

    // Stock levels should remain untouched after rejected transaction
    const flourStill = await db.orm.public.RestaurantInventoryItem.where({ id: flour.id }).all().first();
    assert.strictEqual(flourStill?.quantity, 30, 'Flour should still be 30kg after aborted transaction');
  });
});
