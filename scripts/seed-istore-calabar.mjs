import 'dotenv/config';
import pg from 'pg';
import crypto from 'crypto';
import fs from 'fs';
import { classifyRetailProduct, inferStoreProfileTaxonomy } from '../lib/taxonomy/retail-categorizer.ts';

const { Pool } = pg;

function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(//g, '')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8358;/g, '₦')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractColorFromDesc(desc) {
  if (!desc) return null;
  const colorMatch = desc.match(/(?:COLOR|COLOUR)\s*:\s*([A-Za-z\s]+?)(?:\s+OS\b|\s+Face\s+ID|\s+SENSOR|$)/i);
  if (colorMatch && colorMatch[1]) {
    return colorMatch[1].trim();
  }
  const pipeMatch = desc.match(/Face\s*ID\s*\|\s*([A-Za-z\s]+?)\s*\|/i);
  if (pipeMatch && pipeMatch[1]) {
    return pipeMatch[1].trim();
  }
  return null;
}

async function main() {
  const rawProducts = JSON.parse(
    fs.readFileSync(
      'C:/Users/HomePC/.gemini/antigravity-cli/brain/2dfc51df-169f-4307-8164-b36d0f44339c/scratch/istore-products.json',
      'utf8'
    )
  );

  // Normalize and disambiguate product names
  const nameCounts = new Map();
  const normalizedItems = rawProducts.map((p) => {
    let baseName = decodeHtmlEntities(p.name)
      .replace(/\|\s*\|/g, '|')
      .replace(/\|\s*$/g, '')
      .replace(/\s*\|\s*/g, ' | ')
      .trim();

    const desc = decodeHtmlEntities(p.short_description || p.description || '');
    const color = extractColorFromDesc(desc);

    const rawPrice = Number(p.prices?.price || 0);
    const minorUnit = Number(p.prices?.currency_minor_unit ?? 2);
    const price = rawPrice / Math.pow(10, minorUnit);

    const rawRegPrice = Number(p.prices?.regular_price || 0);
    const regularPrice = rawRegPrice / Math.pow(10, minorUnit);
    const compareAtPrice = regularPrice > price ? regularPrice : null;

    const img = p.images?.[0]?.src || null;
    const wcCat = p.categories?.[0]?.name || 'Apple Devices';

    return {
      wcId: p.id,
      baseName,
      color,
      desc: desc || `${baseName} available at iStore Calabar.`,
      price,
      compareAtPrice,
      img,
      wcCat,
      permalink: p.permalink,
    };
  });

  for (const item of normalizedItems) {
    nameCounts.set(item.baseName.toLowerCase(), (nameCounts.get(item.baseName.toLowerCase()) || 0) + 1);
  }

  const usedFinalNames = new Set();
  const finalItems = normalizedItems.map((item) => {
    let title = item.baseName;
    if (nameCounts.get(item.baseName.toLowerCase()) > 1 && item.color) {
      title = `${item.baseName} (${item.color})`;
    }
    if (usedFinalNames.has(title.toLowerCase())) {
      title = `${title} #${item.wcId}`;
    }
    usedFinalNames.add(title.toLowerCase());
    return {
      ...item,
      title,
    };
  });

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    const tablesRes = await client.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
    );
    const tableNames = tablesRes.rows.map((r) => r.table_name);
    const resolveTable = (candidates) => {
      for (const c of candidates) {
        const found = tableNames.find((t) => t.toLowerCase() === c.toLowerCase());
        if (found) return `"${found}"`;
      }
      throw new Error(`Could not find table for candidates: ${candidates.join(', ')}`);
    };

    const T_CITY = resolveTable(['city', 'City']);
    const T_ORG = resolveTable(['organization', 'Organization']);
    const T_LOC = resolveTable(['location', 'Location']);
    const T_LISTING = resolveTable(['discoveryListing', 'DiscoveryListing', 'discovery_listing']);
    const T_SETTINGS = resolveTable(['retailSettings', 'RetailSettings', 'retail_settings']);
    const T_CATEGORY = resolveTable(['retailCategory', 'RetailCategory', 'retail_category']);
    const T_PRODUCT = resolveTable(['retailProduct', 'RetailProduct', 'retail_product']);
    const T_STOCK = resolveTable(['retailLocationStock', 'RetailLocationStock', 'retail_location_stock']);

    await client.query('BEGIN');

    // 1. Find Calabar city
    const cityRes = await client.query(
      `SELECT id, name, slug FROM ${T_CITY} WHERE LOWER(slug) = 'calabar' OR LOWER(name) = 'calabar' LIMIT 1`
    );
    const cityId = cityRes.rows[0].id;

    // 2. Upsert Organization: iStore Calabar
    const orgId = 'istore-calabar';
    const orgName = 'iStore Calabar';
    const orgAddress = 'Marian Road, Calabar Municipal, Calabar';
    const orgDesc =
      'Premium Apple & Gadget Store in Calabar — iPhones (New & US-Used), iPads, MacBooks, Apple Watch, AirPods, and official Apple Accessories.';
    const orgLogo = 'https://istorecalabar.com/wp-content/uploads/2025/05/Istore-logo.png';
    const coverImg = 'https://istorecalabar.com/wp-content/uploads/2025/11/IMG_2690.jpeg';

    const taxonomy = inferStoreProfileTaxonomy(
      finalItems.map((i) => ({ name: i.title, description: i.desc, price: i.price })),
      'Phones, Apple & Devices'
    );

    const existingOrg = await client.query(`SELECT id FROM ${T_ORG} WHERE id = $1 LIMIT 1`, [orgId]);
    if (existingOrg.rows.length > 0) {
      await client.query(
        `UPDATE ${T_ORG}
         SET name = $2,
             type = 'RETAIL',
             "storeCategory" = $3,
             description = $4,
             address = $5,
             "logoAssetId" = $6,
             status = 'ACTIVE'
         WHERE id = $1`,
        [orgId, orgName, taxonomy.storeCategory, orgDesc, orgAddress, coverImg]
      );
    } else {
      await client.query(
        `INSERT INTO ${T_ORG} (id, name, type, "storeCategory", description, address, "logoAssetId", status)
         VALUES ($1, $2, 'RETAIL', $3, $4, $5, $6, 'ACTIVE')`,
        [orgId, orgName, taxonomy.storeCategory, orgDesc, orgAddress, coverImg]
      );
    }

    // 3. Upsert Location in Calabar
    let locRes = await client.query(`SELECT id FROM ${T_LOC} WHERE "organizationId" = $1 LIMIT 1`, [orgId]);
    let locationId;
    if (locRes.rows.length > 0) {
      locationId = locRes.rows[0].id;
      await client.query(
        `UPDATE ${T_LOC}
         SET name = 'iStore Calabar Showroom',
             address = $2,
             "cityId" = $3,
             latitude = 4.9685,
             longitude = 8.3342
         WHERE id = $1`,
        [locationId, orgAddress, cityId]
      );
    } else {
      locationId = crypto.randomUUID();
      await client.query(
        `INSERT INTO ${T_LOC} (id, "organizationId", name, address, "cityId", latitude, longitude)
         VALUES ($1, $2, 'iStore Calabar Showroom', $3, $4, 4.9685, 8.3342)`,
        [locationId, orgId, orgAddress, cityId]
      );
    }

    // 4. Upsert DiscoveryListing
    const listingMetadata = JSON.stringify({
      isVerified: true,
      neighborhood: 'Marian Road',
      area: 'Marian Road',
      workingHours: 'Mon – Sat · 09:00 AM – 06:00 PM',
      websiteUrl: 'https://istorecalabar.com/',
      logoUrl: orgLogo,
      coverImage: coverImg,
      images: [
        coverImg,
        'https://istorecalabar.com/wp-content/uploads/2025/10/IMG_1977.jpeg',
        'https://istorecalabar.com/wp-content/uploads/2025/10/IMG_1939.jpeg',
        'https://istorecalabar.com/wp-content/uploads/2025/10/IMG_2081.jpeg',
        'https://istorecalabar.com/wp-content/uploads/2025/10/IMG_2032.jpeg',
      ],
      aisles: taxonomy.aisles,
    });

    const listRes = await client.query(`SELECT id FROM ${T_LISTING} WHERE "organizationId" = $1 LIMIT 1`, [orgId]);
    if (listRes.rows.length > 0) {
      await client.query(
        `UPDATE ${T_LISTING}
         SET "locationId" = $2,
             "cityId" = $3,
             vertical = 'RETAIL',
             slug = 'istore-calabar',
             title = $4,
             description = $5,
             "coverAssetId" = $6,
             "isActive" = true,
             metadata = $7
         WHERE id = $1`,
        [listRes.rows[0].id, locationId, cityId, orgName, orgDesc, coverImg, listingMetadata]
      );
    } else {
      await client.query(
        `INSERT INTO ${T_LISTING} (id, "organizationId", "locationId", "cityId", vertical, slug, title, description, "coverAssetId", "isActive", metadata)
         VALUES ($1, $2, $3, $4, 'RETAIL', 'istore-calabar', $5, $6, $7, true, $8)`,
        [crypto.randomUUID(), orgId, locationId, cityId, orgName, orgDesc, coverImg, listingMetadata]
      );
    }

    // 5. Upsert RetailSettings
    const settingsRes = await client.query(`SELECT id FROM ${T_SETTINGS} WHERE "organizationId" = $1 LIMIT 1`, [orgId]);
    if (settingsRes.rows.length === 0) {
      await client.query(
        `INSERT INTO ${T_SETTINGS} (id, "organizationId", "storeName", "storeAddress", "currencySymbol", country, "hasStoreInfo", "hasProducts")
         VALUES ($1, $2, $3, $4, '₦', 'NG', true, true)`,
        [crypto.randomUUID(), orgId, orgName, orgAddress]
      );
    }

    // 6. Clear any old products/categories for istore-calabar & insert fresh 64 products
    await client.query(`DELETE FROM ${T_STOCK} WHERE "organizationId" = $1`, [orgId]);
    await client.query(`DELETE FROM ${T_PRODUCT} WHERE "organizationId" = $1`, [orgId]);
    await client.query(`DELETE FROM ${T_CATEGORY} WHERE "organizationId" = $1`, [orgId]);

    const categoryMap = new Map();
    const aisleSummary = new Map();

    for (let i = 0; i < finalItems.length; i++) {
      const item = finalItems[i];
      const classified = classifyRetailProduct({
        name: item.title,
        description: item.desc,
        price: item.price,
        storeCategory: taxonomy.storeCategory,
      });

      let categoryId = categoryMap.get(classified.inStoreCategory);
      if (!categoryId) {
        categoryId = crypto.randomUUID();
        await client.query(
          `INSERT INTO ${T_CATEGORY} (id, "organizationId", name, description)
           VALUES ($1, $2, $3, $4)`,
          [categoryId, orgId, classified.inStoreCategory, `${classified.inStoreCategory} at iStore Calabar`]
        );
        categoryMap.set(classified.inStoreCategory, categoryId);
      }

      const productId = `istore-cal-${item.wcId}`;
      const sku = `IST-${String(i + 1).padStart(3, '0')}`;

      await client.query(
        `INSERT INTO ${T_PRODUCT} (
          id, "organizationId", name, description, sku, price, "compareAtPrice",
          "stockQuantity", "lowStockLevel", "isWeighed", unit, "imageAssetId",
          "globalCategory", "categoryId"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 5, 1, false, 'ea', $8, $9, $10)`,
        [
          productId,
          orgId,
          item.title,
          item.desc,
          sku,
          item.price,
          item.compareAtPrice,
          item.img,
          classified.globalCategory,
          categoryId,
        ]
      );

      await client.query(
        `INSERT INTO ${T_STOCK} (id, "organizationId", "locationId", "productId", "stockQuantity", "lowStockLevel")
         VALUES ($1, $2, $3, $4, 5, 1)`,
        [crypto.randomUUID(), orgId, locationId, productId]
      );

      aisleSummary.set(classified.inStoreCategory, (aisleSummary.get(classified.inStoreCategory) || 0) + 1);
    }

    await client.query('COMMIT');
    console.log(`\n🎉 Successfully seeded ${finalItems.length} products for ${orgName} (${orgId})!`);
    console.log(`   Store Sector: ${taxonomy.storeCategory}`);
    console.log(`   In-Store Aisles (${aisleSummary.size}):`);
    for (const [aisle, count] of Array.from(aisleSummary.entries()).sort((a, b) => b[1] - a[1])) {
      console.log(`     - ${aisle}: ${count} item(s)`);
    }
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
