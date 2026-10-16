import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../src/prisma/db';
import { v4 as uuidv4 } from 'uuid';
import { encode } from 'next-auth/jwt';
import { authOptions } from './auth';
import { addVoiceCartItem, clearVoiceCart } from './voice/cart';
import { processMerchantCheckout } from '../app/actions/checkout';
import { fetchMyOrderById, acceptOrderByMerchant } from '../app/actions/orders';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const nextHeaders = require('next/headers');
const mockCookies: Record<string, string> = {};
nextHeaders.headers = () => new Map();
nextHeaders.cookies = () => ({
  get: (name: string) => (mockCookies[name] ? { name, value: mockCookies[name] } : undefined),
  getAll: () => Object.entries(mockCookies).map(([name, value]) => ({ name, value })),
  has: (name: string) => Boolean(mockCookies[name]),
});

async function setSessionForPerson(person: any) {
  const email = `wa-test-${person.id.slice(0, 8)}@cityos.test`;
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

  const cookieName = process.env.NODE_ENV === 'production' 
    ? '__Secure-next-auth.session-token' 
    : 'next-auth.session-token';
  mockCookies[cookieName] = token;
}

test('WhatsApp Checkout End-to-End Integration Suite', async (t) => {
  // 1. Setup Test Person (Resident)
  const resident = await db.orm.public.Person.create({
    firstName: 'Emeka',
    lastName: 'Okon',
  });

  await db.orm.public.ResidentProfile.create({
    personId: resident.id,
    phone: '08098765432',
    defaultDeliveryAddress: '15 Target Road, Calabar',
  });

  // 2. Setup Test Merchant Person & Org
  const merchantPerson = await db.orm.public.Person.create({
    firstName: 'Effiong',
    lastName: 'Kitchen',
  });

  const org = await db.orm.public.Organization.create({
    name: 'Calabar Fisherman Spot',
    type: 'RESTAURANT',
    status: 'ACTIVE',
  });

  const location = await db.orm.public.Location.create({
    organizationId: org.id,
    name: 'Marina Road Branch',
    address: 'Marina Resort, Calabar',
  });

  // Link merchant staff membership
  await db.orm.public.Membership.create({
    organizationId: org.id,
    personId: merchantPerson.id,
  });

  // Register Merchant WhatsApp Contact Point
  await db.orm.public.OrganizationContactPoint.create({
    organizationId: org.id,
    type: 'WHATSAPP',
    value: '08023456789',
    isPrimary: true,
  });

  // Create Menu Item
  const dish = await db.orm.public.MenuItem.create({
    organizationId: org.id,
    name: 'Fresh Fisherman Soup',
    category: 'Soups',
    price: 6500,
    isAvailable: true,
  });

  await t.test('1. Resident initiates WhatsApp Checkout with Authoritative DB Hold', async () => {
    await setSessionForPerson(resident);
    await clearVoiceCart(resident.id);

    // Add 2 fisherman soups (13,000 NGN)
    await addVoiceCartItem(resident.id, dish.id, 2, 'food');

    const idempotencyKey = `wa_chk_${Date.now()}`;
    const checkoutRes = await processMerchantCheckout(
      org.id,
      'whatsapp',
      idempotencyKey,
      location.id,
      {
        customerPhone: '08098765432',
        deliveryAddress: '15 Target Road, Calabar',
        deliveryNotes: 'Opposite State Library',
        substitutionPreference: 'call',
      }
    );

    assert.strictEqual(checkoutRes.success, true);
    assert.ok(checkoutRes.orderId, 'Expected placed order ID');
    assert.ok(checkoutRes.whatsappUrl, 'Expected WhatsApp deep link');

    // Verify WhatsApp URL structure
    assert.match(checkoutRes.whatsappUrl, /^https:\/\/wa\.me\/2348023456789\?text=/);

    // Decode message and verify contents
    const decodedMessage = decodeURIComponent(checkoutRes.whatsappUrl.split('?text=')[1]);
    assert.match(decodedMessage, /NEW CITYOS ORDER/i);
    assert.match(decodedMessage, /Calabar Fisherman Spot/);
    assert.match(decodedMessage, /Emeka Okon/);
    assert.match(decodedMessage, /15 Target Road, Calabar/);
    assert.match(decodedMessage, /Fresh Fisherman Soup/);
    assert.match(decodedMessage, /13,000/);
    assert.match(decodedMessage, /orders\//);

    // Verify order in database
    const order = await db.orm.public.RestaurantOrder.where({ id: checkoutRes.orderId }).all().first();
    assert.ok(order);
    assert.strictEqual(order.totalAmount, 13000);
    assert.strictEqual(order.status, 'PENDING');
    assert.strictEqual(order.paymentMethod, 'WHATSAPP');

    // Verify payment record in database
    const payment = await db.orm.public.Payment.where({ restaurantOrderId: order.id }).all().first();
    assert.ok(payment);
    assert.strictEqual(payment.method, 'WHATSAPP');
    assert.strictEqual(payment.status, 'PENDING');
  });

  await t.test('2. Merchant verifies and accepts order via 1-Click Action', async () => {
    // Look up the order created in test 1
    const order = await db.orm.public.RestaurantOrder.where({ organizationId: org.id }).all().first();
    assert.ok(order);

    // Merchant logs in
    await setSessionForPerson(merchantPerson);

    // Merchant fetches order details
    const orderDetails = await fetchMyOrderById(order.id);
    assert.ok(orderDetails);
    assert.strictEqual(orderDetails.isMerchantStaff, true);
    assert.strictEqual(orderDetails.totalAmount, 13000);

    // Merchant clicks "Accept Order & Start Preparation"
    const acceptRes = await acceptOrderByMerchant(order.id, 'FOOD');
    assert.strictEqual(acceptRes.success, true);

    // Verify order transitioned to PREPARING and payment to COMPLETED
    const updatedOrder = await db.orm.public.RestaurantOrder.where({ id: order.id }).all().first();
    assert.ok(updatedOrder);
    assert.strictEqual(updatedOrder.status, 'PREPARING');
    assert.strictEqual(updatedOrder.paymentStatus, 'COMPLETED');
  });
});
