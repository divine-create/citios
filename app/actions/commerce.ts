'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/src/prisma/db';
import { getCurrentCity, getCityBySlug } from '@/lib/city';
import { revalidatePath } from 'next/cache';
import { notifyPerson } from '@/lib/notify';

/**
 * Place a retail order.
 * The server derives each product's organizationId from the DB (client-provided orgId is IGNORED).
 * Price is always re-read from the canonical RetailProduct record (never trusted from client).
 * Authentication is always server-side via session.
 * Supports multi-org carts: creates one RetailOrder per organization group.
 */
export async function placeRetailOrder(input: {
  orgId?: string; // accepted but ignored
  locationId?: string; // Phase 2B location support
  items: { productId: string; qty: number; name: string }[];
  method: string;
  paymentReference?: string;
  idempotencyKey?: string;
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

    // Check product stock availability
    if (!product.isWeighed && product.stockQuantity < item.qty) {
      if (product.stockQuantity <= 0) {
        throw new Error(`"${product.name}" is currently out of stock.`);
      }
      throw new Error(`Only ${product.stockQuantity} item(s) left in stock for "${product.name}".`);
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
      const isWallet = input.method === 'wallet';
      const orderStatus = isWallet ? 'COMPLETED' : 'PENDING';

      // Idempotency check for duplicate creation
      if (input.idempotencyKey) {
        const existingOrder = await tx.orm.public.RetailOrder.where({ idempotencyKey: input.idempotencyKey }).all().first();
        if (existingOrder) {
          // If we find an existing order, we return it safely
          return existingOrder;
        }
      }

      const createdOrder = await tx.orm.public.RetailOrder.create({
        organizationId: orgId,
        locationId: input.locationId,
        customerDataId: customer.id,
        cashierId: 'ONLINE_CHECKOUT',
        totalAmount: group.total,
        paymentMethod: isWallet ? 'WALLET' : input.method === 'card' ? 'CARD' : 'BANK_TRANSFER',
        status: orderStatus,
        idempotencyKey: input.idempotencyKey,
      });
        
      await tx.orm.public.Payment.create({
        amount: group.total,
        currency: 'USD',
        method: isWallet ? 'WALLET' : input.method === 'card' ? 'CARD' : 'BANK_TRANSFER',
        status: orderStatus,
        retailOrderId: createdOrder.id,
        reference: input.paymentReference,
        idempotencyKey: input.idempotencyKey ? input.idempotencyKey + '_pay' : undefined,
      });
        
      for (const verifiedItem of group.items) {
        await tx.orm.public.RetailOrderItem.create({ orderId: createdOrder.id, ...verifiedItem });

        if (isWallet) {
          // For wallet (synchronous success), deduct stock immediately using location logic if possible
          if (input.locationId) {
             const locStock = await tx.orm.public.RetailLocationStock.where({ locationId: input.locationId, productId: verifiedItem.productId }).all().first();
             if (!locStock || locStock.quantity < verifiedItem.quantity) {
                 throw new Error(`Insufficient stock for item at this location.`);
             }
             await tx.orm.public.RetailLocationStock.where({ id: locStock.id }).update({ quantity: locStock.quantity - verifiedItem.quantity });
             
             await tx.orm.public.RetailStockMovement.create({
               organizationId: orgId,
               locationId: input.locationId,
               productId: verifiedItem.productId,
               delta: -verifiedItem.quantity,
               beforeQty: locStock.quantity,
               afterQty: locStock.quantity - verifiedItem.quantity,
               reason: 'SALE',
               note: `Online Order #${createdOrder.id.slice(0, 8)}`,
             });
          } else {
             // Fallback to global stock if no location provided (legacy)
             const product = await tx.orm.public.RetailProduct.where({ id: verifiedItem.productId }).all().first();
             if (product) {
               if (!product.isWeighed && product.stockQuantity < verifiedItem.quantity) {
                 throw new Error(`Item "${product.name}" has insufficient stock.`);
               }
               const nextStock = Math.max(0, product.stockQuantity - verifiedItem.quantity);
               await tx.orm.public.RetailProduct.where({ id: verifiedItem.productId }).update({
                 stockQuantity: nextStock,
               });
               await tx.orm.public.RetailStockMovement.create({
                 organizationId: orgId,
                 productId: verifiedItem.productId,
                 delta: -verifiedItem.quantity,
                 beforeQty: product.stockQuantity,
                 afterQty: nextStock,
                 reason: 'SALE',
                 note: `Online Order #${createdOrder.id.slice(0, 8)}`,
               });
             }
          }
        }
      }
      return createdOrder;
    });

    orderIds.push(order.id);
    grandTotal += group.total;

    // Notify merchant in ShopOS bell
    try {
      await db.orm.public.RetailNotification.create({
        organizationId: orgId,
        type: 'NEW_ONLINE_ORDER',
        title: `New Online Order #${order.id.slice(0, 8).toUpperCase()}`,
        message: `${group.items.length} item(s) totaling ₦${group.total.toLocaleString()} placed via CityMart.`,
        isRead: false,
      });
    } catch (notifErr) {
      console.warn('Could not create shop notification:', notifErr);
    }

    // Real event → resident notification (fire-and-forget, never blocks the order).
    await notifyPerson(personId, {
      type: 'ORDER_CONFIRMED',
      title: `Order placed at ${org.name}`,
      body: `${group.items.length} item${group.items.length === 1 ? '' : 's'} · total ₦${group.total.toLocaleString()}`,
      href: '/orders',
    });
  }

  revalidatePath('/workspaces/shopos');
  revalidatePath('/market');
  for (const item of input.items) {
    revalidatePath(`/product/${item.productId}`);
  }
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

export async function getCityMartProducts(citySlug?: string, cat: string = 'All') {
  // Explicit slug wins; otherwise resolve the session's current city.
  const city = citySlug ? await getCityBySlug(citySlug) : await getCurrentCity();
  if (!city) return [];

  const orgs = await db.orm.public.Organization.where({ cityId: city.id, type: 'RETAIL' }).all();
  const orgIds = orgs.map(o => o.id);

  if (orgIds.length === 0) return [];

  const allProducts = await db.orm.public.RetailProduct.all();
  const products = allProducts.filter((p: any) => orgIds.includes(p.organizationId) && (cat === 'All' || p.globalCategory === cat));
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

export async function getCityMartStores(citySlug?: string) {
  const city = citySlug ? await getCityBySlug(citySlug) : await getCurrentCity();
  if (!city) return [];

  const orgs = await db.orm.public.Organization.where({ cityId: city.id, type: 'RETAIL' }).all();
  return orgs;
}

export async function getCityMartProduct(productId: string) {
  const p = await db.orm.public.RetailProduct.where({ id: productId }).first();
  if (!p) return null;
  const org = await db.orm.public.Organization.where({ id: p.organizationId }).first();
  const orgCity = org?.cityId
    ? await db.orm.public.City.where({ id: org.cityId }).first()
    : null;
  return {
    ...p,
    storeName: org?.name || 'Unknown Store',
    orgSlug: org?.id,
    citySlug: orgCity?.slug ?? null,
  };
}
