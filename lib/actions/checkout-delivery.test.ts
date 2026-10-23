import { test } from 'node:test';
import assert from 'node:assert';
import { getCheckoutDeliveryEstimate, createCheckoutDeliveryJob } from './checkout-delivery';
import { db } from '@/src/prisma/db';
import { v4 as uuidv4 } from 'uuid';

test('Checkout Delivery — Dynamic CityDrive Integration', async (t) => {
  let testOrgId: string;

  t.before(async () => {
    // Seed a synthetic merchant organization and location in Marian Road, Calabar Municipal
    testOrgId = uuidv4();
    await db.orm.public.Organization.create({
      id: testOrgId,
      name: 'Test Marian Eatery',
      type: 'RESTAURANT' as any,
      status: 'ACTIVE' as any,
    });

    await db.orm.public.Location.create({
      id: uuidv4(),
      organizationId: testOrgId,
      name: 'Marian Road Kitchen',
      address: 'Marian Road, Calabar Municipal',
      latitude: 4.9757,
      longitude: 8.3417,
    });
  });

  t.after(async () => {
    await db.orm.public.Location.where({ organizationId: testOrgId }).delete().catch(() => {});
    await db.orm.public.Organization.where({ id: testOrgId }).delete().catch(() => {});
  });

  await t.test('1. Calculates dynamic delivery quote for serviceable Calabar delivery', async () => {
    const quote = await getCheckoutDeliveryEstimate({
      merchantOrgId: testOrgId,
      dropoffAddressText: 'State Housing Estate, Calabar',
      dropoffLat: 4.9612,
      dropoffLng: 8.3276,
    });

    assert.strictEqual(quote.success, true);
    assert.strictEqual(quote.isServiceable, true);
    assert.ok(quote.deliveryFee >= 800, `Expected deliveryFee >= 800, got ${quote.deliveryFee}`);
    assert.ok(quote.distanceKm != null && quote.distanceKm > 0);
    assert.ok(quote.durationMinutes != null && quote.durationMinutes > 0);
  });

  await t.test('2. Rejects out-of-coverage destinations safely', async () => {
    const quote = await getCheckoutDeliveryEstimate({
      merchantOrgId: testOrgId,
      dropoffAddressText: 'Ikeja, Lagos Island',
      dropoffLat: 6.6018,
      dropoffLng: 3.3515,
    });

    assert.strictEqual(quote.isServiceable, false);
    assert.ok(quote.error != null);
  });

  await t.test('3. Creates automated DeliveryJob with OTP and tracking reference', async () => {
    const orderId = uuidv4();
    const result = await createCheckoutDeliveryJob({
      orderId,
      orderType: 'RESTAURANT_ORDER',
      merchantOrgId: testOrgId,
      customerName: 'Test Diner',
      customerPhone: '08031234567',
      deliveryAddress: '14 Asari Eso Lane, Near Rabana Roundabout, Calabar',
      orderSummary: '2x Jollof Rice with Grilled Fish',
    });

    assert.strictEqual(result.success, true);
    assert.ok(result.deliveryJobId != null);
    assert.ok(result.trackingReference != null);
    assert.ok(result.recipientOtp != null);
    assert.strictEqual(result.recipientOtp.length, 6);

    // Verify persisted job in database
    const persisted = (await db.orm.public.DeliveryJob.where({ id: result.deliveryJobId }).all())[0];
    assert.ok(persisted != null);
    assert.strictEqual(persisted.sourceId, orderId);
    assert.strictEqual(persisted.sourceType, 'RESTAURANT_ORDER');
    assert.ok(persisted.dropoffLat != null);
    assert.ok(persisted.dropoffLng != null);
  });
});
