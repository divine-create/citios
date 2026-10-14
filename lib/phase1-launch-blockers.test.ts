import test from 'node:test';
import assert from 'node:assert';
import { createRequire } from 'module';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/src/prisma/db';
import { normalizePhoneNumber } from '@/lib/identity';
import { registerOrganization } from '@/lib/actions/business';
import { registerRestaurantOS } from '@/lib/actions/restaurantos';
import { provisionShopOS } from '@/lib/actions/shopos';
import { handleFailedRetailPayment } from '@/lib/actions/citypay';
import { completeOnboarding } from '@/app/actions/onboarding';
import { searchCityExplore } from '@/app/actions/explore';
import { authOptions } from '@/lib/auth';
import { encode } from 'next-auth/jwt';

// Mock Next.js headers/cookies
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

async function createTestSession(person: any) {
  const email = `test-${person.id.slice(0, 8)}@cityos.test`;
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

test('Phase 1 Launch Blockers Remediation Suite', async (t) => {
  // Ensure a test city exists
  let city = await db.orm.public.City.where({ slug: 'calabar' }).all().first();
  if (!city) {
    city = await db.orm.public.City.create({
      name: 'Calabar',
      slug: 'calabar',
      state: 'Cross River',
      country: 'Nigeria',
      currency: 'NGN',
      isActive: true,
    });
  }

  // --- TEST 1: Phone Normalization (BLK-07) ---
  await t.test('1. normalizePhoneNumber: E.164 normalization & validation', () => {
    assert.strictEqual(normalizePhoneNumber('08012345678'), '+2348012345678');
    assert.strictEqual(normalizePhoneNumber('2348012345678'), '+2348012345678');
    assert.strictEqual(normalizePhoneNumber('+2348012345678'), '+2348012345678');
    assert.strictEqual(normalizePhoneNumber('8012345678'), '+2348012345678');
    assert.strictEqual(normalizePhoneNumber('080-1234-5678'), '+2348012345678');
    assert.strictEqual(normalizePhoneNumber(' (080) 1234 5678 '), '+2348012345678');
    
    // Invalid formats
    assert.strictEqual(normalizePhoneNumber(''), null);
    assert.strictEqual(normalizePhoneNumber('12345'), null);
    assert.strictEqual(normalizePhoneNumber('phone1234567'), null);
    assert.strictEqual(normalizePhoneNumber(null), null);
    assert.strictEqual(normalizePhoneNumber(undefined), null);
  });

  // --- TEST 2: Onboarding Anti-Hijacking (BLK-07) ---
  await t.test('2. completeOnboarding: Phone anti-hijacking guard', async () => {
    const suffix = Math.floor(10000000 + Math.random() * 90000000).toString();
    const aliceLocalPhone = `080${suffix}`;
    const aliceNormPhone = `+23480${suffix}`;
    const bobLocalPhone = `081${suffix}`;
    const bobNormPhone = `+23481${suffix}`;

    const personA = await db.orm.public.Person.create({
      id: uuidv4(),
      firstName: 'Alice',
      lastName: 'Original',
    });
    await db.orm.public.PersonIdentifier.create({
      personId: personA.id,
      type: 'PHONE',
      normalizedValue: aliceNormPhone,
      isVerified: true,
    });

    const personB = await db.orm.public.Person.create({
      id: uuidv4(),
      firstName: 'Bob',
      lastName: 'Attacker',
    });
    const tokenB = await createTestSession(personB);
    mockCookies['next-auth.session-token'] = tokenB;

    // Bob tries to claim Alice's phone number during onboarding
    await assert.rejects(
      async () => {
        await completeOnboarding({
          homeCityId: city.id,
          dateOfBirth: '1995-05-15',
          phone: aliceLocalPhone, // Local format of Alice's phone
          interests: ['Foodie'],
        });
      },
      /This phone number is already linked to another account/
    );

    // Bob successfully onboards with his own phone number
    const res = await completeOnboarding({
      homeCityId: city.id,
      dateOfBirth: '1995-05-15',
      phone: bobLocalPhone,
      interests: ['Tech'],
    });
    assert.strictEqual(res.success, true);

    const profile = await db.orm.public.ResidentProfile.where({ personId: personB.id }).all().firstOrThrow();
    assert.strictEqual(profile.phone, bobNormPhone);
    assert.strictEqual(profile.onboardingComplete, true);
  });

  // --- TEST 3: Business Onboarding Primary Location & Wallet (BLK-02, BLK-08) ---
  await t.test('3. registerOrganization: Provisions Location, Wallet & DiscoveryListing', async () => {
    const owner = await db.orm.public.Person.create({
      id: uuidv4(),
      firstName: 'Merchant',
      lastName: 'Owner',
    });
    await db.orm.public.Account.create({ personId: owner.id, isActive: true });
    const ownerToken = await createTestSession(owner);
    mockCookies['next-auth.session-token'] = ownerToken;

    const orgName = `Test Enterprise ${uuidv4().slice(0, 6)}`;
    const regResult = await registerOrganization({
      name: orgName,
      type: 'RETAIL',
      description: 'Pilot Retail Store',
      citySlug: 'calabar',
      address: '10 Marina Road',
    });

    assert.strictEqual(regResult.success, true);
    const orgId = regResult.organizationId!;

    // 1. Verify primary Location exists with cityId
    const location = await db.orm.public.Location.where({ organizationId: orgId }).all().first();
    assert.ok(location, 'Primary Location must be created');
    assert.strictEqual(location?.cityId, city.id, 'Location must be bound to City');
    assert.strictEqual(location?.name, 'Main Location');

    // 2. Verify MembershipLocation exists
    const membership = await db.orm.public.Membership.where({ organizationId: orgId, personId: owner.id }).all().first();
    assert.ok(membership, 'Membership must exist');
    const memLoc = await db.orm.public.MembershipLocation.where({ membershipId: membership!.id, locationId: location!.id }).all().first();
    assert.ok(memLoc, 'MembershipLocation must exist');

    // 3. Verify Wallet exists with City currency
    const wallet = await db.orm.public.Wallet.where({ organizationId: orgId }).all().first();
    assert.ok(wallet, 'Organization Wallet must be provisioned');
    assert.strictEqual(wallet?.currency, 'NGN');
    assert.strictEqual(wallet?.balance, 0.0);

    // 4. Verify DiscoveryListing exists
    const listing = await db.orm.public.DiscoveryListing.where({ organizationId: orgId }).all().first();
    assert.ok(listing, 'DiscoveryListing must be automatically provisioned');
    assert.strictEqual(listing?.isActive, true);
    assert.strictEqual(listing?.cityId, city.id);
    assert.strictEqual(listing?.locationId, location?.id);

    // 5. Verify Duplicate registration prevention
    const duplicateResult = await registerOrganization({
      name: orgName,
      type: 'RETAIL',
      citySlug: 'calabar',
    });
    assert.ok(duplicateResult.error, 'Duplicate registration must be rejected');
    assert.match(duplicateResult.error!, /already own or belong to an organization/);
  });

  // --- TEST 4: RestaurantOS & ShopOS Provisioning (BLK-02, BLK-04) ---
  await t.test('4. registerRestaurantOS & provisionShopOS: Provisions Location, Wallet & Listing', async () => {
    const owner = await db.orm.public.Person.create({
      id: uuidv4(),
      firstName: 'Chef',
      lastName: 'Patron',
    });
    await db.orm.public.Account.create({ personId: owner.id, isActive: true });
    const ownerToken = await createTestSession(owner);
    mockCookies['next-auth.session-token'] = ownerToken;

    // RestaurantOS
    const restName = `Bistro ${uuidv4().slice(0, 6)}`;
    const restRes = await registerRestaurantOS({
      businessName: restName,
      description: 'Fine dining',
      serviceStyle: 'FULL_SERVICE',
      citySlug: 'calabar',
      address: '5 Calabar Road',
    });
    assert.strictEqual(restRes.success, true);
    const restOrgId = restRes.organizationId!;

    const restLoc = await db.orm.public.Location.where({ organizationId: restOrgId }).all().first();
    assert.ok(restLoc, 'Restaurant must have primary Location');
    assert.strictEqual(restLoc?.cityId, city.id);

    const restWallet = await db.orm.public.Wallet.where({ organizationId: restOrgId }).all().first();
    assert.ok(restWallet, 'Restaurant must have Wallet');
    assert.strictEqual(restWallet?.currency, 'NGN');

    const restListing = await db.orm.public.DiscoveryListing.where({ organizationId: restOrgId }).all().first();
    assert.ok(restListing, 'Restaurant must have DiscoveryListing');
    assert.strictEqual(restListing?.vertical, 'RESTAURANT');

    // ShopOS
    const shopName = `Corner Store ${uuidv4().slice(0, 6)}`;
    const shopSlug = `corner-${uuidv4().slice(0, 6)}`;
    const shopRes = await provisionShopOS({
      businessName: shopName,
      storeUrl: shopSlug,
      citySlug: 'calabar',
      country: 'Nigeria',
    });
    assert.strictEqual(shopRes.success, true);
    const shopOrgId = shopRes.organizationId!;

    const shopLoc = await db.orm.public.Location.where({ organizationId: shopOrgId }).all().first();
    assert.ok(shopLoc, 'ShopOS must have primary Location');
    assert.strictEqual(shopLoc?.cityId, city.id);

    const shopWallet = await db.orm.public.Wallet.where({ organizationId: shopOrgId }).all().first();
    assert.ok(shopWallet, 'ShopOS must have Wallet');
    assert.strictEqual(shopWallet?.currency, 'NGN');

    const shopListing = await db.orm.public.DiscoveryListing.where({ organizationId: shopOrgId }).all().first();
    assert.ok(shopListing, 'ShopOS must have DiscoveryListing');
    assert.strictEqual(shopListing?.vertical, 'RETAIL');
  });

  // --- TEST 5: Honest Explore Search without fabricated ratings (BLK-04) ---
  await t.test('5. searchCityExplore: Returns honest null for unrated listings', async () => {
    const exploreResults = await searchCityExplore('calabar', '', 'All');
    assert.ok(Array.isArray(exploreResults.organizations), 'Organizations must be an array');
    
    // Find our newly created listings
    for (const org of exploreResults.organizations) {
      if (!org.metadata) {
        // Without explicit rating in metadata, rating must be null, NOT fabricated 4.8
        assert.strictEqual(org.rating, null, 'Unrated business must not have fabricated 4.8 rating');
        assert.strictEqual(org.deliveryEta, null, 'Unestimated business must not have fabricated 15m ETA');
      }
    }
  });

  // --- TEST 6: Retail Inventory Reversal on Failed Payment (BLK-03) ---
  await t.test('6. handleFailedRetailPayment: Reverses web order stock without locationId', async () => {
    const org = await db.orm.public.Organization.create({
      name: `Inventory Test Org ${uuidv4().slice(0, 6)}`,
      type: 'RETAIL',
    });

    const product = await db.orm.public.RetailProduct.create({
      organizationId: org.id,
      name: 'Test Item',
      sku: `SKU-${uuidv4().slice(0, 8)}`,
      price: 500,
      stockQuantity: 10,
      isWeighed: false,
    });

    // Create a web order (locationId is null, stock deducted from product.stockQuantity to 8)
    const initialStock = product.stockQuantity;
    const orderQty = 2;
    await db.orm.public.RetailProduct.where({ id: product.id }).update({
      stockQuantity: initialStock - orderQty,
    });

    const order = await db.orm.public.RetailOrder.create({
      organizationId: org.id,
      locationId: null, // Web order
      status: 'PENDING',
      fulfillmentStatus: 'UNFULFILLED',
      totalAmount: 1000,
      paymentMethod: 'ONLINE',
      cashierId: 'WEB',
    });

    await db.orm.public.RetailOrderItem.create({
      orderId: order.id,
      productId: product.id,
      quantity: orderQty,
      unitPrice: 500,
      subtotal: 1000,
    });

    // Trigger failure reversal
    await db.transaction(async (tx: any) => {
      await handleFailedRetailPayment(tx, order.id);
    });

    // Verify order is cancelled
    const updatedOrder = await db.orm.public.RetailOrder.where({ id: order.id }).all().firstOrThrow();
    assert.strictEqual(updatedOrder.status, 'CANCELLED');
    assert.strictEqual(updatedOrder.fulfillmentStatus, 'CANCELLED');

    // Verify stock is restored to 10
    const restoredProduct = await db.orm.public.RetailProduct.where({ id: product.id }).all().firstOrThrow();
    assert.strictEqual(restoredProduct.stockQuantity, initialStock, 'Stock must be restored to initial quantity');

    // Verify stock movement was recorded
    const movements = await db.orm.public.RetailStockMovement.where({
      organizationId: org.id,
      productId: product.id,
      reason: 'SALE_FAILED_REVERSAL',
    }).all();
    assert.ok(movements.length > 0, 'SALE_FAILED_REVERSAL stock movement must be recorded');
    assert.strictEqual(movements[0].delta, orderQty);
  });

  t.after(() => {
    nextHeaders.headers = originalHeaders;
    nextHeaders.cookies = originalCookies;
  });
});
