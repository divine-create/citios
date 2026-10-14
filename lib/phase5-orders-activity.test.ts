import test from 'node:test';
import assert from 'node:assert';
import { db } from '../src/prisma/db';
import { v4 as uuidv4 } from 'uuid';
import { encode } from 'next-auth/jwt';
import { authOptions } from './auth';
import { fetchMyOrders, cancelMyOrder, requestMyOrderRefund } from '../app/actions/orders';
import { transitionOrderStatus } from './actions/order';
import { fetchResidentActivity, fetchResidentActivityDetail } from '../app/actions/activity';
import { fetchResidentNotifications, markNotificationsRead, countUnreadNotificationsForPerson } from './actions/resident-notifications';
import { handleFailedRetailPayment } from './actions/citypay';

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
  const email = `test-activity-${person.id.slice(0, 8)}@cityos.test`;
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
    secret: (authOptions.secret as string) || 'cityos-jwt-secret-key-2026',
  });
  return token;
}

test('Phase 5 Orders & Activity Feed Reality Test Suite', async (t) => {
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

  // 1. Setup Alice (Resident A) and Bob (Resident B)
  const alicePerson = await db.orm.public.Person.create({
    id: uuidv4(),
    firstName: 'Alice',
    lastName: 'Okonkwo',
  });
  const aliceToken = await createTestSession(alicePerson);

  const bobPerson = await db.orm.public.Person.create({
    id: uuidv4(),
    firstName: 'Bob',
    lastName: 'Adeyemi',
  });
  const bobToken = await createTestSession(bobPerson);

  // 2. Setup Merchant Owner (Store & Restaurant Staff)
  const merchantPerson = await db.orm.public.Person.create({
    id: uuidv4(),
    firstName: 'Chief',
    lastName: 'Eze',
  });
  const merchantToken = await createTestSession(merchantPerson);

  // 3. Setup Retail Organization (ShopOS)
  const retailOrg = await db.orm.public.Organization.create({
    name: `Victoria Grocers ${uuidv4().slice(0, 6)}`,
    type: 'RETAIL',
  });
  const retailLocation = await db.orm.public.Location.create({
    organizationId: retailOrg.id,
    name: 'Main Store',
    cityId: city.id,
  });
  const retailProduct = await db.orm.public.RetailProduct.create({
    organizationId: retailOrg.id,
    name: 'Fresh Palm Oil 1L',
    price: 3200,
    stockQuantity: 50,
    isWeighed: false,
    sku: `OIL-${uuidv4().slice(0, 4)}`,
  });
  await db.orm.public.RetailLocationStock.create({
    organizationId: retailOrg.id,
    locationId: retailLocation.id,
    productId: retailProduct.id,
    stockQuantity: 50,
  });

  // Assign merchant membership to retail org
  const retailMembership = await db.orm.public.Membership.create({
    personId: merchantPerson.id,
    organizationId: retailOrg.id,
  });
  await db.orm.public.MembershipRole.create({
    membershipId: retailMembership.id,
    role: 'OWNER',
  });

  // 4. Setup Restaurant Organization (RestaurantOS)
  const restaurantOrg = await db.orm.public.Organization.create({
    name: `Mama Cass Kitchen ${uuidv4().slice(0, 6)}`,
    type: 'RESTAURANT',
  });
  const restaurantLocation = await db.orm.public.Location.create({
    organizationId: restaurantOrg.id,
    name: 'Diner Branch',
    cityId: city.id,
  });
  const foodMenuItem = await db.orm.public.MenuItem.create({
    organizationId: restaurantOrg.id,
    locationId: restaurantLocation.id,
    name: 'Jollof Rice & Grilled Fish',
    category: 'Mains',
    price: 4500,
    isAvailable: true,
  });

  // Assign merchant membership to restaurant org
  const restaurantMembership = await db.orm.public.Membership.create({
    personId: merchantPerson.id,
    organizationId: restaurantOrg.id,
  });
  await db.orm.public.MembershipRole.create({
    membershipId: restaurantMembership.id,
    role: 'OWNER',
  });

  // 5. Connect Alice as customer to both businesses
  const aliceRetailRel = await db.orm.public.Relationship.create({
    personId: alicePerson.id,
    organizationId: retailOrg.id,
    type: 'CUSTOMER',
  });
  const aliceRetailCustomer = await db.orm.public.CustomerData.create({
    relationshipId: aliceRetailRel.id,
    personId: alicePerson.id,
  });

  const aliceRestaurantRel = await db.orm.public.Relationship.create({
    personId: alicePerson.id,
    organizationId: restaurantOrg.id,
    type: 'CUSTOMER',
  });
  const aliceRestaurantCustomer = await db.orm.public.CustomerData.create({
    relationshipId: aliceRestaurantRel.id,
  });

  // Active test orders
  let aliceRetailOrder: any;
  let aliceRestaurantOrder: any;

  await t.test('1. Multi-Vertical Order Placement & Aggregation (fetchMyOrders)', async () => {
    // Create Retail Order for Alice
    aliceRetailOrder = await db.orm.public.RetailOrder.create({
      organizationId: retailOrg.id,
      locationId: retailLocation.id,
      customerDataId: aliceRetailCustomer.id,
      totalAmount: 6400, // 2 bottles
      status: 'CONFIRMED',
      fulfillmentStatus: 'PROCESSING',
      paymentMethod: 'WALLET',
      cashierId: 'ONLINE',
    });
    await db.orm.public.RetailOrderItem.create({
      orderId: aliceRetailOrder.id,
      productId: retailProduct.id,
      quantity: 2,
      unitPrice: 3200,
      subtotal: 6400,
    });

    // Create Restaurant Order for Alice
    aliceRestaurantOrder = await db.orm.public.RestaurantOrder.create({
      organizationId: restaurantOrg.id,
      locationId: restaurantLocation.id,
      customerDataId: aliceRestaurantCustomer.id,
      totalAmount: 4500,
      status: 'PREPARING',
      paymentStatus: 'COMPLETED',
      type: 'TAKEOUT',
    });
    await db.orm.public.OrderItem.create({
      orderId: aliceRestaurantOrder.id,
      menuItemId: foodMenuItem.id,
      quantity: 1,
      unitPrice: 4500,
    });

    // Sign in as Alice and fetch orders
    mockCookies['next-auth.session-token'] = aliceToken;
    const ordersRes = await fetchMyOrders();

    assert.ok(ordersRes);
    assert.strictEqual(ordersRes.retail.length, 1);
    assert.strictEqual(ordersRes.restaurant.length, 1);

    // Verify retail enrichment
    const ret = ordersRes.retail[0];
    assert.strictEqual(ret.id, aliceRetailOrder.id);
    assert.strictEqual(ret.org.id, retailOrg.id);
    assert.strictEqual(ret.items.length, 1);
    assert.strictEqual(ret.items[0].product.name, 'Fresh Palm Oil 1L');
    assert.strictEqual(ret.totalAmount, 6400);

    // Verify restaurant enrichment
    const rest = ordersRes.restaurant[0];
    assert.strictEqual(rest.id, aliceRestaurantOrder.id);
    assert.strictEqual(rest.org.id, restaurantOrg.id);
    assert.strictEqual(rest.items.length, 1);
    assert.strictEqual(rest.items[0].product.name, 'Jollof Rice & Grilled Fish');
    assert.strictEqual(rest.totalAmount, 4500);
  });

  await t.test('2. Strict Cross-Tenant & IDOR Protection in Orders & Activity', async () => {
    // Switch active session to Bob
    mockCookies['next-auth.session-token'] = bobToken;

    // Bob calls fetchMyOrders — must return empty lists
    const bobsOrders = await fetchMyOrders();
    assert.strictEqual(bobsOrders.retail.length, 0);
    assert.strictEqual(bobsOrders.restaurant.length, 0);

    // Bob calls fetchResidentActivity — must not return Alice's orders
    const bobsActivity = await fetchResidentActivity();
    assert.strictEqual(bobsActivity.items.length, 0);

    // Bob tries to fetch Alice's retail order detail via IDOR
    const forbiddenDetail = await fetchResidentActivityDetail('RETAIL_ORDER', aliceRetailOrder.id);
    assert.strictEqual(forbiddenDetail, null, 'IDOR violation: Bob should not read Alice order');
  });

  await t.test('3. Resident Pending Retail Order Cancellation (cancelMyOrder)', async () => {
    // Place a pending retail order for Alice reserving 3 bottles of palm oil
    const pendingRetailOrder = await db.orm.public.RetailOrder.create({
      organizationId: retailOrg.id,
      locationId: retailLocation.id,
      customerDataId: aliceRetailCustomer.id,
      totalAmount: 9600,
      status: 'PENDING',
      fulfillmentStatus: 'UNFULFILLED',
      paymentMethod: 'CARD',
      cashierId: 'ONLINE',
    });
    await db.orm.public.RetailOrderItem.create({
      orderId: pendingRetailOrder.id,
      productId: retailProduct.id,
      quantity: 3,
      unitPrice: 3200,
      subtotal: 9600,
    });
    const pendingPayment = await db.orm.public.Payment.create({
      retailOrderId: pendingRetailOrder.id,
      amount: 9600,
      currency: 'NGN',
      status: 'PENDING',
      method: 'CARD',
      reference: `PND-${uuidv4().slice(0, 8)}`,
    });

    // Simulate inventory deduction at reservation (50 -> 47)
    await db.orm.public.RetailProduct.where({ id: retailProduct.id }).update({ stockQuantity: 47 });
    await db.orm.public.RetailLocationStock.where({ locationId: retailLocation.id }).update({ stockQuantity: 47 });

    // Alice cancels her pending order
    mockCookies['next-auth.session-token'] = aliceToken;
    const cancelRes = await cancelMyOrder(pendingRetailOrder.id, 'MARKET', 'Changed my mind');
    assert.strictEqual(cancelRes.success, true);

    // Verify order is CANCELLED
    const cancelledOrder = await db.orm.public.RetailOrder.where({ id: pendingRetailOrder.id }).all().first();
    assert.ok(cancelledOrder);
    assert.strictEqual(cancelledOrder.status, 'CANCELLED');
    assert.strictEqual(cancelledOrder.fulfillmentStatus, 'CANCELLED');

    // Verify pending payment is CANCELLED
    const cancelledPayment = await db.orm.public.Payment.where({ id: pendingPayment.id }).all().first();
    assert.ok(cancelledPayment);
    assert.strictEqual(cancelledPayment.status, 'CANCELLED');

    // Verify stock is restored (47 -> 50)
    const restoredProduct = await db.orm.public.RetailProduct.where({ id: retailProduct.id }).all().first();
    assert.ok(restoredProduct);
    assert.strictEqual(restoredProduct.stockQuantity, 50);

    // Verify Alice received cancellation notification
    const notifications = await db.orm.public.Notification.where({ personId: alicePerson.id, type: 'ORDER_CANCELLED' }).all();
    assert.ok(notifications.length >= 1);

    // Teardown pending order rows
    await db.orm.public.Payment.where({ id: pendingPayment.id }).delete();
    await db.orm.public.RetailOrderItem.where({ orderId: pendingRetailOrder.id }).delete();
    await db.orm.public.RetailOrder.where({ id: pendingRetailOrder.id }).delete();
  });

  await t.test('4. Resident Pending Food Order Cancellation (cancelMyOrder)', async () => {
    // Place a pending food order for Alice
    const pendingFoodOrder = await db.orm.public.RestaurantOrder.create({
      organizationId: restaurantOrg.id,
      locationId: restaurantLocation.id,
      customerDataId: aliceRestaurantCustomer.id,
      totalAmount: 4500,
      status: 'PENDING',
      paymentStatus: 'PENDING',
      type: 'TAKEOUT',
    });
    const pendingPayment = await db.orm.public.Payment.create({
      restaurantOrderId: pendingFoodOrder.id,
      amount: 4500,
      currency: 'NGN',
      status: 'PENDING',
      method: 'CARD',
      reference: `PND-FOOD-${uuidv4().slice(0, 8)}`,
    });

    // Alice cancels her pending food order
    mockCookies['next-auth.session-token'] = aliceToken;
    const cancelRes = await cancelMyOrder(pendingFoodOrder.id, 'FOOD', 'Ordered by mistake');
    assert.strictEqual(cancelRes.success, true);

    // Verify order is CANCELLED
    const cancelledOrder = await db.orm.public.RestaurantOrder.where({ id: pendingFoodOrder.id }).all().first();
    assert.ok(cancelledOrder);
    assert.strictEqual(cancelledOrder.status, 'CANCELLED');
    assert.strictEqual(cancelledOrder.paymentStatus, 'FAILED');

    // Teardown pending food order rows
    await db.orm.public.Payment.where({ id: pendingPayment.id }).delete();
    await db.orm.public.RestaurantOrder.where({ id: pendingFoodOrder.id }).delete();
  });

  await t.test('5. Unauthorized Order Cancellation Attempt Rejected', async () => {
    // Bob attempts to cancel Alice's confirmed order
    mockCookies['next-auth.session-token'] = bobToken;

    await assert.rejects(
      async () => {
        await cancelMyOrder(aliceRetailOrder.id, 'MARKET', 'Malicious cancellation');
      },
      /Forbidden|You do not own this order/
    );
  });

  await t.test('6. Merchant Order Status Transitions & Real-Time Resident Notifications', async () => {
    // Sign in as Merchant Owner
    mockCookies['next-auth.session-token'] = merchantToken;

    // 1. Retail order: PROCESSING -> READY
    const ret1 = await transitionOrderStatus(retailOrg.id, aliceRetailOrder.id, 'PROCESSING', 'READY');
    assert.strictEqual(ret1, 'RETAIL');

    const updatedRetailOrder = await db.orm.public.RetailOrder.where({ id: aliceRetailOrder.id }).all().first();
    assert.strictEqual(updatedRetailOrder?.fulfillmentStatus, 'READY');

    // Check Alice received ORDER_STATUS_READY notification
    const readyNotifs = await db.orm.public.Notification.where({
      personId: alicePerson.id,
      type: 'ORDER_STATUS_READY',
    }).all();
    assert.ok(readyNotifs.length >= 1);
    assert.ok(readyNotifs[0].title.includes('Ready for Pickup'));

    // 2. Retail order: READY -> FULFILLED
    const ret2 = await transitionOrderStatus(retailOrg.id, aliceRetailOrder.id, 'READY', 'FULFILLED');
    assert.strictEqual(ret2, 'RETAIL');

    const fulfilledRetailOrder = await db.orm.public.RetailOrder.where({ id: aliceRetailOrder.id }).all().first();
    assert.strictEqual(fulfilledRetailOrder?.fulfillmentStatus, 'FULFILLED');

    // 3. Restaurant order: PREPARING -> READY
    const rest1 = await transitionOrderStatus(restaurantOrg.id, aliceRestaurantOrder.id, 'PROCESSING', 'READY');
    assert.strictEqual(rest1, 'RESTAURANT');

    const updatedRestaurantOrder = await db.orm.public.RestaurantOrder.where({ id: aliceRestaurantOrder.id }).all().first();
    assert.strictEqual(updatedRestaurantOrder?.status, 'READY');

    // 4. Restaurant order: READY -> COMPLETED
    const rest2 = await transitionOrderStatus(restaurantOrg.id, aliceRestaurantOrder.id, 'READY', 'FULFILLED');
    assert.strictEqual(rest2, 'RESTAURANT');

    const completedRestaurantOrder = await db.orm.public.RestaurantOrder.where({ id: aliceRestaurantOrder.id }).all().first();
    assert.strictEqual(completedRestaurantOrder?.status, 'COMPLETED');

    // 5. Unauthorized merchant attempt: Bob trying to transition retail org order
    mockCookies['next-auth.session-token'] = bobToken;
    await assert.rejects(
      async () => {
        await transitionOrderStatus(retailOrg.id, aliceRetailOrder.id, 'FULFILLED', 'REFUNDED');
      },
      /Unauthorized|Forbidden/i
    );
  });

  await t.test('7. Resident Unified Activity Feed (fetchResidentActivity & detail)', async () => {
    // Sign back in as Alice
    mockCookies['next-auth.session-token'] = aliceToken;

    const activity = await fetchResidentActivity();
    assert.ok(activity);
    assert.ok(activity.items.length >= 2);

    // Verify retail order item
    const retailItem = activity.items.find((i: any) => i.sourceId === aliceRetailOrder.id);
    assert.ok(retailItem);
    assert.strictEqual(retailItem.merchantName, retailOrg.name);
    assert.strictEqual(retailItem.amount, 6400);

    // Verify detail page query
    const retailDetail = await fetchResidentActivityDetail('RETAIL_ORDER', aliceRetailOrder.id);
    assert.ok(retailDetail);
    assert.strictEqual(retailDetail.merchantName, retailOrg.name);
    assert.strictEqual(retailDetail.amount, 6400);
    assert.strictEqual(retailDetail.lines.length, 1);
    assert.strictEqual(retailDetail.lines[0].name, 'Fresh Palm Oil 1L');
  });

  await t.test('8. Resident Notifications Feed & Read Status Management', async () => {
    mockCookies['next-auth.session-token'] = aliceToken;

    const notifPage = await fetchResidentNotifications({ limit: 20 });
    assert.ok(notifPage);
    assert.ok(notifPage.items.length > 0);

    const unreadBefore = await countUnreadNotificationsForPerson(alicePerson.id);
    assert.ok(unreadBefore > 0);

    // Mark the first notification as read
    const targetNotif = notifPage.items[0];
    await markNotificationsRead([targetNotif.id]);

    const unreadAfter = await countUnreadNotificationsForPerson(alicePerson.id);
    assert.strictEqual(unreadAfter, unreadBefore - 1);
  });

  await t.test('9. Resident Refund Request Flow (requestMyOrderRefund)', async () => {
    mockCookies['next-auth.session-token'] = aliceToken;

    const refundRes = await requestMyOrderRefund(aliceRetailOrder.id, 'MARKET', 'Bottle seal arrived broken');
    assert.strictEqual(refundRes.success, true);

    const reloadedOrder = await db.orm.public.RetailOrder.where({ id: aliceRetailOrder.id }).all().first();
    assert.ok(reloadedOrder);
    assert.strictEqual(reloadedOrder.refundReason, 'Bottle seal arrived broken');

    // Verify notification was sent
    const refundNotifs = await db.orm.public.Notification.where({
      personId: alicePerson.id,
      type: 'REFUND_REQUESTED',
    }).all();
    assert.ok(refundNotifs.length >= 1);

    // Clean up test data in strict foreign-key dependency order
    await db.orm.public.Notification.where({ personId: alicePerson.id }).delete();
    await db.orm.public.Notification.where({ personId: bobPerson.id }).delete();
    await db.orm.public.Notification.where({ personId: merchantPerson.id }).delete();

    // Clean up all orders for retailOrg
    const allRetOrders = await db.orm.public.RetailOrder.where({ organizationId: retailOrg.id }).all();
    for (const ro of allRetOrders) {
      const pmts = await db.orm.public.Payment.where({ retailOrderId: ro.id }).all();
      for (const p of pmts) {
        await db.orm.public.PaymentEvent.where({ paymentId: p.id }).delete();
        await db.orm.public.Payment.where({ id: p.id }).delete();
      }
      await db.orm.public.RetailOrderItem.where({ orderId: ro.id }).delete();
      await db.orm.public.RetailOrder.where({ id: ro.id }).delete();
    }

    // Clean up all orders for restaurantOrg
    const allRestOrders = await db.orm.public.RestaurantOrder.where({ organizationId: restaurantOrg.id }).all();
    for (const ro of allRestOrders) {
      const pmts = await db.orm.public.Payment.where({ restaurantOrderId: ro.id }).all();
      for (const p of pmts) {
        await db.orm.public.PaymentEvent.where({ paymentId: p.id }).delete();
        await db.orm.public.Payment.where({ id: p.id }).delete();
      }
      await db.orm.public.OrderItem.where({ orderId: ro.id }).delete();
      await db.orm.public.RestaurantOrder.where({ id: ro.id }).delete();
    }

    // Delete customer data and relationships
    await db.orm.public.CustomerData.where({ id: aliceRetailCustomer.id }).delete();
    await db.orm.public.CustomerData.where({ id: aliceRestaurantCustomer.id }).delete();
    await db.orm.public.Relationship.where({ id: aliceRetailRel.id }).delete();
    await db.orm.public.Relationship.where({ id: aliceRestaurantRel.id }).delete();

    // Delete memberships
    await db.orm.public.MembershipRole.where({ membershipId: retailMembership.id }).delete();
    await db.orm.public.Membership.where({ id: retailMembership.id }).delete();
    await db.orm.public.MembershipRole.where({ membershipId: restaurantMembership.id }).delete();
    await db.orm.public.Membership.where({ id: restaurantMembership.id }).delete();

    // Delete catalog items and stock
    await db.orm.public.RetailStockMovement.where({ organizationId: retailOrg.id }).delete();
    await db.orm.public.RetailLocationStock.where({ locationId: retailLocation.id }).delete();
    await db.orm.public.RetailProduct.where({ id: retailProduct.id }).delete();
    await db.orm.public.Location.where({ id: retailLocation.id }).delete();
    await db.orm.public.Organization.where({ id: retailOrg.id }).delete();

    await db.orm.public.MenuItem.where({ id: foodMenuItem.id }).delete();
    await db.orm.public.Location.where({ id: restaurantLocation.id }).delete();
    await db.orm.public.Organization.where({ id: restaurantOrg.id }).delete();

    // Delete persons
    await db.orm.public.Account.where({ personId: alicePerson.id }).delete();
    await db.orm.public.PersonIdentifier.where({ personId: alicePerson.id }).delete();
    await db.orm.public.Person.where({ id: alicePerson.id }).delete();

    await db.orm.public.Account.where({ personId: bobPerson.id }).delete();
    await db.orm.public.PersonIdentifier.where({ personId: bobPerson.id }).delete();
    await db.orm.public.Person.where({ id: bobPerson.id }).delete();

    await db.orm.public.Account.where({ personId: merchantPerson.id }).delete();
    await db.orm.public.PersonIdentifier.where({ personId: merchantPerson.id }).delete();
    await db.orm.public.Person.where({ id: merchantPerson.id }).delete();
  });
});
