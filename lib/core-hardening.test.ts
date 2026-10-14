import test from 'node:test';
import assert from 'node:assert';
import { createRequire } from 'module';
import { v4 as uuidv4 } from 'uuid';
import { Client } from 'pg';

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set to run integration tests.");
}
process.env.NEXTAUTH_URL = "http://localhost:3000";

// Mock Next.js headers & cookies for getServerSession
const require = createRequire(import.meta.url);
const nextHeaders = require('next/headers');
let mockCookies: Record<string, string> = {};
nextHeaders.headers = () => new Map();
nextHeaders.cookies = () => ({
  get: (name: string) => mockCookies[name] ? { name, value: mockCookies[name] } : undefined,
  getAll: () => Object.entries(mockCookies).map(([n, v]) => ({ name: n, value: v }))
});

import { db } from '../src/prisma/db';
import { authOptions } from './auth';
import { encode } from 'next-auth/jwt';
import { requireMembership, inviteTeamMember, removeTeamMember } from './actions/tenant';
import { processPaymentEvent } from './actions/citypay';
import { requestPayout } from '../app/actions/finance';
import { requestRefund, approveRefund } from '../app/actions/refund_workflow';
import { updateLocation, deleteLocation } from './actions/retail';

const pgClient = new Client({ connectionString: process.env.DATABASE_URL });

async function createAuthenticatedUser(orgId: string, role = 'OWNER', locationId?: string) {
  const testId = uuidv4().substring(0, 8);
  const email = `tenant-test-${testId}@example.com`;

  const person = await db.orm.public.Person.create({
    id: uuidv4(),
    firstName: "Test",
    lastName: `User-${testId}`
  });

  await db.orm.public.PersonIdentifier.create({
    personId: person.id,
    type: 'EMAIL',
    normalizedValue: email,
    isVerified: true
  });

  await db.orm.public.Account.create({
    personId: person.id,
    isActive: true
  });

  const membership = await db.orm.public.Membership.create({
    personId: person.id,
    organizationId: orgId
  });

  await db.orm.public.MembershipRole.create({
    membershipId: membership.id,
    role
  });

  if (locationId) {
    await db.orm.public.MembershipLocation.create({
      membershipId: membership.id,
      locationId
    });
  }

  const token = await encode({
    token: {
      email,
      name: `Test User ${testId}`,
      personId: person.id,
      memberships: [{
        organizationId: orgId,
        organizationType: "RETAIL" as const,
        role: role as any
      }]
    },
    secret: (authOptions.secret as string) || process.env.NEXTAUTH_SECRET || "super_secret_cityconnect_key_2026_!@#"
  });

  return { person, membership, token, email };
}

function setActiveUserToken(token: string) {
  mockCookies['next-auth.session-token'] = token;
}

test('CityOS Core Hardening: Multi-Tenant Isolation & Authorization', async (t) => {
  await pgClient.connect();

  const orgAId = `org_a_${uuidv4().substring(0, 8)}`;
  const orgBId = `org_b_${uuidv4().substring(0, 8)}`;

  // Provision Org A & Org B
  await pgClient.query(`INSERT INTO "organization" (id, name, type) VALUES ($1, $2, 'RETAIL')`, [orgAId, 'Tenant Organization A']);
  await pgClient.query(`INSERT INTO "organization" (id, name, type) VALUES ($1, $2, 'RETAIL')`, [orgBId, 'Tenant Organization B']);

  const locAId = `loc_a_${uuidv4().substring(0, 8)}`;
  const locBId = `loc_b_${uuidv4().substring(0, 8)}`;

  // Provision Location A (in Org A) and Location B (in Org B)
  await pgClient.query(`INSERT INTO "location" (id, name, "organizationId") VALUES ($1, $2, $3)`, [locAId, 'Location A', orgAId]);
  await pgClient.query(`INSERT INTO "location" (id, name, "organizationId") VALUES ($1, $2, $3)`, [locBId, 'Location B', orgBId]);

  // Provision User A (in Org A) and User B (in Org B)
  const userA = await createAuthenticatedUser(orgAId, 'OWNER', locAId);
  const userB = await createAuthenticatedUser(orgBId, 'OWNER', locBId);

  await t.test('1. Tenant Isolation: User A can access Org A but is denied Org B', async () => {
    setActiveUserToken(userA.token);

    // User A -> Org A: ALLOWED
    const resultA = await requireMembership(orgAId);
    assert.strictEqual(resultA.person.id, userA.person.id);
    assert.strictEqual(resultA.membership.organizationId, orgAId);

    // User A -> Org B: DENIED
    await assert.rejects(
      async () => { await requireMembership(orgBId); },
      (err: any) => {
        assert.match(err.message, /FORBIDDEN/);
        return true;
      },
      'User A must be forbidden from accessing Org B'
    );
  });

  await t.test('2. Tenant Isolation: User B can access Org B but is denied Org A', async () => {
    setActiveUserToken(userB.token);

    // User B -> Org B: ALLOWED
    const resultB = await requireMembership(orgBId);
    assert.strictEqual(resultB.person.id, userB.person.id);
    assert.strictEqual(resultB.membership.organizationId, orgBId);

    // User B -> Org A: DENIED
    await assert.rejects(
      async () => { await requireMembership(orgAId); },
      (err: any) => {
        assert.match(err.message, /FORBIDDEN/);
        return true;
      },
      'User B must be forbidden from accessing Org A'
    );
  });

  await t.test('3. Location Isolation: User A (Org A) cannot manipulate Location B (Org B)', async () => {
    setActiveUserToken(userA.token);

    // User A attempting requireMembership on Org A with Location B from Org B
    await assert.rejects(
      async () => { await requireMembership(orgAId, ['OWNER'], locBId); },
      (err: any) => {
        assert.match(err.message, /Location .* does not belong to organization/);
        return true;
      },
      'requireMembership must reject cross-organization location binding'
    );

    // User A attempting updateLocation on Location B
    const updateRes = await updateLocation(locBId, { name: 'Hacked Location B' });
    assert.ok(updateRes.error, 'updateLocation must fail when caller does not belong to location owner org');
    assert.match(updateRes.error, /FORBIDDEN/);

    // User A attempting deleteLocation on Location B
    const deleteRes = await deleteLocation(locBId);
    assert.ok(deleteRes.error, 'deleteLocation must fail when caller does not belong to location owner org');
    assert.match(deleteRes.error, /FORBIDDEN/);
  });

  await t.test('4. Membership Management: Cross-tenant location binding in inviteTeamMember is denied', async () => {
    setActiveUserToken(userA.token);

    // Invite User B's email to Org A with Location B (which belongs to Org B)
    const inviteRes = await inviteTeamMember({
      organizationId: orgAId,
      email: userB.email,
      roles: ['STAFF'],
      locationId: locBId // Belongs to Org B!
    });

    assert.ok(inviteRes.error, 'inviteTeamMember must reject binding staff to cross-tenant location');
    assert.match(inviteRes.error, /Location does not belong to this organization/);
  });

  await t.test('5. Membership Management: Cannot remove the last OWNER of an organization', async () => {
    setActiveUserToken(userA.token);

    // Attempt to remove User A's membership (only owner of Org A)
    const removeRes = await removeTeamMember({
      organizationId: orgAId,
      membershipId: userA.membership.id
    });

    assert.ok(removeRes.error, 'removeTeamMember must block removing the last OWNER');
    assert.match(removeRes.error, /Cannot remove the last OWNER/);
  });

  await t.test('6. Payment Webhook Idempotency & Wallet Integrity', async () => {
    const paymentId = `pay_${uuidv4().substring(0, 8)}`;
    const eventId = `evt_${uuidv4().substring(0, 8)}`;
    const orgWalletId = `wall_${uuidv4().substring(0, 8)}`;

    // Create wallet for Org A with 0 balance
    await pgClient.query(`INSERT INTO "wallet" (id, "organizationId", currency, balance) VALUES ($1, $2, 'USD', 0)`, [orgWalletId, orgAId]);

    // Create a retail order for Org A
    const retailOrderId = `order_${uuidv4().substring(0, 8)}`;
    await pgClient.query(`INSERT INTO "retailOrder" (id, "organizationId", "totalAmount", "paymentMethod", status, "cashierId") VALUES ($1, $2, 100, 'CARD', 'PENDING', 'system')`, [retailOrderId, orgAId]);

    // Create Payment record
    await pgClient.query(`INSERT INTO "payment" (id, amount, currency, status, method, "retailOrderId") VALUES ($1, 100, 'USD', 'PENDING', 'CARD', $2)`, [paymentId, retailOrderId]);

    // First delivery of webhook
    const res1 = await processPaymentEvent({
      event: 'charge.success',
      data: {
        id: eventId,
        reference: paymentId,
        amount: 100
      }
    });
    assert.strictEqual(res1.status, 'success', 'First webhook delivery should succeed');

    // Check wallet balance = 100
    const walletCheck1 = await pgClient.query(`SELECT balance FROM "wallet" WHERE id = $1`, [orgWalletId]);
    assert.strictEqual(parseFloat(walletCheck1.rows[0].balance), 100, 'Wallet balance should be 100 after first payment');

    // Second (duplicate) delivery of identical webhook
    const res2 = await processPaymentEvent({
      event: 'charge.success',
      data: {
        id: eventId,
        reference: paymentId,
        amount: 100
      }
    });
    assert.strictEqual(res2.status, 'already_processed', 'Duplicate webhook must exit idempotently');

    // Check wallet balance is STILL 100 (NO duplicate crediting!)
    const walletCheck2 = await pgClient.query(`SELECT balance FROM "wallet" WHERE id = $1`, [orgWalletId]);
    assert.strictEqual(parseFloat(walletCheck2.rows[0].balance), 100, 'Wallet balance must not double-credit on duplicate event');

    // Check transactions created for this payment: exactly 1
    const txCount = await pgClient.query(`SELECT COUNT(*) FROM "transaction" WHERE reference = $1`, [paymentId]);
    assert.strictEqual(parseInt(txCount.rows[0].count), 1, 'Exactly one transaction record should exist');
  });

  await t.test('7. Refund Authorization: Merchant A cannot approve refund for Merchant B', async () => {
    const paymentBId = `pay_b_${uuidv4().substring(0, 8)}`;
    const retailOrderBId = `order_b_${uuidv4().substring(0, 8)}`;

    // Order and payment belonging to Org B
    await pgClient.query(`INSERT INTO "retailOrder" (id, "organizationId", "totalAmount", "paymentMethod", status, "cashierId") VALUES ($1, $2, 50, 'CARD', 'CONFIRMED', 'system')`, [retailOrderBId, orgBId]);
    await pgClient.query(`INSERT INTO "payment" (id, amount, currency, status, method, "retailOrderId") VALUES ($1, 50, 'USD', 'COMPLETED', 'CARD', $2)`, [paymentBId, retailOrderBId]);

    // User B requests refund for their order on Org B
    setActiveUserToken(userB.token);
    const refundReq = await requestRefund(paymentBId, userB.person.id, 50, 'Defective item');

    // User A (member of Org A) tries to approve Org B's refund request
    setActiveUserToken(userA.token);
    await assert.rejects(
      async () => { await approveRefund(refundReq.id, userA.person.id); },
      (err: any) => {
        assert.match(err.message, /FORBIDDEN: User does not belong to organization/);
        return true;
      },
      'Merchant A must be strictly denied from approving Merchant B refund'
    );

    // User B (member of Org B) approves Org B's refund request: ALLOWED
    setActiveUserToken(userB.token);
    const approvedRefund = await approveRefund(refundReq.id, userB.person.id);
    assert.strictEqual(approvedRefund.status, 'PROCESSING');
  });

  await t.test('8. Payout Security: Tenant isolation and negative balance protection', async () => {
    setActiveUserToken(userA.token);

    // User A tries to request payout against Org B: DENIED
    await assert.rejects(
      async () => {
        await requestPayout(orgBId, 50, 'PAYSTACK', `payout_hack_${uuidv4().substring(0, 8)}`);
      },
      (err: any) => {
        assert.match(err.message, /FORBIDDEN/);
        return true;
      },
      'User A must not be authorized to request payout for Org B'
    );

    // User A tries to request payout exceeding available balance: REJECTED
    await assert.rejects(
      async () => {
        await requestPayout(orgAId, 999999, 'PAYSTACK', `payout_over_${uuidv4().substring(0, 8)}`);
      },
      (err: any) => {
        assert.match(err.message, /Insufficient available payable balance/);
        return true;
      },
      'Overdrawn payout must be rejected'
    );
  });

  t.after(async () => {
    await pgClient.end();
  });
});
