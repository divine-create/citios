import test from 'node:test';
import assert from 'node:assert';
import { db } from '../src/prisma/db';
import { v4 as uuidv4 } from 'uuid';
import { encode } from 'next-auth/jwt';
import { authOptions } from './auth';
import { addVoiceCartItem, clearVoiceCart } from './voice/cart';
import { processMerchantCheckout } from '../app/actions/checkout';
import { verifyOrderPayment } from '../app/actions/payment';
import { settleSuccessfulPayment, settleFailedPayment } from './actions/payment-settlement';
import { expirePendingOrders } from './actions/expirePendingOrders';
import { processPaymentEvent } from './actions/citypay';

import { createRequire } from 'module';

// Mock next/headers cookies for getServerSession inside Node test runner
const require = createRequire(import.meta.url);
const nextHeaders = require('next/headers');
const mockCookies: Record<string, string> = {};
nextHeaders.headers = () => new Map();
nextHeaders.cookies = () => ({
  get: (name: string) => (mockCookies[name] ? { name, value: mockCookies[name] } : undefined),
  getAll: () => Object.entries(mockCookies).map(([name, value]) => ({ name, value })),
  has: (name: string) => Boolean(mockCookies[name]),
});

async function createTestSession(person: any) {
  const email = `test-payment-${person.id.slice(0, 8)}@cityos.test`;
  const existingIdent = await db.orm.public.PersonIdentifier.where({ personId: person.id, type: 'EMAIL' }).all().first();
  if (!existingIdent) {
    await db.orm.public.PersonIdentifier.create({
      personId: person.id,
      type: 'EMAIL',
      normalizedValue: email,
      isVerified: true,
    });
  }
  const existingAccount = await db.orm.public.Account.where({ personId: person.id }).all().first();
  if (!existingAccount) {
    await db.orm.public.Account.create({
      personId: person.id,
      isActive: true,
    });
  }

  const token = await encode({
    token: {
      email,
      name: `${person.firstName} ${person.lastName}`,
      personId: person.id,
    },
    secret: (authOptions.secret as string) || "cityos-jwt-secret-key-2026",
  });
  return token;
}

test('Phase 4 Checkout & Payment Gateway Reality Test Suite', async (t) => {
  // Ensure test city exists
  let city = await db.orm.public.City.where({ slug: 'calabar' }).all().first();
  if (!city) {
    city = await db.orm.public.City.create({
      name: 'Calabar',
      slug: 'calabar',
      country: 'Nigeria',
      currency: 'NGN',
      timezone: 'Africa/Lagos',
      latitude: 4.9757,
      longitude: 8.3417,
      isPilot: true,
    });
  }

  // 1. Create resident customer with funded wallet
  const residentPerson = await db.orm.public.Person.create({
    id: uuidv4(),
    firstName: 'Amaka',
    lastName: 'Eze',
  });
  await db.orm.public.PersonIdentifier.create({
    personId: residentPerson.id,
    type: 'PHONE',
    normalizedValue: `+234804${Math.floor(1000000 + Math.random() * 9000000)}`,
    isVerified: true,
  });
  const residentToken = await createTestSession(residentPerson);
  mockCookies['next-auth.session-token'] = residentToken;

  const residentWallet = await db.orm.public.Wallet.create({
    personId: residentPerson.id,
    balance: 100000, // ₦100,000 opening balance
    currency: 'NGN',
  });

  // 2. Create Retail Organization (ShopOS) & Merchant Wallet
  const retailOrg = await db.orm.public.Organization.create({
    name: `Lagos Mart ${uuidv4().slice(0, 6)}`,
    type: 'RETAIL',
  });
  const retailWallet = await db.orm.public.Wallet.create({
    organizationId: retailOrg.id,
    balance: 0,
    currency: 'NGN',
  });
  const retailLocation = await db.orm.public.Location.create({
    organizationId: retailOrg.id,
    name: 'Retail Hub',
    cityId: city.id,
  });
  const retailProduct = await db.orm.public.RetailProduct.create({
    organizationId: retailOrg.id,
    name: 'Organic Basmati Rice 5kg',
    price: 4500,
    stockQuantity: 20,
    isWeighed: false,
    sku: `RICE-${uuidv4().slice(0, 4)}`,
  });
  await db.orm.public.RetailLocationStock.create({
    organizationId: retailOrg.id,
    locationId: retailLocation.id,
    productId: retailProduct.id,
    stockQuantity: 20,
  });

  // 3. Create Restaurant Organization (RestaurantOS) & Merchant Wallet
  const restaurantOrg = await db.orm.public.Organization.create({
    name: `Calabar Grill ${uuidv4().slice(0, 6)}`,
    type: 'RESTAURANT',
  });
  const restaurantWallet = await db.orm.public.Wallet.create({
    organizationId: restaurantOrg.id,
    balance: 0,
    currency: 'NGN',
  });
  const restaurantLocation = await db.orm.public.Location.create({
    organizationId: restaurantOrg.id,
    name: 'Bistro One',
    cityId: city.id,
  });
  const foodMenuItem = await db.orm.public.MenuItem.create({
    organizationId: restaurantOrg.id,
    locationId: restaurantLocation.id,
    name: 'Suya Platter',
    category: 'Mains',
    price: 6000,
    isAvailable: true,
  });

  await t.test('1. Internal Wallet Payment: Atomic Debit, Merchant Credit & Double-Entry Ledger', async () => {
    // Add 2 bags of rice to cart (2 x 4500 = 9000 NGN)
    await addVoiceCartItem(residentPerson.id, retailProduct.id, 2, 'retail');

    const checkoutRes = await processMerchantCheckout(retailOrg.id, 'wallet', `chk_wal_${Date.now()}`);
    assert.strictEqual(checkoutRes.success, true);
    assert.match(checkoutRes.message || '', /Payment successful via Wallet/i);

    // Verify Resident Wallet debited by 9,000 NGN
    const updatedResidentWallet = await db.orm.public.Wallet.where({ id: residentWallet.id }).all().first();
    assert.ok(updatedResidentWallet);
    assert.strictEqual(updatedResidentWallet.balance, 91000); // 100000 - 9000

    // Verify Merchant Wallet credited by 9,000 NGN
    const updatedRetailWallet = await db.orm.public.Wallet.where({ id: retailWallet.id }).all().first();
    assert.ok(updatedRetailWallet);
    assert.strictEqual(updatedRetailWallet.balance, 9000);

    // Verify Payment record created as COMPLETED via INTERNAL_WALLET
    const retailOrder = await db.orm.public.RetailOrder.where({ organizationId: retailOrg.id }).all().first();
    assert.ok(retailOrder);
    const payment = await db.orm.public.Payment.where({ retailOrderId: retailOrder.id }).all().first();
    assert.ok(payment);
    assert.strictEqual(payment.status, 'COMPLETED');
    assert.strictEqual(payment.method, 'WALLET');
    assert.strictEqual(payment.provider, 'INTERNAL_WALLET');
    assert.strictEqual(payment.amount, 9000);
    assert.ok(payment.transactionId);

    // Verify double-entry ledger entries exist tied to the exact same Transaction
    const entries = await db.orm.public.LedgerEntry.where({ transactionId: payment.transactionId }).all();
    assert.strictEqual(entries.length, 2, 'Expected debit and credit ledger entries');
    const debitEntry = entries.find(e => e.amount < 0);
    const creditEntry = entries.find(e => e.amount > 0);
    assert.ok(debitEntry);
    assert.ok(creditEntry);
    assert.strictEqual(debitEntry.walletId, residentWallet.id);
    assert.strictEqual(debitEntry.amount, -9000);
    assert.strictEqual(creditEntry.walletId, retailWallet.id);
    assert.strictEqual(creditEntry.amount, 9000);

    // Verify stock was decremented from 20 to 18
    const updatedStock = await db.orm.public.RetailProduct.where({ id: retailProduct.id }).all().first();
    assert.ok(updatedStock);
    assert.strictEqual(updatedStock.stockQuantity, 18);
  });

  await t.test('2. Restaurant Order Wallet Payment: Moves to PREPARING status & Credits Restaurant Wallet', async () => {
    // Add Suya Platter to cart (6,000 NGN)
    await addVoiceCartItem(residentPerson.id, foodMenuItem.id, 1, 'food');

    const checkoutRes = await processMerchantCheckout(restaurantOrg.id, 'wallet', `chk_rest_${Date.now()}`, restaurantLocation.id);
    assert.strictEqual(checkoutRes.success, true);

    // Verify Resident Wallet debited from 91,000 to 85,000
    const residentW = await db.orm.public.Wallet.where({ id: residentWallet.id }).all().first();
    assert.ok(residentW);
    assert.strictEqual(residentW.balance, 85000);

    // Verify Restaurant Wallet credited by 6,000
    const restW = await db.orm.public.Wallet.where({ id: restaurantWallet.id }).all().first();
    assert.ok(restW);
    assert.strictEqual(restW.balance, 6000);

    // Verify RestaurantOrder status is PREPARING (ready for kitchen) and paymentStatus is COMPLETED
    const order = await db.orm.public.RestaurantOrder.where({ organizationId: restaurantOrg.id }).all().first();
    assert.ok(order);
    assert.strictEqual(order.status, 'PREPARING');
    assert.strictEqual(order.paymentStatus, 'COMPLETED');
    assert.ok(order.paidAt);
  });

  await t.test('3. External Payment Initiation (Card / Gateway): Creates PENDING Payment & Authoritative Authorization URL', async () => {
    // Add 1 bag of rice to cart (4,500 NGN)
    await addVoiceCartItem(residentPerson.id, retailProduct.id, 1, 'retail');

    const checkoutRes = await processMerchantCheckout(retailOrg.id, 'card', `chk_ext_${Date.now()}`);
    assert.strictEqual(checkoutRes.success, true);
    assert.strictEqual(checkoutRes.requiresPaymentAction, true);
    assert.ok(checkoutRes.authorizationUrl, 'Expected authorizationUrl from gateway');
    assert.ok(checkoutRes.reference, 'Expected canonical reference');

    // Verify pending Payment created in DB
    const pendingPayment = await db.orm.public.Payment.where({ reference: checkoutRes.reference }).all().first();
    assert.ok(pendingPayment);
    assert.strictEqual(pendingPayment.status, 'PENDING');
    assert.strictEqual(pendingPayment.amount, 4500);
    assert.strictEqual(pendingPayment.currency, 'NGN');

    // Verify stock is reserved (18 -> 17)
    const stockAfterReserve = await db.orm.public.RetailProduct.where({ id: retailProduct.id }).all().first();
    assert.ok(stockAfterReserve);
    assert.strictEqual(stockAfterReserve.stockQuantity, 17);
  });

  await t.test('4. Webhook Ingress & Exactly-Once Settlement (No Double Stock Deduction)', async () => {
    // Find the pending payment created in subtest 3
    const extOrders = await db.orm.public.RetailOrder.where({ organizationId: retailOrg.id }).all();
    const lastOrder = extOrders[extOrders.length - 1];
    assert.ok(lastOrder);
    const pendingPayment = await db.orm.public.Payment.where({ retailOrderId: lastOrder.id }).all().first();
    assert.ok(pendingPayment);

    const initialMerchantBalance = (await db.orm.public.Wallet.where({ id: retailWallet.id }).all().first())?.balance || 0;
    const initialStock = (await db.orm.public.RetailProduct.where({ id: retailProduct.id }).all().first())?.stockQuantity || 0;

    const eventId = `evt_paystack_${uuidv4()}`;

    // Deliver simulated payment success event
    const webhookRes = await settleSuccessfulPayment({
      paymentId: pendingPayment.id,
      providerReference: `pstk_${Date.now()}`,
      providerEventId: eventId,
      eventType: 'charge.success',
      rawPayload: { event: 'charge.success', reference: pendingPayment.reference },
    });
    assert.strictEqual(webhookRes.status, 'success');

    // Verify Payment transitioned to COMPLETED
    const settledPayment = await db.orm.public.Payment.where({ id: pendingPayment.id }).all().first();
    assert.ok(settledPayment);
    assert.strictEqual(settledPayment.status, 'COMPLETED');

    // Verify RetailOrder is CONFIRMED
    const settledOrder = await db.orm.public.RetailOrder.where({ id: pendingPayment.retailOrderId! }).all().first();
    assert.ok(settledOrder);
    assert.strictEqual(settledOrder.status, 'CONFIRMED');
    assert.strictEqual(settledOrder.fulfillmentStatus, 'PROCESSING');

    // Verify inventory was NOT double-deducted (stock stays at 17, not 16)
    const stockAfterWebhook = await db.orm.public.RetailProduct.where({ id: retailProduct.id }).all().first();
    assert.ok(stockAfterWebhook);
    assert.strictEqual(stockAfterWebhook.stockQuantity, initialStock);

    // Verify Merchant Wallet was credited
    const merchantWalletAfter = await db.orm.public.Wallet.where({ id: retailWallet.id }).all().first();
    assert.ok(merchantWalletAfter);
    assert.strictEqual(merchantWalletAfter.balance, initialMerchantBalance + 4500);

    // Replay Attack / Concurrent Duplicate delivery test:
    // Sending the exact same providerEventId must return already_processed and not credit wallet again
    const duplicateRes = await settleSuccessfulPayment({
      paymentId: pendingPayment.id,
      providerReference: `pstk_${Date.now()}`,
      providerEventId: eventId,
      eventType: 'charge.success',
    });
    assert.strictEqual(duplicateRes.status, 'already_processed');

    const merchantWalletDuplicate = await db.orm.public.Wallet.where({ id: retailWallet.id }).all().first();
    assert.ok(merchantWalletDuplicate);
    assert.strictEqual(merchantWalletDuplicate.balance, merchantWalletAfter.balance, 'Balance must not change on duplicate event');
  });

  await t.test('5. Payment Failure & Stock Reversal', async () => {
    // Add 1 bag of rice to cart (4,500 NGN)
    await addVoiceCartItem(residentPerson.id, retailProduct.id, 1, 'retail');
    const checkoutRes = await processMerchantCheckout(retailOrg.id, 'card', `chk_fail_${Date.now()}`);
    assert.strictEqual(checkoutRes.success, true);

    // Stock reserved (17 -> 16)
    const stockReserved = await db.orm.public.RetailProduct.where({ id: retailProduct.id }).all().first();
    assert.ok(stockReserved);
    assert.strictEqual(stockReserved.stockQuantity, 16);

    const payment = await db.orm.public.Payment.where({ reference: checkoutRes.reference }).all().first();
    assert.ok(payment);

    // Process payment failure event
    const failRes = await settleFailedPayment({
      paymentId: payment.id,
      providerEventId: `evt_fail_${Date.now()}`,
      eventType: 'charge.failed',
      reason: 'Card declined',
    });
    assert.strictEqual(failRes.status, 'failed_settled');

    // Verify Payment is marked FAILED
    const failedPayment = await db.orm.public.Payment.where({ id: payment.id }).all().first();
    assert.ok(failedPayment);
    assert.strictEqual(failedPayment.status, 'FAILED');

    // Verify RetailOrder is CANCELLED
    const cancelledOrder = await db.orm.public.RetailOrder.where({ id: payment.retailOrderId! }).all().first();
    assert.ok(cancelledOrder);
    assert.strictEqual(cancelledOrder.status, 'CANCELLED');

    // Verify Stock is restored back to 17
    const stockRestored = await db.orm.public.RetailProduct.where({ id: retailProduct.id }).all().first();
    assert.ok(stockRestored);
    assert.strictEqual(stockRestored.stockQuantity, 17);

    // Verify StockMovement recorded with SALE_FAILED_REVERSAL
    const reversalMovement = await db.orm.public.RetailStockMovement.where({
      organizationId: retailOrg.id,
      reason: 'SALE_FAILED_REVERSAL',
    }).all().first();
    assert.ok(reversalMovement);
    assert.strictEqual(reversalMovement.delta, 1);
  });

  await t.test('6. Order Expiration: Cancels Stale Pending Orders & Restores Stock', async () => {
    // Add 2 bags of rice to cart (2 x 4500)
    await addVoiceCartItem(residentPerson.id, retailProduct.id, 2, 'retail');
    const checkoutRes = await processMerchantCheckout(retailOrg.id, 'card', `chk_exp_${Date.now()}`);
    assert.strictEqual(checkoutRes.success, true);

    // Stock reserved: 17 -> 15
    const stockReserved = await db.orm.public.RetailProduct.where({ id: retailProduct.id }).all().first();
    assert.ok(stockReserved);
    assert.strictEqual(stockReserved.stockQuantity, 15);

    const payment = await db.orm.public.Payment.where({ reference: checkoutRes.reference }).all().first();
    assert.ok(payment);

    // Expire orders with threshold 0 minutes (expires all existing pending orders immediately)
    await expirePendingOrders(0);

    // Verify payment is CANCELLED
    const cancelledPayment = await db.orm.public.Payment.where({ id: payment.id }).all().first();
    assert.ok(cancelledPayment);
    assert.strictEqual(cancelledPayment.status, 'CANCELLED');

    // Verify order is CANCELLED
    const cancelledOrder = await db.orm.public.RetailOrder.where({ id: payment.retailOrderId! }).all().first();
    assert.ok(cancelledOrder);
    assert.strictEqual(cancelledOrder.status, 'CANCELLED');

    // Verify stock is restored: 15 -> 17
    const stockRestored = await db.orm.public.RetailProduct.where({ id: retailProduct.id }).all().first();
    assert.ok(stockRestored);
    assert.strictEqual(stockRestored.stockQuantity, 17);
  });

  await t.test('7. Synchronous Payment Verification Fallback (verifyOrderPayment)', async () => {
    // Add 1 bag of rice to cart
    await addVoiceCartItem(residentPerson.id, retailProduct.id, 1, 'retail');
    const checkoutRes = await processMerchantCheckout(retailOrg.id, 'card', `chk_ver_${Date.now()}`);
    assert.strictEqual(checkoutRes.success, true);
    assert.ok(checkoutRes.reference);

    // Verify order payment synchronously (simulates returning to /pay/success before webhook)
    const verifyResult = await verifyOrderPayment(checkoutRes.reference);
    assert.strictEqual(verifyResult.success, true);
    assert.strictEqual(verifyResult.status, 'SUCCESS');

    // Verify payment is now COMPLETED in DB
    const verifiedPayment = await db.orm.public.Payment.where({ reference: checkoutRes.reference }).all().first();
    assert.ok(verifiedPayment);
    assert.strictEqual(verifiedPayment.status, 'COMPLETED');

    // Verify order is now CONFIRMED
    const verifiedOrder = await db.orm.public.RetailOrder.where({ id: verifiedPayment.retailOrderId! }).all().first();
    assert.ok(verifiedOrder);
    assert.strictEqual(verifiedOrder.status, 'CONFIRMED');

    // Teardown test data in foreign-key safe order
    await clearVoiceCart(residentPerson.id);

    const retOrders = await db.orm.public.RetailOrder.where({ organizationId: retailOrg.id }).all();
    for (const ro of retOrders) {
      const pmts = await db.orm.public.Payment.where({ retailOrderId: ro.id }).all();
      for (const p of pmts) {
        await db.orm.public.PaymentEvent.where({ paymentId: p.id }).delete();
        await db.orm.public.Payment.where({ id: p.id }).delete();
      }
      await db.orm.public.RetailOrderItem.where({ orderId: ro.id }).delete();
      await db.orm.public.RetailOrder.where({ id: ro.id }).delete();
    }
    await db.orm.public.RetailStockMovement.where({ organizationId: retailOrg.id }).delete();
    await db.orm.public.RetailLocationStock.where({ locationId: retailLocation.id }).delete();
    await db.orm.public.RetailProduct.where({ id: retailProduct.id }).delete();
    await db.orm.public.Location.where({ id: retailLocation.id }).delete();
    const retLedgers = await db.orm.public.LedgerEntry.where({ walletId: retailWallet.id }).all();
    for (const le of retLedgers) await db.orm.public.LedgerEntry.where({ id: le.id }).delete();
    await db.orm.public.Wallet.where({ id: retailWallet.id }).delete();
    await db.orm.public.Organization.where({ id: retailOrg.id }).delete();

    const restOrders = await db.orm.public.RestaurantOrder.where({ organizationId: restaurantOrg.id }).all();
    for (const ro of restOrders) {
      const pmts = await db.orm.public.Payment.where({ restaurantOrderId: ro.id }).all();
      for (const p of pmts) {
        await db.orm.public.PaymentEvent.where({ paymentId: p.id }).delete();
        await db.orm.public.Payment.where({ id: p.id }).delete();
      }
      await db.orm.public.OrderItem.where({ orderId: ro.id }).delete();
      await db.orm.public.RestaurantOrder.where({ id: ro.id }).delete();
    }
    await db.orm.public.MenuItem.where({ id: foodMenuItem.id }).delete();
    await db.orm.public.Location.where({ id: restaurantLocation.id }).delete();
    const restLedgers = await db.orm.public.LedgerEntry.where({ walletId: restaurantWallet.id }).all();
    for (const le of restLedgers) await db.orm.public.LedgerEntry.where({ id: le.id }).delete();
    await db.orm.public.Wallet.where({ id: restaurantWallet.id }).delete();
    await db.orm.public.Organization.where({ id: restaurantOrg.id }).delete();

    const rels = await db.orm.public.Relationship.where({ personId: residentPerson.id }).all();
    for (const r of rels) {
      const custs = await db.orm.public.CustomerData.where({ relationshipId: r.id }).all();
      for (const c of custs) await db.orm.public.CustomerData.where({ id: c.id }).delete();
      await db.orm.public.Relationship.where({ id: r.id }).delete();
    }

    const resLedgers = await db.orm.public.LedgerEntry.where({ walletId: residentWallet.id }).all();
    for (const le of resLedgers) await db.orm.public.LedgerEntry.where({ id: le.id }).delete();
    await db.orm.public.Wallet.where({ id: residentWallet.id }).delete();
    await db.orm.public.Account.where({ personId: residentPerson.id }).delete();
    await db.orm.public.PersonIdentifier.where({ personId: residentPerson.id }).delete();
    await db.orm.public.Person.where({ id: residentPerson.id }).delete();
  });
});
