'use server';

import { db } from '@/src/prisma/db';
import { requireSystemAdmin } from '@/lib/rbac';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { notifyPerson, personIdForCustomerData } from '@/lib/notify';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';

export interface ManagedBusinessSummary {
  id: string;
  name: string;
  type: string;
  address: string | null;
  description: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  cityId: string | null;
  cityName: string;
  isClaimed: boolean;
  status: string;
  listingStatus: 'PUBLISHED' | 'PENDING_REVIEW' | 'UNLISTED';
  catalogCount: number;
  mediaCount: number;
  pendingOrdersCount: number;
  postsCount: number;
}

/**
 * Fetch all businesses for HQ multi-business management with readiness metrics.
 */
export async function getManagedBusinessesList(): Promise<ManagedBusinessSummary[]> {
  await requireSystemAdmin();

  const [orgs, listings, memberships, menuItems, retailProducts, hotelRooms, cities, posts, restaurantOrders] = await Promise.all([
    db.orm.public.Organization.all(),
    db.orm.public.DiscoveryListing.all(),
    db.orm.public.Membership.all(),
    db.orm.public.MenuItem.all(),
    db.orm.public.RetailProduct.all(),
    db.orm.public.HotelRoom.all(),
    db.orm.public.City.all(),
    db.orm.public.Post.all(),
    db.orm.public.RestaurantOrder.all(),
  ]);

  const cityMap = new Map(cities.map((c: any) => [c.id, c.name]));
  const claimedOrgIds = new Set(
    memberships
      .filter((m: any) => m.organizationId)
      .map((m: any) => m.organizationId)
  );

  const listingByOrgId = new Map(listings.map((l: any) => [l.organizationId, l]));

  // Index catalog items by orgId
  const catalogCountByOrg = new Map<string, number>();
  for (const m of menuItems) catalogCountByOrg.set(m.organizationId, (catalogCountByOrg.get(m.organizationId) || 0) + 1);
  for (const r of retailProducts) catalogCountByOrg.set(r.organizationId, (catalogCountByOrg.get(r.organizationId) || 0) + 1);
  for (const h of hotelRooms) catalogCountByOrg.set(h.organizationId, (catalogCountByOrg.get(h.organizationId) || 0) + 1);

  // Index posts
  const postsCountByOrg = new Map<string, number>();
  for (const p of posts) {
    if (p.organizationId) {
      postsCountByOrg.set(p.organizationId, (postsCountByOrg.get(p.organizationId) || 0) + 1);
    }
  }

  // Index active orders
  const activeOrdersCountByOrg = new Map<string, number>();
  for (const o of restaurantOrders) {
    if (o.status === 'PENDING' || o.status === 'PREPARING' || o.status === 'READY' || o.status === 'DELIVERING') {
      activeOrdersCountByOrg.set(o.organizationId, (activeOrdersCountByOrg.get(o.organizationId) || 0) + 1);
    }
  }

  return orgs.map((org: any) => {
    const listing = listingByOrgId.get(org.id);
    let meta: any = {};
    try {
      if (listing?.metadata) meta = JSON.parse(listing.metadata);
    } catch {
      meta = {};
    }

    const isClaimed = claimedOrgIds.has(org.id);
    let listingStatus: 'PUBLISHED' | 'PENDING_REVIEW' | 'UNLISTED' = 'UNLISTED';
    if (listing) {
      if (listing.isActive) listingStatus = 'PUBLISHED';
      else listingStatus = 'PENDING_REVIEW';
    }

    const photosList = Array.isArray(meta.images) ? meta.images : [];
    const videosList = Array.isArray(meta.videos) ? meta.videos : [];
    const mediaCount = (listing?.coverAssetId ? 1 : 0) + (org.logoAssetId ? 1 : 0) + photosList.length + videosList.length;

    return {
      id: org.id,
      name: org.name,
      type: org.type,
      address: org.address,
      description: org.description,
      logoUrl: org.logoAssetId,
      coverUrl: listing?.coverAssetId || meta.coverImage || null,
      cityId: listing?.cityId || null,
      cityName: (listing?.cityId && cityMap.get(listing.cityId)) || 'Calabar',
      isClaimed,
      status: org.status,
      listingStatus,
      catalogCount: catalogCountByOrg.get(org.id) || 0,
      mediaCount,
      pendingOrdersCount: activeOrdersCountByOrg.get(org.id) || 0,
      postsCount: postsCountByOrg.get(org.id) || 0,
    };
  });
}

/**
 * Fetch deep operational details for an individual managed business.
 */
export async function getManagedBusinessFullDetails(organizationId: string) {
  await requireSystemAdmin();

  const org = await db.orm.public.Organization.where({ id: organizationId }).all().first();
  if (!org) throw new Error('Organization not found');

  const [listing, locations, menuItems, retailProducts, hotelRooms, posts, contactPoints, orders] = await Promise.all([
    db.orm.public.DiscoveryListing.where({ organizationId }).all().first(),
    db.orm.public.Location.where({ organizationId }).all(),
    db.orm.public.MenuItem.where({ organizationId }).all(),
    db.orm.public.RetailProduct.where({ organizationId }).all(),
    db.orm.public.HotelRoom.where({ organizationId }).all(),
    db.orm.public.Post.where({ organizationId }).all(),
    db.orm.public.OrganizationContactPoint.where({ organizationId }).all(),
    db.orm.public.RestaurantOrder.where({ organizationId }).all(),
  ]);

  let metadata: any = {};
  try {
    if (listing?.metadata) metadata = JSON.parse(listing.metadata);
  } catch {
    metadata = {};
  }

  // Enrich orders with item count
  const enrichedOrders = [];
  for (const o of orders.slice(-25)) {
    const items = await db.orm.public.OrderItem.where({ orderId: o.id }).all();
    const customer = await db.orm.public.CustomerData.where({ id: o.customerDataId }).all().first();
    let person = null;
    if (customer?.relationshipId) {
      const rel = await db.orm.public.Relationship.where({ id: customer.relationshipId }).all().first();
      if (rel?.personId) {
        person = await db.orm.public.Person.where({ id: rel.personId }).all().first();
      }
    }
    enrichedOrders.push({
      ...o,
      itemsCount: items.length,
      items: items.map((it: any) => ({
        id: it.id,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        menuItemId: it.menuItemId,
      })),
      customerName: person ? `${person.firstName} ${person.lastName}` : 'Resident Customer',
    });
  }

  return {
    organization: org,
    listing,
    metadata,
    locations,
    catalog: {
      menuItems: menuItems.map((m: any) => ({
        id: m.id,
        name: m.name,
        category: m.category,
        price: m.price,
        description: m.description,
        imageUrl: m.imageUrl,
        isAvailable: m.isAvailable,
        kitchenStation: m.kitchenStation,
      })),
      retailProducts: retailProducts.map((r: any) => ({
        id: r.id,
        name: r.name,
        price: r.price,
        compareAtPrice: r.compareAtPrice,
        sku: r.sku,
        description: r.description,
        stockQuantity: r.stockQuantity,
      })),
      hotelRooms: hotelRooms.map((h: any) => ({
        id: h.id,
        roomNumber: h.roomNumber,
        type: h.type,
        baseRate: h.baseRate,
        status: h.status,
      })),
    },
    posts: posts.map((p: any) => ({
      id: p.id,
      title: p.title,
      content: p.content,
      category: p.category,
      imageUrl: p.imageUrl,
      videoUrl: p.videoUrl,
      price: p.price,
      createdAt: p.createdAt,
    })),
    contactPoints: contactPoints.map((c: any) => ({
      id: c.id,
      type: c.type,
      value: c.value,
      isPrimary: c.isPrimary,
    })),
    orders: enrichedOrders,
  };
}

/**
 * Insert or update a MenuItem for a managed business.
 */
export async function upsertManagedMenuItem(payload: {
  id?: string;
  organizationId: string;
  name: string;
  category: string;
  price: number;
  description?: string;
  imageUrl?: string;
  isAvailable?: boolean;
  kitchenStation?: string;
}) {
  await requireSystemAdmin();
  const session = await getServerSession(authOptions);
  const actorPersonId = session?.user?.personId || 'system';

  const org = await db.orm.public.Organization.where({ id: payload.organizationId }).all().first();
  if (!org) throw new Error('Organization not found');

  const loc = await db.orm.public.Location.where({ organizationId: payload.organizationId }).all().first();

  let menuItemId = payload.id;

  await db.transaction(async (tx) => {
    if (menuItemId) {
      // Update
      await tx.orm.public.MenuItem.where({ id: menuItemId }).update({
        name: payload.name.trim(),
        category: payload.category.trim(),
        price: Number(payload.price),
        description: payload.description?.trim() || null,
        imageUrl: payload.imageUrl?.trim() || null,
        isAvailable: payload.isAvailable ?? true,
        kitchenStation: payload.kitchenStation?.trim() || 'Main Kitchen',
      });
    } else {
      // Insert
      menuItemId = uuidv4();
      await tx.orm.public.MenuItem.create({
        id: menuItemId,
        organizationId: payload.organizationId,
        locationId: loc?.id || null,
        name: payload.name.trim(),
        category: payload.category.trim(),
        price: Number(payload.price),
        description: payload.description?.trim() || null,
        imageUrl: payload.imageUrl?.trim() || null,
        isAvailable: payload.isAvailable ?? true,
        kitchenStation: payload.kitchenStation?.trim() || 'Main Kitchen',
      });
    }

    await tx.orm.public.HQAuditEvent.create({
      actorPersonId: actorPersonId!,
      action: 'MANAGED_MENU_ITEM_UPSERT',
      targetType: 'MenuItem',
      targetId: menuItemId,
      metadata: {
        organizationId: payload.organizationId,
        name: payload.name,
        price: payload.price,
      },
    });
  });

  revalidatePath(`/hq/managed/${payload.organizationId}`);
  revalidatePath(`/org/${payload.organizationId}`);
  revalidatePath('/food');
  return { success: true, menuItemId };
}

/**
 * Delete a MenuItem.
 */
export async function deleteManagedMenuItem(itemId: string, organizationId: string) {
  await requireSystemAdmin();
  const session = await getServerSession(authOptions);
  const actorPersonId = session?.user?.personId || 'system';

  await db.transaction(async (tx) => {
    await tx.orm.public.MenuItem.where({ id: itemId }).delete();
    await tx.orm.public.HQAuditEvent.create({
      actorPersonId: actorPersonId!,
      action: 'MANAGED_MENU_ITEM_DELETED',
      targetType: 'MenuItem',
      targetId: itemId,
      metadata: { organizationId },
    });
  });

  revalidatePath(`/hq/managed/${organizationId}`);
  revalidatePath(`/org/${organizationId}`);
  return { success: true };
}

/**
 * Update media assets (logo, cover, gallery images, video links) for a managed business.
 */
export async function saveManagedBusinessMedia(payload: {
  organizationId: string;
  logoUrl?: string;
  coverUrl?: string;
  images: string[];
  videos?: string[];
  featuredVideo?: string;
  website?: string;
}) {
  await requireSystemAdmin();
  const session = await getServerSession(authOptions);
  const actorPersonId = session?.user?.personId || 'system';

  const org = await db.orm.public.Organization.where({ id: payload.organizationId }).all().first();
  if (!org) throw new Error('Organization not found');

  const listing = await db.orm.public.DiscoveryListing.where({ organizationId: payload.organizationId }).all().first();

  await db.transaction(async (tx) => {
    // 1. Update logo on Organization
    if (payload.logoUrl !== undefined) {
      await tx.orm.public.Organization.where({ id: payload.organizationId }).update({
        logoAssetId: payload.logoUrl.trim() || null,
      });
    }

    // 2. Update DiscoveryListing cover and metadata
    if (listing) {
      let meta: any = {};
      try {
        if (listing.metadata) meta = JSON.parse(listing.metadata);
      } catch {
        meta = {};
      }

      meta.coverImage = payload.coverUrl || meta.coverImage || null;
      meta.images = payload.images.filter(Boolean);
      meta.videos = payload.videos?.filter(Boolean) || [];
      if (payload.featuredVideo) meta.featuredVideo = payload.featuredVideo.trim();
      if (payload.website) meta.website = payload.website.trim();

      await tx.orm.public.DiscoveryListing.where({ id: listing.id }).update({
        coverAssetId: payload.coverUrl?.trim() || listing.coverAssetId,
        metadata: JSON.stringify(meta),
      });
    }

    await tx.orm.public.HQAuditEvent.create({
      actorPersonId: actorPersonId!,
      action: 'MANAGED_MEDIA_UPDATED',
      targetType: 'Organization',
      targetId: payload.organizationId,
      metadata: {
        imagesCount: payload.images.length,
        hasVideos: Boolean(payload.videos?.length || payload.featuredVideo),
      },
    });
  });

  revalidatePath(`/hq/managed/${payload.organizationId}`);
  revalidatePath(`/org/${payload.organizationId}`);
  revalidatePath('/explore');
  revalidatePath('/food');
  return { success: true };
}

/**
 * Create a public community post on behalf of the managed business.
 */
export async function createManagedBusinessPost(payload: {
  organizationId: string;
  title: string;
  content: string;
  category: string;
  imageUrl?: string;
  videoUrl?: string;
  price?: number;
}) {
  await requireSystemAdmin();
  const session = await getServerSession(authOptions);
  const actorPersonId = session?.user?.personId || null;

  const org = await db.orm.public.Organization.where({ id: payload.organizationId }).all().first();
  if (!org) throw new Error('Organization not found');

  const postId = uuidv4();

  await db.transaction(async (tx) => {
    await tx.orm.public.Post.create({
      id: postId,
      organizationId: payload.organizationId,
      personId: actorPersonId,
      title: payload.title.trim(),
      content: payload.content.trim(),
      category: payload.category || 'DAILY_SPECIAL',
      status: 'PUBLISHED',
      imageUrl: payload.imageUrl?.trim() || null,
      videoUrl: payload.videoUrl?.trim() || null,
      price: payload.price ? Number(payload.price) : null,
      viewCount: 0,
      shareCount: 0,
    });

    await tx.orm.public.HQAuditEvent.create({
      actorPersonId: actorPersonId || 'system',
      action: 'MANAGED_POST_CREATED',
      targetType: 'Post',
      targetId: postId,
      metadata: {
        organizationId: payload.organizationId,
        title: payload.title,
      },
    });
  });

  revalidatePath(`/hq/managed/${payload.organizationId}`);
  revalidatePath(`/org/${payload.organizationId}`);
  revalidatePath('/community');
  return { success: true, postId };
}

/**
 * Delete a managed business post.
 */
export async function deleteManagedBusinessPost(postId: string, organizationId: string) {
  await requireSystemAdmin();
  await db.orm.public.Post.where({ id: postId }).delete();
  revalidatePath(`/hq/managed/${organizationId}`);
  return { success: true };
}

/**
 * Retrieve all orders for unconfirmed / managed businesses for HQ Concierge Dispatch.
 */
export async function getHQManagedOrders(filters?: { status?: string; organizationId?: string }) {
  await requireSystemAdmin();

  let orders = await db.orm.public.RestaurantOrder.all();

  if (filters?.status && filters.status !== 'ALL') {
    orders = orders.filter((o: any) => o.status === filters.status);
  }

  if (filters?.organizationId) {
    orders = orders.filter((o: any) => o.organizationId === filters.organizationId);
  }

  // Sort newest first
  orders.sort((a: any, b: any) => {
    const da = a.createdAt ? new Date(a.createdAt.toString()).getTime() : 0;
    const dbTime = b.createdAt ? new Date(b.createdAt.toString()).getTime() : 0;
    return dbTime - da;
  });

  const enriched = await Promise.all(
    orders.slice(0, 100).map(async (order: any) => {
      const org = await db.orm.public.Organization.where({ id: order.organizationId }).all().first();
      const items = await db.orm.public.OrderItem.where({ orderId: order.id }).all();
      const customer = await db.orm.public.CustomerData.where({ id: order.customerDataId }).all().first();

      let person: any = null;
      let phone: string | null = null;
      if (customer?.relationshipId) {
        const rel = await db.orm.public.Relationship.where({ id: customer.relationshipId }).all().first();
        if (rel?.personId) {
          person = await db.orm.public.Person.where({ id: rel.personId }).all().first();
          const phoneIdent = await db.orm.public.PersonIdentifier.where({ personId: rel.personId, type: 'PHONE' }).all().first();
          phone = phoneIdent?.normalizedValue || null;
        }
      }

      // Resolve items
      const enrichedItems = await Promise.all(
        items.map(async (it: any) => {
          const m = await db.orm.public.MenuItem.where({ id: it.menuItemId }).all().first();
          return {
            id: it.id,
            name: m?.name || 'Dish Item',
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            imageUrl: m?.imageUrl || null,
          };
        })
      );

      return {
        id: order.id,
        organizationId: order.organizationId,
        organizationName: org?.name || 'Managed Spot',
        organizationAddress: org?.address || 'Calabar',
        totalAmount: order.totalAmount,
        status: order.status,
        paymentStatus: order.paymentStatus,
        type: order.type,
        createdAt: order.createdAt ? order.createdAt.toString() : new Date().toISOString(),
        customer: {
          name: person ? `${person.firstName} ${person.lastName}` : 'Resident Customer',
          phone: phone || 'No phone recorded',
        },
        items: enrichedItems,
      };
    })
  );

  return enriched;
}

/**
 * HQ Admin updates order fulfillment status (e.g., marks PREPARING, OUT_FOR_DELIVERY, DELIVERED).
 * Triggers real-time resident notification and audit log.
 */
export async function updateHQManagedOrderStatus(payload: {
  orderId: string;
  newStatus: string;
  adminNote?: string;
}) {
  await requireSystemAdmin();
  const session = await getServerSession(authOptions);
  const actorPersonId = session?.user?.personId || 'system';

  const order = await db.orm.public.RestaurantOrder.where({ id: payload.orderId }).all().first();
  if (!order) throw new Error('Order not found');

  const org = await db.orm.public.Organization.where({ id: order.organizationId }).all().first();

  await db.transaction(async (tx) => {
    await tx.orm.public.RestaurantOrder.where({ id: payload.orderId }).update({
      status: payload.newStatus as any,
    });

    await tx.orm.public.HQAuditEvent.create({
      actorPersonId: actorPersonId!,
      action: 'MANAGED_ORDER_STATUS_UPDATED',
      targetType: 'RestaurantOrder',
      targetId: payload.orderId,
      metadata: {
        organizationId: order.organizationId,
        previousStatus: order.status,
        newStatus: payload.newStatus,
        note: payload.adminNote || null,
      },
    });
  });

  // Notify resident in real-time
  const residentPersonId = order.customerDataId ? await personIdForCustomerData(order.customerDataId) : null;
  if (residentPersonId) {
    const statusTitles: Record<string, string> = {
      PREPARING: `Your order from ${org?.name || 'the restaurant'} is being prepared! 🍳`,
      READY: `Your order from ${org?.name || 'the restaurant'} is packaged and ready! 🛍️`,
      DELIVERING: `A CityOS courier is on the way with your order! 🚴💨`,
      COMPLETED: `Your order from ${org?.name || 'the restaurant'} has been delivered. Enjoy! 😋`,
      CANCELLED: `Your order from ${org?.name || 'the restaurant'} was cancelled.`,
    };

    await notifyPerson(residentPersonId, {
      type: 'ORDER_STATUS_UPDATED',
      title: statusTitles[payload.newStatus] || `Order update: ${payload.newStatus}`,
      body: payload.adminNote || `Status updated to ${payload.newStatus}. Total: ₦${order.totalAmount.toLocaleString()}`,
      href: '/orders',
    });
  }

  revalidatePath('/hq/orders');
  revalidatePath(`/hq/managed/${order.organizationId}`);
  revalidatePath('/orders');
  return { success: true };
}
