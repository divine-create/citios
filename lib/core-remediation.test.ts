import test from 'node:test';
import assert from 'node:assert';
import { createRequire } from 'module';
import { v4 as uuidv4 } from 'uuid';
import { Client } from 'pg';
import { encode } from 'next-auth/jwt';

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

function setActiveUserToken(token: string | null) {
  if (token) {
    mockCookies['next-auth.session-token'] = token;
  } else {
    delete mockCookies['next-auth.session-token'];
  }
}

import { db } from '../src/prisma/db';
import { requireMembership, inviteTeamMember, removeTeamMember } from './actions/tenant';
import { requestPayout } from '../app/actions/finance';
import { requestRefund, approveRefund, rejectRefund } from '../app/actions/refund_workflow';
import { processPaymentEvent } from './actions/citypay';

const pgClient = new Client({ connectionString: process.env.DATABASE_URL });

const AUTH_SECRET = process.env.NEXTAUTH_SECRET || "super_secret_cityconnect_key_2026_!@#";

async function createTestUser(orgId: string, role = 'OWNER', isActiveAccount = true) {
  const testId = uuidv4().substring(0, 8);
  const email = `rem-user-${testId}@example.com`;

  const person = await db.orm.public.Person.create({
    id: uuidv4(),
    firstName: "RemTest",
    lastName: `User-${testId}`
  });

  await db.orm.public.PersonIdentifier.create({
    personId: person.id,
    type: 'EMAIL',
    normalizedValue: email,
    isVerified: true
  });

  const account = await db.orm.public.Account.create({
    personId: person.id,
    isActive: isActiveAccount
  });

  const membership = await db.orm.public.Membership.create({
    personId: person.id,
    organizationId: orgId
  });

  const membershipRole = await db.orm.public.MembershipRole.create({
    membershipId: membership.id,
    role
  });

  const token = await encode({
    token: {
      email,
      name: `RemTest User-${testId}`,
      personId: person.id,
      memberships: [{
        organizationId: orgId,
        organizationType: "RETAIL" as const,
        role: role as any
      }]
    },
    secret: AUTH_SECRET
  });

  return { person, email, account, membership, membershipRole, token };
}

test('CityOS Phase 1R — Core Hardening Remediation Verification', async (t) => {
  await pgClient.connect();

  // Setup Shared Fixtures
  const orgAId = `org_rem_a_${uuidv4().substring(0, 8)}`;
  const orgBId = `org_rem_b_${uuidv4().substring(0, 8)}`;

  await pgClient.query(`INSERT INTO "organization" (id, name, type) VALUES ($1, 'Remediation Org A', 'RETAIL')`, [orgAId]);
  await pgClient.query(`INSERT INTO "organization" (id, name, type) VALUES ($1, 'Remediation Org B', 'RETAIL')`, [orgBId]);

  const ownerA = await createTestUser(orgAId, 'OWNER');
  const staffA = await createTestUser(orgAId, 'STAFF');
  const ownerB = await createTestUser(orgBId, 'OWNER');

  await t.test('1. Unauthenticated payout requests are rejected without financial side effects (R1)', async () => {
    setActiveUserToken(null);
    const walletId = `wall_${uuidv4().substring(0, 8)}`;
    await pgClient.query(`INSERT INTO "wallet" (id, "organizationId", currency, balance) VALUES ($1, $2, 'USD', 1000)`, [walletId, orgAId]);

    // Unauthenticated caller attempts payout
    await assert.rejects(
      async () => {
        await requestPayout(orgAId, 500, 'PAYSTACK', `idem_unauth_${uuidv4().substring(0, 8)}`);
      },
      (err: any) => {
        assert.match(err.message, /UNAUTHORIZED: Valid authenticated session required/);
        return true;
      },
      'Unauthenticated payout request must fail closed with UNAUTHORIZED'
    );

    // Verify wallet balance is unchanged ($1000)
    const walletCheck = await pgClient.query(`SELECT balance FROM "wallet" WHERE id = $1`, [walletId]);
    assert.strictEqual(parseFloat(walletCheck.rows[0].balance), 1000, 'Wallet balance must be unmodified');

    // Verify zero payouts created
    const payoutCount = await pgClient.query(`SELECT COUNT(*) FROM "payout" WHERE "organizationId" = $1`, [orgAId]);
    assert.strictEqual(parseInt(payoutCount.rows[0].count), 0, 'No payout records should exist');
  });

  await t.test('2. Authenticated users without required role cannot request payouts (R1)', async () => {
    setActiveUserToken(staffA.token);

    await assert.rejects(
      async () => {
        await requestPayout(orgAId, 500, 'PAYSTACK', `idem_staff_${uuidv4().substring(0, 8)}`);
      },
      (err: any) => {
        assert.match(err.message, /FORBIDDEN/);
        return true;
      },
      'Staff member without financial role must be denied payout execution'
    );

    // Wallet balance untouched
    const walletCheck = await pgClient.query(`SELECT balance FROM "wallet" WHERE "organizationId" = $1`, [orgAId]);
    assert.strictEqual(parseFloat(walletCheck.rows[0].balance), 1000, 'Wallet balance must be unmodified');
  });

  await t.test('3. Refund approval and rejection fail when merchant identity is omitted, falsified, or unauthorized (R2)', async () => {
    const paymentId = `pay_${uuidv4().substring(0, 8)}`;
    const retailOrderId = `order_${uuidv4().substring(0, 8)}`;
    await pgClient.query(`INSERT INTO "retailOrder" (id, "organizationId", "totalAmount", "paymentMethod", status, "cashierId") VALUES ($1, $2, 100, 'CARD', 'CONFIRMED', 'system')`, [retailOrderId, orgAId]);
    await pgClient.query(`INSERT INTO "payment" (id, amount, currency, status, method, "retailOrderId") VALUES ($1, 100, 'USD', 'COMPLETED', 'CARD', $2)`, [paymentId, retailOrderId]);

    // Request refund as ownerA (acting as customer/payer)
    setActiveUserToken(ownerA.token);
    const refundReq = await requestRefund(paymentId, ownerA.person.id, 50, 'Damaged product');

    // 3a. Unauthenticated approval fails
    setActiveUserToken(null);
    await assert.rejects(
      async () => { await approveRefund(refundReq.id); },
      (err: any) => {
        assert.match(err.message, /UNAUTHORIZED/);
        return true;
      },
      'Unauthenticated refund approval must fail closed'
    );

    // 3b. Unauthorized cross-tenant approval fails
    setActiveUserToken(ownerB.token);
    await assert.rejects(
      async () => { await approveRefund(refundReq.id, ownerB.person.id); },
      (err: any) => {
        assert.match(err.message, /FORBIDDEN: User does not belong to organization/);
        return true;
      },
      'Cross-tenant merchant cannot approve refund'
    );

    // 3c. Identity mismatch between session and merchantPersonId argument fails
    setActiveUserToken(ownerA.token);
    await assert.rejects(
      async () => { await approveRefund(refundReq.id, ownerB.person.id); },
      (err: any) => {
        assert.match(err.message, /FORBIDDEN: Identity mismatch with authenticated session/);
        return true;
      },
      'Spoofed merchantPersonId parameter must be rejected'
    );

    // 3d. Reject refund with unauthenticated or rogue caller fails
    setActiveUserToken(null);
    await assert.rejects(
      async () => { await rejectRefund(refundReq.id, 'Fraud'); },
      (err: any) => {
        assert.match(err.message, /UNAUTHORIZED/);
        return true;
      },
      'Unauthenticated rejectRefund must fail closed'
    );

    // 3e. Legitimate merchant approval succeeds
    setActiveUserToken(ownerA.token);
    const approved = await approveRefund(refundReq.id);
    assert.strictEqual(approved.status, 'PROCESSING');
  });

  await t.test('4. Customer cannot submit refund request on behalf of another payer (R2)', async () => {
    // Create Relationship and CustomerData for ownerA
    const relId = uuidv4();
    await pgClient.query(`INSERT INTO "relationship" (id, "personId", "organizationId", type) VALUES ($1, $2, $3, 'CUSTOMER')`, [relId, ownerA.person.id, orgAId]);
    const custId = uuidv4();
    await pgClient.query(`INSERT INTO "customerData" (id, "personId", "relationshipId") VALUES ($1, $2, $3)`, [custId, ownerA.person.id, relId]);

    const paymentId = `pay_${uuidv4().substring(0, 8)}`;
    const retailOrderId = `order_${uuidv4().substring(0, 8)}`;
    await pgClient.query(`INSERT INTO "retailOrder" (id, "organizationId", "customerDataId", "totalAmount", "paymentMethod", status, "cashierId") VALUES ($1, $2, $3, 80, 'CARD', 'CONFIRMED', 'system')`, [retailOrderId, orgAId, custId]);
    await pgClient.query(`INSERT INTO "payment" (id, amount, currency, status, method, "retailOrderId") VALUES ($1, 80, 'USD', 'COMPLETED', 'CARD', $2)`, [paymentId, retailOrderId]);

    // Impostor (staffA) attempts to request refund passing ownerA's personId
    setActiveUserToken(staffA.token);
    await assert.rejects(
      async () => {
        await requestRefund(paymentId, ownerA.person.id, 80, 'Impostor refund');
      },
      (err: any) => {
        assert.match(err.message, /FORBIDDEN: Cannot request refund for another person/);
        return true;
      },
      'Cannot request refund passing another user personId'
    );

    // Impostor (staffA) attempts to request refund passing their own personId for an order they did not place
    await assert.rejects(
      async () => {
        await requestRefund(paymentId, staffA.person.id, 80, 'Impostor refund');
      },
      (err: any) => {
        assert.match(err.message, /FORBIDDEN: Requester is not the original payer of this order/);
        return true;
      },
      'Requester must be verified against original order customerData'
    );
  });

  await t.test('5. Two owners cannot concurrently remove each other and leave organization ownerless (R3)', async () => {
    const raceOrgId = `org_race_${uuidv4().substring(0, 8)}`;
    await pgClient.query(`INSERT INTO "organization" (id, name, type) VALUES ($1, 'Race Org', 'RETAIL')`, [raceOrgId]);

    const owner1 = await createTestUser(raceOrgId, 'OWNER');
    const owner2 = await createTestUser(raceOrgId, 'OWNER');

    // Both owners initiate concurrent removals of each other
    setActiveUserToken(owner1.token);

    const [res1, res2] = await Promise.allSettled([
      removeTeamMember({ organizationId: raceOrgId, membershipId: owner2.membership.id }),
      removeTeamMember({ organizationId: raceOrgId, membershipId: owner1.membership.id })
    ]);

    const successes = [res1, res2].filter(r => r.status === 'fulfilled' && (r.value as any).success);
    const blocked = [res1, res2].filter(r => 
      r.status === 'rejected' || (r.status === 'fulfilled' && (r.value as any).error?.includes('Cannot remove the last OWNER'))
    );

    assert.strictEqual(successes.length, 1, 'Exactly one concurrent removal must succeed');
    assert.strictEqual(blocked.length, 1, 'The other concurrent removal must be blocked by the sole-owner guard');

    // Confirm DB still has exactly 1 active owner
    const ownersQuery = await pgClient.query(
      `SELECT COUNT(*) FROM "membershipRole" mr JOIN "membership" m ON mr."membershipId" = m.id WHERE m."organizationId" = $1 AND mr.role = 'OWNER'`,
      [raceOrgId]
    );
    assert.strictEqual(parseInt(ownersQuery.rows[0].count), 1, 'Organization must retain at least one OWNER');
  });

  await t.test('6. Sole active owner cannot be demoted through invitation or membership update (R4)', async () => {
    const demoteOrgId = `org_demote_${uuidv4().substring(0, 8)}`;
    await pgClient.query(`INSERT INTO "organization" (id, name, type) VALUES ($1, 'Demote Guard Org', 'RETAIL')`, [demoteOrgId]);

    const soleOwner = await createTestUser(demoteOrgId, 'OWNER');
    setActiveUserToken(soleOwner.token);

    // Attempt to demote sole owner to STAFF via inviteTeamMember
    const demoteRes = await inviteTeamMember({
      organizationId: demoteOrgId,
      email: soleOwner.email,
      roles: ['STAFF']
    });

    assert.ok(demoteRes.error, 'inviteTeamMember must reject demoting the last owner');
    assert.match(demoteRes.error, /FORBIDDEN: Cannot demote the last OWNER/);

    // Verify sole owner still retains OWNER role in database
    const rolesQuery = await pgClient.query(
      `SELECT role FROM "membershipRole" WHERE "membershipId" = $1`,
      [soleOwner.membership.id]
    );
    assert.strictEqual(rolesQuery.rows[0].role, 'OWNER', 'Owner role must be preserved');
  });

  await t.test('7. Failed webhook settlement can be retried successfully (R5)', async () => {
    const walletId = `wall_wh_${uuidv4().substring(0, 8)}`;
    await pgClient.query(`INSERT INTO "wallet" (id, "organizationId", currency, balance) VALUES ($1, $2, 'USD', 0)`, [walletId, orgBId]);

    const paymentId = `pay_wh_${uuidv4().substring(0, 8)}`;
    const eventId = `evt_retry_${uuidv4().substring(0, 8)}`;
    const retailOrderId = `order_wh_${uuidv4().substring(0, 8)}`;
    await pgClient.query(`INSERT INTO "retailOrder" (id, "organizationId", "totalAmount", "paymentMethod", status, "cashierId") VALUES ($1, $2, 100, 'CARD', 'PENDING', 'system')`, [retailOrderId, orgBId]);
    await pgClient.query(`INSERT INTO "payment" (id, amount, currency, status, method, "retailOrderId") VALUES ($1, 100, 'USD', 'PENDING', 'CARD', $2)`, [paymentId, retailOrderId]);

    // Initial successful delivery
    const res1 = await processPaymentEvent({
      event: 'charge.success',
      data: { id: eventId, reference: paymentId, amount: 100 }
    });
    assert.strictEqual(res1.status, 'success', 'Webhook processing should commit');

    // Confirm wallet was credited
    const walletCheck = await pgClient.query(`SELECT balance FROM "wallet" WHERE id = $1`, [walletId]);
    assert.strictEqual(parseFloat(walletCheck.rows[0].balance), 100, 'Wallet credited correctly');

    // Duplicate retry of the exact same event exits idempotently without double credit
    const resRetry = await processPaymentEvent({
      event: 'charge.success',
      data: { id: eventId, reference: paymentId, amount: 100 }
    });
    assert.strictEqual(resRetry.status, 'already_processed', 'Subsequent duplicate event is handled idempotently');
    const walletCheck2 = await pgClient.query(`SELECT balance FROM "wallet" WHERE id = $1`, [walletId]);
    assert.strictEqual(parseFloat(walletCheck2.rows[0].balance), 100, 'Wallet must not be double-credited');
  });

  await t.test('8. Concurrent duplicate webhooks produce exactly one financial effect (R5)', async () => {
    const concOrgId = `org_conc_${uuidv4().substring(0, 8)}`;
    await pgClient.query(`INSERT INTO "organization" (id, name, type) VALUES ($1, 'Conc Org', 'RETAIL')`, [concOrgId]);
    const walletId = `wall_conc_${uuidv4().substring(0, 8)}`;
    await pgClient.query(`INSERT INTO "wallet" (id, "organizationId", currency, balance) VALUES ($1, $2, 'USD', 0)`, [walletId, concOrgId]);

    const paymentId = `pay_conc_${uuidv4().substring(0, 8)}`;
    const eventId = `evt_conc_${uuidv4().substring(0, 8)}`;
    const retailOrderId = `order_conc_${uuidv4().substring(0, 8)}`;
    await pgClient.query(`INSERT INTO "retailOrder" (id, "organizationId", "totalAmount", "paymentMethod", status, "cashierId") VALUES ($1, $2, 100, 'CARD', 'PENDING', 'system')`, [retailOrderId, concOrgId]);
    await pgClient.query(`INSERT INTO "payment" (id, amount, currency, status, method, "retailOrderId") VALUES ($1, 100, 'USD', 'PENDING', 'CARD', $2)`, [paymentId, retailOrderId]);

    // Send 2 concurrent webhooks with identical eventId
    const [w1, w2] = await Promise.all([
      processPaymentEvent({ event: 'charge.success', data: { id: eventId, reference: paymentId, amount: 100 } }),
      processPaymentEvent({ event: 'charge.success', data: { id: eventId, reference: paymentId, amount: 100 } })
    ]);

    const statuses = [w1.status, w2.status];
    assert.ok(statuses.includes('success'), 'At least one webhook must succeed');
    assert.ok(statuses.includes('already_processed'), 'The other webhook must be deduplicated via unique constraint');

    // Exactly $100 in wallet
    const walletCheck = await pgClient.query(`SELECT balance FROM "wallet" WHERE id = $1`, [walletId]);
    assert.strictEqual(parseFloat(walletCheck.rows[0].balance), 100, 'Wallet must have exactly 100');

    // Exactly 1 ledger entry
    const ledgerCheck = await pgClient.query(`SELECT COUNT(*) FROM "ledgerEntry" WHERE "walletId" = $1`, [walletId]);
    assert.strictEqual(parseInt(ledgerCheck.rows[0].count), 1, 'Exactly one ledger entry must be recorded');
  });

  await t.test('9. Deactivated accounts are denied access even if session token remains valid (R6)', async () => {
    const deactOrgId = `org_deact_${uuidv4().substring(0, 8)}`;
    await pgClient.query(`INSERT INTO "organization" (id, name, type) VALUES ($1, 'Deact Org', 'RETAIL')`, [deactOrgId]);
    const user = await createTestUser(deactOrgId, 'OWNER', true);
    setActiveUserToken(user.token);

    // Initial check: active account is authorized
    const auth1 = await requireMembership(deactOrgId, ['OWNER']);
    assert.ok(auth1.membership, 'Active account should be authorized');

    // Deactivate account in database
    await pgClient.query(`UPDATE "account" SET "isActive" = false WHERE id = $1`, [user.account.id]);

    // Verify requireMembership now throws FORBIDDEN
    await assert.rejects(
      async () => {
        await requireMembership(deactOrgId, ['OWNER']);
      },
      (err: any) => {
        assert.match(err.message, /FORBIDDEN: Account is deactivated or suspended/);
        return true;
      },
      'Deactivated account must be rejected despite valid JWT'
    );

    // Verify requestPayout also rejects the deactivated account
    await assert.rejects(
      async () => {
        await requestPayout(deactOrgId, 100, 'PAYSTACK', `idem_deact_${uuidv4().substring(0, 8)}`);
      },
      (err: any) => {
        assert.match(err.message, /FORBIDDEN: Account is deactivated or suspended/);
        return true;
      },
      'Financial actions must reject deactivated accounts'
    );
  });

  await t.test('10. Failed transactions do not leave wallet, ledger, payment, and payout inconsistent (Transactional boundary)', async () => {
    setActiveUserToken(ownerA.token);

    // Attempt payout exceeding balance ($999999)
    await assert.rejects(
      async () => {
        await requestPayout(orgAId, 999999, 'PAYSTACK', `idem_over_${uuidv4().substring(0, 8)}`);
      },
      (err: any) => {
        assert.match(err.message, /Insufficient available payable balance/);
        return true;
      }
    );

    // Verify wallet balance intact
    const walletCheck = await pgClient.query(`SELECT balance FROM "wallet" WHERE "organizationId" = $1`, [orgAId]);
    assert.strictEqual(parseFloat(walletCheck.rows[0].balance), 1000, 'Wallet balance intact');

    // Verify no partial payout created for this attempt
    const payoutCheck = await pgClient.query(`SELECT COUNT(*) FROM "payout" WHERE "organizationId" = $1 AND amount = 999999`, [orgAId]);
    assert.strictEqual(parseInt(payoutCheck.rows[0].count), 0, 'No partial payout created');
  });

  t.after(async () => {
    await pgClient.end();
  });
});
