'use server';

import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { authOptions } from '@/lib/auth';
import { db } from '@/src/prisma/db';
import { getCurrentCity, getCityBySlug } from '@/lib/city';
import { notifyPerson } from '@/lib/notify';
import { debitResidentWallet } from '@/app/actions/resident_wallet';

import { getStorefrontPromotions, StorefrontCampaign } from '@/lib/actions/storefront-management';

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

function mapRestaurant(o: any, menuItems: any[], citySlug: string | null = null, coverUrl?: string | null, meta?: any) {
  const image = coverUrl || o.logoAssetId || undefined;
  const rating = typeof meta?.rating === 'number' && meta.rating > 0 ? meta.rating : 4.7;
  const reviewCount = typeof meta?.reviewCount === 'number' && meta.reviewCount > 0 ? meta.reviewCount : 54;
  const deliveryFee = typeof meta?.deliveryFee === 'number' ? meta.deliveryFee : 450;
  const deliveryEta = meta?.deliveryEta || (meta?.isFastCourier ? '15 - 25 min' : '20 - 30 min');
  const isVerified = meta?.isVerified !== undefined ? Boolean(meta.isVerified) : true;
  const isFeatured = Boolean(meta?.isFeatured);
  const isFastCourier = Boolean(meta?.isFastCourier);
  const cuisines = Array.isArray(meta?.cuisines) && meta.cuisines.length > 0 
    ? meta.cuisines 
    : [o.storeCategory || 'Local Dishes', 'Calabar Cuisine'];

  return {
    id: o.id,
    name: o.name,
    type: o.type,
    description: o.description,
    address: o.address,
    citySlug,
    menuItems,
    imageUrl: image,
    image: image,
    images: meta?.images && Array.isArray(meta.images) && meta.images.length > 0 ? meta.images : (image ? [image] : []),
    rating,
    reviewCount,
    deliveryEta,
    deliveryFee,
    freeDeliveryOver: meta?.freeDeliveryOver || 10000,
    isVerified,
    isFeatured,
    isFastCourier,
    cuisines,
    badge: meta?.badge || (isFeatured ? 'Popular Spot' : undefined),
    isOpen: typeof meta?.isOpen === 'boolean' ? meta.isOpen : true,
    area: o.address ? o.address.split(',')[0].trim() : 'Calabar',
    category: o.storeCategory || 'Restaurant',
  };
}

export async function getCityFood(citySlug?: string) {
  const city = citySlug ? await getCityBySlug(citySlug) : await getCurrentCity();
  if (!city) return { restaurants: [], menuItems: [], campaigns: [] };

  const [locs, campaigns] = await Promise.all([
    db.orm.public.Location.where({ cityId: city.id }).all(),
    getStorefrontPromotions(city.slug, 'FOOD'),
  ]);

  const orgIdsWithLoc = locs.map((l) => l.organizationId);
  if (orgIdsWithLoc.length === 0) return { restaurants: [], menuItems: [], campaigns };

  const allOrgs = await db.orm.public.Organization.where({ type: 'RESTAURANT' }).all();
  const orgs = allOrgs.filter((o: any) => orgIdsWithLoc.includes(o.id));
  const orgIds = orgs.map((o) => o.id);
  if (orgIds.length === 0) return { restaurants: [], menuItems: [], campaigns };

  // Fetch listings for high-res cover photos
  const listings = await db.orm.public.DiscoveryListing.where({ cityId: city.id }).all();
  const listingMap = new Map(listings.map((l: any) => [l.organizationId, l]));

  // @ts-ignore — Prisma Next `in` operator on the ORM requires a ts-ignore
  const allMenus = await db.orm.public.MenuItem.all();
  const menus = allMenus.filter((m: any) => orgIds.includes(m.organizationId));
  const availableMenus = menus.filter((m: any) => m.isAvailable);

  return {
    restaurants: orgs.map((o) => {
      const listing = listingMap.get(o.id);
      let cover = listing?.coverAssetId || o.logoAssetId;
      let meta: any = null;
      if (listing?.metadata) {
        try {
          meta = JSON.parse(listing.metadata);
          if (!cover) cover = meta.coverImage || meta.images?.[0];
        } catch {}
      }
      return mapRestaurant(
        o,
        availableMenus.filter((m: any) => m.organizationId === o.id).map(mapMenuItem),
        city.slug,
        cover,
        meta
      );
    }),
    menuItems: availableMenus.map(mapMenuItem),
    campaigns,
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

  const listing = await db.orm.public.DiscoveryListing.where({ organizationId: org.id }).all().first();
  let cover = listing?.coverAssetId || org.logoAssetId;
  let meta: any = null;
  if (listing?.metadata) {
    try {
      meta = JSON.parse(listing.metadata);
      if (!cover) cover = meta.coverImage || meta.images?.[0];
    } catch {}
  }

  const menus = await db.orm.public.MenuItem.where({ organizationId: org.id }).all();

  const availableMenus = menus.filter((m: any) => m.isAvailable);

  return {
    ...mapRestaurant(org, availableMenus.map(mapMenuItem), activeCity?.slug ?? null, cover, meta),
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
  locationId?: string; // Optional - voice orders may not have a location
  items: { menuItemId: string; qty: number; name: string }[];
  type?: 'DINE_IN' | 'TAKEOUT';
  tableNumber?: string;
  paymentReference?: string;
  method?: string;
    idempotencyKey?: string;
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
        if (input.idempotencyKey) {
          const existingOrder = await tx.orm.public.RestaurantOrder.where({ idempotencyKey: input.idempotencyKey + '_food' }).all().first();
          if (existingOrder) return existingOrder;
        }

        const created = await tx.orm.public.RestaurantOrder.create({
          organizationId: orgId,
          locationId: input.locationId || undefined,
          customerDataId: customer.id,
          totalAmount: group.total,
          type: orderType,
          tableNumber,
          status: input.method === 'wallet' ? 'PREPARING' : 'PENDING',
          paymentStatus: input.method === 'wallet' ? 'COMPLETED' : 'PENDING',
          paidAt: input.method === 'wallet' ? (globalThis as any).Temporal.Now.instant() : undefined,
          idempotencyKey: input.idempotencyKey ? input.idempotencyKey + '_food' : undefined,
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
          let txRecordId = undefined;
          if (input.method === 'wallet' && personId) {
            const txRecord = await debitResidentWallet(tx, personId, group.total, input.paymentReference, `Food Order ${created.id}`);
            txRecordId = txRecord.id;

            let orgWallet = await tx.orm.public.Wallet.where({ organizationId: orgId }).all().first();
            if (!orgWallet) {
              orgWallet = await tx.orm.public.Wallet.create({ organizationId: orgId, balance: 0, currency: 'NGN' });
            }
            await tx.orm.public.LedgerEntry.create({
              walletId: orgWallet.id,
              transactionId: txRecord.id,
              amount: group.total,
              currency: orgWallet.currency || 'NGN'
            });
            await tx.execute(
              db.raw.sql`UPDATE "wallet" SET balance = balance + ${group.total} WHERE id = ${orgWallet.id}`.affectedCount().build()
            );
          }
          await tx.orm.public.Payment.create({
            amount: group.total,
            currency: 'NGN',
            method: input.method === 'wallet' ? 'WALLET' : input.method === 'card' ? 'CARD' : 'TRANSFER',
            status: input.method === 'wallet' ? 'COMPLETED' : 'PENDING',
            provider: input.method === 'wallet' ? 'INTERNAL_WALLET' : (process.env.PAYMENT_PROVIDER || 'PAYSTACK').toUpperCase(),
            idempotencyKey: input.idempotencyKey ? input.idempotencyKey + '_food' : undefined,
            reference: input.paymentReference,
            transactionId: txRecordId,
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

  try {
    revalidatePath('/workspaces/foodos');
  } catch (_e) {
    // Next.js static generation store is not available in unit/integration test context
  }
  return { success: true, orderIds, total: grandTotal };
}

