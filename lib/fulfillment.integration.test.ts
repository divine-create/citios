import test from 'node:test';
import assert from 'node:assert';
import { db } from '../src/prisma/db';
import { requestRetailFulfillment, syncLogisticsStatusToShopOS } from './actions/retail';

test('Fulfillment Integration Contract - Phase 2B', async (t) => {
  const org = await db.orm.public.Organization.create({
    name: 'Fulfillment Test Org ' + Date.now(),
    type: 'RETAIL' as any,
  });

  // 1. Setup minimal order
  const order = await db.orm.public.RetailOrder.create({
    organizationId: org.id,
    cashierId: 'TEST',
    totalAmount: 1000,
    paymentMethod: 'CARD',
    status: 'CONFIRMED',
    fulfillmentStatus: 'READY'
  });

  // 2. Request Fulfillment
  const res = await requestRetailFulfillment(order.id);
  assert.strictEqual(res.success, true);
  
  // 3. Verify DeliveryJob was created
  const job = await db.orm.public.DeliveryJob.where({ retailOrderId: order.id }).all().first();
  assert.ok(job);
  assert.strictEqual(job.status, 'REQUESTED');

  // 4. Test syncLogisticsStatusToShopOS
  await db.orm.public.DeliveryJob.where({ id: job.id }).update({ status: 'DELIVERED' });
  await syncLogisticsStatusToShopOS(job.id);

  const completedOrder = await db.orm.public.RetailOrder.where({ id: order.id }).all().first();
  assert.strictEqual(completedOrder?.status, 'CONFIRMED');
  assert.strictEqual(completedOrder?.fulfillmentStatus, 'FULFILLED');

  // 5. Test idempotency/state regression protection (Duplicate DELIVERED / FAILED)
  await db.orm.public.DeliveryJob.where({ id: job.id }).update({ status: 'FAILED' });
  await syncLogisticsStatusToShopOS(job.id);
  
  const unchangedOrder = await db.orm.public.RetailOrder.where({ id: order.id }).all().first();
  assert.strictEqual(unchangedOrder?.status, 'CONFIRMED');
  assert.strictEqual(unchangedOrder?.fulfillmentStatus, 'READY');
});
