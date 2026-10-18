import 'dotenv/config';
import pg from 'pg';
import { v4 as uuidv4 } from 'uuid';

async function main() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();

  try {
    console.log('=== PURGING UNVERIFIED CHOPCALABAR SCRAPED DATA & SEEDING VERIFIED CRUNCHIES ===\n');

    await client.query('BEGIN');

    // 1. Resolve Calabar City
    const cityRes = await client.query(`SELECT id FROM "city" WHERE slug = 'calabar'`);
    if (cityRes.rows.length === 0) {
      throw new Error('Calabar city not found!');
    }
    const calabarCityId = cityRes.rows[0].id;
    console.log(`Resolved Calabar City ID: ${calabarCityId}`);

    // 2. Identify all scraped listings & orgs
    const scrapeListingsRes = await client.query(`
      SELECT "organizationId" FROM "discoveryListing" 
      WHERE metadata LIKE '%sourceId%' 
         OR metadata LIKE '%chopcalabar%' 
         OR metadata LIKE '%sourceUrl%'
    `);
    const scrapedOrgIds = Array.from(new Set(scrapeListingsRes.rows.map(r => r.organizationId)));
    console.log(`Found ${scrapedOrgIds.length} organizations from unverified scrape to purge.`);

    if (scrapedOrgIds.length > 0) {
      // Delete dependent records for these organizations
      await client.query(`DELETE FROM "discoveryListing" WHERE "organizationId" = ANY($1::text[])`, [scrapedOrgIds]);
      await client.query(`DELETE FROM "organizationContactPoint" WHERE "organizationId" = ANY($1::text[])`, [scrapedOrgIds]);
      await client.query(`DELETE FROM "restaurantSettings" WHERE "organizationId" = ANY($1::text[])`, [scrapedOrgIds]);
      await client.query(`DELETE FROM "hotelRoom" WHERE "organizationId" = ANY($1::text[])`, [scrapedOrgIds]);
      await client.query(`DELETE FROM "menuItem" WHERE "organizationId" = ANY($1::text[])`, [scrapedOrgIds]);
      await client.query(`DELETE FROM "retailProduct" WHERE "organizationId" = ANY($1::text[])`, [scrapedOrgIds]);
      await client.query(`DELETE FROM "location" WHERE "organizationId" = ANY($1::text[])`, [scrapedOrgIds]);
      await client.query(`DELETE FROM "wallet" WHERE "organizationId" = ANY($1::text[])`, [scrapedOrgIds]);
      await client.query(`DELETE FROM "organization" WHERE id = ANY($1::text[])`, [scrapedOrgIds]);
      console.log(`Successfully purged ${scrapedOrgIds.length} unverified scraped organizations and all dependent entities.`);
    }

    // Also check if any old Crunchies entry exists
    const oldCrunchies = await client.query(`SELECT id FROM "organization" WHERE LOWER(name) LIKE '%crunchies%'`);
    if (oldCrunchies.rows.length > 0) {
      const oldIds = oldCrunchies.rows.map(r => r.id);
      await client.query(`DELETE FROM "discoveryListing" WHERE "organizationId" = ANY($1::text[])`, [oldIds]);
      await client.query(`DELETE FROM "organizationContactPoint" WHERE "organizationId" = ANY($1::text[])`, [oldIds]);
      await client.query(`DELETE FROM "restaurantSettings" WHERE "organizationId" = ANY($1::text[])`, [oldIds]);
      await client.query(`DELETE FROM "menuItem" WHERE "organizationId" = ANY($1::text[])`, [oldIds]);
      await client.query(`DELETE FROM "location" WHERE "organizationId" = ANY($1::text[])`, [oldIds]);
      await client.query(`DELETE FROM "wallet" WHERE "organizationId" = ANY($1::text[])`, [oldIds]);
      await client.query(`DELETE FROM "organization" WHERE id = ANY($1::text[])`, [oldIds]);
      console.log(`Cleaned up old Crunchies records.`);
    }

    // 3. Seed Verified Crunchies Fried Chicken (Marian Road, Calabar)
    console.log('\n--- Seeding Verified Crunchies Fried Chicken (Marian Road) ---');
    const crunchiesOrgId = uuidv4();
    const crunchiesLocId = uuidv4();
    const crunchiesListingId = uuidv4();
    const crunchiesWalletId = uuidv4();

    const crunchiesCover = 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=1000&auto=format&fit=crop&q=80';
    const crunchiesImages = [
      'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=1000&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1000&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=1000&auto=format&fit=crop&q=80'
    ];

    // Insert Organization
    await client.query(`
      INSERT INTO "organization" (
        id, name, type, "storeCategory", description, address, "logoAssetId", status, "createdAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE', NOW())
    `, [
      crunchiesOrgId,
      'Crunchies Fried Chicken (Marian)',
      'RESTAURANT',
      'Fast Food',
      'Premier quick-service restaurant on Marian Road, Calabar. Freshly fried chicken, signature party jollof & fried rice combos, golden meat pies, double sausage shawarma, and oven-fresh bread.',
      '39 Ndidem Usang Iso Rd, Marian, Calabar, Cross River State',
      crunchiesCover
    ]);

    // Insert Location
    await client.query(`
      INSERT INTO "location" (
        id, "organizationId", name, address, latitude, longitude, "cityId"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      crunchiesLocId,
      crunchiesOrgId,
      'Crunchies Fried Chicken - Marian Branch',
      '39 Ndidem Usang Iso Rd, Marian, Calabar',
      4.9700,
      8.3340,
      calabarCityId
    ]);

    // Insert Wallet
    await client.query(`
      INSERT INTO "wallet" (
        id, "organizationId", balance, currency
      ) VALUES ($1, $2, 0.0, 'NGN')
    `, [
      crunchiesWalletId,
      crunchiesOrgId
    ]);

    // Insert Restaurant Settings
    await client.query(`
      INSERT INTO "restaurantSettings" (
        id, "organizationId", "serviceStyle", "taxRate", "serviceCharge", "openingHours", "acceptsWalkIns", "nextOrderNumber"
      ) VALUES ($1, $2, 'HYBRID', 7.5, 0, '07:00 AM - 09:30 PM daily', true, 1)
    `, [
      uuidv4(),
      crunchiesOrgId
    ]);

    // Insert Contact Points (verified)
    await client.query(`
      INSERT INTO "organizationContactPoint" (
        id, "organizationId", "locationId", type, value, "isPrimary", "isVerified", "createdAt", "updatedAt"
      ) VALUES 
        ($1, $2, $3, 'PHONE', '09062439146', true, true, NOW(), NOW()),
        ($4, $2, $3, 'WEBSITE', 'https://www.crunchiesonline.com/menu', false, true, NOW(), NOW())
    `, [
      uuidv4(), crunchiesOrgId, crunchiesLocId,
      uuidv4()
    ]);

    // Insert Discovery Listing with NO fake rating (rating: null)
    const metadata = JSON.stringify({
      coverImage: crunchiesCover,
      images: crunchiesImages,
      phone: '09062439146',
      hours: '07:00 AM - 09:30 PM daily',
      tags: ['Fast Food', 'Crispy Chicken', 'Jollof Rice', 'Meat Pie', 'Shawarma', 'Bakery'],
      sourceUrl: 'https://www.crunchiesonline.com/menu',
      rating: null,
      reviewCount: 0,
      isOpen: true,
      deliveryEta: '20 - 30 min',
      isVerified: false
    });

    await client.query(`
      INSERT INTO "discoveryListing" (
        id, "organizationId", "locationId", "cityId", vertical, slug, title, description, "coverAssetId", "isActive", metadata, "createdAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, $10, NOW())
    `, [
      crunchiesListingId,
      crunchiesOrgId,
      crunchiesLocId,
      calabarCityId,
      'RESTAURANT',
      'crunchies-fried-chicken-marian',
      'Crunchies Fried Chicken (Marian)',
      'Premier quick-service restaurant on Marian Road. Famous for golden crispy fried chicken, combos, pastries, shawarma, and fresh bread.',
      crunchiesCover,
      metadata
    ]);

    // Insert Authentic Menu Items
    const menuItems = [
      {
        name: 'Mega Crunch Combo',
        category: 'Combos & Deals',
        price: 4500,
        description: 'Signature crispy fried chicken piece paired with seasoned fried rice, coleslaw salad, and a cold drink.',
        imageUrl: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&auto=format&fit=crop&q=80'
      },
      {
        name: 'Jollof Rice & Crispy Chicken',
        category: 'Rice Meals',
        price: 3800,
        description: 'Smoky Nigerian party jollof rice paired with a golden fried chicken quarter and fried sweet plantain.',
        imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&auto=format&fit=crop&q=80'
      },
      {
        name: 'Fried Rice & Crispy Chicken',
        category: 'Rice Meals',
        price: 3800,
        description: 'Stir-fried seasoned rice with carrots, sweet corn, and green peas, served with a crispy fried chicken quarter.',
        imageUrl: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800&auto=format&fit=crop&q=80'
      },
      {
        name: 'Crunchies Special Meat Pie',
        category: 'Pastries & Snacks',
        price: 900,
        description: 'Flaky golden pastry crust generously packed with seasoned minced beef, potatoes, and savory herbs.',
        imageUrl: 'https://images.unsplash.com/photo-1621236378699-8597fee6a1ce?w=800&auto=format&fit=crop&q=80'
      },
      {
        name: 'Crunchies Chicken Pie',
        category: 'Pastries & Snacks',
        price: 1000,
        description: 'Savory golden baked turnover filled with tender spiced diced chicken breast chunks in herb gravy.',
        imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80'
      },
      {
        name: 'Beef Shawarma (Double Sausage)',
        category: 'Shawarma & Grills',
        price: 3200,
        description: 'Grilled spiced beef strips wrapped in warm flatbread with two beef sausages, crunchy cabbage, and creamy garlic sauce.',
        imageUrl: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=800&auto=format&fit=crop&q=80'
      },
      {
        name: 'Chicken Shawarma (Special)',
        category: 'Shawarma & Grills',
        price: 3500,
        description: 'Slow-roasted chicken breast fillet seasoned with aromatic spices, fresh shredded cabbage, and signature cream sauce.',
        imageUrl: 'https://images.unsplash.com/photo-1561651823-34feb02250e4?w=800&auto=format&fit=crop&q=80'
      },
      {
        name: 'Freshly Baked Jumbo Bread',
        category: 'Bakery',
        price: 1800,
        description: 'Warm, soft, and buttery sliced bread freshly baked at the Marian bakery section.',
        imageUrl: 'https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?w=800&auto=format&fit=crop&q=80'
      },
      {
        name: 'Charcolite Peppered Chicken',
        category: 'Shawarma & Grills',
        price: 3000,
        description: 'Succulent flame-grilled chicken quarter generously tossed in spicy scotch bonnet and bell pepper relish.',
        imageUrl: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=800&auto=format&fit=crop&q=80'
      },
      {
        name: 'Cold Bottled Drink (50cl)',
        category: 'Drinks & Beverages',
        price: 600,
        description: 'Chilled refreshing soft drink of choice (Coca-Cola, Fanta, Sprite, or Malt).',
        imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=800&auto=format&fit=crop&q=80'
      }
    ];

    for (const item of menuItems) {
      await client.query(`
        INSERT INTO "menuItem" (
          id, name, description, price, category, "imageUrl", "isAvailable", "organizationId", "locationId"
        ) VALUES ($1, $2, $3, $4, $5, $6, true, $7, $8)
      `, [
        uuidv4(),
        item.name,
        item.description,
        item.price,
        item.category,
        item.imageUrl,
        crunchiesOrgId,
        crunchiesLocId
      ]);
    }

    console.log(`Successfully added ${menuItems.length} authentic menu items for Crunchies Marian.`);

    await client.query('COMMIT');
    console.log('\nTRANSACTION COMMITTED SUCCESSFULLY.');

    // Print summary
    const finalOrgs = await client.query('SELECT COUNT(*) FROM "organization"');
    const finalLocations = await client.query('SELECT COUNT(*) FROM "location"');
    const finalListings = await client.query('SELECT COUNT(*) FROM "discoveryListing"');
    const finalMenuItems = await client.query('SELECT COUNT(*) FROM "menuItem"');

    console.log('\n=== CURRENT DATABASE COUNTS ===');
    console.log(`Organizations: ${finalOrgs.rows[0].count}`);
    console.log(`Locations: ${finalLocations.rows[0].count}`);
    console.log(`Discovery Listings: ${finalListings.rows[0].count}`);
    console.log(`Restaurant Menu Items: ${finalMenuItems.rows[0].count}`);
    console.log(`Crunchies Org ID: ${crunchiesOrgId}`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('FAILED and rolled back:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
