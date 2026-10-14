import test from 'node:test';
import assert from 'node:assert';
import { createRequire } from 'module';
import { v4 as uuidv4 } from 'uuid';

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set to run integration tests.");
}
process.env.NEXTAUTH_URL = "http://localhost:3000";
process.env.NEXTAUTH_SECRET = "integration-test-secret";

// 1. Mock Next.js headers/cookies
const require = createRequire(import.meta.url);
const nextHeaders = require('next/headers');
const originalHeaders = nextHeaders.headers;
const originalCookies = nextHeaders.cookies;
let mockCookies: Record<string, string> = {};
nextHeaders.headers = () => new Map();
nextHeaders.cookies = () => ({
  get: (name: string) => mockCookies[name] ? { name, value: mockCookies[name] } : undefined,
  getAll: () => Object.entries(mockCookies).map(([n, v]) => ({ name: n, value: v }))
});

import { db } from '@/src/prisma/db';
import { createSupportCase, requestRefund } from '@/lib/actions/resident-support';
import { authOptions } from '@/lib/auth';
import { encode } from 'next-auth/jwt';

async function setupAuth() {
  const testId = uuidv4().substring(0, 8);
  const email = `test-${testId}@example.com`;
  
  const person = await db.orm.public.Person.create({ id: uuidv4(), firstName: "Test", lastName: "User" });
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
    secret: (authOptions.secret as string) || process.env.NEXTAUTH_SECRET || "cityos-jwt-secret-key-2026"
  });
  return { person, token };
}

test('Resident Support & Dispute Integration Tests', async (t) => {
  const residentA = await setupAuth();
  const residentB = await setupAuth();
  
  // Create an org and order for Resident A
  const org = await db.orm.public.Organization.create({ name: 'Test Org', type: 'RETAIL' as any });
  const rel = await db.orm.public.Relationship.create({
    personId: residentA.person.id,
    organizationId: org.id,
    type: 'CUSTOMER'
  });
  const custA = await db.orm.public.CustomerData.create({
    personId: residentA.person.id,
    relationshipId: rel.id
  });
  
  const orderA = await db.orm.public.RetailOrder.create({
    customerDataId: custA.id,
    organizationId: org.id,
    status: 'CONFIRMED',
    fulfillmentStatus: 'FULFILLED',
    totalAmount: 1000,
    paymentMethod: 'ONLINE',
    cashierId: 'SYSTEM'
  });

  const paymentA = await db.orm.public.Payment.create({
    amount: 1000,
    currency: 'USD',
    status: 'COMPLETED',
    retailOrderId: orderA.id,
    method: 'CARD'
  });

  await t.test('1. Unauthenticated request is rejected', async () => {
    mockCookies = {}; // clear token
    await assert.rejects(
      createSupportCase({ sourceType: 'RETAIL_ORDER', sourceId: orderA.id, category: 'MISSING_ITEM', description: 'test' }),
      /Unauthorized/
    );
  });

  await t.test('2. Resident B attempting to access Resident A source is rejected', async () => {
    mockCookies['next-auth.session-token'] = residentB.token; // Log in as B
    await assert.rejects(
      createSupportCase({ sourceType: 'RETAIL_ORDER', sourceId: orderA.id, category: 'MISSING_ITEM', description: 'test' }),
      /Resource not found or unauthorized/
    );
    await assert.rejects(
      requestRefund({ sourceType: 'RETAIL_ORDER', sourceId: orderA.id, reason: 'broke' }),
      /Resource not found or unauthorized/
    );
  });

  await t.test('3. Resident A creating support case against own source succeeds idempotently', async () => {
    mockCookies['next-auth.session-token'] = residentA.token; // Log in as A
    const caseId1 = await createSupportCase({ sourceType: 'RETAIL_ORDER', sourceId: orderA.id, category: 'MISSING_ITEM', description: 'test' });
    const caseId2 = await createSupportCase({ sourceType: 'RETAIL_ORDER', sourceId: orderA.id, category: 'MISSING_ITEM', description: 'test' });
    assert.strictEqual(caseId1, caseId2, "Idempotency should return the same case ID");
    
    const c = await db.orm.public.SupportCase.where({ id: caseId1 }).all().firstOrThrow();
    assert.strictEqual(c.personId, residentA.person.id);
  });

  await t.test('4. Resident A requesting refund against own source succeeds', async () => {
    mockCookies['next-auth.session-token'] = residentA.token;
    const reqId = await requestRefund({ sourceType: 'RETAIL_ORDER', sourceId: orderA.id, reason: 'test refund' });
    const req = await db.orm.public.RefundRequest.where({ id: reqId }).all().firstOrThrow();
    
    assert.strictEqual(req.personId, residentA.person.id);
    assert.strictEqual(req.paymentId, paymentA.id);
    assert.strictEqual(req.amount, 1000, "Server must dictate refund amount based on payment");
  });

  await t.test('5. Duplicate refund request is prevented', async () => {
    mockCookies['next-auth.session-token'] = residentA.token;
    await assert.rejects(
      requestRefund({ sourceType: 'RETAIL_ORDER', sourceId: orderA.id, reason: 'test refund 2' }),
      /Refund already requested/
    );
  });

  t.after(() => {
    nextHeaders.headers = originalHeaders;
    nextHeaders.cookies = originalCookies;
  });
});
