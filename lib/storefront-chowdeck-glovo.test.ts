import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '@/src/prisma/db';
import {
  getStorefrontPromotions,
  saveStorefrontPromotions,
  updateStorefrontPlacement,
} from '@/lib/actions/storefront-management';
import { getCityFood } from '@/app/actions/food';
import { getCityMarketFeed, getCityMartStores } from '@/app/actions/commerce';
import { getHotelOrgs } from '@/lib/actions/resident';
import { v4 as uuidv4 } from 'uuid';

test('Chowdeck & Glovo Storefront Integration Suite', async (t) => {
  // Setup test environment
  const citySlug = `test-city-${Date.now()}`;
  const cityId = `city-${uuidv4().substring(0, 8)}`;
  const orgFoodId = `org-food-${uuidv4().substring(0, 8)}`;
  const orgRetailId = `org-retail-${uuidv4().substring(0, 8)}`;
  const locFoodId = `loc-food-${uuidv4().substring(0, 8)}`;
  const locRetailId = `loc-retail-${uuidv4().substring(0, 8)}`;
  const listingFoodId = `listing-food-${uuidv4().substring(0, 8)}`;
  const listingRetailId = `listing-retail-${uuidv4().substring(0, 8)}`;

  // Create City
  await db.orm.public.City.create({
    id: cityId,
    name: 'Calabar Test City',
    slug: citySlug,
    country: 'NG',
    currency: 'NGN',
    isActive: true,
  });

  // Create Restaurant Org & Location
  await db.orm.public.Organization.create({
    id: orgFoodId,
    name: 'Supreme Buka Test Spot',
    type: 'RESTAURANT',
    storeCategory: 'Calabar Soups',
    address: '12 Marian Road, Calabar',
    status: 'ACTIVE',
  });

  await db.orm.public.Location.create({
    id: locFoodId,
    organizationId: orgFoodId,
    cityId: cityId,
    name: 'Marian Road Branch',
    address: '12 Marian Road, Calabar',
  });

  await db.orm.public.DiscoveryListing.create({
    id: listingFoodId,
    organizationId: orgFoodId,
    locationId: locFoodId,
    cityId: cityId,
    vertical: 'RESTAURANT',
    slug: `supreme-buka-${Date.now()}`,
    title: 'Supreme Buka Test Spot',
    isActive: true,
    metadata: JSON.stringify({
      rating: 4.9,
      reviewCount: 120,
      deliveryEta: '15 - 25 min',
      deliveryFee: 450,
      isVerified: true,
      isFeatured: true,
      isFastCourier: true,
      cuisines: ['Calabar Soups & Swallow', 'Party Jollof & Rice'],
      badge: 'Verified Kitchen',
    }),
  });

  // Create Retail Org & Location
  await db.orm.public.Organization.create({
    id: orgRetailId,
    name: 'Everyday Supermarket Test',
    type: 'RETAIL',
    storeCategory: 'Supermarket',
    address: '44 Calabar Mall, Calabar',
    status: 'ACTIVE',
  });

  await db.orm.public.Location.create({
    id: locRetailId,
    organizationId: orgRetailId,
    cityId: cityId,
    name: 'Calabar Mall Branch',
    address: '44 Calabar Mall, Calabar',
  });

  await db.orm.public.DiscoveryListing.create({
    id: listingRetailId,
    organizationId: orgRetailId,
    locationId: locRetailId,
    cityId: cityId,
    vertical: 'RETAIL',
    slug: `everyday-supermarket-${Date.now()}`,
    title: 'Everyday Supermarket Test',
    isActive: true,
    metadata: JSON.stringify({
      rating: 4.8,
      reviewCount: 95,
      deliveryEta: '20 - 30 min',
      deliveryFee: 500,
      isVerified: true,
      isFeatured: true,
      aisles: ['Supermarket & Pantry', 'Cold Drinks & Beverages'],
      badge: 'Supermarket Partner',
    }),
  });

  await t.test('1. getStorefrontPromotions returns high-converting defaults when none saved', async () => {
    const foodPromos = await getStorefrontPromotions(citySlug, 'FOOD');
    assert.ok(Array.isArray(foodPromos));
    assert.ok(foodPromos.length >= 3);
    assert.ok(foodPromos.some((p) => p.code === 'CHOWCALABAR'));

    const mktPromos = await getStorefrontPromotions(citySlug, 'MARKET');
    assert.ok(Array.isArray(mktPromos));
    assert.ok(mktPromos.some((p) => p.badge === 'Farm Fresh'));
  });

  await t.test('2. updateStorefrontPlacement saves badging and category bubble tags into DiscoveryListing.metadata', async () => {
    const result = await updateStorefrontPlacement({
      organizationId: orgFoodId,
      isFeatured: true,
      isFastCourier: true,
      isVerified: true,
      deliveryEta: '10 - 20 min',
      deliveryFee: 300,
      rating: 5.0,
      reviewCount: 250,
      cuisines: ['Calabar Soups & Swallow', 'Suya & Street Grills'],
      badge: 'Top Calabar Kitchen',
      isOpen: true,
    });

    assert.equal(result.success, true);

    // Verify in database
    const updatedListing = await db.orm.public.DiscoveryListing.where({ organizationId: orgFoodId }).all().first();
    assert.ok(updatedListing);
    assert.ok(updatedListing.metadata);
    const meta = JSON.parse(updatedListing.metadata);
    assert.equal(meta.deliveryEta, '10 - 20 min');
    assert.equal(meta.deliveryFee, 300);
    assert.equal(meta.rating, 5.0);
    assert.equal(meta.badge, 'Top Calabar Kitchen');
    assert.deepEqual(meta.cuisines, ['Calabar Soups & Swallow', 'Suya & Street Grills']);
  });

  await t.test('3. getCityFood enriches restaurant with Chowdeck metrics and returns campaigns', async () => {
    const foodData = await getCityFood(citySlug);
    assert.ok(foodData.restaurants.length > 0);
    const spot = foodData.restaurants.find((r: any) => r.id === orgFoodId);
    assert.ok(spot);
    assert.equal(spot.name, 'Supreme Buka Test Spot');
    assert.equal(spot.deliveryEta, '10 - 20 min');
    assert.equal(spot.deliveryFee, 300);
    assert.equal(spot.rating, 5.0);
    assert.equal(spot.badge, 'Top Calabar Kitchen');
    assert.equal(spot.isVerified, true);
    assert.equal(spot.isFastCourier, true);
    assert.ok(Array.isArray(spot.cuisines));
    assert.ok(foodData.campaigns.length > 0);
  });

  await t.test('4. getCityMarketFeed returns stores with Glovo metadata and market campaigns', async () => {
    const feed = await getCityMarketFeed(citySlug, 'All');
    assert.ok(Array.isArray(feed.stores));
    const store = feed.stores.find((s: any) => s.id === orgRetailId);
    assert.ok(store);
    assert.equal(store.name, 'Everyday Supermarket Test');
    assert.equal(store.rating, 4.8);
    assert.equal(store.deliveryFee, 500);
    assert.ok(Array.isArray(store.aisles));
    assert.ok(feed.campaigns.length > 0);
  });

  await t.test('5. saveStorefrontPromotions saves custom hero slides and getStorefrontPromotions retrieves them', async () => {
    const customSlides = [
      {
        id: 'promo-1',
        title: 'Calabar Carnival Flash Deals 🎉',
        subtitle: '50% off all delivery across Calabar!',
        badge: 'Carnival Special',
        code: 'CARNIVAL50',
        imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
        targetUrl: '/food?filter=soups',
        vertical: 'FOOD' as const,
        priority: 1,
        isActive: true,
      },
    ];

    const saveRes = await saveStorefrontPromotions({
      citySlug,
      vertical: 'FOOD',
      campaigns: customSlides,
    });
    assert.equal(saveRes.success, true);

    const retrieved = await getStorefrontPromotions(citySlug, 'FOOD');
    assert.equal(retrieved.length, 1);
    assert.equal(retrieved[0].code, 'CARNIVAL50');
    assert.equal(retrieved[0].title, 'Calabar Carnival Flash Deals 🎉');
  });

  await t.test('6. getHotelOrgs enriches hotels with Booking.com review scores, room rates, and power guarantee', async () => {
    const orgHotelId = `org-hotel-${uuidv4().substring(0, 8)}`;
    const locHotelId = `loc-hotel-${uuidv4().substring(0, 8)}`;
    const listingHotelId = `listing-hotel-${uuidv4().substring(0, 8)}`;

    await db.orm.public.Organization.create({
      id: orgHotelId,
      name: 'Tinapa Lakeside Resort Test',
      type: 'HOTEL',
      address: 'Tinapa Free Trade Zone, Calabar',
      status: 'ACTIVE',
    });

    await db.orm.public.Location.create({
      id: locHotelId,
      organizationId: orgHotelId,
      cityId: cityId,
      name: 'Resort Main Building',
      address: 'Tinapa Free Trade Zone, Calabar',
    });

    await db.orm.public.HotelRoom.create({
      id: `room-${uuidv4().substring(0, 8)}`,
      organizationId: orgHotelId,
      locationId: locHotelId,
      roomNumber: '101',
      type: 'Executive Lakeview Suite',
      baseRate: 48000,
      status: 'AVAILABLE',
    });

    await db.orm.public.DiscoveryListing.create({
      id: listingHotelId,
      organizationId: orgHotelId,
      locationId: locHotelId,
      cityId: cityId,
      vertical: 'HOTEL',
      slug: `tinapa-resort-${Date.now()}`,
      title: 'Tinapa Lakeside Resort Test',
      isActive: true,
      metadata: JSON.stringify({
        rating: 4.6,
        reviewCount: 140,
        stars: 5,
        freeCancellation: true,
      }),
    });

    const hotels = await getHotelOrgs(citySlug);
    const resort = hotels.find((h: any) => h.id === orgHotelId);
    assert.ok(resort);
    assert.equal(resort.name, 'Tinapa Lakeside Resort Test');
    assert.equal(resort.stars, 5);
    assert.equal(resort.reviewScore, 9.2);
    assert.equal(resort.reviewText, 'Superb');
    assert.equal(resort.price, 48000);
    assert.equal(resort.roomType, 'Executive Lakeview Suite');
    assert.equal(resort.hasPowerGuarantee, true);
    assert.equal(resort.freeCancellation, true);

    // Clean up hotel records
    await db.orm.public.HotelRoom.where({ organizationId: orgHotelId }).delete();
    await db.orm.public.DiscoveryListing.where({ id: listingHotelId }).delete();
    await db.orm.public.Location.where({ id: locHotelId }).delete();
    await db.orm.public.Organization.where({ id: orgHotelId }).delete();
  });

  // Final Cleanup
  await db.orm.public.DiscoveryListing.where({ cityId }).delete();
  await db.orm.public.Location.where({ cityId }).delete();
  await db.orm.public.Organization.where({ id: orgFoodId }).delete();
  await db.orm.public.Organization.where({ id: orgRetailId }).delete();
  await db.orm.public.City.where({ id: cityId }).delete();
});
