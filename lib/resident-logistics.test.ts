import { describe, it } from 'node:test';
import assert from 'node:assert';
import { db } from '@/src/prisma/db';
import {
  residentDeliveryStatus,
  DELIVERY_STATUSES,
  TIMELINE_EVENT_TYPES,
  isDeliveryDelayed,
  isTimelineEvent,
  isActiveDelivery,
} from '@/lib/resident-logistics/status';
import { deliveryStatusView, headlineStatus, paymentStatusView, retailOrderStatusView } from '@/lib/resident-activity/status';
import { getResidentDelivery } from '@/lib/resident-logistics';
import { composeResidentActivity, getResidentActivityDetail } from '@/lib/resident-activity/compose';

const uid = (p: string) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

describe('Resident delivery status mapping (pure)', () => {
  it('maps every LogisticsOS DeliveryStatus deterministically with no raw leakage', () => {
    const expected: Record<string, string> = {
      REQUESTED: 'Preparing delivery', PRICED: 'Preparing delivery', CREATED: 'Preparing delivery',
      DISPATCHED: 'Finding a rider', ASSIGNED: 'Rider assigned', AT_PICKUP: 'Rider at pickup',
      PICKED_UP: 'Picked up', IN_TRANSIT: 'On the way', AT_DROPOFF: 'Arriving soon',
      DELIVERED: 'Delivered', COMPLETED: 'Delivered', CANCELLED: 'Delivery cancelled', FAILED: 'Delivery issue',
    };
    assert.deepStrictEqual([...DELIVERY_STATUSES].sort(), Object.keys(expected).sort());
    for (const st of DELIVERY_STATUSES) {
      const v = residentDeliveryStatus(st);
      assert.strictEqual(v.label, expected[st]);
      assert.strictEqual(v.raw, st);
      assert.ok(!/_/.test(v.label), 'no raw enum in label');
      assert.deepStrictEqual(residentDeliveryStatus(st), v, 'deterministic');
    }
  });

  it('does not treat DISPATCHED (searching) as rider assigned', () => {
    assert.strictEqual(residentDeliveryStatus('DISPATCHED').label, 'Finding a rider');
    assert.strictEqual(deliveryStatusView('DISPATCHED').label, 'Finding a rider');
  });

  it('unknown states fall through neutrally', () => {
    const v = residentDeliveryStatus('SOMETHING_NEW');
    assert.strictEqual(v.tone, 'neutral');
    assert.strictEqual(v.stage, null);
  });

  it('terminal failures have no progress stage; delivered is final stage', () => {
    assert.strictEqual(residentDeliveryStatus('FAILED').stage, null);
    assert.strictEqual(residentDeliveryStatus('CANCELLED').stage, null);
    assert.strictEqual(residentDeliveryStatus('DELIVERED').stage, 5);
  });

  it('LOCATION_UPDATE is not a timeline milestone', () => {
    assert.strictEqual(isTimelineEvent('LOCATION_UPDATE'), false);
    for (const t of TIMELINE_EVENT_TYPES) assert.ok(isTimelineEvent(t));
  });

  it('delay hint only applies to active deliveries', () => {
    const now = Date.now();
    assert.strictEqual(isDeliveryDelayed('IN_TRANSIT', now - 200 * 60000, now), true);
    assert.strictEqual(isDeliveryDelayed('IN_TRANSIT', now - 5 * 60000, now), false);
    assert.strictEqual(isDeliveryDelayed('DELIVERED', now - 999 * 60000, now), false);
    assert.strictEqual(isDeliveryDelayed('CANCELLED', now - 999 * 60000, now), false);
    assert.strictEqual(isActiveDelivery('FAILED'), false);
    assert.strictEqual(isActiveDelivery('ASSIGNED'), true);
  });

  it('keeps order / payment / delivery as separate domains; unresolved payment outranks delivery', () => {
    const order = retailOrderStatusView('CONFIRMED', 'PROCESSING');
    const failedPay = paymentStatusView('FAILED');
    const delivery = deliveryStatusView('IN_TRANSIT');
    assert.strictEqual(headlineStatus({ order, payment: failedPay, delivery }).raw, 'FAILED');
    // paid + in transit → delivery surfaces; the order view itself is untouched
    const paid = paymentStatusView('COMPLETED');
    assert.strictEqual(headlineStatus({ order, payment: paid, delivery }).raw, 'IN_TRANSIT');
    assert.notStrictEqual(order.raw, delivery.raw);
    // a delivered delivery does not rewrite a non-complete order
    const delivered = deliveryStatusView('DELIVERED');
    assert.strictEqual(order.label, 'Being prepared');
    assert.strictEqual(delivered.label, 'Delivered');
  });
});

describe('Resident delivery read layer (DB)', () => {
  async function seed() {
    const alice = await db.orm.public.Person.create({ id: uid('p-alice'), firstName: 'Alice', lastName: 'A' });
    const bob = await db.orm.public.Person.create({ id: uid('p-bob'), firstName: 'Bob', lastName: 'B' });
    const org = await db.orm.public.Organization.create({ id: uid('org'), name: 'Merchant', type: 'RETAIL' });
    const otherOrg = await db.orm.public.Organization.create({ id: uid('org2'), name: 'Other Merchant', type: 'RETAIL' });
    const logistics = await db.orm.public.Organization.create({ id: uid('log'), name: 'Logistics Co', type: 'LOGISTICS' });
    // The live DB enforces NOT NULL on customerData.relationshipId, so each customer gets a Relationship.
    const relA = await db.orm.public.Relationship.create({ id: uid('rel-a'), organizationId: org.id, personId: alice.id, type: 'CUSTOMER' });
    const relB = await db.orm.public.Relationship.create({ id: uid('rel-b'), organizationId: otherOrg.id, personId: bob.id, type: 'CUSTOMER' });
    const ca = await db.orm.public.CustomerData.create({ id: uid('c-a'), personId: alice.id, relationshipId: relA.id });
    const cb = await db.orm.public.CustomerData.create({ id: uid('c-b'), personId: bob.id, relationshipId: relB.id });

    const mkRetail = (customerDataId: string, organizationId: string) =>
      db.orm.public.RetailOrder.create({
        id: uid('ro'), customerDataId, organizationId, status: 'CONFIRMED', totalAmount: 10,
        paymentMethod: 'CARD', cashierId: 'ONLINE', fulfillmentStatus: 'PROCESSING',
      });
    const aliceOrder = await mkRetail(ca.id, org.id);
    const bobOrder = await mkRetail(cb.id, otherOrg.id);
    const aliceNoDelivery = await mkRetail(ca.id, org.id);

    const aliceJob = await db.orm.public.DeliveryJob.create({
      id: uid('dj'), providerId: logistics.id, sourceType: 'RETAIL_ORDER', sourceId: aliceOrder.id,
      status: 'IN_TRANSIT', dropoffAddress: '12 Alice Street',
    });
    const bobJob = await db.orm.public.DeliveryJob.create({
      id: uid('dj'), providerId: logistics.id, sourceType: 'RETAIL_ORDER', sourceId: bobOrder.id,
      status: 'ASSIGNED', dropoffAddress: '99 Bob Avenue',
    });
    return { alice, bob, logistics, aliceOrder, bobOrder, aliceNoDelivery, aliceJob, bobJob };
  }

  it('resident sees own delivery with minimal fields', async () => {
    const s = await seed();
    const d = await getResidentDelivery(s.alice.id, 'RETAIL_ORDER', s.aliceOrder.id);
    assert.ok(d);
    assert.strictEqual(d.status.label, 'On the way');
    assert.strictEqual(d.dropoffAddress, '12 Alice Street');
    const keys = Object.keys(d);
    for (const forbidden of ['providerId', 'driverProfileId', 'pickupAddress', 'pickupLat', 'dropoffLat', 'notes']) {
      assert.ok(!keys.includes(forbidden), `must not expose ${forbidden}`);
    }
  });

  it("resident cannot see another resident's delivery (IDOR)", async () => {
    const s = await seed();
    assert.strictEqual(await getResidentDelivery(s.alice.id, 'RETAIL_ORDER', s.bobOrder.id), null);
    assert.strictEqual(await getResidentDelivery(s.bob.id, 'RETAIL_ORDER', s.aliceOrder.id), null);
  });

  it('random ids, wrong source type, and delivery ids fail safely', async () => {
    const s = await seed();
    assert.strictEqual(await getResidentDelivery(s.alice.id, 'RETAIL_ORDER', '00000000-0000-4000-8000-000000000000'), null);
    // a delivery id is not an order id
    assert.strictEqual(await getResidentDelivery(s.alice.id, 'RETAIL_ORDER', s.aliceJob.id), null);
    // valid order id, wrong source type
    assert.strictEqual(await getResidentDelivery(s.alice.id, 'RESTAURANT_ORDER', s.aliceOrder.id), null);
    assert.strictEqual(await getResidentDelivery(s.alice.id, 'SERVICE_JOB', s.aliceOrder.id), null);
    assert.strictEqual(await getResidentDelivery(s.alice.id, 'DIRECT_DELIVERY', s.aliceOrder.id), null);
    assert.strictEqual(await getResidentDelivery(s.alice.id, { $ne: 1 }, s.aliceOrder.id), null);
    assert.strictEqual(await getResidentDelivery(s.alice.id, 'RETAIL_ORDER', 'x'.repeat(200)), null);
  });

  it('unauthenticated (no personId) gets nothing', async () => {
    const s = await seed();
    assert.strictEqual(await getResidentDelivery('', 'RETAIL_ORDER', s.aliceOrder.id), null);
    assert.strictEqual(await getResidentDelivery('nonexistent-person', 'RETAIL_ORDER', s.aliceOrder.id), null);
  });

  it('order without a delivery relationship yields null', async () => {
    const s = await seed();
    assert.strictEqual(await getResidentDelivery(s.alice.id, 'RETAIL_ORDER', s.aliceNoDelivery.id), null);
    const detail = await getResidentActivityDetail(s.alice.id, 'RETAIL_ORDER', s.aliceNoDelivery.id);
    assert.ok(detail);
    assert.strictEqual(detail.deliveryDetail, null);
  });

  it('timeline only contains real milestones, excludes GPS pings, ordered ascending; missing events ok', async () => {
    const s = await seed();
    const empty = await getResidentDelivery(s.alice.id, 'RETAIL_ORDER', s.aliceOrder.id);
    assert.ok(empty);
    assert.deepStrictEqual(empty.timeline, []);
    assert.strictEqual(empty.tracking.lastLocationAtMs, null);

    const base = { deliveryJobId: s.aliceJob.id, providerId: s.logistics.id };
    await db.orm.public.DeliveryTrackingEvent.create({ id: uid('te'), ...base, eventType: 'ASSIGNED' });
    await db.orm.public.DeliveryTrackingEvent.create({ id: uid('te'), ...base, eventType: 'LOCATION_UPDATE', latitude: 6.5, longitude: 3.3 });
    await db.orm.public.DeliveryTrackingEvent.create({ id: uid('te'), ...base, eventType: 'PICKED_UP' });

    const d = await getResidentDelivery(s.alice.id, 'RETAIL_ORDER', s.aliceOrder.id);
    assert.ok(d);
    assert.deepStrictEqual(d.timeline.map((t) => t.status.raw), ['ASSIGNED', 'PICKED_UP']);
    assert.ok(d.timeline[0].atMs <= d.timeline[1].atMs);
    assert.ok(d.tracking.lastLocationAtMs !== null);
    assert.strictEqual(d.tracking.fresh, true);
    // coordinates are never exposed
    assert.ok(!JSON.stringify(d).includes('6.5'));
  });

  it('cancelled / completed / failed deliveries present correct terminal states', async () => {
    const s = await seed();
    for (const [st, label, active] of [['CANCELLED', 'Delivery cancelled', false], ['FAILED', 'Delivery issue', false], ['DELIVERED', 'Delivered', false]] as const) {
      await db.orm.public.DeliveryJob.where({ id: s.aliceJob.id }).update({ status: st });
      const d = await getResidentDelivery(s.alice.id, 'RETAIL_ORDER', s.aliceOrder.id);
      assert.ok(d);
      assert.strictEqual(d.status.label, label);
      assert.strictEqual(d.active, active);
      assert.strictEqual(d.delayed, false);
    }
  });

  it('activity feed carries delivery state separately from order and payment (batched)', async () => {
    const s = await seed();
    const page = await composeResidentActivity(s.alice.id);
    const withDelivery = page.items.find((i) => i.sourceId === s.aliceOrder.id);
    assert.ok(withDelivery);
    assert.strictEqual(withDelivery.delivery?.label, 'On the way');
    assert.strictEqual(withDelivery.order.label, 'Being prepared');
    assert.strictEqual(withDelivery.payment, null);
    const without = page.items.find((i) => i.sourceId === s.aliceNoDelivery.id);
    assert.ok(without);
    assert.strictEqual(without.delivery, null);
    // Bob's delivery never leaks into Alice's feed
    assert.ok(!page.items.some((i) => i.sourceId === s.bobOrder.id));
  });
});
