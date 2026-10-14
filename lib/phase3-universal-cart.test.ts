import test from 'node:test';
import assert from 'node:assert';
import { createRequire } from 'module';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/src/prisma/db';
import { authOptions } from '@/lib/auth';
import { encode } from 'next-auth/jwt';
import { getVoiceCart, addVoiceCartItem, updateVoiceCartQuantity, removeVoiceCartItem, prepareVoiceCheckout, clearVoiceCart } from '@/lib/voice/cart';
import { fetchUserCart, addCartItemAction, removeCartItemAction, updateCartItemQuantityAction } from '@/app/actions/cart';
import { processMerchantCheckout } from '@/app/actions/checkout';

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
  const email = `test-cart-${person.id.slice(0, 8)}@cityos.test`;
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

test('Phase 3 Universal Cart & Multi-Item Ordering Reality Test Suite', async (t) => {
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

  // Create resident person
  const residentPerson = await db.orm.public.Person.create({
    id: uuidv4(),
    firstName: 'Universal',
    lastName: 'Shopper',
  });
  await db.orm.public.PersonIdentifier.create({
    personId: residentPerson.id,
    type: 'PHONE',
    normalizedValue: `+234803${Math.floor(1000000 + Math.random() * 9000000)}`,
    isVerified: true,
  });
  const residentToken = await createTestSession(residentPerson);
  mockCookies['next-auth.session-token'] = residentToken;

  // Provision Resident Wallet with 100,000 NGN balance for testing
  let residentWallet = await db.orm.public.Wallet.where({ personId: residentPerson.id, currency: 'NGN' }).all().first();
  if (!residentWallet) {
    residentWallet = await db.orm.public.Wallet.create({
      personId: residentPerson.id,
      currency: 'NGN',
      balance: 100000,
    });
  }

  // 1. Create Retail Merchant (ShopOS)
  const retailOrg = await db.orm.public.Organization.create({
    name: `CityMart Mega ${uuidv4().slice(0, 6)}`,
    type: 'RETAIL',
  });
  const retailLocation = await db.orm.public.Location.create({
    organizationId: retailOrg.id,
    name: 'Main Store',
    cityId: city.id,
  });
  const retailProduct = await db.orm.public.RetailProduct.create({
    organizationId: retailOrg.id,
    name: 'Artisan Sourdough Loaf',
    price: 3500,
    stockQuantity: 10,
    isWeighed: false,
    sku: `BREAD-${uuidv4().slice(0, 4)}`,
  });
  await db.orm.public.RetailLocationStock.create({
    organizationId: retailOrg.id,
    locationId: retailLocation.id,
    productId: retailProduct.id,
    stockQuantity: 10,
  });

  // 2. Create Restaurant Merchant (RestaurantOS)
  const restaurantOrg = await db.orm.public.Organization.create({
    name: `Calabar Kitchen ${uuidv4().slice(0, 6)}`,
    type: 'RESTAURANT',
  });
  const restaurantLocation = await db.orm.public.Location.create({
    organizationId: restaurantOrg.id,
    name: 'Flagship Bistro',
    cityId: city.id,
  });
  const foodMenuItem = await db.orm.public.MenuItem.create({
    organizationId: restaurantOrg.id,
    locationId: restaurantLocation.id,
    name: 'Afang Soup & Pounded Yam',
    category: 'Mains',
    price: 5500,
    isAvailable: true,
  });

  // 3. Create ServiceOS Provider
  const serviceOrg = await db.orm.public.Organization.create({
    name: `ProClean Services ${uuidv4().slice(0, 6)}`,
    type: 'SERVICES',
  });
  const serviceItem = await db.orm.public.ServiceCatalogItem.create({
    organizationId: serviceOrg.id,
    name: 'Premium Deep Home Cleaning',
    price: 25000,
    durationMinutes: 180,
  });

  await t.test('1. Universal Cart Multi-Item Ingestion & Stock Guardrails', async () => {
    // Adding more than stockQuantity should throw an Insufficient stock error
    await assert.rejects(
      async () => {
        await addVoiceCartItem(residentPerson.id, retailProduct.id, 15, 'retail');
      },
      (err: any) => {
        assert.match(err.message, /insufficient stock/i);
        return true;
      }
    );

    // Adding valid quantity succeeds
    const cartRes = await addVoiceCartItem(residentPerson.id, retailProduct.id, 2, 'retail');
    assert.strictEqual(cartRes.subtotal, 7000);
    assert.strictEqual(cartRes.cart.items.length, 1);

    // fetchUserCart server action should map line item with authoritative DB data
    const userCart = await fetchUserCart();
    assert.ok(userCart);
    assert.strictEqual(userCart.lines.length, 1);
    const line = userCart.lines[0];
    assert.strictEqual(line.productId, retailProduct.id);
    assert.strictEqual(line.name, 'Artisan Sourdough Loaf');
    assert.strictEqual(line.price, 3500);
    assert.strictEqual(line.qty, 2);
    assert.strictEqual(line.orgId, retailOrg.id);
    assert.strictEqual(line.isAvailable, true);
  });

  await t.test('2. Restaurant Menu Item Ingestion & 86 Availability Toggle', async () => {
    // Add restaurant dish to universal cart
    const cartRes = await addVoiceCartItem(residentPerson.id, foodMenuItem.id, 1, 'food');
    assert.strictEqual(cartRes.subtotal, 7000 + 5500);
    assert.strictEqual(cartRes.cart.items.length, 2);

    // 86 the dish (toggle availability to false)
    await db.orm.public.MenuItem.where({ id: foodMenuItem.id }).update({ isAvailable: false });

    // Attempting to add an 86'd dish must be firmly rejected
    await assert.rejects(
      async () => {
        await addVoiceCartItem(residentPerson.id, foodMenuItem.id, 1, 'food');
      },
      (err: any) => {
        assert.match(err.message, /unavailable/i);
        return true;
      }
    );

    // fetchUserCart must surface isAvailable: false for the existing dish in cart
    const userCart = await fetchUserCart();
    assert.ok(userCart);
    const dishLine = userCart.lines.find(l => l.productId === foodMenuItem.id);
    assert.ok(dishLine);
    assert.strictEqual(dishLine.isAvailable, false);

    // prepareVoiceCheckout must reject checkout when an unavailable dish is in cart
    await assert.rejects(
      async () => {
        await prepareVoiceCheckout(residentPerson.id);
      },
      (err: any) => {
        assert.match(err.message, /currently unavailable/i);
        return true;
      }
    );

    // Re-enable dish availability
    await db.orm.public.MenuItem.where({ id: foodMenuItem.id }).update({ isAvailable: true });
    const readyCheckout = await prepareVoiceCheckout(residentPerson.id);
    assert.ok(readyCheckout.checkoutId);
  });

  await t.test('3. Service Item (ServiceOS) Quote Ingestion & Persistence', async () => {
    // Add service item to universal cart
    await addVoiceCartItem(residentPerson.id, serviceItem.id, 1, 'service');

    // Verify persistence in PostgreSQL voiceCartItem table with sourceType and sourceId
    const itemInDb = await db.orm.public.CartItem.where({
      sourceId: serviceItem.id,
      sourceType: 'SERVICE',
    }).all().first();
    assert.ok(itemInDb);
    assert.strictEqual(itemInDb.kind, 'service');
    assert.strictEqual(itemInDb.quantity, 1);

    // fetchUserCart server action maps service item with provider info
    const userCart = await fetchUserCart();
    assert.ok(userCart);
    const serviceLine = userCart.lines.find(l => l.productId === serviceItem.id);
    assert.ok(serviceLine);
    assert.strictEqual(serviceLine.name, 'Premium Deep Home Cleaning');
    assert.strictEqual(serviceLine.orgId, serviceOrg.id);
    assert.strictEqual(serviceLine.orgName, serviceOrg.name);
    assert.strictEqual(serviceLine.isAvailable, true);

    // Process checkout for the service provider
    const checkoutRes = await processMerchantCheckout(serviceOrg.id, 'wallet', `svc_chk_${Date.now()}`);
    assert.strictEqual(checkoutRes.success, true);
    assert.match(checkoutRes.message || '', /Service requests submitted/i);

    // Verify ServiceJob was created with status NEW
    const serviceJob = await db.orm.public.ServiceJob.where({
      organizationId: serviceOrg.id,
      serviceId: serviceItem.id,
    }).all().first();
    assert.ok(serviceJob);
    assert.strictEqual(serviceJob.status, 'NEW');

    // Verify service item was removed from cart upon successful request
    const cartAfterSvc = await fetchUserCart();
    assert.ok(cartAfterSvc);
    assert.strictEqual(cartAfterSvc.lines.some(l => l.productId === serviceItem.id), false);
  });

  await t.test('4. Multi-Merchant Cart Isolation & Independent Checkout', async () => {
    // Cart currently contains Retail (Merchant A) and Food (Merchant B)
    const currentCart = await fetchUserCart();
    assert.ok(currentCart);
    assert.strictEqual(currentCart.lines.length, 2);

    const retailLine = currentCart.lines.find(l => l.orgId === retailOrg.id);
    const foodLine = currentCart.lines.find(l => l.orgId === restaurantOrg.id);
    assert.ok(retailLine);
    assert.ok(foodLine);

    // Execute checkout exclusively for Merchant A (Retail) via Wallet
    const checkoutA = await processMerchantCheckout(retailOrg.id, 'wallet', `ret_chk_${Date.now()}`);
    assert.strictEqual(checkoutA.success, true);

    // Verify RetailOrder was created
    const createdRetailOrder = await db.orm.public.RetailOrder.where({
      organizationId: retailOrg.id,
    }).all().first();
    assert.ok(createdRetailOrder);

    // Verify Merchant A's items are removed, Merchant B's items remain untouched in cart
    const cartAfterRetail = await fetchUserCart();
    assert.ok(cartAfterRetail);
    assert.strictEqual(cartAfterRetail.lines.length, 1);
    assert.strictEqual(cartAfterRetail.lines[0].orgId, restaurantOrg.id);
    assert.strictEqual(cartAfterRetail.lines[0].productId, foodMenuItem.id);
  });

  await t.test('5. Cart Item Quantity Mutations & Complete Teardown', async () => {
    // Update quantity of restaurant dish
    await updateVoiceCartQuantity(residentPerson.id, foodMenuItem.id, 3, 'food');
    let userCart = await fetchUserCart();
    assert.ok(userCart);
    assert.strictEqual(userCart.lines[0].qty, 3);

    // Reducing quantity to 0 removes the item
    await updateVoiceCartQuantity(residentPerson.id, foodMenuItem.id, 0, 'food');
    userCart = await fetchUserCart();
    assert.ok(userCart);
    assert.strictEqual(userCart.lines.length, 0);

    // Clear cart
    await clearVoiceCart(residentPerson.id);

    // Clean up test data in strict foreign-key order
    const cart = await db.orm.public.Cart.where({ personId: residentPerson.id }).all().first();
    if (cart) {
      await db.orm.public.CartCheckout.where({ cartId: cart.id }).delete();
      await db.orm.public.CartItem.where({ cartId: cart.id }).delete();
      await db.orm.public.Cart.where({ id: cart.id }).delete();
    }

    // 1. Clean up Retail Orders, payments, stock movements first before CustomerData
    const retOrders = await db.orm.public.RetailOrder.where({ organizationId: retailOrg.id }).all();
    for (const ro of retOrders) {
      await db.orm.public.Payment.where({ retailOrderId: ro.id }).delete();
      await db.orm.public.RetailOrderItem.where({ orderId: ro.id }).delete();
      await db.orm.public.RetailOrder.where({ id: ro.id }).delete();
    }
    await db.orm.public.RetailStockMovement.where({ organizationId: retailOrg.id }).delete();
    await db.orm.public.RetailLocationStock.where({ locationId: retailLocation.id }).delete();
    await db.orm.public.RetailProduct.where({ id: retailProduct.id }).delete();
    await db.orm.public.Location.where({ id: retailLocation.id }).delete();
    const retWallet = await db.orm.public.Wallet.where({ organizationId: retailOrg.id }).all().first();
    if (retWallet) {
      const le = await db.orm.public.LedgerEntry.where({ walletId: retWallet.id }).all();
      for (const e of le) await db.orm.public.LedgerEntry.where({ id: e.id }).delete();
      await db.orm.public.Wallet.where({ id: retWallet.id }).delete();
    }
    await db.orm.public.Organization.where({ id: retailOrg.id }).delete();

    // 2. Clean up ServiceJob and ServiceCatalogItem
    const jobs = await db.orm.public.ServiceJob.where({ organizationId: serviceOrg.id }).all();
    for (const j of jobs) await db.orm.public.ServiceJob.where({ id: j.id }).delete();
    await db.orm.public.ServiceCatalogItem.where({ id: serviceItem.id }).delete();
    await db.orm.public.Organization.where({ id: serviceOrg.id }).delete();

    // 3. Clean up Relationships & CustomerData
    const rels = await db.orm.public.Relationship.where({ personId: residentPerson.id }).all();
    for (const r of rels) {
      const custs = await db.orm.public.CustomerData.where({ relationshipId: r.id }).all();
      for (const c of custs) await db.orm.public.CustomerData.where({ id: c.id }).delete();
      await db.orm.public.Relationship.where({ id: r.id }).delete();
    }

    // 4. Clean up Restaurant
    await db.orm.public.MenuItem.where({ id: foodMenuItem.id }).delete();
    await db.orm.public.Location.where({ id: restaurantLocation.id }).delete();
    const restWallet = await db.orm.public.Wallet.where({ organizationId: restaurantOrg.id }).all().first();
    if (restWallet) {
      const le = await db.orm.public.LedgerEntry.where({ walletId: restWallet.id }).all();
      for (const e of le) await db.orm.public.LedgerEntry.where({ id: e.id }).delete();
      await db.orm.public.Wallet.where({ id: restWallet.id }).delete();
    }
    await db.orm.public.Organization.where({ id: restaurantOrg.id }).delete();

    // 5. Clean up resident person and wallet
    const resLedgers = await db.orm.public.LedgerEntry.where({ walletId: residentWallet.id }).all();
    for (const le of resLedgers) await db.orm.public.LedgerEntry.where({ id: le.id }).delete();
    await db.orm.public.Wallet.where({ id: residentWallet.id }).delete();
    await db.orm.public.Account.where({ personId: residentPerson.id }).delete();
    await db.orm.public.PersonIdentifier.where({ personId: residentPerson.id }).delete();
    await db.orm.public.Person.where({ id: residentPerson.id }).delete();
  });
});
