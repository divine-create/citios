import { test } from 'node:test';
import assert from 'node:assert';
import {
  getMerchantDeliverySettings,
  getDefaultMerchantDeliverySettings,
} from './merchant-delivery-settings';
import { getCheckoutDeliveryEstimate, createCheckoutDeliveryJob } from './checkout-delivery';
import { db } from '@/src/prisma/db';
import { v4 as uuidv4 } from 'uuid';

test('Merchant Delivery & Fulfillment Settings Suite (Tier 3)', async (t) => {
  let testOrgId: string;
  let testCityId: string;
  let listingSlug: string;

  t.before(async () => {
    testOrgId = uuidv4();
    listingSlug = `merchant-delivery-${testOrgId}`;

    const city = (await db.orm.public.City.all().first())!;
    testCityId = city.id;

    await db.orm.public.Organization.create({
      id: testOrgId,
      name: 'Calabar Grills & Bistro',
      type: 'RESTAURANT' as any,
      status: 'ACTIVE' as any,
    });

    await db.orm.public.Location.create({
      id: uuidv4(),
      organizationId: testOrgId,
      name: 'Marian Main Branch',
      address: 'Marian Road, Calabar Municipal',
      latitude: 4.9757,
      longitude: 8.3417,
    });
  });

  t.after(async () => {
    await db.orm.public.DeliveryJob.where({ providerId: testOrgId }).delete().catch(() => {});
    await db.orm.public.DiscoveryListing.where({ organizationId: testOrgId }).delete().catch(() => {});
    await db.orm.public.Location.where({ organizationId: testOrgId }).delete().catch(() => {});
    await db.orm.public.Organization.where({ id: testOrgId }).delete().catch(() => {});
  });

  await t.test('1. Returns default settings gracefully for unconfigured merchant', async () => {
    const settings = await getMerchantDeliverySettings(testOrgId);
    assert.strictEqual(settings.fulfillmentMode, 'PLATFORM_FLEET');
    assert.strictEqual(settings.isDeliveryActive, true);
    assert.strictEqual(settings.maxDeliveryRadiusKm, 8.0);
    assert.strictEqual(settings.freeDeliveryThreshold, 0);
  });

  await t.test('2. Updates merchant fulfillment mode to IN_HOUSE_COURIER', async () => {
    await db.orm.public.DiscoveryListing.create({
      id: uuidv4(),
      organizationId: testOrgId,
      cityId: testCityId,
      vertical: 'RESTAURANT',
      slug: listingSlug,
      title: 'Test Delivery Settings',
      description: 'Test Settings',
      metadata: JSON.stringify({
        ...(await getDefaultMerchantDeliverySettings()),
        fulfillmentMode: 'IN_HOUSE_COURIER',
        inHouseCourierName: 'Bassey Dispatch',
        inHouseCourierPhone: '08021112233',
        maxDeliveryRadiusKm: 5.0,
        freeDeliveryThreshold: 7500,
      }),
      isActive: true,
    });

    const settings = await getMerchantDeliverySettings(testOrgId);
    assert.strictEqual(settings.fulfillmentMode, 'IN_HOUSE_COURIER');
    assert.strictEqual(settings.inHouseCourierName, 'Bassey Dispatch');
    assert.strictEqual(settings.maxDeliveryRadiusKm, 5.0);
    assert.strictEqual(settings.freeDeliveryThreshold, 7500);
  });

  await t.test('3. Enforces merchant custom maxDeliveryRadiusKm at checkout', async () => {
    // Destination 7.5 km away (Airport to 8 Miles) exceeds 5.0 km radius
    const estimate = await getCheckoutDeliveryEstimate({
      merchantOrgId: testOrgId,
      dropoffAddressText: 'Federal Housing Estate, 8 Miles, Calabar',
      dropoffLat: 5.0289,
      dropoffLng: 8.3562,
    });

    assert.strictEqual(estimate.isServiceable, false);
    assert.ok(estimate.error?.includes('outside the merchant\'s maximum delivery radius'));
  });

  await t.test('4. Applies merchant free delivery subsidy when order exceeds threshold', async () => {
    // Close trip (1.5 km to State Housing) with order total ₦10,000 (exceeds ₦7,500)
    const estimate = await getCheckoutDeliveryEstimate({
      merchantOrgId: testOrgId,
      dropoffAddressText: 'State Housing Estate, Calabar',
      dropoffLat: 4.9612,
      dropoffLng: 8.3276,
      orderSubtotal: 10000,
    });

    assert.strictEqual(estimate.success, true);
    assert.strictEqual(estimate.isServiceable, true);
    assert.strictEqual(estimate.deliveryFee, 0, 'Delivery fee should be 0 for subsidized order');
  });

  await t.test('5. Rejects delivery quote when merchant is set to PICKUP_ONLY', async () => {
    const listing = await db.orm.public.DiscoveryListing.where({ slug: listingSlug }).all().first();
    await db.orm.public.DiscoveryListing.where({ id: listing!.id }).update({
      metadata: JSON.stringify({
        ...(await getDefaultMerchantDeliverySettings()),
        fulfillmentMode: 'PICKUP_ONLY',
      }),
    });

    const estimate = await getCheckoutDeliveryEstimate({
      merchantOrgId: testOrgId,
      dropoffAddressText: 'State Housing Estate, Calabar',
      dropoffLat: 4.9612,
      dropoffLng: 8.3276,
    });

    assert.strictEqual(estimate.isServiceable, false);
    assert.ok(estimate.error?.includes('in-store pickup orders only'));
  });

  await t.test('6. Creates DeliveryJob assigned to in-house courier when IN_HOUSE_COURIER is active', async () => {
    const listing = await db.orm.public.DiscoveryListing.where({ slug: listingSlug }).all().first();
    await db.orm.public.DiscoveryListing.where({ id: listing!.id }).update({
      metadata: JSON.stringify({
        ...(await getDefaultMerchantDeliverySettings()),
        fulfillmentMode: 'IN_HOUSE_COURIER',
        inHouseCourierName: 'Bassey Dispatch',
        inHouseCourierPhone: '08021112233',
        maxDeliveryRadiusKm: 10.0,
      }),
    });

    const orderId = uuidv4();
    const result = await createCheckoutDeliveryJob({
      orderId,
      orderType: 'RESTAURANT_ORDER',
      merchantOrgId: testOrgId,
      customerName: 'Ekiti Emeka',
      customerPhone: '08039998877',
      deliveryAddress: 'State Housing Estate, Calabar',
      orderSummary: '1x Fisherman Soup + Pounded Yam',
    });

    assert.strictEqual(result.success, true);
    assert.ok(result.deliveryJobId != null);
    assert.strictEqual(result.recipientOtp?.length, 6);

    // Verify job in database has providerId equal to merchantOrgId (private in-house courier)
    const persisted = (await db.orm.public.DeliveryJob.where({ id: result.deliveryJobId }).all())[0];
    assert.ok(persisted != null);
    assert.strictEqual(persisted.providerId, testOrgId);
  });
});
