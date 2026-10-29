'use server';

import { db } from '@/src/prisma/db';
import { getCurrentCity, getCityBySlug } from '@/lib/city';
import { isTestOrDemoOrganization } from '@/lib/storefront-filter';
import { formatWhatsAppNumber } from '@/lib/whatsapp';
import {
  DirectoryListingItem,
  DIRECTORY_CATEGORIES,
  DirectoryCategoryId,
  DIRECTORY_CATEGORY_MAP,
} from '@/lib/directory-constants';

export async function getDirectoryListings(params?: {
  citySlug?: string;
  query?: string;
  category?: string;
  zone?: string;
  limit?: number;
  offset?: number;
}) {
  const city = params?.citySlug
    ? await getCityBySlug(params.citySlug)
    : await getCurrentCity();

  if (!city) {
    return {
      listings: [],
      totalCount: 0,
      zones: [],
      cityName: 'Calabar',
    };
  }

  const rawListings = await db.orm.public.DiscoveryListing
    .where({ cityId: city.id, isActive: true })
    .include('organization', (org: any) =>
      org.select('id', 'name', 'type', 'storeCategory', 'address', 'description', 'status', 'logoAssetId')
    )
    .include('location', (loc: any) => loc.select('id', 'address', 'name'))
    .all();

  // Filter out automated test/demo organizations
  const validListings = rawListings.filter(
    (l: any) =>
      !isTestOrDemoOrganization({
        id: l.organizationId,
        name: l.title || l.organization?.name,
        slug: l.slug,
      })
  );

  const directoryItems: DirectoryListingItem[] = [];
  const zonesSet = new Set<string>();

  for (const l of (validListings as any[])) {
    let meta: any = {};
    try {
      if (l.metadata) meta = JSON.parse(l.metadata);
    } catch {}

    const org = l.organization as any;
    const loc = l.location as any;
    const name = l.title || org?.name || 'Local Business';
    const rawVertical = (l.vertical || org?.type || 'SERVICES').toUpperCase();
    const rawCategory = (meta.category || org?.storeCategory || rawVertical).toUpperCase();

    // Map to canonical category id
    let catId: DirectoryCategoryId = DIRECTORY_CATEGORY_MAP[rawVertical] || DIRECTORY_CATEGORY_MAP[rawCategory] || 'artisans';
    if (meta.directoryCategory && DIRECTORY_CATEGORY_MAP[meta.directoryCategory.toUpperCase()]) {
      catId = DIRECTORY_CATEGORY_MAP[meta.directoryCategory.toUpperCase()];
    }

    const categoryObj = DIRECTORY_CATEGORIES.find((c) => c.id === catId) || DIRECTORY_CATEGORIES[0];

    const address = meta.address || loc?.address || org?.address || 'Calabar, Cross River State';
    const zone = meta.zone || loc?.name || null;
    if (zone) zonesSet.add(zone);

    const phone = meta.phone || '08065373747'; // fallback to central Calabar desk if not set
    const whatsapp = meta.whatsapp ? formatWhatsAppNumber(meta.whatsapp) : formatWhatsAppNumber(phone);

    directoryItems.push({
      id: l.organizationId,
      listingId: l.id,
      name,
      slug: l.slug,
      category: catId,
      categoryLabel: categoryObj.label,
      description: meta.description || l.description || org?.description || null,
      address,
      zone,
      landmark: meta.landmark || null,
      phone,
      whatsapp,
      hours: meta.hours || 'Mon - Sat: 8:00 AM - 6:00 PM',
      isClaimed: Boolean(meta.claimed),
      isVerified: meta.verified !== false,
      services: Array.isArray(meta.services) ? meta.services : [],
      website: meta.website || null,
      coverAssetId: l.coverAssetId || org?.logoAssetId || meta.coverImage || null,
      rating: typeof meta.rating === 'number' ? meta.rating : 4.8,
    });
  }

  // Deduplicate by name & address if duplicate test entries exist
  const uniqueItemsMap = new Map<string, DirectoryListingItem>();
  for (const item of directoryItems) {
    const key = `${item.name.toLowerCase().trim()}::${(item.address || '').toLowerCase().trim()}`;
    if (!uniqueItemsMap.has(key)) {
      uniqueItemsMap.set(key, item);
    }
  }
  let items = Array.from(uniqueItemsMap.values());

  // Filter by category
  if (params?.category && params.category !== 'all') {
    const cat = params.category.toLowerCase();
    items = items.filter((i) => i.category.toLowerCase() === cat);
  }

  // Filter by zone
  if (params?.zone && params.zone !== 'all') {
    const targetZone = params.zone.toLowerCase();
    items = items.filter(
      (i) => i.zone && i.zone.toLowerCase().includes(targetZone)
    );
  }

  // Text search query
  if (params?.query && params.query.trim().length > 0) {
    const q = params.query.trim().toLowerCase();
    items = items.filter((i) => {
      return (
        i.name.toLowerCase().includes(q) ||
        (i.description && i.description.toLowerCase().includes(q)) ||
        (i.address && i.address.toLowerCase().includes(q)) ||
        (i.zone && i.zone.toLowerCase().includes(q)) ||
        (i.landmark && i.landmark.toLowerCase().includes(q)) ||
        (i.categoryLabel && i.categoryLabel.toLowerCase().includes(q)) ||
        i.services.some((s) => s.toLowerCase().includes(q))
      );
    });
  }

  const totalCount = items.length;
  const offset = params?.offset || 0;
  const limit = params?.limit || 50;
  const paginatedItems = items.slice(offset, offset + limit);

  return {
    listings: paginatedItems,
    totalCount,
    zones: Array.from(zonesSet).sort(),
    cityName: city.name,
  };
}
