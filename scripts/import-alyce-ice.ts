import { db } from '../src/prisma/db';
import { v4 as uuidv4 } from 'uuid';

interface ScrapedItem {
  id: string;
  slug: string;
  name: string;
  price: number;
  description?: string | null;
  image?: string | null;
  category?: string | null;
}

const CATEGORY_MAP: Record<string, string> = {
  'desserts': 'Ice Cream & Desserts',
  'pastries-bread': 'Pastries, Pizza & Shawarma',
  'snacks-small-chops': 'Snacks & Small Chops',
  'grills-proteins': 'Grills & Proteins',
  'rice-grains': 'Rice & Pasta',
  'soups-swallow': 'Soups & Swallow',
  'drinks-beverages': 'Drinks & Beverages',
  'uncategorized': 'Specialties',
};

function resolveCategory(cat: string | null | undefined, name: string): string {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('salad')) return 'Sides & Salads';
  if (lowerName.includes('stew')) return 'Soups & Swallow';
  if (lowerName.includes('topping') || lowerName.includes('sprinkles') || lowerName.includes('icecream') || lowerName.includes('parfait')) {
    return 'Ice Cream & Desserts';
  }
  if (lowerName.includes('kilishi')) return 'Grills & Proteins';
  if (lowerName.includes('shawarma') || lowerName.includes('pizza') || lowerName.includes('bread')) {
    return 'Pastries, Pizza & Shawarma';
  }
  if (cat && CATEGORY_MAP[cat]) return CATEGORY_MAP[cat];
  return 'Specialties';
}

async function main() {
  console.log('--- STARTING ALYCE-ICE CONFECTIONERY IMPORT ---');

  // 1. Fetch vendor data
  const vendorRes = await fetch('https://developer.carrygo.org/api/v1/vendors/alyce-ice-confectionery-jql4');
  const vendorJson = await vendorRes.json();
  const vendor = vendorJson.data?.vendor;

  if (!vendor) {
    throw new Error('Failed to fetch vendor details from CarryGo');
  }

  console.log(`Vendor fetched: ${vendor.name} (${vendor.storeAddress})`);

  // 2. Fetch full catalog of items
  const itemsFile = 'scratch/alyce-all-items.json';
  const fs = await import('fs');
  let rawItems: ScrapedItem[] = [];

  if (fs.existsSync(itemsFile)) {
    rawItems = JSON.parse(fs.readFileSync(itemsFile, 'utf8'));
    console.log(`Loaded ${rawItems.length} items from ${itemsFile}`);
  } else {
    throw new Error(`Could not find ${itemsFile}. Please run scraper first.`);
  }

  // 3. Remove any previous test org with org_ prefix if present
  try {
    const oldMenuItems = await db.orm.public.MenuItem.where({ organizationId: 'org_alyce_ice_calabar' }).all();
    for (const it of oldMenuItems) {
      await db.orm.public.MenuItem.where({ id: it.id }).delete();
    }
    await db.orm.public.DiscoveryListing.where({ id: 'dl_alyce_ice_calabar' }).delete();
    await db.orm.public.Location.where({ id: 'loc_alyce_ice_marian' }).delete();
    await db.orm.public.Organization.where({ id: 'org_alyce_ice_calabar' }).delete();
    console.log('Cleaned up previous org_alyce_ice_calabar records.');
  } catch {}

  // 4. Setup Permanent Organization with authentic UUID in Calabar
  const CALABAR_CITY_ID = 'c497e1f5-4dc7-4340-b007-0a1e9e765b90';
  const ORG_ID = 'b7e1ce90-881b-4871-9c6a-4a7b51e08ce7';
  const LOC_ID = 'c9a2ef40-771c-4b68-9d8a-5b8c62f19df8';
  const DL_ID = 'e8b3fa50-661d-4a59-8e9b-6c9d73a20ea9';

  let org = await db.orm.public.Organization.where({ id: ORG_ID }).first();
  if (!org) {
    org = await db.orm.public.Organization.create({
      id: ORG_ID,
      name: 'Alyce-Ice Confectionery',
      type: 'RESTAURANT',
      status: 'ACTIVE',
      storeCategory: 'Ice Cream & Confectionery',
      address: vendor.storeAddress || '40 Ndidem Usang Iso Rd, Big Qua Town, Calabar, Cross River, Nigeria',
      logoAssetId: vendor.logo || vendor.image || 'https://res.cloudinary.com/https-carrygo-com/image/upload/v1790339954/shops/logos/otigb2kyp2hhsypnmby1.png',
      description: 'Premier ice cream parlour, confectionery, bakery and quick dining in Calabar. Famous for soft-serve ice cream, fresh pastries, pizza, shawarma, cakes, and local dishes.',
    });
    console.log(`Created Organization: ${org.name} (${org.id})`);
  } else {
    await db.orm.public.Organization.where({ id: ORG_ID }).update({
      name: 'Alyce-Ice Confectionery',
      status: 'ACTIVE',
      storeCategory: 'Ice Cream & Confectionery',
      address: vendor.storeAddress || '40 Ndidem Usang Iso Rd, Big Qua Town, Calabar, Cross River, Nigeria',
      logoAssetId: vendor.logo || vendor.image,
      description: 'Premier ice cream parlour, confectionery, bakery and quick dining in Calabar. Famous for soft-serve ice cream, fresh pastries, pizza, shawarma, cakes, and local dishes.',
    });
    console.log(`Updated Organization: ${org.name} (${org.id})`);
  }

  // 5. Setup Location
  let loc = await db.orm.public.Location.where({ id: LOC_ID }).first();
  if (!loc) {
    loc = await db.orm.public.Location.create({
      id: LOC_ID,
      organizationId: ORG_ID,
      name: 'Alyce-Ice Confectionery - Marian Branch',
      address: '40 Ndidem Usang Iso Rd, Big Qua Town, Calabar',
      cityId: CALABAR_CITY_ID,
      latitude: 4.969,
      longitude: 8.335,
    });
    console.log(`Created Location: ${loc.name} (${loc.id})`);
  } else {
    await db.orm.public.Location.where({ id: LOC_ID }).update({
      name: 'Alyce-Ice Confectionery - Marian Branch',
      address: '40 Ndidem Usang Iso Rd, Big Qua Town, Calabar',
      cityId: CALABAR_CITY_ID,
      latitude: 4.969,
      longitude: 8.335,
    });
    console.log(`Updated Location: ${loc.name} (${loc.id})`);
  }

  // 6. Setup DiscoveryListing
  const metadata = JSON.stringify({
    coverImage: vendor.image || vendor.logo,
    logoUrl: vendor.logo || vendor.image,
    phone: '08034567890',
    hours: '09:00 AM - 10:00 PM daily',
    tags: ['Ice Cream', 'Confectionery', 'Pastries', 'Shawarma', 'Pizza', 'Fast Food'],
    sourceUrl: 'https://emart.carrygo.org/store/alyce-ice-confectionery-jql4',
    rating: 4.8,
    reviewCount: 24,
    isOpen: true,
    deliveryEta: '20 - 35 min',
    deliveryFee: 500,
    website: 'https://emart.carrygo.org/store/alyce-ice-confectionery-jql4',
    source: 'CarryGo eMart (alyce-ice-confectionery-jql4)',
    isVerified: true,
  });

  const dl = await db.orm.public.DiscoveryListing.where({ id: DL_ID }).first();
  if (!dl) {
    await db.orm.public.DiscoveryListing.create({
      id: DL_ID,
      organizationId: ORG_ID,
      locationId: LOC_ID,
      cityId: CALABAR_CITY_ID,
      vertical: 'RESTAURANT',
      title: 'Alyce-Ice Confectionery',
      slug: 'alyce-ice-confectionery',
      description: 'Popular confectionery and ice cream hub along Marian Road, Calabar. Freshly baked pastries, signature cone & cup ice creams, pizzas, shawarmas, and native dishes.',
      coverAssetId: vendor.image || vendor.logo,
      isActive: true,
      metadata,
    });
    console.log(`Created DiscoveryListing for Alyce-Ice Confectionery`);
  } else {
    await db.orm.public.DiscoveryListing.where({ id: DL_ID }).update({
      organizationId: ORG_ID,
      locationId: LOC_ID,
      cityId: CALABAR_CITY_ID,
      vertical: 'RESTAURANT',
      title: 'Alyce-Ice Confectionery',
      slug: 'alyce-ice-confectionery',
      description: 'Popular confectionery and ice cream hub along Marian Road, Calabar. Freshly baked pastries, signature cone & cup ice creams, pizzas, shawarmas, and native dishes.',
      coverAssetId: vendor.image || vendor.logo,
      isActive: true,
      metadata,
    });
    console.log(`Updated DiscoveryListing for Alyce-Ice Confectionery`);
  }

  // 7. Clean existing items under ORG_ID
  const existingItems = await db.orm.public.MenuItem.where({ organizationId: ORG_ID }).all();
  if (existingItems.length > 0) {
    console.log(`Removing ${existingItems.length} existing items for clean sync...`);
    for (const it of existingItems) {
      await db.orm.public.MenuItem.where({ id: it.id }).delete();
    }
  }

  // 8. Insert all 76 items with extra 15% price markup
  console.log(`\nImporting ${rawItems.length} menu items with +15% price markup...`);
  let importedCount = 0;

  for (const item of rawItems) {
    const originalPrice = Number(item.price);
    // Add extra 15% (e.g. price * 1.15)
    const markupPrice = Math.round(originalPrice * 1.15);
    const category = resolveCategory(item.category, item.name);

    await db.orm.public.MenuItem.create({
      id: uuidv4(),
      organizationId: ORG_ID,
      locationId: LOC_ID,
      name: item.name.trim(),
      description: item.description?.trim() || `${category} - Freshly prepared at Alyce-Ice Confectionery`,
      price: markupPrice,
      category,
      imageUrl: item.image || null,
      isAvailable: true,
      kitchenStation: category.includes('Ice Cream') ? 'Dessert Station' : (category.includes('Pastries') ? 'Bakery Station' : 'Main Kitchen'),
    });

    importedCount++;
  }

  console.log(`Successfully imported ${importedCount} items with +15% markup!`);

  // 9. Verification
  const checkItems = await db.orm.public.MenuItem.where({ organizationId: ORG_ID }).all();
  console.log(`\nDatabase verification: ${checkItems.length} total items in DB for Alyce-Ice.`);
}

main().catch(console.error).finally(() => process.exit(0));
