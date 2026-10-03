'use server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/src/prisma/db';
import { getDeliveryStatusForSource } from '../../../logisticsos/lib/actions/logistics-api';

export async function getMyDeliveries() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.personId) throw new Error('Unauthorized');
  const personId = session.user.personId as string;

  const relationships = await db.orm.public.Relationship.where({ personId }).all();
  if (relationships.length === 0) return [];
  const relationshipIds = relationships.map(r => r.id);
  
  // @ts-ignore
  const customerRecords = await db.orm.public.CustomerData.where({ relationshipId: { in: relationshipIds } }).all();
  if (customerRecords.length === 0) return [];
  const customerIds = customerRecords.map(c => c.id);

  // @ts-ignore
  const orders = await db.orm.public.RetailOrder.where({ customerDataId: { in: customerIds } }).all();
  if (orders.length === 0) return [];

  const deliveries = [];
  
  for (const order of orders) {
    const delivery = await getDeliveryStatusForSource('RETAIL_ORDER', order.id);
    if (delivery) {
      let orgName = 'Unknown Store';
      const org = await db.orm.public.Organization.where({ id: order.organizationId }).first();
      if (org) orgName = org.name;
      
      let driverName = 'Logistics Network';
      
      deliveries.push({ 
        id: delivery.deliveryJobId, 
        status: delivery.status, 
        dropoffAddress: delivery.dropoffAddress, 
        orderId: order.id, 
        storeName: orgName, 
        driverName 
      });
    }
  }
  
  return deliveries;
}
