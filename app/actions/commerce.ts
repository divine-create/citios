'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/src/prisma/db';
import { revalidatePath } from 'next/cache';

/**
 * Place a retail order.
 * The server derives each product's organizationId from the DB (client-provided orgId is IGNORED).
 * Price is always re-read from the canonical RetailProduct record (never trusted from client).
 * Authentication is always server-side via session.
 * Supports multi-org carts: creates one RetailOrder per organization group.
 */
export async function placeRetailOrder(input: {
  orgId?: string; // accepted but ignored — org derived server-side per product
  items: { productId: string; qty: number; name: string }[];
  method: string;
}) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.personId) {
    throw new Error('Unauthorized. Real authentication is required to place an order.');
  }

  const personId = session.user.personId as string;

  if (!input.items || input.items.length === 0) {
    throw new Error('No items in order.');
  }

  // Group items by their CANONICAL organizationId (DB-authoritative, never client-provided)
  const orgGroups = new Map<string, {
    items: { productId: string; quantity: number; unitPrice: number; subtotal: number }[];
    total: number;
  }>();

  for (const item of input.items) {
    if (item.qty < 1) throw new Error(`Invalid quantity for product ${item.productId}`);

    // Re-read product from DB — authoritative price and org
    const product = await db.orm.public.RetailProduct.where({ id: item.productId }).all().first();
    if (!product) {
      throw new Error(`Product not found: ${item.productId}`);
    }

    const unitPrice = product.price; // server-authoritative, never client price
    const subtotal = unitPrice * item.qty;
    const orgId = product.organizationId;

    if (!orgGroups.has(orgId)) orgGroups.set(orgId, { items: [], total: 0 });
    const g = orgGroups.get(orgId)!;
    g.items.push({ productId: item.productId, quantity: item.qty, unitPrice, subtotal });
    g.total += subtotal;
  }

  const orderIds: string[] = [];
  let grandTotal = 0;

  for (const [orgId, group] of orgGroups) {
    // Verify org exists
    const org = await db.orm.public.Organization.where({ id: orgId }).all().first();
    if (!org) throw new Error(`Organization not found: ${orgId}`);

    // Ensure customer/relationship exists for this person+org
    let relationship = await db.orm.public.Relationship.where({ personId, organizationId: orgId }).all().first();
    if (!relationship) {
      relationship = await db.orm.public.Relationship.create({
        personId,
        organizationId: orgId,
        type: 'CUSTOMER',
      });
    }
    let customer = await db.orm.public.CustomerData.where({ relationshipId: relationship.id }).all().first();
    if (!customer) {
      customer = await db.orm.public.CustomerData.create({ relationshipId: relationship.id });
    }

    const order = await db.transaction(async (tx: any) => {
      const createdOrder = await tx.orm.public.RetailOrder.create({
        organizationId: orgId,
        customerDataId: customer.id,
        cashierId: 'ONLINE_CHECKOUT',
        totalAmount: group.total,
        paymentMethod: input.method === 'wallet' ? 'WALLET' : input.method === 'card' ? 'CARD' : 'BANK_TRANSFER',
        status: 'COMPLETED',
      });
      for (const verifiedItem of group.items) {
        await tx.orm.public.RetailOrderItem.create({ orderId: createdOrder.id, ...verifiedItem });
      }
      return createdOrder;
    });

    orderIds.push(order.id);
    grandTotal += group.total;
  }

  revalidatePath('/workspaces/shopos');
  return { success: true, orderIds, total: grandTotal };
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
      status: o.status === 'COMPLETED' ? 'packing' : 'delivered',
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
      time: o.createdAt.toLocaleTimeString(),
    };
  }));
}

export async function getCityMartProducts(citySlug: string = 'calabar', cat: string = 'All') {
  const city = await db.orm.public.City.where({ slug: citySlug }).first();
  if (!city) return [];

  const orgs = await db.orm.public.Organization.where({ cityId: city.id, type: 'RETAIL' }).all();
  const orgIds = orgs.map(o => o.id);

  if (orgIds.length === 0) return [];

  let query: any = { organizationId: { in: orgIds } };
  if (cat !== 'All') {
    query.globalCategory = cat;
  }

  // @ts-ignore — Prisma Next `in` operator requires ts-ignore
  const products = await db.orm.public.RetailProduct.where(query).all();
  return products.map(p => {
    const org = orgs.find(o => o.id === p.organizationId);
    return {
      ...p,
      storeName: org?.name || 'Unknown Store',
      storeCategory: (org as any)?.storeCategory || 'Supermarket',
      orgSlug: org?.id,
    };
  });
}

export async function getCityMartStores(citySlug: string = 'calabar') {
  const city = await db.orm.public.City.where({ slug: citySlug }).first();
  if (!city) return [];

  const orgs = await db.orm.public.Organization.where({ cityId: city.id, type: 'RETAIL' }).all();
  return orgs;
}

export async function getCityMartProduct(productId: string) {
  const p = await db.orm.public.RetailProduct.where({ id: productId }).first();
  if (!p) return null;
  const org = await db.orm.public.Organization.where({ id: p.organizationId }).first();
  return {
    ...p,
    storeName: org?.name || 'Unknown Store',
    orgSlug: org?.id,
  };
}
