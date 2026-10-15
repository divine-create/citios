import 'dotenv/config';
import fs from 'fs';
import pg from 'pg';
import { v4 as uuidv4 } from 'uuid';

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    console.log('=== STARTING PURGE & CALABAR INGESTION ===\n');

    await client.query('BEGIN');

    // 1. Resolve Calabar city ID
    const calabarCityRes = await client.query(`SELECT id FROM "city" WHERE slug = 'calabar'`);
    if (calabarCityRes.rows.length === 0) {
      throw new Error('Calabar city record not found in database!');
    }
    const calabarCityId = calabarCityRes.rows[0].id;
    console.log(`Resolved Calabar City ID: ${calabarCityId}`);

    // 2. Backup personal wallets and personal ledger entries
    console.log('1. Backing up resident and admin personal wallets...');
    await client.query(`CREATE TEMP TABLE temp_person_wallets AS SELECT * FROM "wallet" WHERE "personId" IS NOT NULL`);
    const backedUpWallets = (await client.query('SELECT COUNT(*) FROM temp_person_wallets')).rows[0].count;
    await client.query(`CREATE TEMP TABLE temp_person_ledger AS SELECT * FROM "ledgerEntry" WHERE "walletId" IN (SELECT id FROM temp_person_wallets)`);
    const backedUpLedger = (await client.query('SELECT COUNT(*) FROM temp_person_ledger')).rows[0].count;
    console.log(`  -> Preserved ${backedUpWallets} personal wallets and ${backedUpLedger} personal ledger entries.`);

    // 3. Truncate demo tables CASCADE
    console.log('2. Truncating all demo organizations, demo pickups & mock verified claims with cascade...');
    await client.query(`TRUNCATE TABLE "organization", "deliveryJob", "payment", "task", "organizationClaim", "wallet" CASCADE`);
    console.log('  -> Wiped all mock orgs, demo deliveries, and mock claims.');

    // 4. Restore personal wallets and personal ledger entries
    console.log('3. Restoring resident and admin personal wallets & ledger entries...');
    await client.query(`INSERT INTO "wallet" SELECT * FROM temp_person_wallets`);
    await client.query(`INSERT INTO "ledgerEntry" SELECT * FROM temp_person_ledger`);
    console.log('  -> Personal wallets restored.');

    // 5. Verify core preservation
    const personCount = (await client.query('SELECT COUNT(*) FROM "person"')).rows[0].count;
    const accountCount = (await client.query('SELECT COUNT(*) FROM "account"')).rows[0].count;
    const personWalletCount = (await client.query('SELECT COUNT(*) FROM "wallet" WHERE "personId" IS NOT NULL')).rows[0].count;
    const cityCount = (await client.query('SELECT COUNT(*) FROM "city"')).rows[0].count;
    console.log(`\nCORE AUDIT: ${personCount} Persons, ${accountCount} Accounts, ${personWalletCount} Personal Wallets, ${cityCount} Cities.`);

    // 6. Load and filter Calabar scraped data
    const rawData = JSON.parse(fs.readFileSync('scratch/chopcalabar_calabar.json', 'utf8'));
    const calabarBusinesses = rawData.filter((d: any) => {
      const addr = (d.address || '').toLowerCase();
      const name = (d.name || '').toLowerCase();
      return !addr.includes('uyo') && !name.includes('uyo') && !addr.includes('akwa ibom');
    });

    console.log(`Total authentic Calabar businesses to ingest: ${calabarBusinesses.length}\n`);

    // Helper functions
    function slugify(name: string): string {
      return name
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .slice(0, 60);
    }

    function mapCategoryAndTags(item: any): { orgType: string; vertical: string } {
      const cat = item.category || '';
      const tags = (item.tags || []).map((t: string) => t.toLowerCase());
      const name = item.name.toLowerCase();

      if (cat === 'Hotel') {
        return { orgType: 'HOTEL', vertical: 'HOTEL' };
      }
      if (['Restaurant', 'Fast Food', 'Kitchen', 'Bars & Lounges'].includes(cat)) {
        return { orgType: 'RESTAURANT', vertical: 'RESTAURANT' };
      }
      if (cat === 'Event Center') {
        return { orgType: 'EVENT_ORGANIZER', vertical: 'EVENT_ORGANIZER' };
      }
      if (cat === 'Essential Services') {
        if (tags.some((t: string) => t.includes('hospital')) || name.includes('hospital') || name.includes('clinic') || name.includes('medical') || name.includes('diagnostics')) {
          return { orgType: 'HEALTHCARE', vertical: 'HEALTHCARE' };
        }
        if (tags.some((t: string) => t.includes('pharmacy')) || name.includes('pharmacy')) {
          return { orgType: 'PHARMACY', vertical: 'PHARMACY' };
        }
        if (tags.some((t: string) => t.includes('event')) || name.includes('event') || name.includes('arena') || name.includes('dome')) {
          return { orgType: 'EVENT_ORGANIZER', vertical: 'EVENT_ORGANIZER' };
        }
        return { orgType: 'SERVICES', vertical: 'SERVICES' };
      }
      if (cat === 'Lifestyle & Leisure') {
        if (name.includes('hotel') || name.includes('suites') || name.includes('inn')) {
          return { orgType: 'HOTEL', vertical: 'HOTEL' };
        }
        if (name.includes('confectionery') || name.includes('bakery')) {
          return { orgType: 'RETAIL', vertical: 'RETAIL' };
        }
        if (name.includes('club') || name.includes('lounge') || name.includes('bar')) {
          return { orgType: 'RESTAURANT', vertical: 'RESTAURANT' };
        }
        return { orgType: 'SERVICES', vertical: 'SERVICES' };
      }
      return { orgType: 'SERVICES', vertical: 'SERVICES' };
    }

    const seenSlugs = new Set<string>();
    let insertedCount = 0;

    for (const biz of calabarBusinesses) {
      const orgId = uuidv4();
      const locId = uuidv4();
      const listingId = uuidv4();
      const walletId = uuidv4();

      const { orgType, vertical } = mapCategoryAndTags(biz);

      let baseSlug = slugify(biz.name);
      if (!baseSlug) baseSlug = `calabar-place-${biz.sourceId || insertedCount + 1}`;
      let finalSlug = baseSlug;
      let counter = 1;
      while (seenSlugs.has(finalSlug)) {
        finalSlug = `${baseSlug}-${counter++}`;
      }
      seenSlugs.add(finalSlug);

      const coverImg = biz.coverImage || (biz.images && biz.images[0]) || null;
      const cleanDesc = biz.description || `${biz.category} located at ${biz.address || 'Calabar'}.`;
      const cleanAddr = biz.address || 'Calabar, Cross River State';

      // Insert Organization
      await client.query(`
        INSERT INTO "organization" (
          id, name, type, "storeCategory", description, address, "logoAssetId", status, "createdAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE', NOW())
      `, [
        orgId,
        biz.name,
        orgType,
        biz.category || orgType,
        cleanDesc,
        cleanAddr,
        coverImg
      ]);

      // Insert Location
      await client.query(`
        INSERT INTO "location" (
          id, "organizationId", name, address, latitude, longitude, "cityId"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        locId,
        orgId,
        `${biz.name} - Calabar Main`,
        cleanAddr,
        biz.latitude || 4.9757,
        biz.longitude || 8.3417,
        calabarCityId
      ]);

      // Insert Wallet for Organization
      await client.query(`
        INSERT INTO "wallet" (
          id, "organizationId", balance, currency
        ) VALUES ($1, $2, 0.0, 'NGN')
      `, [
        walletId,
        orgId
      ]);

      // Insert DiscoveryListing
      const metadata = JSON.stringify({
        coverImage: coverImg,
        images: biz.images || [],
        phone: biz.phone || null,
        whatsapp: biz.whatsapp || null,
        hours: biz.hours || null,
        tags: biz.tags || [],
        instagram: biz.instagram || null,
        sourceUrl: biz.sourceUrl || null,
        sourceId: biz.sourceId || null,
        rating: null,
        isOpen: true,
        deliveryEta: null
      });

      await client.query(`
        INSERT INTO "discoveryListing" (
          id, "organizationId", "locationId", "cityId", vertical, slug, title, description, "coverAssetId", "isActive", metadata, "createdAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, $10, NOW())
      `, [
        listingId,
        orgId,
        locId,
        calabarCityId,
        vertical,
        finalSlug,
        biz.name,
        cleanDesc,
        coverImg,
        metadata
      ]);

      // Insert Contact Points
      if (biz.phone) {
        await client.query(`
          INSERT INTO "organizationContactPoint" (
            id, "organizationId", "locationId", type, value, "isPrimary", "isVerified", "createdAt", "updatedAt"
          ) VALUES ($1, $2, $3, 'PHONE', $4, true, false, NOW(), NOW())
        `, [uuidv4(), orgId, locId, biz.phone]);
      }

      if (biz.whatsapp) {
        await client.query(`
          INSERT INTO "organizationContactPoint" (
            id, "organizationId", "locationId", type, value, "isPrimary", "isVerified", "createdAt", "updatedAt"
          ) VALUES ($1, $2, $3, 'WHATSAPP', $4, false, false, NOW(), NOW())
        `, [uuidv4(), orgId, locId, biz.whatsapp]);
      }

      if (biz.instagram) {
        await client.query(`
          INSERT INTO "organizationContactPoint" (
            id, "organizationId", "locationId", type, value, "isPrimary", "isVerified", "createdAt", "updatedAt"
          ) VALUES ($1, $2, $3, 'INSTAGRAM', $4, false, false, NOW(), NOW())
        `, [uuidv4(), orgId, locId, biz.instagram]);
      }

      if (biz.sourceUrl) {
        await client.query(`
          INSERT INTO "organizationContactPoint" (
            id, "organizationId", "locationId", type, value, "isPrimary", "isVerified", "createdAt", "updatedAt"
          ) VALUES ($1, $2, $3, 'WEBSITE', $4, false, false, NOW(), NOW())
        `, [uuidv4(), orgId, locId, biz.sourceUrl]);
      }

      // Vertical-specific initial records
      if (orgType === 'HOTEL') {
        await client.query(`
          INSERT INTO "hotelRoom" (
            id, "organizationId", "locationId", "roomNumber", type, status, "baseRate"
          ) VALUES ($1, $2, $3, '101', 'Deluxe Suite', 'CLEAN', 35000)
        `, [uuidv4(), orgId, locId]);
      }

      if (orgType === 'RESTAURANT') {
        await client.query(`
          INSERT INTO "restaurantSettings" (
            id, "organizationId", "serviceStyle", "taxRate", "serviceCharge", "openingHours", "acceptsWalkIns", "nextOrderNumber"
          ) VALUES ($1, $2, 'HYBRID', 7.5, 0, $3, true, 1)
        `, [uuidv4(), orgId, biz.hours || '8:00 AM - 10:00 PM']);
      }

      insertedCount++;
    }

    await client.query('COMMIT');
    console.log(`\nSUCCESS: Ingested ${insertedCount} authentic Calabar businesses into database!`);

    // Audit counts post-ingest
    console.log('\n=== FINAL VERIFIED DATABASE AUDIT ===');
    const finalTables = [
      'organization',
      'location',
      'discoveryListing',
      'organizationContactPoint',
      'organizationClaim',
      'deliveryJob',
      'hotelRoom',
      'restaurantSettings',
      'wallet',
      'person',
      'account',
      'city'
    ];

    for (const t of finalTables) {
      const res = await client.query(`SELECT COUNT(*) FROM "${t}"`);
      console.log(`${t.padEnd(26)} : ${res.rows[0].count}`);
    }

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed and rolled back:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().then(() => {
  console.log('Script completed successfully.');
  process.exit(0);
}).catch((e) => {
  console.error(e);
  process.exit(1);
});
