const { db } = require('./src/prisma/db.ts');
const { refundOrder, processCanonicalRetailOrderTransaction } = require('./lib/actions/retail.ts');

async function testConcurrentRefunds() {
  const org = await db.orm.public.Organization.where({ slug: 'test' }).all().first();
  const order = await db.orm.public.RetailOrder.where({ status: 'CONFIRMED' }).all().first();

  console.log('Order status before:', order.status, 'RefundedAt:', order.refundedAt);

  const [res1, res2] = await Promise.allSettled([
    refundOrder(order.id, { reason: 'Test 1' }),
    refundOrder(order.id, { reason: 'Test 2' })
  ]);

  console.log('Res 1:', res1);
  console.log('Res 2:', res2);
}

testConcurrentRefunds();
