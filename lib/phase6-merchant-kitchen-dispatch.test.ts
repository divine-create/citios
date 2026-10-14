import test from 'node:test';
import assert from 'node:assert';
import { db } from '../src/prisma/db';
import { v4 as uuidv4 } from 'uuid';
import { encode } from 'next-auth/jwt';
import { authOptions } from './auth';
import {
  createTable,
  updateTableStatus,
  getTables,
  openShift,
  closeShift,
  getActiveShift,
  createPosOrder,
  getKitchenTickets,
  updateOrderItemStatus,
  updateOrderStatus,
} from './actions/restaurantos';
import { updateFulfillmentStatus } from './actions/retail';

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

async function createTestSession(person: any) {
  const email = `test-p6-${person.id.slice(0, 8)}@cityos.test`;
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

test('Phase 6 Merchant Kitchen & Dispatch Reality Integration Suite', async (t) => {
  // Ensure test city exists
  let city = await db.orm.public.City.where({ slug: 'calabar' }).all().first();
  if (!city) {
    city = await db.orm.public.City.create({
      name: 'Calabar',
      slug: 'calabar',
      country: 'Nigeria',
      isActive: true,
    });
  }

  // 1. Create restaurant organization & owner
  const ownerPerson = await db.orm.public.Person.create({
    id: uuidv4(),
    firstName: 'Chef',
    lastName: 'Gusteau',
  });
  const ownerToken = await createTestSession(ownerPerson);

  const restOrg = await db.orm.public.Organization.create({
    name: `Gusteau Kitchen ${uuidv4().slice(0, 6)}`,
    type: 'RESTAURANT',
  });

  const restLocation = await db.orm.public.Location.create({
    organizationId: restOrg.id,
    name: 'Main Dining Hall',
    cityId: city.id,
  });

  const ownerMembership = await db.orm.public.Membership.create({
    organizationId: restOrg.id,
    personId: ownerPerson.id,
  });

  await db.orm.public.MembershipRole.create({
    membershipId: ownerMembership.id,
    role: 'OWNER',
  });

  await db.orm.public.RestaurantSettings.create({
    organizationId: restOrg.id,
    serviceStyle: 'HYBRID',
    hasTables: true,
    nextOrderNumber: 101,
  });

  // Create menu item
  const menuItem = await db.orm.public.MenuItem.create({
    organizationId: restOrg.id,
    name: 'Ratatouille Deluxe',
    category: 'Mains',
    price: 3500,
    isAvailable: true,
    kitchenStation: 'Hot Line',
  });

  // Create secondary unrelated tenant (for cross-tenant checks)
  const outsiderPerson = await db.orm.public.Person.create({
    id: uuidv4(),
    firstName: 'Outsider',
    lastName: 'Tenant',
  });
  const outsiderToken = await createTestSession(outsiderPerson);

  const outsiderOrg = await db.orm.public.Organization.create({
    name: `Other Diner ${uuidv4().slice(0, 6)}`,
    type: 'RESTAURANT',
  });
  const outsiderMembership = await db.orm.public.Membership.create({
    organizationId: outsiderOrg.id,
    personId: outsiderPerson.id,
  });
  await db.orm.public.MembershipRole.create({
    membershipId: outsiderMembership.id,
    role: 'OWNER',
  });

  // Track created records for teardown
  let createdTableId: string | null = null;
  let createdShiftId: string | null = null;
  let createdOrderId: string | null = null;

  await t.test('1. Table Management: creation with locationId and seat capacity', async () => {
    mockCookies['next-auth.session-token'] = ownerToken;

    const table = await createTable({
      organizationId: restOrg.id,
      locationId: restLocation.id,
      name: 'Table 12',
      seats: 6,
    });

    assert.ok(table.id, 'Table should be created with an ID');
    assert.strictEqual(table.name, 'Table 12');
    assert.strictEqual(table.seats, 6);
    assert.strictEqual(table.status, 'available');
    assert.strictEqual(table.locationId, restLocation.id);
    createdTableId = table.id;

    // Verify getTables with location filtering
    const tables = await getTables(restOrg.id, restLocation.id);
    assert.ok(tables.some((t: any) => t.id === createdTableId), 'Table should appear in location tables');
  });

  await t.test('2. Table Status Transitions & Tenancy Isolation', async () => {
    assert.ok(createdTableId);

    // Outsider cannot update table status
    mockCookies['next-auth.session-token'] = outsiderToken;
    const forbiddenRes = await updateTableStatus(createdTableId, 'reserved');
    assert.ok(forbiddenRes.error, 'Outsider must be forbidden from updating table status');

    // Authorized owner can update table status
    mockCookies['next-auth.session-token'] = ownerToken;
    const successRes = await updateTableStatus(createdTableId, 'reserved');
    assert.strictEqual(successRes.success, true);

    const updated = await db.orm.public.RestaurantTable.where({ id: createdTableId }).all().first();
    assert.strictEqual(updated.status, 'reserved');

    // Reset back to available
    await updateTableStatus(createdTableId, 'available');
  });

  await t.test('3. POS Shifts: opening validation & concurrency guard', async () => {
    mockCookies['next-auth.session-token'] = ownerToken;

    // Reject negative opening float
    const negRes = await openShift({
      organizationId: restOrg.id,
      locationId: restLocation.id,
      openingFloat: -500,
    });
    assert.ok(negRes.error, 'Negative opening float must be rejected');

    // Valid shift open
    const openRes = await openShift({
      organizationId: restOrg.id,
      locationId: restLocation.id,
      openingFloat: 10000,
    });
    assert.strictEqual(openRes.success, true);
    assert.ok(openRes.shift.id);
    createdShiftId = openRes.shift.id;

    // Concurrent duplicate shift rejection
    const dupRes = await openShift({
      organizationId: restOrg.id,
      locationId: restLocation.id,
      openingFloat: 5000,
    });
    assert.ok(dupRes.error, 'Cannot open duplicate active shift for the same location');

    // Verify getActiveShift
    const active = await getActiveShift(restOrg.id, restLocation.id);
    assert.strictEqual(active.shift.id, createdShiftId);
    assert.strictEqual(active.shift.status, 'OPEN');
  });

  await t.test('4. KDS Order Ingestion: table occupation & ticket enrichment', async () => {
    mockCookies['next-auth.session-token'] = ownerToken;
    assert.ok(createdTableId);

    const posRes = await createPosOrder({
      organizationId: restOrg.id,
      locationId: restLocation.id,
      tableId: createdTableId,
      type: 'DINE_IN',
      paymentMethod: 'CASH',
      items: [
        {
          menuItemId: menuItem.id,
          quantity: 2,
          notes: 'Extra crispy',
        },
      ],
    });

    assert.strictEqual(posRes.success, true);
    assert.ok(posRes.orderId);
    createdOrderId = posRes.orderId;

    // Verify table is automatically marked OCCUPIED
    const table = await db.orm.public.RestaurantTable.where({ id: createdTableId }).all().first();
    assert.strictEqual(table.status, 'occupied', 'Table must transition to occupied when dine-in order is placed');

    // Verify KDS kitchen ticket ingestion
    const tickets = await getKitchenTickets(restOrg.id, restLocation.id);
    const myTicket = tickets.find((t: any) => t.id === createdOrderId);
    assert.ok(myTicket, 'KDS ticket must exist for newly created order');
    assert.strictEqual(myTicket.tableName, 'Table 12', 'KDS ticket should display table name');
    assert.strictEqual(myTicket.items.length, 1);
    assert.strictEqual(myTicket.items[0].itemName, 'Ratatouille Deluxe');
    assert.strictEqual(myTicket.items[0].kitchenStation, 'Hot Line');
    assert.strictEqual(myTicket.items[0].kitchenStatus, 'PENDING');
  });

  await t.test('5. KDS Bump Workflow & Item/Order Status Rollup', async () => {
    mockCookies['next-auth.session-token'] = ownerToken;
    assert.ok(createdOrderId);

    const orderItems = await db.orm.public.OrderItem.where({ orderId: createdOrderId }).all();
    assert.strictEqual(orderItems.length, 1);
    const lineItem = orderItems[0];

    // Bump item to PREPARING
    const prepRes = await updateOrderItemStatus(createdOrderId, lineItem.id, 'PREPARING');
    assert.strictEqual(prepRes.success, true);

    let order = await db.orm.public.RestaurantOrder.where({ id: createdOrderId }).all().first();
    assert.strictEqual(order.status, 'PREPARING');
    assert.ok(order.kitchenStartedAt, 'kitchenStartedAt timestamp must be recorded');

    // Bump item to READY
    const readyRes = await updateOrderItemStatus(createdOrderId, lineItem.id, 'READY');
    assert.strictEqual(readyRes.success, true);

    // Because all items on order are now READY, order rolls up to READY
    order = await db.orm.public.RestaurantOrder.where({ id: createdOrderId }).all().first();
    assert.strictEqual(order.status, 'READY', 'Order status must roll up to READY when all items are READY');
    assert.ok(order.kitchenCompletedAt, 'kitchenCompletedAt timestamp must be recorded');
  });

  await t.test('6. Completing Order: table release to available', async () => {
    mockCookies['next-auth.session-token'] = ownerToken;
    assert.ok(createdOrderId);
    assert.ok(createdTableId);

    // Complete order
    const completed = await updateOrderStatus(createdOrderId, 'COMPLETED');
    assert.strictEqual(completed.status, 'COMPLETED');

    // Table should now be released back to 'available'
    const table = await db.orm.public.RestaurantTable.where({ id: createdTableId }).all().first();
    assert.strictEqual(table.status, 'available', 'Table must be released to available after order completion');
  });

  await t.test('7. POS Shifts: closing reconciliation & cash variance', async () => {
    mockCookies['next-auth.session-token'] = ownerToken;
    assert.ok(createdShiftId);

    // Negative cash rejected
    const negRes = await closeShift({
      shiftId: createdShiftId,
      actualCash: -100,
    });
    assert.ok(negRes.error, 'Negative actual cash must be rejected');

    // Expected cash: openingFloat (10000) + CASH order (3500 * 2 = 7000) = 17000
    // If cashier counts 17200, variance should be +200
    const closeRes = await closeShift({
      shiftId: createdShiftId,
      actualCash: 17200,
      notes: 'Z-Report evening close',
    });

    assert.strictEqual(closeRes.success, true);
    assert.strictEqual(closeRes.shift.status, 'CLOSED');
    assert.strictEqual(closeRes.shift.expectedCash, 17000);
    assert.strictEqual(closeRes.shift.actualCash, 17200);
    assert.strictEqual(closeRes.shift.variance, 200);
  });

  await t.test('8. ShopOS Order Fulfillment: state transitions & tenant isolation', async () => {
    // Create retail product and retail order
    const retailProd = await db.orm.public.RetailProduct.create({
      organizationId: restOrg.id,
      name: 'Organic Olive Oil',
      price: 4500,
      stockQuantity: 20,
    });

    const retailOrder = await db.orm.public.RetailOrder.create({
      organizationId: restOrg.id,
      locationId: restLocation.id,
      cashierId: ownerMembership.id,
      totalAmount: 4500,
      status: 'CONFIRMED',
      fulfillmentStatus: 'UNFULFILLED',
      paymentMethod: 'CARD',
    });

    // Outsider cannot update fulfillment
    mockCookies['next-auth.session-token'] = outsiderToken;
    const unauthFulfillment = await updateFulfillmentStatus(retailOrder.id, 'PROCESSING', restLocation.id);
    assert.ok(unauthFulfillment.error, 'Outsider must be forbidden from updating fulfillment status');

    // Authorized staff can update fulfillment
    mockCookies['next-auth.session-token'] = ownerToken;
    const procRes = await updateFulfillmentStatus(retailOrder.id, 'PROCESSING', restLocation.id);
    assert.strictEqual(procRes.success, true);

    const readyRes = await updateFulfillmentStatus(retailOrder.id, 'READY', restLocation.id);
    assert.strictEqual(readyRes.success, true);

    const fulfilledRes = await updateFulfillmentStatus(retailOrder.id, 'FULFILLED', restLocation.id);
    assert.strictEqual(fulfilledRes.success, true);

    const updated = await db.orm.public.RetailOrder.where({ id: retailOrder.id }).all().first();
    assert.strictEqual(updated.fulfillmentStatus, 'FULFILLED');

    // Clean up retail order & product
    await db.orm.public.RetailOrder.where({ id: retailOrder.id }).delete();
    await db.orm.public.RetailProduct.where({ id: retailProd.id }).delete();
  });

  // Teardown
  if (createdOrderId) {
    const ois = await db.orm.public.OrderItem.where({ orderId: createdOrderId }).all();
    for (const oi of ois) {
      await db.orm.public.OrderItemModifier.where({ orderItemId: oi.id }).delete();
    }
    await db.orm.public.OrderItem.where({ orderId: createdOrderId }).delete();
    await db.orm.public.RestaurantOrder.where({ id: createdOrderId }).delete();
  }
  if (createdShiftId) {
    await db.orm.public.RestaurantShift.where({ id: createdShiftId }).delete();
  }
  // Delete all tables before location to avoid FK violation
  const allTables = await db.orm.public.RestaurantTable.where({ organizationId: restOrg.id }).all();
  for (const t of allTables) {
    await db.orm.public.RestaurantTable.where({ id: t.id }).delete();
  }
  await db.orm.public.MenuItem.where({ id: menuItem.id }).delete();
  await db.orm.public.RestaurantSettings.where({ organizationId: restOrg.id }).delete();
  await db.orm.public.MembershipRole.where({ membershipId: ownerMembership.id }).delete();
  await db.orm.public.Membership.where({ id: ownerMembership.id }).delete();
  await db.orm.public.Location.where({ id: restLocation.id }).delete();
  await db.orm.public.Organization.where({ id: restOrg.id }).delete();

  await db.orm.public.MembershipRole.where({ membershipId: outsiderMembership.id }).delete();
  await db.orm.public.Membership.where({ id: outsiderMembership.id }).delete();
  await db.orm.public.Organization.where({ id: outsiderOrg.id }).delete();

  await db.orm.public.PersonIdentifier.where({ personId: ownerPerson.id }).delete();
  await db.orm.public.Account.where({ personId: ownerPerson.id }).delete();
  await db.orm.public.Person.where({ id: ownerPerson.id }).delete();

  await db.orm.public.PersonIdentifier.where({ personId: outsiderPerson.id }).delete();
  await db.orm.public.Account.where({ personId: outsiderPerson.id }).delete();
  await db.orm.public.Person.where({ id: outsiderPerson.id }).delete();
});
