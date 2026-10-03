const fs = require('fs');

let retail = fs.readFileSync('lib/actions/retail.ts', 'utf8');

const fulfillCode = `
export async function fulfillRetailOrderInventory(tx: any, orderId: string) {
  const order = await tx.orm.public.RetailOrder.where({ id: orderId }).all().first();
  if (!order) throw new Error('Order not found');
  const items = await tx.orm.public.RetailOrderItem.where({ orderId: order.id }).all();
  
  for (const item of items) {
      const product = await tx.orm.public.RetailProduct.where({ id: item.productId }).all().first();
      if (product && !product.isWeighed) {
          if (order.locationId) {
              let stock = await tx.orm.public.RetailLocationStock.where({ locationId: order.locationId, productId: item.productId }).all().first();
              if (!stock) {
                 stock = await tx.orm.public.RetailLocationStock.create({ organizationId: order.organizationId, locationId: order.locationId, productId: item.productId, stockQuantity: 0 });
              }
              const plan = db.raw.sql\`
                  UPDATE "retailLocationStock"
                  SET "stockQuantity" = "stockQuantity" - \${item.quantity}
                  WHERE id = \${stock.id} AND "stockQuantity" >= \${item.quantity}
              \`.affectedCount();
              const updated = await tx.execute(plan);
              if (updated === 0) {
                  throw new Error('OVERSELL');
              }
              const afterQty = stock.stockQuantity - item.quantity;
              await tx.orm.public.RetailStockMovement.create({
                  organizationId: order.organizationId,
                  locationId: stock.locationId,
                  productId: item.productId,
                  delta: -item.quantity,
                  beforeQty: stock.stockQuantity,
                  afterQty: afterQty,
                  reason: 'SALE',
                  referenceType: 'SALE',
                  referenceId: item.id,
                  note: \`Order \${order.id.slice(0, 8)}\`
              });
          } else {
              const plan2 = db.raw.sql\`
                  UPDATE "retailProduct"
                  SET "stockQuantity" = "stockQuantity" - \${item.quantity}
                  WHERE id = \${product.id} AND "stockQuantity" >= \${item.quantity}
              \`.affectedCount();
              const updated = await tx.execute(plan2);
              if (updated === 0) {
                  throw new Error('OVERSELL');
              }
              const afterQty = product.stockQuantity - item.quantity;
              await tx.orm.public.RetailStockMovement.create({
                  organizationId: product.organizationId,
                  productId: product.id,
                  delta: -item.quantity,
                  beforeQty: product.stockQuantity,
                  afterQty: afterQty,
                  reason: 'SALE',
                  referenceType: 'SALE',
                  referenceId: item.id,
                  note: \`Order \${order.id.slice(0, 8)}\`
              });
          }
      }
  }
}
`;

retail = retail + fulfillCode;

const requestFulfillmentCode = `
export async function requestRetailFulfillment(orderId: string, locationId?: string) {
  const order = await db.orm.public.RetailOrder.where({ id: orderId }).all().first();
  if (!order) throw new Error('Order not found');
  if (order.status !== 'CONFIRMED') throw new Error('Order must be confirmed');
  
  const existingJob = await db.orm.public.DeliveryJob.where({ retailOrderId: order.id }).all().first();
  if (existingJob) return { success: true, deliveryJobId: existingJob.id, status: existingJob.status };

  const job = await db.orm.public.DeliveryJob.create({
    organizationId: order.organizationId,
    retailOrderId: order.id,
    locationId: locationId || order.locationId,
    status: 'PENDING',
    pickupAddress: 'Store',
    deliveryAddress: 'Customer'
  });
  
  await db.orm.public.RetailOrder.where({ id: order.id }).update({ fulfillmentStatus: 'PROCESSING' });
  return { success: true, deliveryJobId: job.id, status: job.status };
}
`;

retail = retail + requestFulfillmentCode;

const syncLogistics = `
export async function syncLogisticsStatusToShopOS(jobId: string) {
  const job = await db.orm.public.DeliveryJob.where({ id: jobId }).all().first();
  if (!job || !job.retailOrderId) return;
  const deliveryStatus = job.status;
  if (deliveryStatus === 'DELIVERED') {
      await db.orm.public.RetailOrder.where({ id: job.retailOrderId }).update({ fulfillmentStatus: 'FULFILLED' });
  } else {
      await db.orm.public.RetailOrder.where({ id: job.retailOrderId }).update({ fulfillmentStatus: 'READY' });
  }
}
`;

retail = retail + syncLogistics;

fs.writeFileSync('lib/actions/retail.ts', retail);

let commerce = fs.readFileSync('app/actions/commerce.ts', 'utf8');
const fetchMyOrdersCode = `
export async function fetchMyOrders() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.personId) return { error: 'Unauthorized' };
    const cust = await db.orm.public.CustomerData.where({ personId: session.user.personId }).all().first();
    if (!cust) return [];
    const orders = await db.orm.public.RetailOrder.where({ customerDataId: cust.id }).include({ delivery: true }).all();
    orders.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return orders.map((o: any) => ({
      ...o,
      status: o.status === 'PENDING' ? 'pending' : 'completed',
      fulfillmentStatus: o.fulfillmentStatus,
      deliveryJobId: o.delivery?.id,
    }));
  } catch (error) {
    return [];
  }
}
`;
commerce = commerce + fetchMyOrdersCode;
fs.writeFileSync('app/actions/commerce.ts', commerce);
