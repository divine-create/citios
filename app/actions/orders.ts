'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/src/prisma/db';

export async function fetchMyOrders() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || !session.user.personId) {
    throw new Error('Unauthorized');
  }

  const personId = session.user.personId as string;

  // We need to fetch CustomerData linked to this Person
  const relationships = await db.orm.public.Relationship.where({ personId }).all();
  if (relationships.length === 0) return { retail: [], restaurant: [] };

  const relationshipIds = relationships.map(r => r.id);
  
  // @ts-ignore
  const customerRecords = await db.orm.public.CustomerData.where({ relationshipId: { in: relationshipIds } }).all();
  if (customerRecords.length === 0) return { retail: [], restaurant: [] };

  const customerIds = customerRecords.map(c => c.id);

  // Fetch Retail Orders
  // @ts-ignore
  const retailOrders = await db.orm.public.RetailOrder.where({ customerDataId: { in: customerIds } }).all();
  
  // Fetch Restaurant Orders
  // @ts-ignore
  const restaurantOrders = await db.orm.public.RestaurantOrder.where({ customerDataId: { in: customerIds } }).all();

  // For each, fetch the organization to display names, and fetch payments/delivery if possible
  const enrichedRetail = await Promise.all(retailOrders.map(async (order) => {
    const org = await db.orm.public.Organization.where({ id: order.organizationId }).all().first();
    const items = await db.orm.public.RetailOrderItem.where({ orderId: order.id }).all();
    const payment = await db.orm.public.Payment.where({ retailOrderId: order.id }).all().first();
    
    // Eagerly resolve product names for UI
    const enrichedItems = await Promise.all(items.map(async (item) => {
        const product = await db.orm.public.RetailProduct.where({ id: item.productId }).all().first();
        return { ...item, product };
    }));

    return { ...order, org, items: enrichedItems, payment };
  }));

  const enrichedRestaurant = await Promise.all(restaurantOrders.map(async (order) => {
    const org = await db.orm.public.Organization.where({ id: order.organizationId }).all().first();
    const items = await db.orm.public.OrderItem.where({ orderId: order.id }).all();
    const payment = await db.orm.public.Payment.where({ restaurantOrderId: order.id }).all().first();
    const delivery = await db.orm.public.DeliveryJob.where({ restaurantOrderId: order.id }).all().first();
    
    const enrichedItems = await Promise.all(items.map(async (item) => {
        const product = await db.orm.public.MenuItem.where({ id: item.menuItemId }).all().first();
        return { ...item, product };
    }));

    return { ...order, org, items: enrichedItems, payment, delivery };
  }));

  // Sort both by createdAt descending
  enrichedRetail.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  enrichedRestaurant.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return JSON.parse(JSON.stringify({
    retail: enrichedRetail,
    restaurant: enrichedRestaurant
  }));
}
