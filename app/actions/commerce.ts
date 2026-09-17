'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/src/prisma/db';
import { revalidatePath } from 'next/cache';

export async function placeRetailOrder(input: {
  orgId: string;
  items: { productId: string; qty: number; name: string }[];
  method: string;
}) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || !session.user.personId) {
    throw new Error('Unauthorized. Real authentication is required to place an order.');
  }

  const personId = session.user.personId as string;

  // Verify the organization exists
  const org = await db.orm.public.Organization.where({ id: input.orgId }).all().first();
  if (!org) {
    throw new Error('Organization not found');
  }

  // Find the customer data for this person and org
  let relationship = await db.orm.public.Relationship.where({ personId, organizationId: input.orgId }).all().first();
  if (!relationship) {
    relationship = await db.orm.public.Relationship.create({
      personId,
      organizationId: input.orgId,
      type: 'CUSTOMER'
    });
  }

  let customer = await db.orm.public.CustomerData.where({ relationshipId: relationship.id }).all().first();
  if (!customer) {
    customer = await db.orm.public.CustomerData.create({
      relationshipId: relationship.id
    });
  }

  // Calculate authoritative server-side pricing
  let calculatedTotal = 0;
  const verifiedItems: { productId: string; quantity: number; unitPrice: number; subtotal: number; }[] = [];

  for (const item of input.items) {
    const product = await db.orm.public.RetailProduct.where({ id: item.productId }).all().first();
    if (!product) {
      throw new Error(`Product not found: ${item.productId}`);
    }
    if (product.organizationId !== input.orgId) {
      throw new Error(`Product ${item.productId} does not belong to the specified organization`);
    }

    const price = product.price;
    const subtotal = price * item.qty;
    calculatedTotal += subtotal;

    verifiedItems.push({
      productId: item.productId,
      quantity: item.qty,
      unitPrice: price,
      subtotal
    });
  }

  const order = await db.transaction(async (tx: any) => {
    const createdOrder = await tx.orm.public.RetailOrder.create({
      organizationId: input.orgId,
      customerDataId: customer.id,
      cashierId: 'ONLINE_CHECKOUT',
      totalAmount: calculatedTotal,
      paymentMethod: input.method === 'wallet' ? 'WALLET' : input.method === 'card' ? 'CARD' : 'BANK_TRANSFER',
      status: 'COMPLETED',
    });

    for (const verifiedItem of verifiedItems) {
      await tx.orm.public.RetailOrderItem.create({
        orderId: createdOrder.id,
        ...verifiedItem
      });
    }
    
    return createdOrder;
  });

  revalidatePath('/workspaces/shopos');
  return { success: true, orderId: order.id, total: calculatedTotal };
}

export async function fetchRetailOrders(orgId: string) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || !session.user.personId) {
    throw new Error('Unauthorized');
  }

  // Check if user is a member of org
  const isMember = session.user.memberships?.some((m: any) => m.organizationId === orgId);
  if (!isMember) {
    throw new Error('Unauthorized: Not a member of this organization');
  }
  
  const orders = await db.orm.public.RetailOrder.where({ organizationId: orgId }).all();
  
  return Promise.all(orders.map(async (o) => {
    const items = await db.orm.public.RetailOrderItem.where({ orderId: o.id }).all();
    let customerName = 'Unknown';
    if (o.customerDataId) {
      const cust = await db.orm.public.CustomerData.where({ id: o.customerDataId }).all().first();
      if (cust) {
        const rel = await db.orm.public.Relationship.where({ id: cust.relationshipId }).all().first();
        if (rel) {
          const person = await db.orm.public.Person.where({ id: rel.personId }).all().first();
          if (person) customerName = `${person.firstName} ${person.lastName}`;
        }
      }
    }
    
    return {
      id: o.id,
      ref: o.id.split('-')[0].toUpperCase(),
      customer: customerName,
      area: 'Local',
      items: items.map(i => `${i.quantity}x item`).join(', '),
      total: o.totalAmount,
      status: o.status === 'COMPLETED' ? 'packing' : 'delivered'
    };
  }));
}

export async function fetchMyOrders() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || !session.user.personId) {
    return [];
  }

  const personId = session.user.personId;

  // Find all CustomerData for this person
  const relationships = await db.orm.public.Relationship.where({ personId }).all();
  const relIds = relationships.map(r => r.id);
  
  if (relIds.length === 0) return [];

  const customers = await Promise.all(relIds.map(id => db.orm.public.CustomerData.where({ relationshipId: id }).all()));
  const custIds = customers.flat().map(c => c.id);

  if (custIds.length === 0) return [];

  // Find all orders across all orgs for this person
  const orders = await Promise.all(custIds.map(id => db.orm.public.RetailOrder.where({ customerDataId: id }).all()));
  const flatOrders = orders.flat().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return Promise.all(flatOrders.map(async (o) => {
    const org = await db.orm.public.Organization.where({ id: o.organizationId }).all().first();
    const items = await db.orm.public.RetailOrderItem.where({ orderId: o.id }).all();
    
    return {
      id: o.id,
      ref: o.id.split('-')[0].toUpperCase(),
      merchant: org?.name || 'CityOS Merchant',
      items: items.map(i => `${i.quantity}x item`).join(', '),
      total: o.totalAmount,
      status: o.status === 'COMPLETED' ? 'packing' : 'delivered',
      time: o.createdAt.toLocaleTimeString()
    };
  }));
}
