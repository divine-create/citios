import test from 'node:test';
import assert from 'node:assert';
import { createRequire } from 'module';

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set to run integration tests.");
}
process.env.NEXTAUTH_URL = "http://localhost:3000";
process.env.NEXTAUTH_SECRET = "integration-test-secret";

// 1. Mock Next.js headers/cookies
const require = createRequire(import.meta.url);
const nextHeaders = require('next/headers');
let mockCookies: Record<string, string> = {};
nextHeaders.headers = () => new Map();
nextHeaders.cookies = () => ({
  get: (name: string) => mockCookies[name] ? { name, value: mockCookies[name] } : undefined,
  getAll: () => Object.entries(mockCookies).map(([n, v]) => ({ name: n, value: v }))
});

import { db } from '../src/prisma/db';
import { placeRetailOrder } from '../app/actions/commerce';
import { encode } from 'next-auth/jwt';
import { v4 as uuidv4 } from 'uuid';

async function setupAuth() {
  const testId = uuidv4().substring(0, 8);
  const email = `test-${testId}@example.com`;
  
  const person = await db.orm.public.Person.create({ firstName: "Test", lastName: "User" });
  await db.orm.public.PersonIdentifier.create({
    personId: person.id,
    type: 'EMAIL',
    normalizedValue: email,
    isVerified: true,
  });
  await db.orm.public.Account.create({ personId: person.id, isActive: true });

  const token = await encode({
    token: { 
      email, 
      name: "Test User",
      personId: person.id,
    },
    secret: process.env.NEXTAUTH_SECRET!
  });
  mockCookies['next-auth.session-token'] = token;
  return person;
}

test('RetailOS Integration Concurrency Tests', async (t) => {
  const person = await setupAuth();

  const org = await db.orm.public.Organization.create({
    name: 'Retail Concurrency Test Org ' + Date.now(),
    type: 'RETAIL' as any,
  });

  const city = await db.orm.public.City.all().first() || await db.orm.public.City.create({
    name: 'Test City',
    state: 'TS',
    country: 'NG',
    slug: 'test-city'
  });

  const loc = await db.orm.public.Location.create({
    organizationId: org.id,
    name: 'Test Store',
    address: '123 Test Ave',
    cityId: city.id,
  });

  const product = await db.orm.public.RetailProduct.create({
    organizationId: org.id,
    name: 'Limited Edition Widget',
    price: 1000,
  });

  const stock = await db.orm.public.RetailLocationStock.create({
    organizationId: org.id,
    locationId: loc.id,
    productId: product.id,
    stockQuantity: 1,
  });

  await t.test('createRetailOrder concurrent overselling prevention', async () => {
    const input = {
      method: 'card' as const,
      deliveryAddress: '123 Test St',
      items: [{ productId: product.id, qty: 1, name: product.name, unitPrice: 1000, lineTotal: 1000 }],
      subtotal: 1000,
      deliveryFee: 0,
      total: 1000,
      kind: 'retail' as const,
      locationId: loc.id
    };

    const [res1, res2] = await Promise.allSettled([
      placeRetailOrder(input),
      placeRetailOrder(input)
    ]);

    const finalStock = await db.orm.public.RetailLocationStock.where({ id: stock.id }).all().first();
    assert.strictEqual(finalStock!.stockQuantity, 0, 'Final stock should be 0');

    let successCount = 0;
    let failCount = 0;

    if (res1.status === 'fulfilled') {
      if (res1.value.success) successCount++;
      if ((res1.value as any).error) {
        failCount++;
        console.log('res1 error:', (res1.value as any).error);
      }
    }
    if (res2.status === 'fulfilled') {
      if (res2.value.success) successCount++;
      if ((res2.value as any).error) {
        failCount++;
        console.log('res2 error:', (res2.value as any).error);
      }
    }

    assert.strictEqual(successCount, 1, 'Exactly one order should succeed');
    assert.strictEqual(failCount, 1, 'Exactly one order should fail');
  });

  await t.test('handleFailedRetailPayment stock rollback', async () => {
    const order = await db.orm.public.RetailOrder.where({ organizationId: org.id }).all().first();
    assert.ok(order, 'Order should exist');

    const { handleFailedRetailPayment } = await import('../lib/actions/citypay');
    
    await db.transaction(async (prismaTx: any) => {
      await handleFailedRetailPayment(prismaTx, order.id);
    });

    const finalStock = await db.orm.public.RetailLocationStock.where({ id: stock.id }).all().first();
    assert.strictEqual(finalStock!.stockQuantity, 1, 'Stock should be restored to 1');
    
    await db.transaction(async (prismaTx: any) => {
      await handleFailedRetailPayment(prismaTx, order.id);
    });
    const finalStock2 = await db.orm.public.RetailLocationStock.where({ id: stock.id }).all().first();
    assert.strictEqual(finalStock2!.stockQuantity, 1, 'Stock should still be 1 after duplicate failure');
  });
});




