import test from 'node:test';
import assert from 'node:assert';
import { db } from '../../src/prisma/db';
import { createLogisticsDeliveryRequest, getDeliveryStatusForSource, LogisticsDeliveryRequest } from './logistics-api';
import { LogisticsDomainError } from './logistics-domain';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

async function makeProvider(name: string, active = true) {
  const p = await db.orm.public.Organization.create({
    name,
    type: 'LOGISTICS' as any,
    status: active ? 'ACTIVE' : 'SUSPENDED',
  });
  
  // Create default pricing rule so quotes succeed
  await db.orm.public.DeliveryPricingRule.create({
    providerId: p.id,
    baseFee: 2.50,
    perKmRate: 1.00,
    perKgRate: 0.50,
    prioritySurcharge: 5.00,
    isActive: true,
    version: 1
  });
  return p;
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

test('LogisticsOS Phase 6 Integration Tests', async (t) => {

  // We need at least two active network providers
  const provA = await makeProvider(uid('ProvA'));
  const provB = await makeProvider(uid('ProvB'));
  const inactiveProv = await makeProvider(uid('ProvInactive'), false);

  // Reusable test fixture for cross-vertical requests
  async function testVerticalIntegration(sourceType: any, sourceId: string) {
    const req: LogisticsDeliveryRequest = {
      sourceType,
      sourceId,
      idempotencyKey: uid('key'),
      pickup: { address: '100 Main St' },
      dropoff: { address: '200 Elm St' },
    };

    const job = await createLogisticsDeliveryRequest(req);
    assert.ok(job.id, 'DeliveryJob should be created');
    assert.strictEqual(job.sourceType, sourceType, 'Source type should match');
    assert.strictEqual(job.sourceId, sourceId, 'Source ID should match');
    assert.strictEqual(job.status, 'CREATED', 'Job should progress to CREATED status immediately');

    // Verify Read Contract
    const status = await getDeliveryStatusForSource(sourceType, sourceId);
    assert.ok(status, 'Read contract should return data');
    assert.strictEqual(status.deliveryJobId, job.id);
    assert.strictEqual(status.status, 'CREATED');
    assert.ok(status.providerId, 'A provider should be assigned via network dispatch');
    return { job, status };
  }

  // 1. Generic integration for ShopOS
  await t.test('Test 1 — Generic integration for ShopOS', async () => {
    await testVerticalIntegration('RETAIL_ORDER', uid('shop-order'));
  });

  // 2. Generic integration for RestaurantOS
  await t.test('Test 2 — Generic integration for RestaurantOS', async () => {
    await testVerticalIntegration('RESTAURANT_ORDER', uid('rest-order'));
  });

  // 3. Generic integration for HotelOS
  await t.test('Test 3 — Generic integration for HotelOS', async () => {
    await testVerticalIntegration('HOTEL_REQUEST', uid('hotel-req'));
  });

  // 4. Generic integration for Services/WorkOS
  await t.test('Test 4 — Generic integration for Services/WorkOS', async () => {
    await testVerticalIntegration('SERVICE_JOB', uid('work-job'));
  });

  // 5. Network Dispatch vs Explicit Provider
  await t.test('Test 5 — Explicit provider assignment vs Network Dispatch', async () => {
    const key = uid('idem');
    // Mode A: Explicit
    const jobA = await createLogisticsDeliveryRequest({
      providerId: provB.id,
      sourceType: 'DIRECT_DELIVERY',
      sourceId: uid('direct'),
      idempotencyKey: key + 'A',
      pickup: { address: 'A' },
      dropoff: { address: 'B' },
    });
    assert.strictEqual(jobA.providerId, provB.id, 'Explicit provider must be respected');

    // Mode B: Network
    const jobB = await createLogisticsDeliveryRequest({
      providerId: null, // Network dispatch
      sourceType: 'DIRECT_DELIVERY',
      sourceId: uid('direct'),
      idempotencyKey: key + 'B',
      pickup: { address: 'A' },
      dropoff: { address: 'B' },
    });
    assert.ok(jobB.providerId, 'Network dispatch should assign a provider');
    assert.notStrictEqual(jobB.providerId, inactiveProv.id, 'Network dispatch should never assign inactive providers');
  });

  // 6. Cross-Vertical Read Isolation
  await t.test('Test 6 — Source vertical isolation in Read Contract', async () => {
    const shopSourceId = uid('shop');
    await testVerticalIntegration('RETAIL_ORDER', shopSourceId);
    
    // A restaurant should not be able to read the shop order by guessing the sourceId
    const restRead = await getDeliveryStatusForSource('RESTAURANT_ORDER', shopSourceId);
    assert.strictEqual(restRead, null, 'Restaurant should not see ShopOS delivery');

    // But ShopOS can read its own
    const shopRead = await getDeliveryStatusForSource('RETAIL_ORDER', shopSourceId);
    assert.ok(shopRead, 'ShopOS should read its own delivery');
  });

  // 7. Request Idempotency 
  await t.test('Test 7 — Generic request idempotency and safe retries', async () => {
    const req: LogisticsDeliveryRequest = {
      sourceType: 'RETAIL_ORDER',
      sourceId: uid('idem-src'),
      idempotencyKey: uid('idem-key'),
      pickup: { address: 'A' },
      dropoff: { address: 'B' },
    };

    const first = await createLogisticsDeliveryRequest(req);
    const second = await createLogisticsDeliveryRequest(req);

    assert.strictEqual(first.id, second.id, 'Retries with same payload should return the exact same DeliveryJob');

    // Mutating payload with same key should fail
    const badReq = { ...req, sourceId: 'different-source' };
    await assert.rejects(
      createLogisticsDeliveryRequest(badReq),
      (err: any) => err instanceof LogisticsDomainError && err.message.includes('Idempotency conflict')
    );
  });
});
