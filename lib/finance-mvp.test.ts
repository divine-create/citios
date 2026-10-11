import test from 'node:test';
import assert from 'node:assert';
import { db } from '../src/prisma/db';
import { requestRefund, approveRefund } from '../app/actions/refund_workflow';
import { requestPayout } from '../app/actions/finance';
import { Client } from 'pg';

const pgClient = new Client({ connectionString: process.env.DATABASE_URL });

test('Finance MVP: Payout Concurrency', async (t) => {
  if (!process.env.DATABASE_URL) return;
  await pgClient.connect();
  
  const orgId = 'org_' + Date.now();
  await pgClient.query(`INSERT INTO "organization" (id, name, type) VALUES ($1, $2, 'RETAIL')`, [orgId, 'Org ' + orgId]);
  const walletId = 'wall_' + Date.now();
  await pgClient.query(`INSERT INTO "wallet" (id, "organizationId", currency, balance) VALUES ($1, $2, 'NGN', 100000)`, [walletId, orgId]);

  await t.test('Concurrent request of 80k each against 100k wallet - exactly one succeeds', async () => {
    const [res1, res2] = await Promise.allSettled([
      requestPayout(orgId, 80000, 'MONNIFY', 'idem1_' + Date.now()),
      requestPayout(orgId, 80000, 'MONNIFY', 'idem2_' + Date.now()),
    ]);

    const successes = [res1, res2].filter(r => r.status === 'fulfilled');
    const failures = [res1, res2].filter(r => r.status === 'rejected');
    
    assert.strictEqual(successes.length, 1, 'Exactly one payout should succeed');
    assert.strictEqual(failures.length, 1, 'Exactly one payout should fail due to insufficient balance');
  });

  await pgClient.query(`UPDATE "wallet" SET balance = 20000 WHERE id = $1`, [walletId]);

  await t.test('Concurrent request of 10k each against 20k wallet - both succeed', async () => {
    const [res1, res2] = await Promise.allSettled([
      requestPayout(orgId, 10000, 'MONNIFY', 'idem3_' + Date.now()),
      requestPayout(orgId, 10000, 'MONNIFY', 'idem4_' + Date.now()),
    ]);

    const successes = [res1, res2].filter(r => r.status === 'fulfilled');
    assert.strictEqual(successes.length, 2, 'Both payouts should succeed');
  });
});

test('Finance MVP: Refund Concurrency', async (t) => {
  if (!process.env.DATABASE_URL) return;

  const paymentId = 'pay_' + Date.now();
  await pgClient.query(`INSERT INTO "payment" (id, amount, currency, status, method, "providerReference") VALUES ($1, 100000, 'NGN', 'COMPLETED', 'CARD', $1)`, [paymentId]);

  await t.test('Concurrent refunds exceeding capture amount - only one succeeds', async () => {
    const [res1, res2] = await Promise.allSettled([
      requestRefund(paymentId, 'person1', 70000, 'duplicate intent'),
      requestRefund(paymentId, 'person1', 70000, 'duplicate intent 2'),
    ]);

    const successes = [res1, res2].filter(r => r.status === 'fulfilled');
    assert.strictEqual(successes.length, 1, 'Only one refund request should succeed');
  });
});

test('Finance MVP: Payment State Semantics', async (t) => {
  if (!process.env.DATABASE_URL) return;

  const paymentId = 'pay_' + Date.now();
  await pgClient.query(`INSERT INTO "payment" (id, amount, currency, status, method, "providerReference") VALUES ($1, 5000, 'NGN', 'COMPLETED', 'CARD', $1)`, [paymentId]);

  await t.test('Successful payment fully refunded -> Payment remains COMPLETED', async () => {
    const req = await requestRefund(paymentId, 'merchantId', 5000, 'return');
    const refund = await approveRefund(req.id, 'merchantId');

    const check = await pgClient.query(`SELECT status FROM "payment" WHERE id = $1`, [paymentId]);
    assert.strictEqual(check.rows[0].status, 'COMPLETED', 'Payment must remain COMPLETED');
    assert.strictEqual(refund.status, 'PROCESSING', 'Refund should be PROCESSING');
  });
});

async function processWebhookSimulated(providerEventId: string, paymentId: string) {
  return await db.transaction(async (tx) => {
    const existing = await tx.orm.public.PaymentEvent.where({ providerEventId }).select('id').all().first();
    if (existing) return { success: true, message: 'Already processed' };

    try {
      await tx.orm.public.PaymentEvent.select('id').create({
        providerEventId,
        paymentId,
        type: 'charge.success',
        payload: {}
      });
    } catch (err: any) {
      if (err.sqlState === '23505' || err.code === '23505' || err.message?.includes('Unique constraint')) {
        return { success: true, message: 'Already processed' };
      }
      throw err;
    }

    const payment = await tx.orm.public.Payment.where({ id: paymentId }).select('id', 'reference', 'amount').all().first();

    if (payment?.reference?.startsWith('FUND_WALLET')) {
      const wallet = await tx.orm.public.Wallet.where({ organizationId: 'resident_org' }).select('id', 'balance').all().first();
      if (wallet) {
         await tx.orm.public.Wallet.where({ id: wallet.id }).select('id').update({ balance: wallet.balance + payment.amount });
      }
    }
    return { success: true };
  });
}

test('Finance MVP: Resident Funding & Webhook Idempotency', async (t) => {
  if (!process.env.DATABASE_URL) return;

  const paymentId = 'pay_' + Date.now();
  const ref = 'FUND_WALLET_' + paymentId;
  await pgClient.query(`INSERT INTO "payment" (id, amount, currency, status, method, "reference") VALUES ($1, 50000, 'NGN', 'PENDING', 'CARD', $2)`, [paymentId, ref]);

  await t.test('Duplicate webhook delivery', async () => {
    const evtId = 'evt_' + Date.now();

    const [res1, res2] = await Promise.allSettled([
      processWebhookSimulated(evtId, paymentId),
      processWebhookSimulated(evtId, paymentId)
    ]);

    const successes = [res1, res2].filter(r => r.status === 'fulfilled');
    assert.strictEqual(successes.length, 2, 'Both webhooks should return without crashing');

    const evts = await pgClient.query(`SELECT id FROM "paymentEvent" WHERE "providerEventId" = $1`, [evtId]);
    assert.strictEqual(evts.rowCount, 1, 'Only one DB record generated');
  });
  
  await t.test('Cleanup', async () => {
      await pgClient.end();
  });
});
