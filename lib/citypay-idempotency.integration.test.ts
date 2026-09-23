import test from 'node:test';
import assert from 'node:assert';
import { db } from '../src/prisma/db';
import { processPaymentEvent } from '../lib/actions/citypay';

test('CityPay Merchant Payout Idempotency', async (t) => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be set');
  }

  const org = await db.orm.public.Organization.create({
    name: 'Payout Test Org ' + Date.now(),
    type: 'RETAIL' as any,
  });

  const wallet = await db.orm.public.Wallet.create({
    organizationId: org.id,
    currency: 'NGN',
    balance: 0,
  });

  const payment = await db.orm.public.Payment.create({
    amount: 5000,
    currency: 'NGN',
    status: 'PENDING', method: 'CARD',
  });

  const order = await db.orm.public.RetailOrder.create({
    organizationId: org.id,
    total: 5000,
    status: 'PENDING', method: 'CARD',
    fulfillmentstatus: 'PENDING', method: 'CARD',
    paymentId: payment.id,
  });

  await db.orm.public.Payment.where({ id: payment.id }).update({ retailOrderId: order.id });

  await t.test('duplicate webhook delivery for same providerEventId', async () => {
    const payload = {
      event: 'charge.success',
      data: { id: 'evt_' + Date.now(), reference: payment.id }
    };

    const [res1, res2, res3] = await Promise.allSettled([
      processPaymentEvent(payload),
      processPaymentEvent(payload),
      processPaymentEvent(payload)
    ]);

    const finalWallet = await db.orm.public.Wallet.where({ id: wallet.id }).all().first();
    assert.strictEqual(finalWallet.balance, 5000, 'Wallet should be credited exactly once');

    const ledgers = await db.orm.public.LedgerEntry.where({ walletId: wallet.id }).all();
    assert.strictEqual(ledgers.length, 1, 'Only one ledger entry should be created');
  });

  await t.test('second successful payment for same merchant', async () => {
    const payment2 = await db.orm.public.Payment.create({
      amount: 3000,
      currency: 'NGN',
      status: 'PENDING', method: 'CARD',
      retailOrderId: order.id
    });

    const payload2 = {
      event: 'charge.success',
      data: { id: 'evt_' + Date.now(), reference: payment2.id }
    };

    await processPaymentEvent(payload2);

    const finalWallet = await db.orm.public.Wallet.where({ id: wallet.id }).all().first();
    assert.strictEqual(finalWallet.balance, 8000, 'Wallet should be cumulatively credited (+3000)');

    const ledgers = await db.orm.public.LedgerEntry.where({ walletId: wallet.id }).all();
    assert.strictEqual(ledgers.length, 2, 'Two ledger entries should exist');
  });
});

