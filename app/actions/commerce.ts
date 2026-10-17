'use server';

import { getDeliveryStatusForSource } from '@/lib/actions/logistics-api';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/src/prisma/db';
import { getCurrentCity, getCityBySlug } from '@/lib/city';
import { revalidatePath } from 'next/cache';
import { notifyPerson } from '@/lib/notify';
import { debitResidentWallet } from '@/app/actions/resident_wallet';
import { resolveResidentCustomerIds } from '@/lib/resident-activity/compose';

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
  expectedTotal?: number;
  deliveryAddress?: string;
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
    if (input.locationId) {
      const loc = await db.orm.public.Location.where({ id: input.locationId, organizationId: product.organizationId }).all().first();
      if (!loc) throw new Error("Location not found or invalid for this product");
      
      const locStock = await db.orm.public.RetailLocationStock.where({ locationId: input.locationId, productId: item.productId }).all().first();
      if (!product.isWeighed && (!locStock || locStock.stockQuantity < item.qty)) {
        throw new Error(`Only ${locStock?.stockQuantity || 0} item(s) left in stock for "${product.name}".`);
      }
    } else {
      if (!product.isWeighed && product.stockQuantity < item.qty) {
        if (product.stockQuantity <= 0) {
          throw new Error(`"${product.name}" is currently out of stock.`);
        }
        throw new Error(`Only ${product.stockQuantity} item(s) left in stock for "${product.name}".`);
      }
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
  for (const group of orgGroups.values()) grandTotal += group.total;

  if (input.expectedTotal !== undefined && Math.abs(grandTotal - input.expectedTotal) > 0.01) {
    throw new Error('PRICE_CHANGED: The order total has changed due to price updates. Please review the new total.');
  }
  
  grandTotal = 0;
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
      const orderStatus = isWallet ? 'CONFIRMED' : 'PENDING';

      const orderIdempKey = input.idempotencyKey ? `${input.idempotencyKey}-${orgId}` : undefined;
      // Idempotency check for duplicate creation
      if (orderIdempKey) {
        const existingOrder = await tx.orm.public.RetailOrder.where({ idempotencyKey: orderIdempKey }).all().first();
        if (existingOrder) {
          // If we find an existing order, we return it safely
          return existingOrder;
        }
      }

      const paymentMethodStr = isWallet
        ? 'WALLET'
        : input.method === 'card'
        ? 'CARD'
        : input.method === 'whatsapp'
        ? 'WHATSAPP'
        : 'BANK_TRANSFER';

      const createdOrder = await tx.orm.public.RetailOrder.create({
        organizationId: orgId,
        locationId: input.locationId,
        customerDataId: customer.id,
        cashierId: 'ONLINE_CHECKOUT',
        totalAmount: group.total,
        paymentMethod: paymentMethodStr,
        status: orderStatus,
        deliveryAddress: input.deliveryAddress || null,
        idempotencyKey: orderIdempKey,
      });
      
      let txRecordId = undefined;
      if (isWallet && personId) {
        const txRecord = await debitResidentWallet(tx, personId, group.total, input.paymentReference || createdOrder.id, `Checkout Order ${createdOrder.id}`);
        txRecordId = txRecord.id;

        // Credit Merchant Organization Wallet
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
        status: isWallet ? 'COMPLETED' : 'PENDING',
        provider: isWallet ? 'INTERNAL_WALLET' : input.method === 'whatsapp' ? 'WHATSAPP' : (process.env.PAYMENT_PROVIDER || 'PAYSTACK').toUpperCase(),
        retailOrderId: createdOrder.id,
        reference: input.paymentReference,
        transactionId: txRecordId,
        idempotencyKey: input.idempotencyKey ? input.idempotencyKey + '_pay' : undefined,
      });
        
      for (const verifiedItem of group.items) {
        await tx.orm.public.RetailOrderItem.create({ orderId: createdOrder.id, ...verifiedItem });

        // Deduct stock immediately (reserve on checkout). Restored if payment fails.
          if (true) {
            // using location logic if possible
          if (input.locationId) {
               const locStock = await tx.orm.public.RetailLocationStock.where({ locationId: input.locationId, productId: verifiedItem.productId }).all().first();
               if (!locStock) {
                   throw new Error(`Insufficient stock for item at this location.`);
               }
               const plan = db.raw.sql`
                   UPDATE "retailLocationStock"
                   SET "stockQuantity" = "stockQuantity" - ${verifiedItem.quantity}
                   WHERE id = ${locStock.id} AND "stockQuantity" >= ${verifiedItem.quantity}
                   RETURNING "stockQuantity"
    `.returnsRow({ stockQuantity: 'pg/int4@1' }).build();
               const updated = await tx.execute(plan);
               if ((updated && updated.affectedRows === 0) || (Array.isArray(updated) && updated.length === 0) || !updated) {
                   throw new Error(`Insufficient stock for item at this location.`);
               }
               const nextStock = locStock.stockQuantity - verifiedItem.quantity;
               
               await tx.orm.public.RetailStockMovement.create({
                 organizationId: orgId,
                 locationId: input.locationId,
                 productId: verifiedItem.productId,
                 delta: -verifiedItem.quantity,
                 beforeQty: locStock.stockQuantity,
                 afterQty: nextStock,
                 reason: 'SALE',
                 note: `Online Order #${createdOrder.id.slice(0, 8)}`,
               });
            } else {
               const product = await tx.orm.public.RetailProduct.where({ id: verifiedItem.productId }).all().first();
               if (product && !product.isWeighed) {
                 const plan = db.raw.sql`
                   UPDATE "retailProduct"
                   SET "stockQuantity" = "stockQuantity" - ${verifiedItem.quantity}
                   WHERE id = ${product.id} AND "stockQuantity" >= ${verifiedItem.quantity}
                   RETURNING "stockQuantity"
    `.returnsRow({ stockQuantity: 'pg/int4@1' }).build();
                 const updated = await tx.execute(plan);
                 if ((updated && updated.affectedRows === 0) || (Array.isArray(updated) && updated.length === 0) || !updated) {
                   throw new Error(`Item "${product.name}" has insufficient stock.`);
                 }
                 const nextStock = product.stockQuantity - verifiedItem.quantity;
                 
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
      href: `/orders/${order.id}`,
    });
  }

  try { 
    revalidatePath('/workspaces/shopos'); 
    revalidatePath('/market'); 
    for(const item of input.items) { 
      revalidatePath(`/product/${item.productId}`); 
    } 
  } catch(e) {}
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
      const delivery = await getDeliveryStatusForSource('RETAIL_ORDER', o.id);
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
      status: o.status === 'CANCELLED' ? 'CANCELLED' : o.fulfillmentStatus,
        time: o.createdAt.toLocaleTimeString(),
        deliveryJobId: delivery?.deliveryJobId || null,
    };
  }));
}

import { getStorefrontPromotions } from '@/lib/actions/storefront-management';
import { classifyRetailProduct, inferStoreProfileTaxonomy } from '@/lib/taxonomy/retail-categorizer';
import { isTestOrDemoOrganization, isTestOrDemoProduct } from '@/lib/storefront-filter';

export async function getCityMartProducts(citySlug?: string, cat: string = 'All') {
  // Explicit slug wins; otherwise resolve the session's current city.
  const city = citySlug ? await getCityBySlug(citySlug) : await getCurrentCity();
  if (!city) return [];

  const locs = await db.orm.public.Location.where({ cityId: city.id }).all();
  const orgIdsInCity = Array.from(new Set(locs.map((l: any) => l.organizationId)));
  const allOrgs = await db.orm.public.Organization.all();
  const orgs = allOrgs.filter(
    (o: any) => o.type === 'RETAIL' && orgIdsInCity.includes(o.id) && !isTestOrDemoOrganization(o)
  );
  const orgIds = orgs.map(o => o.id);

  if (orgIds.length === 0) return [];

  const allProducts = await db.orm.public.RetailProduct.all();
  const retailCategories = await db.orm.public.RetailCategory.all();
  const categoryNameMap = new Map(retailCategories.map((c: any) => [c.id, c.name]));

  const enrichedAll = allProducts
    .filter((p: any) => orgIds.includes(p.organizationId) && !p.parentId && !isTestOrDemoProduct(p))
    .map((p: any) => {
      const org = orgs.find((o) => o.id === p.organizationId);
      const classified = classifyRetailProduct({
        name: p.name,
        description: p.description,
        price: p.price,
        storeCategory: (org as any)?.storeCategory,
      });
      const explicitAisle = p.categoryId ? categoryNameMap.get(p.categoryId) : null;
      const area = org?.address ? org.address.split(',')[0].trim() : city.name;
      return {
        ...p,
        globalCategory: p.globalCategory || classified.globalCategory,
        categoryName: explicitAisle || classified.inStoreCategory,
        brand: classified.brand,
        specTags: classified.specTags,
        storeName: org?.name || 'Unknown Store',
        storeCategory: (org as any)?.storeCategory || 'Electronics & Computers',
        orgSlug: org?.id,
        area,
        neighborhood: area,
      };
    });

  if (!cat || cat.toLowerCase() === 'all') return enrichedAll;

  const catSlug = cat.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return enrichedAll.filter((p: any) => {
    const pCatSlug = (p.globalCategory || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const aCatSlug = (p.categoryName || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const sCatSlug = (p.storeCategory || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return pCatSlug === catSlug || aCatSlug === catSlug || sCatSlug === catSlug;
  });
}

export async function getCityMartStores(citySlug?: string) {
  const city = citySlug ? await getCityBySlug(citySlug) : await getCurrentCity();
  if (!city) return [];

  const locs = await db.orm.public.Location.where({ cityId: city.id }).all();
  const orgIdsInCity = Array.from(new Set(locs.map((l: any) => l.organizationId)));
  const allOrgs = await db.orm.public.Organization.all();
  const orgs = allOrgs.filter(
    (o: any) => o.type === 'RETAIL' && orgIdsInCity.includes(o.id) && !isTestOrDemoOrganization(o)
  );

  const listings = await db.orm.public.DiscoveryListing.where({ cityId: city.id }).all();
  const listingMap = new Map(listings.map((l: any) => [l.organizationId, l]));
  const allProducts = await db.orm.public.RetailProduct.all();

  return orgs
    .map((o: any) => {
      const listing = listingMap.get(o.id);
      const orgProducts = allProducts.filter(
        (p: any) => p.organizationId === o.id && !p.parentId && !isTestOrDemoProduct(p)
      );
      const inferred = inferStoreProfileTaxonomy(orgProducts, o.storeCategory);

      let cover = o.logoAssetId || listing?.coverAssetId;
      let rating: number | null = null;
    let meta: any = null;
    if (listing?.metadata) {
      try {
        meta = JSON.parse(listing.metadata);
        if (!cover) cover = meta.coverImage || meta.images?.[0];
        if (typeof meta.rating === 'number' && meta.rating > 0) rating = meta.rating;
      } catch {}
    }
    const isVerified = Boolean(meta?.isVerified);
    const isFeatured = Boolean(meta?.isFeatured);
    const reviewCount = typeof meta?.reviewCount === 'number' ? meta.reviewCount : 0;
    const aisles = inferred.aisles.length > 0
      ? inferred.aisles
      : Array.isArray(meta?.aisles) && meta.aisles.length > 0 
      ? meta.aisles 
      : (o.storeCategory ? [o.storeCategory] : []);

    return {
      ...o,
      storeCategory: o.storeCategory || inferred.storeCategory,
      productCount: orgProducts.length,
      image: cover,
      storeCoverImage: cover,
      rating,
      reviewCount,
      deliveryEta: null,
      deliveryFee: null,
      freeDeliveryOver: null,
      isVerified,
      isFeatured,
      isFastCourier: false,
      aisles,
      badge: meta?.badge || (isFeatured ? 'Featured Partner' : undefined),
      neighborhood: o.address ? o.address.split(',')[0].trim() : city.name,
      area: o.address ? o.address.split(',')[0].trim() : city.name,
    };
  });
}

export async function getCityMarketFeed(citySlug?: string, activeAisle: string = 'All') {
  const city = citySlug ? await getCityBySlug(citySlug) : await getCurrentCity();
  if (!city) {
    return {
      stores: [],
      products: [],
      campaigns: [],
      categories: [{ id: 'all', label: 'All Goods', count: 0 }],
      storeSectors: [],
      deliveryHubs: [],
      defaultAddress: null,
      topSearchTags: [],
    };
  }

  // Always fetch all city products so category counts remain stable and client-side filtering is instant
  const [stores, allProducts, campaigns] = await Promise.all([
    getCityMartStores(city.slug),
    getCityMartProducts(city.slug, 'All'),
    getStorefrontPromotions(city.slug, 'MARKET'),
  ]);

  const locs = await db.orm.public.Location.where({ cityId: city.id }).all();
  const deliveryHubs = locs.map((l: any) => ({
    id: l.id,
    name: l.name || l.address || 'Retail Hub',
    address: l.address,
  }));

  let defaultAddress: string | null = null;
  const session = await getServerSession(authOptions).catch(() => null);
  if (session?.user?.personId) {
    try {
      const profile = await db.orm.public.ResidentProfile.where({ personId: session.user.personId }).all().first();
      defaultAddress = profile?.defaultDeliveryAddress ?? null;
    } catch {}
  }

  // 1. Dynamically derive Shop Sectors (Store-level categories)
  const sectorMap = new Map<string, { id: string; label: string; count: number }>();
  for (const s of stores) {
    const rawSector = (s.storeCategory || 'General Merchandise').trim();
    const id = rawSector.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const existing = sectorMap.get(id);
    if (existing) {
      existing.count += 1;
    } else {
      sectorMap.set(id, { id, label: rawSector, count: 1 });
    }
  }
  const storeSectors = [
    { id: 'all', label: 'All Shops', count: stores.length },
    ...Array.from(sectorMap.values()).sort((a, b) => b.count - a.count),
  ];

  // 2. Dynamically derive Product Aisles / Categories
  const categoryMap = new Map<string, { id: string; label: string; count: number }>();
  const addCategoryCount = (rawLabel: string) => {
    const clean = rawLabel.trim();
    if (!clean || clean.toLowerCase() === 'all') return;
    const id = clean.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const existing = categoryMap.get(id);
    if (existing) {
      existing.count += 1;
    } else {
      categoryMap.set(id, { id, label: clean, count: 1 });
    }
  };

  for (const p of allProducts) {
    const aisleLabel = (p as any).categoryName?.trim() || p.globalCategory?.trim() || (p as any).category?.trim();
    if (aisleLabel) {
      addCategoryCount(aisleLabel);
    } else if (p.storeCategory && p.storeCategory !== 'Supermarket') {
      addCategoryCount(p.storeCategory);
    }
  }

  // If no products had categories, fallback to store aisles
  if (categoryMap.size === 0) {
    for (const s of stores) {
      for (const a of s.aisles || []) {
        addCategoryCount(a);
      }
    }
  }

  const dynamicCategories = Array.from(categoryMap.values()).sort((a, b) => b.count - a.count);

  const categories = [
    { id: 'all', label: 'All Goods', count: allProducts.length },
    ...dynamicCategories,
  ];

  // Filter products if activeAisle was explicitly passed to server action
  const products =
    !activeAisle || activeAisle.toLowerCase() === 'all'
      ? allProducts
      : allProducts.filter((p: any) => {
          const aisleSlug = activeAisle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          const aCat = ((p as any).categoryName || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
          const pCat = (p.globalCategory || (p as any).category || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
          const sCat = (p.storeCategory || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
          return aCat === aisleSlug || pCat === aisleSlug || sCat === aisleSlug;
        });

  const topSearchTags = Array.from(
    new Set([
      ...dynamicCategories.slice(0, 4).map((c) => c.label),
      ...allProducts.slice(0, 4).map((p: any) => p.name),
    ])
  ).slice(0, 6);

  return {
    stores,
    products,
    campaigns,
    categories,
    storeSectors,
    deliveryHubs,
    defaultAddress,
    topSearchTags,
  };
}

export async function getCityMartProduct(productId: string) {
  const p = await db.orm.public.RetailProduct.where({ id: productId }).all().first();
  if (!p) return null;
  const org = await db.orm.public.Organization.where({ id: p.organizationId }).all().first();

  const activeCity = await getCurrentCity();
  let locs = await db.orm.public.Location.where({ organizationId: p.organizationId }).all();

  // Scope to the active city context
  if (activeCity) {
    const cityLocs = locs.filter((l) => l.cityId === activeCity.id);
    if (cityLocs.length > 0) {
      locs = cityLocs;
    }
  }

  // Fetch child variants and up to 6 other products from the same store
  const storeProducts = await db.orm.public.RetailProduct.where({ organizationId: p.organizationId }).all();
  const variants = storeProducts.filter((sp: any) => sp.parentId === p.id);
  const relatedProducts = storeProducts
    .filter((sp: any) => sp.id !== p.id && !sp.parentId && (sp.isWeighed || (sp.stockQuantity ?? 0) > 0))
    .slice(0, 6)
    .map((sp: any) => ({
      id: sp.id,
      name: sp.name,
      price: sp.price,
      description: sp.description,
      imageAssetId: sp.imageAssetId,
      imageUrl: (sp as any).imageUrl,
      storeName: org?.name || 'Unknown Store',
      orgSlug: org?.id,
      organizationId: sp.organizationId,
      globalCategory: sp.globalCategory,
      stockQuantity: sp.stockQuantity,
      isWeighed: sp.isWeighed,
      unit: sp.unit,
    }));

  return {
    ...p,
    variants,
    storeName: org?.name || 'Unknown Store',
    orgSlug: org?.id,
    citySlug: activeCity?.slug ?? null,
    relatedProducts,
  };
}

export async function fetchMyOrders() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.personId) return { error: 'Unauthorized' };
    const customerIds = await resolveResidentCustomerIds(session.user.personId);
    if (customerIds.length === 0) return [];
    const orders = await db.orm.public.RetailOrder
      .where((o: any) => o.customerDataId.in(customerIds))
      .all();
    orders.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    // Fetch delivery statuses efficiently
    const ordersWithDelivery = await Promise.all(orders.map(async (o: any) => {
      const delivery = await getDeliveryStatusForSource('RETAIL_ORDER', o.id);
      return {
        ...o,
        status: o.status === 'PENDING' ? 'pending' : 'completed',
        fulfillmentStatus: o.fulfillmentStatus,
        deliveryJobId: delivery?.deliveryJobId || null,
      };
    }));
    return ordersWithDelivery;
  } catch (error) {
    return [];
  }
}
