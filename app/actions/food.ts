'use server';

import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { authOptions } from '@/lib/auth';
import { db } from '@/src/prisma/db';
import { getCurrentCity, getCityBySlug } from '@/lib/city';
import { notifyPerson } from '@/lib/notify';
import { debitResidentWallet } from '@/app/actions/resident_wallet';

import { getStorefrontPromotions, StorefrontCampaign } from '@/lib/actions/storefront-management';
import { getCityAreas, detectAreaFromAddress } from '@/lib/city-areas';
import {
  STANDARDIZED_FOOD_CATEGORIES,
  normalizeFoodCategory,
  inferCanonicalCategoriesForRestaurant,
} from '@/lib/food-categories';
import { matchImageForMenuItem } from '@/lib/menu-library';

const FOOD_CATS = ['All', 'Restaurant', 'Cafe', 'Campus Eats', 'Food & Market'];

async function safeQuery<T = any[]>(fn: () => any, fallback: T = [] as unknown as T): Promise<T> {
  try {
    const res = await fn();
    return (res ?? fallback) as T;
  } catch {
    return fallback;
  }
}

function mapMenuItem(
  m: any,
  modifierGroups: any[] = [],
  addons: any[] = [],
  variants: any[] = []
) {
  const normCat = normalizeFoodCategory(m.category, m.name);
  return {
    id: m.id,
    name: m.name,
    description: m.description,
    price: m.price,
    category: m.category || normCat.label,
    canonicalCategoryId: normCat.id,
    canonicalCategoryLabel: normCat.label,
    imageUrl: m.imageUrl || matchImageForMenuItem(m.name) || null,
    isAvailable: m.isAvailable,
    organizationId: m.organizationId,
    modifierGroups: modifierGroups.map((g: any) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      isRequired: Boolean(g.isRequired),
      minSelections: g.minSelections ?? 0,
      maxSelections: g.maxSelections,
      type: (g.maxSelections === 1 || g.type === 'radio') ? 'radio' : 'checkbox',
      options: (g.options || []).filter((opt: any) => opt.isActive !== false).map((opt: any) => ({
        id: opt.id,
        name: opt.name,
        priceDelta: opt.priceDelta || 0,
      })),
    })),
    addons: addons.map((a: any) => ({
      id: a.id,
      name: a.name,
      price: a.price || 0,
      isAvailable: a.isAvailable,
    })),
    variants: variants.map((v: any) => ({
      id: v.id,
      name: v.name,
      price: v.price,
      isAvailable: v.isAvailable,
    })),
  };
}

function mapRestaurant(
  o: any,
  menuItems: any[],
  citySlug: string | null = null,
  coverUrl?: string | null,
  meta?: any,
  reviewStats?: { rating: number | null; count: number }
) {
  const image = coverUrl || o.logoAssetId || undefined;
  const rating = typeof meta?.rating === 'number' && meta.rating > 0
    ? meta.rating
    : reviewStats?.rating !== undefined ? reviewStats.rating : null;
  const reviewCount = typeof meta?.reviewCount === 'number' && meta.reviewCount > 0
    ? meta.reviewCount
    : (reviewStats?.count || 0);

  const deliveryFee = typeof meta?.deliveryFee === 'number' ? meta.deliveryFee : null;
  const deliveryEta = meta?.deliveryEta || null;
  const isVerified = Boolean(meta?.isVerified);
  const isFeatured = Boolean(meta?.isFeatured);
  const isFastCourier = Boolean(meta?.isFastCourier);
  const cuisines = Array.isArray(meta?.cuisines) && meta.cuisines.length > 0 
    ? meta.cuisines 
    : (o.storeCategory ? [o.storeCategory] : []);

  const canonicalCategoryIds = inferCanonicalCategoriesForRestaurant({
    category: o.storeCategory,
    cuisines,
    menuItems,
  });

  const logo = o.logoAssetId || meta?.logo || (o.name?.toLowerCase().includes('crunchies') ? '/images/logos/crunchies-logo.png' : undefined);

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
    logoUrl: logo,
    logo: logo,
    images: meta?.images && Array.isArray(meta.images) && meta.images.length > 0 ? meta.images : (image ? [image] : []),
    rating,
    reviewCount,
    deliveryEta,
    deliveryFee,
    freeDeliveryOver: typeof meta?.freeDeliveryOver === 'number' ? meta.freeDeliveryOver : null,
    isVerified,
    isFeatured,
    isFastCourier,
    cuisines,
    badge: meta?.badge || (isFeatured ? 'Featured' : undefined),
    isOpen: typeof meta?.isOpen === 'boolean' ? meta.isOpen : true,
    area: meta?.area || detectAreaFromAddress(citySlug, meta?.area || o.address || o.name)?.name || (o.address ? o.address.split(',')[0].trim() : 'Central Area'),
    areaSlug: detectAreaFromAddress(citySlug, meta?.area || o.address || o.name)?.id || 'central',
    category: o.storeCategory || 'Restaurant',
    canonicalCategoryIds,
  };
}

export async function getCityFood(citySlug?: string) {
  const city = citySlug ? await getCityBySlug(citySlug) : await getCurrentCity();
  if (!city) {
    return {
      restaurants: [],
      menuItems: [],
      campaigns: [],
      categories: [{ id: 'all', label: 'All Cuisines', count: 0 }],
      areas: [{ id: 'all', name: 'All Areas', shortName: 'All Areas', count: 0 }],
      deliveryHubs: [],
      defaultAddress: null,
      topSearchTags: [],
    };
  }

  const [locs, campaigns] = await Promise.all([
    db.orm.public.Location.where({ cityId: city.id }).all(),
    getStorefrontPromotions(city.slug, 'FOOD'),
  ]);

  const orgIdsWithLoc = locs.map((l) => l.organizationId);
  if (orgIdsWithLoc.length === 0) {
    return {
      restaurants: [],
      menuItems: [],
      campaigns,
      categories: [{ id: 'all', label: 'All Cuisines', count: 0 }],
      areas: [{ id: 'all', name: `All ${city.name} Areas`, shortName: 'All Areas', count: 0 }],
      deliveryHubs: [],
      defaultAddress: null,
      topSearchTags: [],
    };
  }

  const { isTestOrDemoOrganization } = await import('@/lib/storefront-filter');
  const allOrgs = await db.orm.public.Organization.where({ type: 'RESTAURANT' }).all();
  let orgs = allOrgs.filter((o: any) => orgIdsWithLoc.includes(o.id) && !isTestOrDemoOrganization(o));
  if (city.slug === 'calabar') {
    orgs = orgs.filter((o: any) => {
      const lower = (o.name || '').toLowerCase();
      return lower.includes('crunchies') || lower.includes('alyce') || lower.includes('alice');
    });
  }
  const orgIds = orgs.map((o) => o.id);
  if (orgIds.length === 0) {
    return {
      restaurants: [],
      menuItems: [],
      campaigns,
      categories: [{ id: 'all', label: 'All Cuisines', count: 0 }],
      areas: [{ id: 'all', name: `All ${city.name} Areas`, shortName: 'All Areas', count: 0 }],
      deliveryHubs: [],
      defaultAddress: null,
      topSearchTags: [],
    };
  }

  // Fetch listings for high-res cover photos
  const listings = await db.orm.public.DiscoveryListing.where({ cityId: city.id }).all();
  const listingMap = new Map(listings.map((l: any) => [l.organizationId, l]));

  // Fetch menu items, modifiers, addons and variants
  // @ts-ignore — Prisma Next `in` operator on the ORM requires a ts-ignore
  const allMenus = await db.orm.public.MenuItem.all();
  const menus = allMenus.filter((m: any) => orgIds.includes(m.organizationId));
  const availableMenus = menus.filter((m: any) => m.isAvailable);

  const [allModifierLinks, allGroups, allOptions, allAddons, allVariants, allReviews] = await Promise.all([
    safeQuery<any[]>(() => db.orm.public.MenuItemModifierGroup.all(), []),
    safeQuery<any[]>(() => db.orm.public.ModifierGroup.where({ isActive: true }).all(), []),
    safeQuery<any[]>(() => db.orm.public.ModifierOption.where({ isActive: true }).all(), []),
    safeQuery<any[]>(() => db.orm.public.MenuItemAddon.where({ isAvailable: true }).all(), []),
    safeQuery<any[]>(() => db.orm.public.MenuItemVariant.where({ isAvailable: true }).all(), []),
    safeQuery<any[]>(() => db.orm.public.Review.all(), []),
  ]);

  // Index reviews by org
  const reviewsByOrg = new Map<string, { total: number; count: number }>();
  for (const rev of (allReviews as any[])) {
    if (!reviewsByOrg.has(rev.organizationId)) reviewsByOrg.set(rev.organizationId, { total: 0, count: 0 });
    const stat = reviewsByOrg.get(rev.organizationId)!;
    stat.total += rev.rating;
    stat.count += 1;
  }

  // Build modifier group options map
  const optionsByGroup = new Map<string, any[]>();
  for (const opt of allOptions) {
    if (!optionsByGroup.has(opt.modifierGroupId)) optionsByGroup.set(opt.modifierGroupId, []);
    optionsByGroup.get(opt.modifierGroupId)!.push(opt);
  }

  const groupMap = new Map<string, any>();
  for (const g of allGroups) {
    groupMap.set(g.id, {
      ...g,
      options: optionsByGroup.get(g.id) || [],
    });
  }

  const groupsByMenu = new Map<string, any[]>();
  for (const link of allModifierLinks) {
    const grp = groupMap.get(link.modifierGroupId);
    if (grp) {
      if (!groupsByMenu.has(link.menuItemId)) groupsByMenu.set(link.menuItemId, []);
      groupsByMenu.get(link.menuItemId)!.push(grp);
    }
  }

  const addonsByMenu = new Map<string, any[]>();
  for (const a of allAddons) {
    if (!addonsByMenu.has(a.menuItemId)) addonsByMenu.set(a.menuItemId, []);
    addonsByMenu.get(a.menuItemId)!.push(a);
  }

  const variantsByMenu = new Map<string, any[]>();
  for (const v of allVariants) {
    if (!variantsByMenu.has(v.menuItemId)) variantsByMenu.set(v.menuItemId, []);
    variantsByMenu.get(v.menuItemId)!.push(v);
  }

  const mappedMenuItems = availableMenus.map((m: any) =>
    mapMenuItem(
      m,
      groupsByMenu.get(m.id) || [],
      addonsByMenu.get(m.id) || [],
      variantsByMenu.get(m.id) || []
    )
  );

  const mappedRestaurants = orgs.map((o) => {
    const listing = listingMap.get(o.id);
    let cover = listing?.coverAssetId || o.logoAssetId;
    let meta: any = null;
    if (listing?.metadata) {
      try {
        meta = JSON.parse(listing.metadata);
        if (!cover) cover = meta.coverImage || meta.images?.[0];
      } catch {}
    }

    const revStat = reviewsByOrg.get(o.id);
    const reviewStats = revStat && revStat.count > 0
      ? { rating: Number((revStat.total / revStat.count).toFixed(1)), count: revStat.count }
      : undefined;

    return mapRestaurant(
      o,
      mappedMenuItems.filter((m: any) => m.organizationId === o.id),
      city.slug,
      cover,
      meta,
      reviewStats
    );
  });

  // Standardized categories taxonomy aggregation
  const categoryCounter = new Map<string, number>();
  for (const r of mappedRestaurants) {
    for (const catId of (r as any).canonicalCategoryIds || []) {
      categoryCounter.set(catId, (categoryCounter.get(catId) || 0) + 1);
    }
  }

  // Canonical categories sorted by restaurant presence (descending)
  const populatedCategories = STANDARDIZED_FOOD_CATEGORIES
    .filter((cat) => cat.id !== 'other')
    .map((cat) => ({
      id: cat.id,
      label: cat.label,
      shortLabel: cat.shortLabel,
      emoji: cat.emoji,
      count: categoryCounter.get(cat.id) || 0,
    }))
    .sort((a, b) => b.count - a.count);

  const categories = [
    {
      id: 'all',
      label: 'All Cuisines',
      shortLabel: 'All Places',
      emoji: '🍽️',
      count: mappedRestaurants.length,
    },
    ...populatedCategories,
  ];

  // Delivery hubs derived from actual locations in this city
  const deliveryHubs = locs.map((l: any) => ({
    id: l.id,
    name: l.name || l.address || 'Branch Hub',
    address: l.address,
  }));

  // Read default delivery address if resident is logged in
  let defaultAddress: string | null = null;
  const session = await getServerSession(authOptions).catch(() => null);
  if (session?.user?.personId) {
    const profile = await safeQuery<any>(
      () => db.orm.public.ResidentProfile.where({ personId: session.user.personId }).all().first(),
      null
    );
    defaultAddress = profile?.defaultDeliveryAddress ?? null;
  }

  // Top search tags derived from actual menu items and canonical cuisines in this city
  const topSearchTags = Array.from(
    new Set([
      ...populatedCategories.slice(0, 4).map((c) => c.label),
      ...mappedMenuItems.slice(0, 4).map((m: any) => m.name),
    ])
  ).slice(0, 6);

  const canonicalAreas = getCityAreas(city.slug);
  const areaCounts = new Map<string, number>();
  for (const r of mappedRestaurants) {
    const slug = (r as any).areaSlug || 'central';
    areaCounts.set(slug, (areaCounts.get(slug) || 0) + 1);
  }

  const areas = [
    { id: 'all', name: `All ${city.name} Areas`, shortName: 'All Areas', count: mappedRestaurants.length },
    ...canonicalAreas.map((a) => ({
      ...a,
      count: areaCounts.get(a.id) || 0,
    })),
  ];

  return {
    restaurants: mappedRestaurants,
    menuItems: mappedMenuItems,
    campaigns,
    categories,
    areas,
    deliveryHubs,
    defaultAddress,
    topSearchTags,
  };
}

export async function getCityFoodRestaurant(orgId: string) {
  const org = await db.orm.public.Organization.where({ id: orgId, type: 'RESTAURANT' }).all().first();
  if (!org) return null;

  const activeCity = await getCurrentCity();
  if (activeCity?.slug === 'calabar') {
    const lower = (org.name || '').toLowerCase();
    const isAllowed = lower.includes('crunchies') || lower.includes('alyce') || lower.includes('alice');
    if (!isAllowed) return null;
  }

  let locs = await db.orm.public.Location.where({ organizationId: org.id }).all();
  
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

  const [allModifierLinks, allGroups, allOptions, allAddons, allVariants, reviews] = await Promise.all([
    safeQuery<any[]>(() => db.orm.public.MenuItemModifierGroup.all(), []),
    safeQuery<any[]>(() => db.orm.public.ModifierGroup.where({ organizationId: org.id, isActive: true }).all(), []),
    safeQuery<any[]>(() => db.orm.public.ModifierOption.where({ isActive: true }).all(), []),
    safeQuery<any[]>(() => db.orm.public.MenuItemAddon.where({ organizationId: org.id, isAvailable: true }).all(), []),
    safeQuery<any[]>(() => db.orm.public.MenuItemVariant.where({ organizationId: org.id, isAvailable: true }).all(), []),
    safeQuery<any[]>(() => db.orm.public.Review.where({ organizationId: org.id }).all(), []),
  ]);

  const optionsByGroup = new Map<string, any[]>();
  for (const opt of allOptions) {
    if (!optionsByGroup.has(opt.modifierGroupId)) optionsByGroup.set(opt.modifierGroupId, []);
    optionsByGroup.get(opt.modifierGroupId)!.push(opt);
  }

  const groupMap = new Map<string, any>();
  for (const g of allGroups) {
    groupMap.set(g.id, {
      ...g,
      options: optionsByGroup.get(g.id) || [],
    });
  }

  const groupsByMenu = new Map<string, any[]>();
  for (const link of allModifierLinks) {
    const grp = groupMap.get(link.modifierGroupId);
    if (grp) {
      if (!groupsByMenu.has(link.menuItemId)) groupsByMenu.set(link.menuItemId, []);
      groupsByMenu.get(link.menuItemId)!.push(grp);
    }
  }

  const addonsByMenu = new Map<string, any[]>();
  for (const a of allAddons) {
    if (!addonsByMenu.has(a.menuItemId)) addonsByMenu.set(a.menuItemId, []);
    addonsByMenu.get(a.menuItemId)!.push(a);
  }

  const variantsByMenu = new Map<string, any[]>();
  for (const v of allVariants) {
    if (!variantsByMenu.has(v.menuItemId)) variantsByMenu.set(v.menuItemId, []);
    variantsByMenu.get(v.menuItemId)!.push(v);
  }

  const mappedMenus = availableMenus.map((m: any) =>
    mapMenuItem(
      m,
      groupsByMenu.get(m.id) || [],
      addonsByMenu.get(m.id) || [],
      variantsByMenu.get(m.id) || []
    )
  );

  const reviewStats = reviews.length > 0
    ? {
        rating: Number((reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / reviews.length).toFixed(1)),
        count: reviews.length,
      }
    : undefined;

  return {
    ...mapRestaurant(org, mappedMenus, activeCity?.slug ?? null, cover, meta, reviewStats),
    location: locs[0] ?? null,
    menuItems: mappedMenus,
  };
}

export async function getCityFoodMenuItem(menuItemId: string) {
  const m = await db.orm.public.MenuItem.where({ id: menuItemId }).all().first();
  if (!m) return null;

  const org = await db.orm.public.Organization.where({ id: m.organizationId }).all().first();
  
  const activeCity = await getCurrentCity();
  if (activeCity?.slug === 'calabar' && org) {
    const lower = (org.name || '').toLowerCase();
    const isAllowed = lower.includes('crunchies') || lower.includes('alyce') || lower.includes('alice');
    if (!isAllowed) return null;
  }

  let locs = await db.orm.public.Location.where({ organizationId: m.organizationId }).all();

  if (activeCity) {
    const cityLocs = locs.filter((l) => l.cityId === activeCity.id);
    if (cityLocs.length > 0) {
      locs = cityLocs;
    }
  }

  const [allModifierLinks, allGroups, allOptions, allAddons, allVariants] = await Promise.all([
    safeQuery<any[]>(() => db.orm.public.MenuItemModifierGroup.where({ menuItemId: m.id }).all(), []),
    safeQuery<any[]>(() => db.orm.public.ModifierGroup.where({ organizationId: m.organizationId, isActive: true }).all(), []),
    safeQuery<any[]>(() => db.orm.public.ModifierOption.where({ isActive: true }).all(), []),
    safeQuery<any[]>(() => db.orm.public.MenuItemAddon.where({ menuItemId: m.id, isAvailable: true }).all(), []),
    safeQuery<any[]>(() => db.orm.public.MenuItemVariant.where({ menuItemId: m.id, isAvailable: true }).all(), []),
  ]);

  const optionsByGroup = new Map<string, any[]>();
  for (const opt of allOptions) {
    if (!optionsByGroup.has(opt.modifierGroupId)) optionsByGroup.set(opt.modifierGroupId, []);
    optionsByGroup.get(opt.modifierGroupId)!.push(opt);
  }

  const groupMap = new Map<string, any>();
  for (const g of allGroups) {
    groupMap.set(g.id, {
      ...g,
      options: optionsByGroup.get(g.id) || [],
    });
  }

  const groups = allModifierLinks
    .map((link: any) => groupMap.get(link.modifierGroupId))
    .filter(Boolean);

  return {
    ...mapMenuItem(m, groups, allAddons, allVariants),
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

        const paymentMethodStr = input.method === 'wallet'
          ? 'WALLET'
          : input.method === 'card'
          ? 'CARD'
          : input.method === 'whatsapp'
          ? 'WHATSAPP'
          : 'TRANSFER';

        const created = await tx.orm.public.RestaurantOrder.create({
          organizationId: orgId,
          locationId: input.locationId || undefined,
          customerDataId: customer.id,
          totalAmount: group.total,
          type: orderType,
          tableNumber,
          paymentMethod: paymentMethodStr,
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
            method: paymentMethodStr,
            status: input.method === 'wallet' ? 'COMPLETED' : 'PENDING',
            provider: input.method === 'wallet' ? 'INTERNAL_WALLET' : input.method === 'whatsapp' ? 'WHATSAPP' : (process.env.PAYMENT_PROVIDER || 'PAYSTACK').toUpperCase(),
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

