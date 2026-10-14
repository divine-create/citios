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
import {
  recordDoubleEntryTransaction,
  reconcileWalletBalance,
  getMerchantAccountingStatement,
  auditOrganizationLedger,
  LedgerDomainError,
} from '@/lib/actions/ledger';
import { requestPayout } from '@/app/actions/finance';
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

test('Phase 9 Real Financial Audits & Accounting Reports Suite', async (t) => {
  // 1. Setup Organizations
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
  const platformOrg = await db.orm.public.Organization.create({
    name: `CityPlatform HQ ${uuidv4().slice(0, 6)}`,
    type: 'GOVERNMENT' as any,
  });
  const providerOrg = await db.orm.public.Organization.create({
    name: `CityLogistics Provider ${uuidv4().slice(0, 6)}`,
    type: 'LOGISTICS' as any,
  });

  // Assign memberships
  const memA = await db.orm.public.Membership.create({
    personId: merchantOwnerA.person.id,
    organizationId: orgA.id,
  });
  await db.orm.public.MembershipRole.create({
    membershipId: memA.id,
    role: 'OWNER',
  });

  const memB = await db.orm.public.Membership.create({
    personId: merchantOwnerB.person.id,
    organizationId: orgB.id,
  });
  await db.orm.public.MembershipRole.create({
    membershipId: memB.id,
    role: 'OWNER',
  });

  // Setup Wallets
  const walletA = await db.orm.public.Wallet.create({
    organizationId: orgA.id,
    balance: 0.0,
    currency: 'NGN',
  });
  const walletPlatform = await db.orm.public.Wallet.create({
    organizationId: platformOrg.id,
    balance: 0.0,
    currency: 'NGN',
  });
  const walletProvider = await db.orm.public.Wallet.create({
    organizationId: providerOrg.id,
    balance: 0.0,
    currency: 'NGN',
  });

  // Resident & Resident Wallet
  const resident = await setupAuth('ResidentPayer');
  const walletResident = await db.orm.public.Wallet.create({
    personId: resident.person.id,
    balance: 50000.0, // Starting balance
    currency: 'NGN',
  });

  const createdTxnIds: string[] = [];

  await t.test('1. Double-Entry Invariant: Rejection of Unbalanced Transactions', async () => {
    // Attempt transaction where entries do not balance to zero
    await assert.rejects(
      recordDoubleEntryTransaction({
        description: 'Unbalanced injection test',
        entries: [
          { walletId: walletA.id, amount: 1000, currency: 'NGN' },
          { walletId: walletResident.id, amount: -800, currency: 'NGN' }, // Discrepancy of +200
        ],
      }),
      (err: any) => err instanceof LedgerDomainError && /do not balance to zero/i.test(err.message)
    );

    // Attempt transaction with fewer than 2 entries
    await assert.rejects(
      recordDoubleEntryTransaction({
        description: 'Single entry invalid test',
        entries: [
          { walletId: walletA.id, amount: 1000, currency: 'NGN' },
        ],
      }),
      (err: any) => err instanceof LedgerDomainError && /requires at least 2 entries/i.test(err.message)
    );

    // Attempt currency mismatch
    await assert.rejects(
      recordDoubleEntryTransaction({
        description: 'Currency mismatch test',
        entries: [
          { walletId: walletA.id, amount: 1000, currency: 'USD' }, // Wallet is NGN
          { walletId: walletResident.id, amount: -1000, currency: 'USD' },
        ],
      }),
      (err: any) => err instanceof LedgerDomainError && /Currency mismatch/i.test(err.message)
    );
  });

  await t.test('2. Multi-Party Payout Split: Balanced Double-Entry Transaction', async () => {
    // 10,000 NGN Order Payment Split:
    // Payer: -10,000 NGN
    // Merchant: +8,000 NGN
    // Logistics: +1,200 NGN
    // Platform Fee: +800 NGN
    // Net: 0.00
    const res = await recordDoubleEntryTransaction({
      description: 'Order #ORD-7741 Payment Settlement & Split',
      reference: 'SETTLE_ORD_7741',
      entries: [
        { walletId: walletResident.id, amount: -10000.0, currency: 'NGN' },
        { walletId: walletA.id, amount: 8000.0, currency: 'NGN' },
        { walletId: walletProvider.id, amount: 1200.0, currency: 'NGN' },
        { walletId: walletPlatform.id, amount: 800.0, currency: 'NGN' },
      ],
    });

    assert.ok(res.transaction.id, 'Transaction created');
    assert.strictEqual(res.entries.length, 4, '4 LedgerEntry rows created');
    createdTxnIds.push(res.transaction.id);

    // Verify wallet balances updated atomically
    const wRes = await db.orm.public.Wallet.where({ id: walletResident.id }).all().firstOrThrow();
    assert.strictEqual(wRes.balance, 40000.0);

    const wA = await db.orm.public.Wallet.where({ id: walletA.id }).all().firstOrThrow();
    assert.strictEqual(wA.balance, 8000.0);

    const wProv = await db.orm.public.Wallet.where({ id: walletProvider.id }).all().firstOrThrow();
    assert.strictEqual(wProv.balance, 1200.0);

    const wPlat = await db.orm.public.Wallet.where({ id: walletPlatform.id }).all().firstOrThrow();
    assert.strictEqual(wPlat.balance, 800.0);
  });

  await t.test('3. Wallet Balance Reconciliation: Zero Discrepancy Verification', async () => {
    const reconA = await reconcileWalletBalance(walletA.id);
    assert.strictEqual(reconA.isBalanced, true, 'Merchant wallet must be perfectly balanced');
    assert.strictEqual(reconA.discrepancy, 0.0);
    assert.strictEqual(reconA.reportedBalance, 8000.0);
    assert.strictEqual(reconA.ledgerSum, 8000.0);

    const reconProv = await reconcileWalletBalance(walletProvider.id);
    assert.strictEqual(reconProv.isBalanced, true);
    assert.strictEqual(reconProv.discrepancy, 0.0);
    assert.strictEqual(reconProv.reportedBalance, 1200.0);

    const reconPlat = await reconcileWalletBalance(walletPlatform.id);
    assert.strictEqual(reconPlat.isBalanced, true);
    assert.strictEqual(reconPlat.discrepancy, 0.0);
    assert.strictEqual(reconPlat.reportedBalance, 800.0);
  });

  await t.test('4. Merchant Payout Execution & Overdraw Guarding', async () => {
    mockCookies['next-auth.session-token'] = merchantOwnerA.token;

    // Overdraw attempt: merchant has 8,000 NGN, requests 15,000 NGN
    await assert.rejects(
      requestPayout(orgA.id, 15000, 'BANK_TRANSFER', 'payout-overdraw-test'),
      /Insufficient available payable balance/
    );

    // Valid payout request: 5,000 NGN
    const payoutKey = `payout-${uuidv4().slice(0, 8)}`;
    const payout = await requestPayout(orgA.id, 5000, 'BANK_TRANSFER', payoutKey);
    assert.ok(payout.id, 'Payout record generated');
    assert.strictEqual(payout.status, 'PROCESSING');

    // Idempotent duplicate payout request returns existing payout
    const dupPayout = await requestPayout(orgA.id, 5000, 'BANK_TRANSFER', payoutKey);
    assert.strictEqual(dupPayout.id, payout.id, 'Duplicate payout with same key must return existing record');

    // Verify wallet balance decremented
    const updatedWalletA = await db.orm.public.Wallet.where({ id: walletA.id }).all().firstOrThrow();
    assert.strictEqual(updatedWalletA.balance, 3000.0);

    // Verify reconciliation holds after payout
    const reconPostPayout = await reconcileWalletBalance(walletA.id);
    assert.strictEqual(reconPostPayout.isBalanced, true);
    assert.strictEqual(reconPostPayout.reportedBalance, 3000.0);
    assert.strictEqual(reconPostPayout.ledgerSum, 3000.0);
  });

  await t.test('5. Merchant Accounting Statement & Cross-Tenant Isolation', async () => {
    // Merchant A requests their own statement
    mockCookies['next-auth.session-token'] = merchantOwnerA.token;
    const stmtA = await getMerchantAccountingStatement(orgA.id);

    assert.strictEqual(stmtA.organizationId, orgA.id);
    assert.strictEqual(stmtA.currency, 'NGN');
    assert.strictEqual(stmtA.currentBalance, 3000.0);
    assert.strictEqual(stmtA.grossEarnings, 8000.0);
    assert.strictEqual(stmtA.totalDebits, 5000.0);
    assert.strictEqual(stmtA.isBalanced, true);
    assert.strictEqual(stmtA.discrepancy, 0.0);

    // Merchant B attempts to view Merchant A's statement -> Rejected
    mockCookies['next-auth.session-token'] = merchantOwnerB.token;
    await assert.rejects(
      getMerchantAccountingStatement(orgA.id),
      /FORBIDDEN|Access denied/i
    );
  });

  await t.test('6. Organization Ledger Full Audit', async () => {
    mockCookies['next-auth.session-token'] = merchantOwnerA.token;
    const auditRes = await auditOrganizationLedger(orgA.id);

    assert.strictEqual(auditRes.allBalanced, true, 'All merchant wallets must pass integrity check');
    assert.strictEqual(auditRes.totalDiscrepancy, 0.0);
    assert.strictEqual(auditRes.walletsAudited, 1);
  });

  // Teardown
  const payouts = await db.orm.public.Payout.where({ organizationId: orgA.id }).all();
  for (const p of payouts) {
    await db.orm.public.Payout.where({ id: p.id }).delete();
  }

  const allEntries = await db.orm.public.LedgerEntry.where((le: any) =>
    le.walletId.in([walletA.id, walletPlatform.id, walletProvider.id, walletResident.id])
  ).all();
  const txIds = allEntries.map((e: any) => e.transactionId);
  for (const e of allEntries) {
    await db.orm.public.LedgerEntry.where({ id: e.id }).delete();
  }

  for (const tid of Array.from(new Set([...createdTxnIds, ...txIds]))) {
    await db.orm.public.Transaction.where({ id: tid }).delete();
  }

  await db.orm.public.Wallet.where({ id: walletA.id }).delete();
  await db.orm.public.Wallet.where({ id: walletPlatform.id }).delete();
  await db.orm.public.Wallet.where({ id: walletProvider.id }).delete();
  await db.orm.public.Wallet.where({ id: walletResident.id }).delete();

  await db.orm.public.MembershipRole.where({ membershipId: memA.id }).delete();
  await db.orm.public.Membership.where({ id: memA.id }).delete();
  await db.orm.public.MembershipRole.where({ membershipId: memB.id }).delete();
  await db.orm.public.Membership.where({ id: memB.id }).delete();

  await db.orm.public.Organization.where({ id: orgA.id }).delete();
  await db.orm.public.Organization.where({ id: orgB.id }).delete();
  await db.orm.public.Organization.where({ id: platformOrg.id }).delete();
  await db.orm.public.Organization.where({ id: providerOrg.id }).delete();

  await db.orm.public.Account.where({ personId: resident.person.id }).delete();
  await db.orm.public.PersonIdentifier.where({ personId: resident.person.id }).delete();
  await db.orm.public.Person.where({ id: resident.person.id }).delete();

  await db.orm.public.Account.where({ personId: merchantOwnerA.person.id }).delete();
  await db.orm.public.PersonIdentifier.where({ personId: merchantOwnerA.person.id }).delete();
  await db.orm.public.Person.where({ id: merchantOwnerA.person.id }).delete();

  await db.orm.public.Account.where({ personId: merchantOwnerB.person.id }).delete();
  await db.orm.public.PersonIdentifier.where({ personId: merchantOwnerB.person.id }).delete();
  await db.orm.public.Person.where({ id: merchantOwnerB.person.id }).delete();
});
