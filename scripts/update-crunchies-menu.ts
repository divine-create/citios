import { db } from '../src/prisma/db';
import { v4 as uuidv4 } from 'uuid';

const CRUNCHIES_ORG_ID = '3c9212da-52a4-427c-94b6-cb8b80ef45ca';
const CRUNCHIES_LOC_ID = '354db86a-91db-44e8-b6b3-a477645201fa';
const MARIAN_OUTLET_ID = '6578762d84f5c816d7780723';

const CATEGORY_MAP: Record<string, string> = {
  'CAKES': 'Cakes & Celebration',
  'FOOD': 'Rice & Meals',
  'Food': 'Rice & Meals',
  'DRINKS': 'Drinks & Beverages',
  'ICE CREAM': 'Ice Cream & Desserts',
  'PASTRY': 'Pies & Pastries',
  'PROMO': 'Combos & Specials',
  'LOYALTY': 'Loyalty Deals',
  'SHAWARMA': 'Shawarma & Wraps',
  'BREAD': 'Fresh Bakery',
  'PROTEIN': 'Chicken & Protein',
};

function resolveStation(category: string): string {
  if (category.includes('Cake')) return 'Bakery & Cake Station';
  if (category.includes('Ice Cream')) return 'Dessert Station';
  if (category.includes('Pastries') || category.includes('Bakery')) return 'Bakery Station';
  if (category.includes('Drinks')) return 'Beverage Station';
  return 'Main Kitchen';
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/['"’“”]/g, '').replace(/\s+/g, ' ').trim();
}

async function main() {
  console.log('--- STARTING CRUNCHIES ONLINE MENU SYNC (+15% MARKUP) ---');

  // 1. Fetch live production menu for Marian Road, Calabar
  const res = await fetch(`https://api.crunchiesonline.com/api/v1/menu/unauthenticated?outlet_id=${MARIAN_OUTLET_ID}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch Crunchies menu: ${res.statusText}`);
  }
  const liveMenu: any[] = await res.json();
  console.log(`Fetched ${liveMenu.length} current items from Crunchies Marian Road official catalog.`);

  // 2. Fetch existing menu items in CityOS DB
  const existingItems = await db.orm.public.MenuItem.where({ organizationId: CRUNCHIES_ORG_ID }).all();
  console.log(`Current items in CityOS DB: ${existingItems.length}`);

  const existingMap = new Map<string, any>();
  for (const it of existingItems) {
    const key = normalizeName(it.name);
    existingMap.set(key, it);
  }

  let updatedCount = 0;
  let createdCount = 0;
  const processedKeys = new Set<string>();

  console.log('\nProcessing live items with +15% price markup...');

  for (const it of liveMenu) {
    const rawName = it.name.trim();
    let resolvedName = rawName;
    if (rawName.toLowerCase() === 'ice cream') {
      resolvedName = it.description?.includes('1/2') ? 'Ice Cream (1/2 Litre)' : 'Ice Cream (1 Litre)';
    }

    const key = normalizeName(resolvedName);
    processedKeys.add(key);

    const basePrice = Number(it.outlet_menu?.price ?? it.price ?? 0);
    // Add 15% markup
    const markupPrice = Math.round(basePrice * 1.15);

    const rawCategory = it.category || 'FOOD';
    const category = CATEGORY_MAP[rawCategory] || CATEGORY_MAP[rawCategory.toUpperCase()] || 'Rice & Meals';
    const isAvailable = Boolean(it.outlet_menu?.is_available !== false && it.is_available !== false);
    const description = it.description?.trim() || `${category} - Freshly prepared at Crunchies Fried Chicken (Marian)`;
    const imageUrl = it.image_url || null;
    const kitchenStation = resolveStation(category);

    const existing = existingMap.get(key);
    if (existing) {
      await db.orm.public.MenuItem.where({ id: existing.id }).update({
        name: resolvedName,
        price: markupPrice,
        category,
        description,
        imageUrl,
        isAvailable,
        kitchenStation,
        locationId: CRUNCHIES_LOC_ID,
      });
      updatedCount++;
    } else {
      await db.orm.public.MenuItem.create({
        id: uuidv4(),
        organizationId: CRUNCHIES_ORG_ID,
        locationId: CRUNCHIES_LOC_ID,
        name: resolvedName,
        price: markupPrice,
        category,
        description,
        imageUrl,
        isAvailable,
        kitchenStation,
      });
      createdCount++;
    }
  }

  // 3. Mark any items no longer in live menu as not available
  let archivedCount = 0;
  for (const [key, existing] of existingMap) {
    if (!processedKeys.has(key) && existing.isAvailable) {
      await db.orm.public.MenuItem.where({ id: existing.id }).update({
        isAvailable: false,
      });
      archivedCount++;
    }
  }

  console.log('\n--- SYNC COMPLETED ---');
  console.log(`Updated existing items: ${updatedCount}`);
  console.log(`Newly created items: ${createdCount}`);
  console.log(`Archived obsolete items (marked unavailable): ${archivedCount}`);

  // 4. Verify in DB
  const finalItems = await db.orm.public.MenuItem.where({ organizationId: CRUNCHIES_ORG_ID }).all();
  const availableFinal = finalItems.filter((i: any) => i.isAvailable);
  console.log(`\nTotal items now in DB for Crunchies: ${finalItems.length} (${availableFinal.length} available)`);

  // Category breakdown
  const categoryStats: Record<string, number> = {};
  for (const it of availableFinal) {
    categoryStats[it.category] = (categoryStats[it.category] || 0) + 1;
  }
  console.log('\nAvailable Categories in CityOS:');
  for (const [cat, count] of Object.entries(categoryStats)) {
    console.log(` - ${cat}: ${count} items`);
  }

  console.log('\nSample items preview (+15% markup applied):');
  for (const it of availableFinal.slice(0, 10)) {
    console.log(` - ${it.name} [${it.category}]: ₦${it.price.toLocaleString()}`);
  }
}

main().catch(console.error).finally(() => process.exit(0));
