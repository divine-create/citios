import test from 'node:test';
import assert from 'node:assert';
import { createRequire } from 'module';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/src/prisma/db';
import { authOptions } from '@/lib/auth';
import { encode } from 'next-auth/jwt';
import { registerRestaurantOS, createMenuItem, toggleMenuItemAvailability, openShift as openRestaurantShift, createPosOrder } from '@/lib/actions/restaurantos';
import { createProduct, getProducts, openShift, createOrder as createRetailOrder, getRetailSettings } from '@/lib/actions/retail';
import { placeRestaurantOrder } from '@/app/actions/food';

// Mock Next.js headers/cookies
const require = createRequire(import.meta.url);
const nextHeaders = require('next/headers');
let mockCookies: Record<string, string> = {};
nextHeaders.headers = () => new Map();
nextHeaders.cookies = () => ({
  get: (name: string) => mockCookies[name] ? { name, value: mockCookies[name] } : undefined,
  getAll: () => Object.entries(mockCookies).map(([n, v]) => ({ name: n, value: v }))
});

function toInstant(date: Date) {
  return (globalThis as any).Temporal.Instant.fromEpochMilliseconds(date.getTime());
}

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

test('Phase 2 Merchant Reality (Catalog, Menu, POS & Storefront Operations) Test Suite', async (t) => {
  // Ensure a test city exists
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

  // Create merchant owner person
  const ownerPerson = await db.orm.public.Person.create({
    id: uuidv4(),
    firstName: 'Merchant',
    lastName: 'Operator',
  });
  await db.orm.public.PersonIdentifier.create({
    personId: ownerPerson.id,
    type: 'PHONE',
    normalizedValue: `+234802${Math.floor(1000000 + Math.random() * 9000000)}`,
    isVerified: true,
  });
  const ownerToken = await createTestSession(ownerPerson);
  mockCookies['next-auth.session-token'] = ownerToken;

  let retailOrg: any;
  let retailLocation: any;
  let testProduct: any;
  let testRegister: any;

  let restOrg: any;
  let restLocation: any;
  let testMenuItem: any;

  await t.test('1. Retail Product Creation, Location Stock Sync & hasProducts Onboarding Flag', async () => {
    // Set up retail organization
    retailOrg = await db.orm.public.Organization.create({
      name: `CityMart Express ${uuidv4().slice(0, 6)}`,
      type: 'RETAIL',
      status: 'ACTIVE',
    });

    retailLocation = await db.orm.public.Location.create({
      organizationId: retailOrg.id,
      cityId: city.id,
      name: 'Main Storefront',
      address: '45 Marian Road, Calabar',
    });

    const membership = await db.orm.public.Membership.create({
      organizationId: retailOrg.id,
      personId: ownerPerson.id,
    });
    await db.orm.public.MembershipRole.create({
      membershipId: membership.id,
      role: 'OWNER',
    });

    // Create initial settings
    await db.orm.public.RetailSettings.create({
      organizationId: retailOrg.id,
      storeName: retailOrg.name,
      hasProducts: false,
    });

    // Ensure standard plan exists
    let plan = await db.orm.public.Plan.where({ code: 'STANDARD_RETAIL' }).all().first();
    if (!plan) {
      plan = await db.orm.public.Plan.create({
        name: 'Standard Retail',
        code: 'STANDARD_RETAIL',
        price: 0,
        interval: 'MONTHLY',
      });
      await db.orm.public.PlanLimit.create({
        planId: plan.id,
        resourceCode: 'CITYMART_PRODUCTS',
        limit: 1000,
      });
    }

    // Assign active subscription to retailOrg
    await db.orm.public.Subscription.create({
      organizationId: retailOrg.id,
      planId: plan.id,
      status: 'ACTIVE',
      currentPeriodStart: toInstant(new Date()),
      currentPeriodEnd: toInstant(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
    });

    // Create retail product with 40 units stock
    const createRes = await createProduct({
      organizationId: retailOrg.id,
      name: 'Ceramic Coffee Mug',
      description: 'Durable ceramic mug 350ml',
      price: 3500,
      stockQuantity: 40,
      lowStockLevel: 5,
      unit: 'ea',
    });

    assert.equal(createRes.success, true, 'Product creation succeeded');
    assert.ok(createRes.product?.id, 'Product ID returned');
    testProduct = createRes.product;

    // Verify RetailLocationStock is synchronized for the primary location
    const locStock = await db.orm.public.RetailLocationStock.where({
      locationId: retailLocation.id,
      productId: testProduct.id,
    }).all().first();

    assert.ok(locStock, 'RetailLocationStock created for primary location');
    assert.equal(locStock.stockQuantity, 40, 'Location stock matches initial product stock quantity');

    // Verify initial RetailStockMovement recorded
    const movement = await db.orm.public.RetailStockMovement.where({
      productId: testProduct.id,
      reason: 'INITIAL_STOCK',
    }).all().first();

    assert.ok(movement, 'RetailStockMovement INITIAL_STOCK record exists');
    assert.equal(movement.delta, 40, 'Movement delta matches initial stock');
    assert.equal(movement.beforeQty, 0, 'Movement beforeQty is 0');
    assert.equal(movement.afterQty, 40, 'Movement afterQty is 40');

    // Verify hasProducts flag updated in RetailSettings
    const settings = await db.orm.public.RetailSettings.where({ organizationId: retailOrg.id }).all().first();
    assert.equal(settings?.hasProducts, true, 'RetailSettings.hasProducts flipped to true');
  });

  await t.test('2. getProducts Respects Location Stock Context', async () => {
    // Fetch products with location context
    const productsAtLoc = await getProducts(retailOrg.id, retailLocation.id);
    const itemAtLoc = productsAtLoc.find((p: any) => p.id === testProduct.id);
    assert.ok(itemAtLoc, 'Product returned by getProducts with location context');
    assert.equal(itemAtLoc.stockQuantity, 40, 'getProducts accurately reflects location stock quantity');

    // Global fetch without location context also reports stock
    const globalProducts = await getProducts(retailOrg.id);
    const globalItem = globalProducts.find((p: any) => p.id === testProduct.id);
    assert.ok(globalItem, 'Product returned by global getProducts');
    assert.equal(globalItem.stockQuantity, 40, 'Global getProducts reflects product stock');
  });

  await t.test('3. POS Register Shift & In-Store Order Stock Decrement', async () => {
    // Create register
    testRegister = await db.orm.public.RetailRegister.create({
      organizationId: retailOrg.id,
      locationId: retailLocation.id,
      name: 'Register 1',
    });

    // Open shift
    const shiftRes = await openShift({
      organizationId: retailOrg.id,
      locationId: retailLocation.id,
      registerId: testRegister.id,
      openingFloat: 10000,
    });
    assert.equal(shiftRes.success, true, 'Shift opened successfully');
    assert.equal(shiftRes.shift?.status, 'OPEN', 'Shift status is OPEN');

    // Place in-store retail order of 8 units
    const orderRes = await createRetailOrder({
      organizationId: retailOrg.id,
      locationId: retailLocation.id,
      items: [{ productId: testProduct.id, quantity: 8 }],
      paymentMethod: 'CASH',
    });

    assert.equal(orderRes.success, true, 'In-store retail order processed');
    assert.ok(orderRes.orderId, 'Order created with valid ID');

    // Verify location stock decrement (40 - 8 = 32)
    const updatedStock = await db.orm.public.RetailLocationStock.where({
      locationId: retailLocation.id,
      productId: testProduct.id,
    }).all().first();
    assert.equal(updatedStock?.stockQuantity, 32, 'Location stock decremented correctly from 40 to 32');

    // Verify sale stock movement recorded
    const saleMovement = await db.orm.public.RetailStockMovement.where({
      productId: testProduct.id,
      reason: 'SALE_PENDING',
      referenceId: orderRes.orderId,
    }).all().first();
    assert.ok(saleMovement, 'SALE_PENDING stock movement recorded for order');
    assert.equal(saleMovement.delta, -8, 'Stock movement delta is -8');
    assert.equal(saleMovement.afterQty, 32, 'Stock movement afterQty is 32');
  });

  await t.test('4. In-Store POS Prevents Overselling Out-of-Stock Quantities', async () => {
    // Try to order 100 units when only 32 remain
    const failRes = await createRetailOrder({
      organizationId: retailOrg.id,
      locationId: retailLocation.id,
      items: [{ productId: testProduct.id, quantity: 100 }],
      paymentMethod: 'CASH',
    });

    assert.ok(failRes.error, 'Oversell attempt was rejected with an error');
    assert.match(failRes.error, /Not enough stock/i, 'Error message indicates insufficient stock');

    // Verify stock remained unchanged at 32
    const currentStock = await db.orm.public.RetailLocationStock.where({
      locationId: retailLocation.id,
      productId: testProduct.id,
    }).all().first();
    assert.equal(currentStock?.stockQuantity, 32, 'Location stock remained 32');
  });

  await t.test('5. Restaurant Menu Item Creation & Primary Location Binding', async () => {
    // Register RestaurantOS organization
    const restReg = await registerRestaurantOS({
      businessName: `Calabar Kitchen ${uuidv4().slice(0, 6)}`,
      serviceStyle: 'COUNTER',
      citySlug: city.slug,
      address: '10 Ndidem Usang Iso Road, Calabar',
    });

    assert.equal(restReg.success, true, 'RestaurantOS registration succeeded');
    restOrg = await db.orm.public.Organization.where({ id: restReg.organizationId }).all().first();
    assert.ok(restOrg, 'Restaurant organization found');

    restLocation = await db.orm.public.Location.where({ organizationId: restOrg.id }).all().first();
    assert.ok(restLocation, 'Primary location provisioned during RestaurantOS registration');

    // Create menu item WITHOUT explicitly providing locationId
    testMenuItem = await createMenuItem({
      organizationId: restOrg.id,
      name: 'Edikang Ikong with Pounded Yam',
      description: 'Traditional Calabar vegetable delicacy with assorted meats',
      price: 5500,
      category: 'Soups',
    });

    assert.ok(testMenuItem.id, 'Menu item created');
    assert.equal(testMenuItem.name, 'Edikang Ikong with Pounded Yam');
    assert.equal(testMenuItem.price, 5500);
    assert.equal(testMenuItem.isAvailable, true, 'Menu item is available by default');
    assert.equal(testMenuItem.locationId, restLocation.id, 'Menu item automatically bound to primary locationId');

    // Verify RestaurantSettings.hasMenu flipped to true
    const restSettings = await db.orm.public.RestaurantSettings.where({ organizationId: restOrg.id }).all().first();
    assert.equal(restSettings?.hasMenu, true, 'RestaurantSettings.hasMenu is true');
  });

  await t.test('6. Restaurant Menu Item 86ing & Order Blockade (In-Store and Online)', async () => {
    // 1. Toggle availability to false (86'd)
    const toggleRes = await toggleMenuItemAvailability(testMenuItem.id);
    assert.equal(toggleRes.success, true, 'Availability toggle succeeded');
    assert.equal(toggleRes.isAvailable, false, 'Menu item marked unavailable (86)');

    // 2. In-store POS attempt: open shift first
    const shiftRes = await openRestaurantShift({
      organizationId: restOrg.id,
      locationId: restLocation.id,
      openingFloat: 15000,
    });
    if (!shiftRes.success) {
      console.log('restaurant shiftRes error:', shiftRes);
    }
    assert.equal(shiftRes.success, true, 'Restaurant shift opened');

    // In-store order should be blocked
    const inStoreOrderRes = await createPosOrder({
      organizationId: restOrg.id,
      locationId: restLocation.id,
      items: [{ menuItemId: testMenuItem.id, quantity: 2 }],
      paymentMethod: 'CASH',
    });
    assert.ok(inStoreOrderRes.error, 'In-store order for 86 item rejected');
    assert.match(inStoreOrderRes.error, /86'd item/i, 'Error message explicitly reports 86 item');

    // 3. Online resident takeout order should also be blocked
    await assert.rejects(
      async () => {
        await placeRestaurantOrder({
          locationId: restLocation.id,
          items: [{ menuItemId: testMenuItem.id, qty: 1, name: testMenuItem.name }],
          type: 'TAKEOUT',
        });
      },
      /Menu item is not available/i,
      'Resident online order rejected for 86 menu item'
    );

    // 4. Restore availability
    const restoreRes = await toggleMenuItemAvailability(testMenuItem.id);
    assert.equal(restoreRes.success, true, 'Availability toggle succeeded');
    assert.equal(restoreRes.isAvailable, true, 'Menu item available again');
  });

  await t.test('7. Cleanup Phase 2 Test Data', async () => {
    if (retailOrg?.id) {
      if (testProduct?.id) {
        await db.orm.public.RetailOrderItem.where({ productId: testProduct.id }).delete();
        await db.orm.public.RetailStockMovement.where({ productId: testProduct.id }).delete();
        await db.orm.public.RetailLocationStock.where({ productId: testProduct.id }).delete();
        await db.orm.public.RetailProduct.where({ id: testProduct.id }).delete();
      }
      await db.orm.public.RetailStockMovement.where({ organizationId: retailOrg.id }).delete();
      await db.orm.public.RetailLocationStock.where({ organizationId: retailOrg.id }).delete();
      await db.orm.public.RetailOrder.where({ organizationId: retailOrg.id }).delete();
      await db.orm.public.RetailSettings.where({ organizationId: retailOrg.id }).delete();
      const mems = await db.orm.public.Membership.where({ organizationId: retailOrg.id }).all();
      const memIds = mems.map(m => m.id);
      if (memIds.length > 0) {
        await db.orm.public.MembershipRole.where({ membershipId: { in: memIds } }).delete();
        await db.orm.public.MembershipLocation.where({ membershipId: { in: memIds } }).delete();
      }
      await db.orm.public.Membership.where({ organizationId: retailOrg.id }).delete();
      await db.orm.public.Subscription.where({ organizationId: retailOrg.id }).delete();
      if (testRegister?.id) {
        await db.orm.public.RetailShift.where({ registerId: testRegister.id }).delete();
        await db.orm.public.RetailRegister.where({ id: testRegister.id }).delete();
      }
      await db.orm.public.Location.where({ organizationId: retailOrg.id }).delete();
      await db.orm.public.Organization.where({ id: retailOrg.id }).delete();
    }
    if (restOrg?.id) {
      await db.orm.public.MenuItem.where({ organizationId: restOrg.id }).delete();
      await db.orm.public.RestaurantShift.where({ organizationId: restOrg.id }).delete();
      await db.orm.public.RestaurantOrder.where({ organizationId: restOrg.id }).delete();
      await db.orm.public.RestaurantSettings.where({ organizationId: restOrg.id }).delete();
      const restMemberships = await db.orm.public.Membership.where({ organizationId: restOrg.id }).all();
      const restMemIds = restMemberships.map(m => m.id);
      if (restMemIds.length > 0) {
        await db.orm.public.MembershipRole.where({ membershipId: { in: restMemIds } }).delete();
        await db.orm.public.MembershipLocation.where({ membershipId: { in: restMemIds } }).delete();
      }
      await db.orm.public.Membership.where({ organizationId: restOrg.id }).delete();
      await db.orm.public.DiscoveryListing.where({ organizationId: restOrg.id }).delete();
      await db.orm.public.Wallet.where({ organizationId: restOrg.id }).delete();
      await db.orm.public.Location.where({ organizationId: restOrg.id }).delete();
      await db.orm.public.Organization.where({ id: restOrg.id }).delete();
    }
    if (ownerPerson?.id) {
      await db.orm.public.Account.where({ personId: ownerPerson.id }).delete();
      await db.orm.public.PersonIdentifier.where({ personId: ownerPerson.id }).delete();
      await db.orm.public.Person.where({ id: ownerPerson.id }).delete();
    }
    assert.ok(true, 'Test cleanup completed cleanly');
  });
});
