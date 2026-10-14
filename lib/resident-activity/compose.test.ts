import { describe, it } from 'node:test';
import assert from 'node:assert';
import { db } from '@/src/prisma/db';
import { composeResidentActivity, getResidentActivityDetail } from './compose';

describe('Resident Activity Composition Layer', () => {
  it('protects against IDOR by only returning owned activity', async () => {
    // 1. Setup isolated test data
    const p1 = await db.orm.public.Person.create({ id: `person-test-1-${Date.now()}`, firstName: 'Alice', lastName: 'A' });
    const p2 = await db.orm.public.Person.create({ id: `person-test-2-${Date.now()}`, firstName: 'Bob', lastName: 'B' });
    const org = await db.orm.public.Organization.create({ name: 'Test Org', type: 'RETAIL' });

    // Alice's customer data via Relationship
    const rel1 = await db.orm.public.Relationship.create({ personId: p1.id, organizationId: org.id, type: 'CUSTOMER' });
    const c1 = await db.orm.public.CustomerData.create({ id: `cust-test-1-${Date.now()}`, relationshipId: rel1.id, personId: p1.id });
    
    // Bob's customer data via Relationship
    const rel2 = await db.orm.public.Relationship.create({ personId: p2.id, organizationId: org.id, type: 'CUSTOMER' });
    const c2 = await db.orm.public.CustomerData.create({ id: `cust-test-2-${Date.now()}`, relationshipId: rel2.id, personId: p2.id });

    // Alice's order
    const o1 = await db.orm.public.RetailOrder.create({ customerDataId: c1.id, organizationId: org.id, status: 'PENDING', totalAmount: 10, paymentMethod: 'CARD', cashierId: 'ONLINE', fulfillmentStatus: 'UNFULFILLED' });
    
    // Bob's order
    const o2 = await db.orm.public.RetailOrder.create({ customerDataId: c2.id, organizationId: org.id, status: 'PENDING', totalAmount: 20, paymentMethod: 'CARD', cashierId: 'ONLINE', fulfillmentStatus: 'UNFULFILLED' });

    try {
      // 2. Test compose lists
      const alicePage = await composeResidentActivity(p1.id);
      assert.strictEqual(alicePage.items.length, 1);
      assert.strictEqual(alicePage.items[0].sourceId, o1.id);

      const bobPage = await composeResidentActivity(p2.id);
      assert.strictEqual(bobPage.items.length, 1);
      assert.strictEqual(bobPage.items[0].sourceId, o2.id);

      // 3. Test detail IDOR
      const bobTryingAliceOrder = await getResidentActivityDetail(p2.id, 'RETAIL_ORDER', o1.id);
      assert.strictEqual(bobTryingAliceOrder, null, 'Bob should not be able to read Alice\'s order');

      const aliceTryingAliceOrder = await getResidentActivityDetail(p1.id, 'RETAIL_ORDER', o1.id);
      assert.ok(aliceTryingAliceOrder, 'Alice should be able to read her own order');
      assert.strictEqual(aliceTryingAliceOrder.sourceId, o1.id);
    } finally {
      // Teardown
      await db.orm.public.RetailOrder.where({ id: o1.id }).delete();
      await db.orm.public.RetailOrder.where({ id: o2.id }).delete();
      await db.orm.public.CustomerData.where({ id: c1.id }).delete();
      await db.orm.public.CustomerData.where({ id: c2.id }).delete();
      await db.orm.public.Relationship.where({ id: rel1.id }).delete();
      await db.orm.public.Relationship.where({ id: rel2.id }).delete();
      await db.orm.public.Organization.where({ id: org.id }).delete();
      await db.orm.public.Person.where({ id: p1.id }).delete();
      await db.orm.public.Person.where({ id: p2.id }).delete();
    }
  });
});
