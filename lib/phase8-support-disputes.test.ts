import test from 'node:test';
import assert from 'node:assert';
import { createRequire } from 'module';
import { v4 as uuidv4 } from 'uuid';

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set to run integration tests.");
}
process.env.NEXTAUTH_URL = "http://localhost:3000";
process.env.NEXTAUTH_SECRET = "integration-test-secret";

// Mock Next.js headers/cookies
const require = createRequire(import.meta.url);
const nextHeaders = require('next/headers');
let mockCookies: Record<string, string> = {};
nextHeaders.headers = () => new Map();
nextHeaders.cookies = () => ({
  get: (name: string) => mockCookies[name] ? { name, value: mockCookies[name] } : undefined,
  getAll: () => Object.entries(mockCookies).map(([n, v]) => ({ name: n, value: v }))
});

import { db } from '@/src/prisma/db';
import { createSupportCase, requestRefund } from '@/lib/actions/resident-support';
import {
  getMerchantSupportCases,
  getMerchantSupportCase,
  updateSupportCaseStatus,
  getMerchantRefundRequests,
  getMerchantRefundRequest,
  approveMerchantRefundRequest,
  rejectMerchantRefundRequest
} from '@/app/actions/merchant-support';
import { reportRefund, resolveRefundDispute } from '@/app/actions/refund_workflow';
import { authOptions } from '@/lib/auth';
import { encode } from 'next-auth/jwt';

async function setupAuth(prefix: string) {
  const uid = uuidv4().slice(0, 8);
  const email = `${prefix.toLowerCase()}-${uid}@example.com`;
  
  const person = await db.orm.public.Person.create({
    id: uuidv4(),
    firstName: prefix,
    lastName: 'Tester',
  });

  await db.orm.public.PersonIdentifier.create({
    personId: person.id,
    type: 'EMAIL',
    normalizedValue: email,
    isVerified: true,
  });

  await db.orm.public.Account.create({
    personId: person.id,
    isActive: true,
  });

  const token = await encode({
    token: {
      email,
      name: `${prefix} Tester`,
      personId: person.id,
    },
    secret: (authOptions.secret as string) || process.env.NEXTAUTH_SECRET || "cityos-jwt-secret-key-2026",
  });

  return { person, token };
}

test('Phase 8 Resident Support & Dispute Resolution Reality Suite', async (t) => {
  // 1. Setup Merchants
  const merchantOwnerA = await setupAuth('MerchantA');
  const merchantOwnerB = await setupAuth('MerchantB');

  const orgA = await db.orm.public.Organization.create({
    name: `Retail Org A ${uuidv4().slice(0, 6)}`,
    type: 'RETAIL' as any,
  });
  const orgB = await db.orm.public.Organization.create({
    name: `Retail Org B ${uuidv4().slice(0, 6)}`,
    type: 'RETAIL' as any,
  });

  // Assign memberships
  const membershipA = await db.orm.public.Membership.create({
    personId: merchantOwnerA.person.id,
    organizationId: orgA.id,
  });
  await db.orm.public.MembershipRole.create({
    membershipId: membershipA.id,
    role: 'OWNER',
  });

  const membershipB = await db.orm.public.Membership.create({
    personId: merchantOwnerB.person.id,
    organizationId: orgB.id,
  });
  await db.orm.public.MembershipRole.create({
    membershipId: membershipB.id,
    role: 'OWNER',
  });

  // 2. Setup Residents
  const residentA = await setupAuth('ResidentA');
  const residentB = await setupAuth('ResidentB');

  // CustomerData for Resident A in Org A
  const relA = await db.orm.public.Relationship.create({
    personId: residentA.person.id,
    organizationId: orgA.id,
    type: 'CUSTOMER',
  });
  const custA = await db.orm.public.CustomerData.create({
    personId: residentA.person.id,
    relationshipId: relA.id,
  });

  // Create confirmed order & payment for Resident A
  const orderA = await db.orm.public.RetailOrder.create({
    customerDataId: custA.id,
    organizationId: orgA.id,
    status: 'CONFIRMED',
    fulfillmentStatus: 'FULFILLED',
    totalAmount: 5000,
    paymentMethod: 'ONLINE',
    cashierId: 'SYSTEM',
  });

  const paymentA = await db.orm.public.Payment.create({
    amount: 5000,
    currency: 'NGN',
    status: 'COMPLETED',
    retailOrderId: orderA.id,
    method: 'CARD',
  });

  let createdCaseId: string | null = null;
  let createdRefundRequestId: string | null = null;
  let createdDisputeId: string | null = null;

  await t.test('1. Security: Unauthenticated and Cross-Tenant Isolation Enforcement', async () => {
    // Unauthenticated resident rejected
    mockCookies = {};
    await assert.rejects(
      createSupportCase({
        sourceType: 'RETAIL_ORDER',
        sourceId: orderA.id,
        category: 'DAMAGED_ITEM',
        description: 'Broken packaging on delivery',
      }),
      /Unauthorized/
    );

    // Resident B attempting to file support against Resident A's order is rejected
    mockCookies['next-auth.session-token'] = residentB.token;
    await assert.rejects(
      createSupportCase({
        sourceType: 'RETAIL_ORDER',
        sourceId: orderA.id,
        category: 'DAMAGED_ITEM',
        description: 'Impersonation attempt',
      }),
      /Resource not found or unauthorized/
    );

    await assert.rejects(
      requestRefund({
        sourceType: 'RETAIL_ORDER',
        sourceId: orderA.id,
        reason: 'Impersonation refund',
      }),
      /Resource not found or unauthorized/
    );
  });

  await t.test('2. Resident Support Ticket Creation with Server Idempotency', async () => {
    mockCookies['next-auth.session-token'] = residentA.token;

    // First call creates the case
    const caseId1 = await createSupportCase({
      sourceType: 'RETAIL_ORDER',
      sourceId: orderA.id,
      category: 'DAMAGED_ITEM',
      description: 'Items arrived cracked and leaking',
    });
    assert.ok(caseId1, 'Support case ID generated');
    createdCaseId = caseId1;

    // Idempotent second call returns existing case ID
    const caseId2 = await createSupportCase({
      sourceType: 'RETAIL_ORDER',
      sourceId: orderA.id,
      category: 'DAMAGED_ITEM',
      description: 'Items arrived cracked and leaking (retry)',
    });
    assert.strictEqual(caseId1, caseId2, 'Duplicate ticket submission must be idempotent');

    const sc = await db.orm.public.SupportCase.where({ id: caseId1 }).all().firstOrThrow();
    assert.strictEqual(sc.personId, residentA.person.id);
    assert.strictEqual(sc.organizationId, orgA.id);
    assert.strictEqual(sc.status, 'OPEN');
  });

  await t.test('3. Merchant Support Dashboard & Cross-Tenant Access Enforcement', async () => {
    assert.ok(createdCaseId);

    // Merchant A sees their case
    mockCookies['next-auth.session-token'] = merchantOwnerA.token;
    const casesA = await getMerchantSupportCases(orgA.id);
    assert.ok(casesA.some((c: any) => c.id === createdCaseId), 'Merchant A must view their support case');

    const singleCase = await getMerchantSupportCase(orgA.id, createdCaseId);
    assert.strictEqual(singleCase?.id, createdCaseId);

    // Merchant B is denied access to Merchant A's organization cases
    mockCookies['next-auth.session-token'] = merchantOwnerB.token;
    await assert.rejects(
      getMerchantSupportCases(orgA.id),
      /FORBIDDEN|Access denied/i
    );
    await assert.rejects(
      getMerchantSupportCase(orgA.id, createdCaseId),
      /FORBIDDEN|Access denied/i
    );
  });

  await t.test('4. Support Case State Machine: Legal Transitions & Illegal Transition Guarding', async () => {
    assert.ok(createdCaseId);
    mockCookies['next-auth.session-token'] = merchantOwnerA.token;

    // Legal: OPEN -> IN_REVIEW
    await updateSupportCaseStatus(orgA.id, createdCaseId, 'IN_REVIEW');
    let sc = await db.orm.public.SupportCase.where({ id: createdCaseId }).all().firstOrThrow();
    assert.strictEqual(sc.status, 'IN_REVIEW');

    // Legal: IN_REVIEW -> WAITING_FOR_RESIDENT
    await updateSupportCaseStatus(orgA.id, createdCaseId, 'WAITING_FOR_RESIDENT');
    sc = await db.orm.public.SupportCase.where({ id: createdCaseId }).all().firstOrThrow();
    assert.strictEqual(sc.status, 'WAITING_FOR_RESIDENT');

    // Legal: WAITING_FOR_RESIDENT -> RESOLVED
    await updateSupportCaseStatus(orgA.id, createdCaseId, 'RESOLVED');
    sc = await db.orm.public.SupportCase.where({ id: createdCaseId }).all().firstOrThrow();
    assert.strictEqual(sc.status, 'RESOLVED');

    // Legal: RESOLVED -> CLOSED
    await updateSupportCaseStatus(orgA.id, createdCaseId, 'CLOSED');
    sc = await db.orm.public.SupportCase.where({ id: createdCaseId }).all().firstOrThrow();
    assert.strictEqual(sc.status, 'CLOSED');

    // Illegal: Terminal CLOSED cannot transition back to IN_REVIEW
    await assert.rejects(
      updateSupportCaseStatus(orgA.id, createdCaseId, 'IN_REVIEW'),
      /Invalid transition from CLOSED to IN_REVIEW/
    );
  });

  await t.test('5. Refund Workflow: Request Creation, Validation & Duplicate Prevention', async () => {
    mockCookies['next-auth.session-token'] = residentA.token;

    const reqId = await requestRefund({
      sourceType: 'RETAIL_ORDER',
      sourceId: orderA.id,
      reason: 'Damaged products received',
    });
    assert.ok(reqId, 'RefundRequest ID generated');
    createdRefundRequestId = reqId;

    const req = await db.orm.public.RefundRequest.where({ id: reqId }).all().firstOrThrow();
    assert.strictEqual(req.personId, residentA.person.id);
    assert.strictEqual(req.paymentId, paymentA.id);
    assert.strictEqual(req.amount, 5000);
    assert.strictEqual(req.status, 'REQUESTED');

    // Duplicate refund request is prevented
    await assert.rejects(
      requestRefund({
        sourceType: 'RETAIL_ORDER',
        sourceId: orderA.id,
        reason: 'Duplicate attempt',
      }),
      /Refund already requested/
    );
  });

  await t.test('6. Merchant Refund Review, Isolation & Rejection', async () => {
    assert.ok(createdRefundRequestId);

    // Merchant B cannot view Merchant A's refund requests
    mockCookies['next-auth.session-token'] = merchantOwnerB.token;
    await assert.rejects(
      getMerchantRefundRequests(orgA.id),
      /FORBIDDEN|Access denied/i
    );

    // Merchant A views requests
    mockCookies['next-auth.session-token'] = merchantOwnerA.token;
    const reqs = await getMerchantRefundRequests(orgA.id);
    assert.ok(reqs.some((r: any) => r.id === createdRefundRequestId));

    // Merchant A rejects the refund request with reason
    await rejectMerchantRefundRequest(orgA.id, createdRefundRequestId, 'Items appear consumed, not damaged');

    const updatedReq = await db.orm.public.RefundRequest.where({ id: createdRefundRequestId }).all().firstOrThrow();
    assert.strictEqual(updatedReq.status, 'REJECTED');
  });

  await t.test('7. Dispute Escalation & Authoritative Resolution', async () => {
    assert.ok(createdRefundRequestId);

    // Resident escalates rejected refund into a dispute
    const dispute = await reportRefund(createdRefundRequestId, 'Resident escalation: items were genuinely defective upon unboxing');
    assert.ok(dispute.id, 'Dispute record created');
    assert.strictEqual(dispute.status, 'DISPUTE_OPEN');
    createdDisputeId = dispute.id;

    const savedDispute = await db.orm.public.RefundDispute.where({ id: dispute.id }).all().firstOrThrow();
    assert.strictEqual(savedDispute.status, 'DISPUTE_OPEN');

    // Authoritative resolution: Admin / Merchant resolves in resident favor (RESOLVED_REFUND)
    const resolveRes = await resolveRefundDispute(dispute.id, 'RESOLVED_REFUND', 'Customer provided photos confirming defect');
    assert.strictEqual(resolveRes.success, true);
    assert.strictEqual(resolveRes.status, 'RESOLVED_REFUND');

    // Verify dispute updated to RESOLVED_REFUND
    const finalDispute = await db.orm.public.RefundDispute.where({ id: dispute.id }).all().firstOrThrow();
    assert.strictEqual(finalDispute.status, 'RESOLVED_REFUND');

    // Verify RefundRequest transitioned to APPROVED
    const finalReq = await db.orm.public.RefundRequest.where({ id: createdRefundRequestId }).all().firstOrThrow();
    assert.strictEqual(finalReq.status, 'APPROVED');

    // Verify Refund record was generated in PROCESSING state
    const refunds = await db.orm.public.Refund.where({ paymentId: paymentA.id }).all();
    assert.ok(refunds.length > 0, 'Refund entity must be created upon dispute approval');
    assert.strictEqual(refunds[0].amount, 5000);
    assert.strictEqual(refunds[0].status, 'PROCESSING');
  });

  // Teardown
  if (createdDisputeId) {
    await db.orm.public.RefundDispute.where({ id: createdDisputeId }).delete();
  }
  const refunds = await db.orm.public.Refund.where({ paymentId: paymentA.id }).all();
  for (const r of refunds) {
    await db.orm.public.Refund.where({ id: r.id }).delete();
  }
  if (createdRefundRequestId) {
    await db.orm.public.RefundRequest.where({ id: createdRefundRequestId }).delete();
  }
  if (createdCaseId) {
    await db.orm.public.SupportCase.where({ id: createdCaseId }).delete();
  }
  await db.orm.public.Payment.where({ id: paymentA.id }).delete();
  await db.orm.public.RetailOrder.where({ id: orderA.id }).delete();
  await db.orm.public.CustomerData.where({ id: custA.id }).delete();
  await db.orm.public.Relationship.where({ id: relA.id }).delete();

  await db.orm.public.MembershipRole.where({ membershipId: membershipA.id }).delete();
  await db.orm.public.Membership.where({ id: membershipA.id }).delete();
  await db.orm.public.MembershipRole.where({ membershipId: membershipB.id }).delete();
  await db.orm.public.Membership.where({ id: membershipB.id }).delete();

  await db.orm.public.Organization.where({ id: orgA.id }).delete();
  await db.orm.public.Organization.where({ id: orgB.id }).delete();

  await db.orm.public.Account.where({ personId: residentA.person.id }).delete();
  await db.orm.public.PersonIdentifier.where({ personId: residentA.person.id }).delete();
  await db.orm.public.Person.where({ id: residentA.person.id }).delete();

  await db.orm.public.Account.where({ personId: residentB.person.id }).delete();
  await db.orm.public.PersonIdentifier.where({ personId: residentB.person.id }).delete();
  await db.orm.public.Person.where({ id: residentB.person.id }).delete();

  await db.orm.public.Account.where({ personId: merchantOwnerA.person.id }).delete();
  await db.orm.public.PersonIdentifier.where({ personId: merchantOwnerA.person.id }).delete();
  await db.orm.public.Person.where({ id: merchantOwnerA.person.id }).delete();

  await db.orm.public.Account.where({ personId: merchantOwnerB.person.id }).delete();
  await db.orm.public.PersonIdentifier.where({ personId: merchantOwnerB.person.id }).delete();
  await db.orm.public.Person.where({ id: merchantOwnerB.person.id }).delete();
});
