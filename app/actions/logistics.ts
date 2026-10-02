'use server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/src/prisma/db';
import { DeliveryStatus } from '@/src/prisma/contract';

export async function getMyDeliveries() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.personId) throw new Error('Unauthorized');
  const personId = session.user.personId as string;

  const relationships = await db.orm.public.Relationship.where({ personId }).all();
  if (relationships.length === 0) return [];
  const relationshipIds = relationships.map(r => r.id);
  
  const customerRecords = await db.orm.public.CustomerData.where({ relationshipId: { in: relationshipIds } }).all();
  if (customerRecords.length === 0) return [];
  const customerIds = customerRecords.map(c => c.id);

  const orders = await db.orm.public.RestaurantOrder.where({ customerDataId: { in: customerIds } }).all();
  if (orders.length === 0) return [];
  const orderIds = orders.map(o => o.id);

  const deliveries = await db.orm.public.DeliveryJob.where({ restaurantOrderId: { in: orderIds } }).all();
  
  return Promise.all(deliveries.map(async (d) => {
    const order = orders.find(o => o.id === d.restaurantOrderId);
    let orgName = 'Unknown Restaurant';
    let driverName = 'Not yet assigned';
    if (order) {
      const org = await db.orm.public.Organization.where({ id: order.organizationId }).first();
      if (org) orgName = org.name;
    }
    if (d.driverId) {
      const driver = await db.orm.public.Person.where({ id: d.driverId }).first();
      if (driver && driver.firstName) {
        driverName = `${driver.firstName} ${driver.lastName}`;
      }
    }
    return { 
      id: d.id, 
      status: d.status, 
      dropoffAddress: d.dropoffAddress, 
      orderId: d.restaurantOrderId, 
      restaurantName: orgName, 
      driverName 
    };
  }));
}
