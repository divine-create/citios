import 'dotenv/config';
import pg from 'pg';
import crypto from 'crypto';
import fs from 'fs';
import { classifyRetailProduct } from '../lib/taxonomy/retail-categorizer.ts';

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
    .replace(/&#8230;/g, '...')
    .replace(/&#8358;/g, '₦')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  const rawProducts = JSON.parse(
    fs.readFileSync('scripts/cygroup-products.json', 'utf8')
  );

  const usedFinalNames = new Set();
  const finalItems = [];

  for (const p of rawProducts) {
    let baseName = decodeHtmlEntities(p.name)
      .replace(/\s*\.\.\.\s*$/, '')
      .trim();
    if (!baseName) continue;

    const desc = decodeHtmlEntities(p.short_description || p.description || '');
    const rawPrice = Number(p.prices?.price || 0);
    const minorUnit = Number(p.prices?.currency_minor_unit ?? 2);
    const price = rawPrice / Math.pow(10, minorUnit);
    if (!price || price <= 0) continue;

    const rawRegPrice = Number(p.prices?.regular_price || 0);
    const regularPrice = rawRegPrice / Math.pow(10, minorUnit);
    const compareAtPrice = regularPrice > price ? regularPrice : null;

    const img = p.images?.[0]?.src || null;
    const wcCat = (p.categories || []).map((c) => c.name).join(' > ');
    const inStock = p.is_in_stock !== false;

    let title = baseName;
    if (usedFinalNames.has(title.toLowerCase())) {
      title = `${title} #${p.id}`;
    }
    usedFinalNames.add(title.toLowerCase());

    finalItems.push({
      wcId: p.id,
      title,
      desc: desc || `${title} available at Cy.com Phone Accessories Calabar.`,
      price,
      compareAtPrice,
      img,
      wcCat,
      inStock,
      permalink: p.permalink,
    });
  }

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
    const T_CONTACT = resolveTable(['organizationContactPoint', 'OrganizationContactPoint', 'organization_contact_point']);

    await client.query('BEGIN');

    // 1. Find Calabar city
    const cityRes = await client.query(
      `SELECT id, name, slug FROM ${T_CITY} WHERE LOWER(slug) = 'calabar' OR LOWER(name) = 'calabar' LIMIT 1`
    );
    const cityId = cityRes.rows[0].id;

    // 2. Upsert Organization: Cy.com Phone Accessories
    const orgId = 'cygroup-calabar';
    const orgName = 'Cy.com Phone Accessories';
    const orgAddress = 'Shop 268 Etim Edem Park (Opp. Cultural Centre) & Shop 8 Tonimas Plaza, Etta Agbor Road, Calabar';
    const orgDesc =
      "Calabar's premier distributor of phone accessories, power banks (Oraimo, New Age, itel), fast chargers, wireless earbuds, Bluetooth speakers, smartwatches, memory cards, and phone replacement parts at wholesale and retail prices.";
    const orgLogo = 'https://cygroup.ng/wp-content/uploads/2022/09/cropped-20220912_0335085.png';
    const coverImg = 'https://cygroup.ng/wp-content/uploads/2026/09/1-22.jpg';
    const storeCategory = 'Phones, Apple & Devices';

    // Pre-compute aisles
    const aisleSummary = new Map();
    for (const item of finalItems) {
      const classified = classifyRetailProduct({
        name: item.title,
        description: item.desc,
        price: item.price,
        storeCategory,
        wcCategory: item.wcCat,
      });
      item.classified = classified;
      aisleSummary.set(classified.inStoreCategory, (aisleSummary.get(classified.inStoreCategory) || 0) + 1);
    }

    const topAisles = Array.from(aisleSummary.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name)
      .slice(0, 8);

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
        [orgId, orgName, storeCategory, orgDesc, orgAddress, orgLogo]
      );
    } else {
      await client.query(
        `INSERT INTO ${T_ORG} (id, name, type, "storeCategory", description, address, "logoAssetId", status)
         VALUES ($1, $2, 'RETAIL', $3, $4, $5, $6, 'ACTIVE')`,
        [orgId, orgName, storeCategory, orgDesc, orgAddress, orgLogo]
      );
    }

    // 3. Upsert Primary Location in Calabar
    let locRes = await client.query(`SELECT id FROM ${T_LOC} WHERE "organizationId" = $1 LIMIT 1`, [orgId]);
    let locationId;
    if (locRes.rows.length > 0) {
      locationId = locRes.rows[0].id;
      await client.query(
        `UPDATE ${T_LOC}
         SET name = 'Cy.com Calabar Main Hub (Etim Edem / Ettagbor)',
             address = $2,
             "cityId" = $3,
             latitude = 4.9548,
             longitude = 8.3265
         WHERE id = $1`,
        [locationId, orgAddress, cityId]
      );
    } else {
      locationId = crypto.randomUUID();
      await client.query(
        `INSERT INTO ${T_LOC} (id, "organizationId", name, address, "cityId", latitude, longitude)
         VALUES ($1, $2, 'Cy.com Calabar Main Hub (Etim Edem / Ettagbor)', $3, $4, 4.9548, 8.3265)`,
        [locationId, orgId, orgAddress, cityId]
      );
    }

    // 4. Upsert WhatsApp Contact Point (+2348067154233)
    const waRes = await client.query(
      `SELECT id FROM ${T_CONTACT} WHERE "organizationId" = $1 AND type = 'WHATSAPP' LIMIT 1`,
      [orgId]
    );
    if (waRes.rows.length > 0) {
      await client.query(
        `UPDATE ${T_CONTACT} SET value = '2348067154233', "isPrimary" = true, "isVerified" = true WHERE id = $1`,
        [waRes.rows[0].id]
      );
    } else {
      await client.query(
        `INSERT INTO ${T_CONTACT} (id, "organizationId", type, value, "isPrimary", "isVerified")
         VALUES ($1, $2, 'WHATSAPP', '2348067154233', true, true)`,
        [crypto.randomUUID(), orgId]
      );
    }

    // 5. Upsert DiscoveryListing
    const listingMetadata = JSON.stringify({
      isVerified: false,
      neighborhood: 'Ettagbor',
      area: 'Ettagbor',
      workingHours: 'Mon – Sat · 08:00 AM – 07:00 PM',
      websiteUrl: 'https://cygroup.ng/',
      whatsappPhone: '2348067154233',
      logoUrl: orgLogo,
      coverImage: coverImg,
      images: [
        coverImg,
        'https://cygroup.ng/wp-content/uploads/2026/07/OPB-750SQ-4-Device-Charging-Fully-Charges-Phone-Up-to-11-Time-PowerJet-501-12.webp',
        'https://cygroup.ng/wp-content/uploads/2026/08/1-16.jpg',
      ],
      aisles: topAisles,
    });

    const listRes = await client.query(`SELECT id FROM ${T_LISTING} WHERE "organizationId" = $1 LIMIT 1`, [orgId]);
    if (listRes.rows.length > 0) {
      await client.query(
        `UPDATE ${T_LISTING}
         SET "locationId" = $2,
             "cityId" = $3,
             vertical = 'RETAIL',
             slug = 'cygroup-calabar',
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
         VALUES ($1, $2, $3, $4, 'RETAIL', 'cygroup-calabar', $5, $6, $7, true, $8)`,
        [crypto.randomUUID(), orgId, locationId, cityId, orgName, orgDesc, coverImg, listingMetadata]
      );
    }

    // 6. Upsert RetailSettings
    const settingsRes = await client.query(`SELECT id FROM ${T_SETTINGS} WHERE "organizationId" = $1 LIMIT 1`, [orgId]);
    if (settingsRes.rows.length === 0) {
      await client.query(
        `INSERT INTO ${T_SETTINGS} (id, "organizationId", "storeName", "storeAddress", "currencySymbol", country, "hasStoreInfo", "hasProducts")
         VALUES ($1, $2, $3, $4, '₦', 'NG', true, true)`,
        [crypto.randomUUID(), orgId, orgName, orgAddress]
      );
    }

    // 7. Clear existing products/categories for cygroup-calabar & insert all 278 products
    await client.query(`DELETE FROM ${T_STOCK} WHERE "organizationId" = $1`, [orgId]);
    await client.query(`DELETE FROM ${T_PRODUCT} WHERE "organizationId" = $1`, [orgId]);
    await client.query(`DELETE FROM ${T_CATEGORY} WHERE "organizationId" = $1`, [orgId]);

    const categoryMap = new Map();

    for (let i = 0; i < finalItems.length; i++) {
      const item = finalItems[i];
      const classified = item.classified;

      let categoryId = categoryMap.get(classified.inStoreCategory);
      if (!categoryId) {
        categoryId = crypto.randomUUID();
        await client.query(
          `INSERT INTO ${T_CATEGORY} (id, "organizationId", name, description)
           VALUES ($1, $2, $3, $4)`,
          [categoryId, orgId, classified.inStoreCategory, `${classified.inStoreCategory} at Cy.com Phone Accessories`]
        );
        categoryMap.set(classified.inStoreCategory, categoryId);
      }

      const productId = `cygroup-cal-${item.wcId}`;
      const sku = `CYG-${String(i + 1).padStart(3, '0')}`;
      const stockQty = item.inStock ? 15 : 0;

      await client.query(
        `INSERT INTO ${T_PRODUCT} (
          id, "organizationId", name, description, sku, price, "compareAtPrice",
          "stockQuantity", "lowStockLevel", "isWeighed", unit, "imageAssetId",
          "globalCategory", "categoryId"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 2, false, 'ea', $9, $10, $11)`,
        [
          productId,
          orgId,
          item.title,
          item.desc,
          sku,
          item.price,
          item.compareAtPrice,
          stockQty,
          item.img,
          classified.globalCategory,
          categoryId,
        ]
      );

      await client.query(
        `INSERT INTO ${T_STOCK} (id, "organizationId", "locationId", "productId", "stockQuantity", "lowStockLevel")
         VALUES ($1, $2, $3, $4, $5, 2)`,
        [crypto.randomUUID(), orgId, locationId, productId, stockQty]
      );
    }

    await client.query('COMMIT');
    console.log(`\n🎉 Successfully seeded ${finalItems.length} products for ${orgName} (${orgId})!`);
    console.log(`   Store Sector: ${storeCategory}`);
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
