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
import { getMerchantSupportCases, updateSupportCaseStatus, getMerchantRefundRequests, approveMerchantRefundRequest, rejectMerchantRefundRequest } from '@/app/actions/merchant-support';
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

test('Merchant Support & Dispute Integration Tests', async (t) => {
  const merchantA = await setupAuth();
  const merchantB = await setupAuth();
  
  // Create orgs
  const orgA = await db.orm.public.Organization.create({ name: 'Merchant A', type: 'RETAIL' as any });
  const orgB = await db.orm.public.Organization.create({ name: 'Merchant B', type: 'RETAIL' as any });
  
  // Create memberships
  await db.orm.public.Membership.create({ personId: merchantA.person.id, organizationId: orgA.id }).then(async m => {
    await db.orm.public.MembershipRole.create({ membershipId: m.id, role: 'OWNER' });
  });
  await db.orm.public.Membership.create({ personId: merchantB.person.id, organizationId: orgB.id }).then(async m => {
    await db.orm.public.MembershipRole.create({ membershipId: m.id, role: 'OWNER' });
  });

  // Create Resident
  const resident = await setupAuth();
  const relA = await db.orm.public.Relationship.create({
    personId: resident.person.id,
    organizationId: orgA.id,
    type: 'CUSTOMER'
  });
  const custA = await db.orm.public.CustomerData.create({
    personId: resident.person.id,
    relationshipId: relA.id
  });
  
  const orderA = await db.orm.public.RetailOrder.create({
    customerDataId: custA.id,
    organizationId: orgA.id,
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

  const caseId = (await db.orm.public.SupportCase.create({
    personId: resident.person.id,
    organizationId: orgA.id,
    sourceType: 'RETAIL_ORDER',
    sourceId: orderA.id,
    category: 'MISSING_ITEM',
    description: 'missing item',
    status: 'OPEN',
    priority: 'NORMAL'
  })).id;

  const reqId = (await db.orm.public.RefundRequest.create({
    paymentId: paymentA.id,
    personId: resident.person.id,
    organizationId: orgA.id,
    amount: 1000,
    reason: 'test refund',
    status: 'REQUESTED'
  })).id;

  await t.test('1. Merchant A can view their support cases and refund requests', async () => {
    mockCookies['next-auth.session-token'] = merchantA.token;
    
    const cases = await getMerchantSupportCases(orgA.id);
    assert.strictEqual(cases.length, 1);
    assert.strictEqual(cases[0].id, caseId);

    const requests = await getMerchantRefundRequests(orgA.id);
    assert.strictEqual(requests.length, 1);
    assert.strictEqual(requests[0].id, reqId);
  });

  await t.test('2. Merchant B attempting to access Merchant A support cases fails', async () => {
    mockCookies['next-auth.session-token'] = merchantB.token; // Log in as B
    
    await assert.rejects(
      getMerchantSupportCases(orgA.id), // Trying to pass orgA ID directly
      /FORBIDDEN: User does not have a membership at organization/
    );

    await assert.rejects(
      getMerchantRefundRequests(orgA.id),
      /FORBIDDEN: User does not have a membership at organization/
    );
  });

  await t.test('3. Merchant A can update support case status', async () => {
    mockCookies['next-auth.session-token'] = merchantA.token;
    
    await updateSupportCaseStatus(orgA.id, caseId, 'IN_REVIEW');
    
    const c = await db.orm.public.SupportCase.where({ id: caseId }).all().firstOrThrow();
    assert.strictEqual(c.status, 'IN_REVIEW');

    // Verify resident got notified
    const notes = await db.orm.public.Notification.where({ personId: resident.person.id, title: 'Support Case Updated' }).all();
    assert.strictEqual(notes.length, 1);
  });

  await t.test('4. Merchant A can reject a refund request', async () => {
    mockCookies['next-auth.session-token'] = merchantA.token;
    
    await rejectMerchantRefundRequest(orgA.id, reqId, 'Invalid request');
    
    const req = await db.orm.public.RefundRequest.where({ id: reqId }).all().firstOrThrow();
    assert.strictEqual(req.status, 'REJECTED');

    // Verify resident got notified
    const notes = await db.orm.public.Notification.where({ personId: resident.person.id, title: 'Refund Rejected' }).all();
    assert.strictEqual(notes.length, 1);
  });

  await t.test('5. Merchant A can approve a refund request', async () => {
    mockCookies['next-auth.session-token'] = merchantA.token;

    // create another req
    const reqId2 = (await db.orm.public.RefundRequest.create({
      paymentId: paymentA.id,
      personId: resident.person.id,
      organizationId: orgA.id,
      amount: 500, // Partial
      reason: 'partial refund',
      status: 'REQUESTED'
    })).id;
    
    await approveMerchantRefundRequest(orgA.id, reqId2);
    
    const req = await db.orm.public.RefundRequest.where({ id: reqId2 }).all().firstOrThrow();
    assert.strictEqual(req.status, 'APPROVED');

    // Core finance refund row should exist
    const refund = await db.orm.public.Refund.where({ paymentId: paymentA.id }).all().firstOrThrow();
    assert.strictEqual(refund.amount, 500);

    // Verify resident got notified
    const notes = await db.orm.public.Notification.where({ personId: resident.person.id, title: 'Refund Approved' }).all();
    assert.strictEqual(notes.length, 1);
  });

  t.after(() => {
    nextHeaders.headers = originalHeaders;
    nextHeaders.cookies = originalCookies;
  });
});
