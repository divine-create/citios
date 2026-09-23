'use server';

import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { authOptions } from '@/lib/auth';
import { db } from '@/src/prisma/db';
import { getCurrentCity, getCityBySlug } from '@/lib/city';
import { notifyPerson } from '@/lib/notify';

const FOOD_CATS = ['All', 'Restaurant', 'Cafe', 'Campus Eats', 'Food & Market'];

function mapMenuItem(m: any) {
  return {
    id: m.id,
    name: m.name,
    description: m.description,
    price: m.price,
    category: m.category,
    imageUrl: m.imageUrl,
    isAvailable: m.isAvailable,
    organizationId: m.organizationId,
  };
}

function mapRestaurant(o: any, menuItems: any[], citySlug: string | null = null) {
  return {
    id: o.id,
    name: o.name,
    type: o.type,
    description: o.description,
    address: o.address,
    
    citySlug,
    menuItems,
    imageUrl: undefined,
    rating: null,
    isOpen: true,
    area: '',
    category: 'Restaurant',
    deliveryEta: '30-45 min',
  };
}

export async function getCityFood(citySlug?: string) {
  const city = citySlug ? await getCityBySlug(citySlug) : await getCurrentCity();
  if (!city) return { restaurants: [], menuItems: [] };

  const locs = await db.orm.public.Location.where({ cityId: city.id }).all();
  const orgIdsWithLoc = locs.map((l) => l.organizationId);
  if (orgIdsWithLoc.length === 0) return { restaurants: [], menuItems: [] };

  // @ts-ignore
  const orgs = await db.orm.public.Organization.where({ 
    // @ts-ignore
    id: { in: orgIdsWithLoc },
    type: 'RESTAURANT'
  }).all();
  const orgIds = orgs.map((o) => o.id);
  if (orgIds.length === 0) return { restaurants: [], menuItems: [] };

  // @ts-ignore — Prisma Next `in` operator on the ORM requires a ts-ignore
  const menus = await db.orm.public.MenuItem.where({ organizationId: { in: orgIds } }).all();
  const availableMenus = menus.filter((m: any) => m.isAvailable);

  return {
    restaurants: orgs.map((o) => mapRestaurant(o, availableMenus.filter((m: any) => m.organizationId === o.id).map(mapMenuItem), city.slug)),
    menuItems: availableMenus.map(mapMenuItem),
  };
}

export async function getCityFoodRestaurant(orgId: string) {
  const org = await db.orm.public.Organization.where({ id: orgId, type: 'RESTAURANT' }).all().first();
  if (!org) return null;

  const activeCity = await getCurrentCity();
  let locs = await db.orm.public.Location.where({ organizationId: org.id }).all();
  
  // If the user is in a city context, prioritize local presence
  if (activeCity) {
    const cityLocs = locs.filter((l) => l.cityId === activeCity.id);
    if (cityLocs.length > 0) {
      locs = cityLocs;
    }
  }

  const menus = await db.orm.public.MenuItem.where({ organizationId: org.id }).all();

  const availableMenus = menus.filter((m: any) => m.isAvailable);

  return {
    ...mapRestaurant(org, availableMenus.map(mapMenuItem), activeCity?.slug ?? null),
    location: locs[0] ?? null,
    menuItems: availableMenus.map(mapMenuItem),
  };
}

export async function getCityFoodMenuItem(menuItemId: string) {
  const m = await db.orm.public.MenuItem.where({ id: menuItemId }).all().first();
  if (!m) return null;

  const org = await db.orm.public.Organization.where({ id: m.organizationId }).all().first();
  
  const activeCity = await getCurrentCity();
  let locs = await db.orm.public.Location.where({ organizationId: m.organizationId }).all();

  // Scope to the active city context
  if (activeCity) {
    const cityLocs = locs.filter((l) => l.cityId === activeCity.id);
    if (cityLocs.length > 0) {
      locs = cityLocs;
    }
  }

  return {
    ...mapMenuItem(m),
    org,
    location: locs[0] ?? null,
  };
}

/**
 * Place a restaurant (food) order. Mirrors placeRetailOrder:
 *  - Skip any MenuItem not available.
 *  - Menu item's organizationId is derived server-side (client-provided org ignored).
 *  - Price always re-read from the canonical MenuItem record (never trusted from client).
 *  - Multi-restaurant carts become one RestaurantOrder per restaurant (pickup, no delivery in V1).
 */
export async function placeRestaurantOrder(input: {
  orgId?: string;
  locationId: string;
  items: { menuItemId: string; qty: number; name: string }[];
  type?: 'DINE_IN' | 'TAKEOUT';
  tableNumber?: string;
  paymentReference?: string;
  method?: string;
}) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.personId) {
    throw new Error('Unauthorized. You must be signed in to place a food order.');
  }

  const personId = session.user.personId;

  if (!input.items || input.items.length === 0) {
    throw new Error('No items in order.');
  }

  const orderType = input.type === 'DINE_IN' ? 'DINE_IN' : 'TAKEOUT';
  const tableNumber = orderType === 'DINE_IN' ? input.tableNumber || null : null;

  // Group items by their CANONICAL organizationId (DB-authoritative, never client-provided)
  const orgGroups = new Map<string, {
    items: { menuItemId: string; quantity: number; unitPrice: number; subtotal: number }[];
    total: number;
  }>();

  for (const item of input.items) {
    if (item.qty < 1) throw new Error(`Invalid quantity for menu item ${item.menuItemId}`);

    // Re-read menu item from DB — authoritative price and org
    const menuItem = await db.orm.public.MenuItem.where({ id: item.menuItemId }).all().first();
    if (!menuItem) throw new Error(`Menu item not found: ${item.menuItemId}`);
    if (menuItem.isAvailable === false) throw new Error(`Menu item is not available: ${item.menuItemId}`);

    const unitPrice = menuItem.price; // server-authoritative, never client price
    const subtotal = unitPrice * item.qty;
    const orgId = menuItem.organizationId;

    if (!orgGroups.has(orgId)) orgGroups.set(orgId, { items: [], total: 0 });
    const g = orgGroups.get(orgId)!;
    g.items.push({ menuItemId: item.menuItemId, quantity: item.qty, unitPrice, subtotal });
    g.total += subtotal;
  }

  if (orderType === 'DINE_IN' && orgGroups.size > 1) {
    throw new Error('DINE_IN orders cannot span multiple restaurants.');
  }

  const orderIds: string[] = [];
  let grandTotal = 0;

  for (const [orgId, group] of orgGroups) {
    // Verify org exists
    const org = await db.orm.public.Organization.where({ id: orgId }).all().first();
    if (!org) throw new Error(`Organization not found: ${orgId}`);

    // Ensure customer/relationship exists for this person+restaurant
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
      customer = await db.orm.public.CustomerData.create({
        relationshipId: relationship.id,
      });
    }

    try {
      const order = await db.transaction(async (tx: any) => {
        const created = await tx.orm.public.RestaurantOrder.create({
          organizationId: orgId,
          locationId: input.locationId,
          customerDataId: customer.id,
          totalAmount: group.total,
          type: orderType,
          tableNumber,
          status: 'PENDING',
          // paymentMethod: 'WALLET', // TODO: Phase 1B CityPay Integration
        });
        
        for (const it of group.items) {
          await tx.orm.public.OrderItem.create({
            orderId: created.id,
            menuItemId: it.menuItemId,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
          });
        }
        
        if (input.paymentReference) {
          await tx.orm.public.Payment.create({
            amount: group.total,
            currency: 'NGN',
            method: input.method === 'wallet' ? 'WALLET' : input.method === 'card' ? 'CARD' : 'TRANSFER',
            status: 'PENDING',
            reference: input.paymentReference,
            restaurantOrderId: created.id,
          });
        }
        return created;
      });
      orderIds.push(order.id);
      grandTotal += group.total;

      // Real event → resident notification (fire-and-forget, never blocks the order).
      await notifyPerson(personId, {
        type: 'FOOD_ORDER_CONFIRMED',
        title: `Food order placed at ${org.name}`,
        body: `${group.items.length} item${group.items.length === 1 ? '' : 's'} · total ${group.total.toLocaleString()} (local currency)`,
        href: '/orders',
      });
    } catch (e: any) {
      throw new Error(`Failed to place restaurant order: ${e?.message || 'unknown'}`);
    }
  }

  revalidatePath('/workspaces/foodos');
  return { success: true, orderIds, total: grandTotal };
}

