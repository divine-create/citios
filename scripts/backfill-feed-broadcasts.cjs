const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Client } = require('pg');

const envContent = fs.readFileSync(path.join(__dirname, '../.env'), 'utf8');
let dbUrl = '';
for (const line of envContent.split('\n')) {
  if (line.startsWith('DIRECT_URL=')) {
    dbUrl = line.split('=')[1].trim().replace(/^["']|["']$/g, '');
  }
}

const TEST_ORG_ID_PREFIXES = [
  'org_test_',
  'org_service_',
  'org_rem_',
  'org_race_',
  'org_demote_',
  'org_conc_',
  'org_deact_',
  'org_a_',
  'org_b_',
  'org_1',
  'log-',
  'org-hotel-',
  'org-food-',
];

const TEST_ORG_NAME_PATTERNS = [
  /^org$/i,
  /^org\s+org_/i,
  /^bistro\s+[0-9a-f]{5,8}$/i,
  /\s[0-9a-f]{6,8}$/i,
  /\b(test|demo)\s+(enterprise|org|spot|shop|store|hotel|resort|item|product)\b/i,
  /\b(payout|fulfillment|inventory)\s+test\s+org\b/i,
  /\b(remediation|demote guard|race|conc|deact)\s+org\b/i,
  /\btenant\s+organization\s+[ab]\b/i,
  /^merchant\s+[ab]$/i,
  /^logistics\s+co$/i,
  /^citylogistics\s+provider/i,
  /^calabar\s+fisherman\s+spot$/i,
  /^reject\s+me\s+shop/i,
  /^kano\s+spice\s+bazaar/i,
  /^olumo\s+(bistro|staged\s+cafe)/i,
  /^newly\s+registered\s+hotel/i,
  /^tinapa\s+lakeside\s+resort\s+test$/i,
  /^supreme\s+buka\s+test\s+spot$/i,
  /^lagos\s+pro\s+services/i,
  /^ikeja\s+quick\s+fix/i,
];

function isTestOrDemoOrg(id, name) {
  const orgId = (id || '').trim();
  const orgName = (name || '').trim();

  if (orgId && TEST_ORG_ID_PREFIXES.some((pfx) => orgId.toLowerCase().startsWith(pfx))) {
    return true;
  }
  if (orgName && TEST_ORG_NAME_PATTERNS.some((pattern) => pattern.test(orgName))) {
    return true;
  }
  return false;
}

async function main() {
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  console.log('🚀 Connected to database. Starting catalog-to-feed backfill...');

  await client.query('BEGIN');

  try {
    // 1. Purge stale automated test posts
    const purgeTestPosts = await client.query(`
      DELETE FROM "post"
      WHERE "organizationId" IN (
        'org_service_a_56ce8fdd',
        'org_service_a_c697f5e0',
        'org_service_a_d1d92138',
        'org_service_a_d351f271',
        'org_service_a_0fa04ac3',
        'org_service_a_89d61fb3'
      )
    `);
    console.log(`Cleaned up ${purgeTestPosts.rowCount} stale test service posts.`);

    // 2. Fetch Organizations & primary locations
    const orgsRes = await client.query(`
      SELECT o.id, o.name, o.address, o.type,
             l.name as loc_name, l.address as loc_address
      FROM "organization" o
      LEFT JOIN "location" l ON l."organizationId" = o.id
    `);
    const orgMap = new Map();
    for (const r of orgsRes.rows) {
      if (!orgMap.has(r.id)) {
        orgMap.set(r.id, r);
      }
    }

    let serviceCount = 0;
    let retailCount = 0;
    let menuCount = 0;
    let jobCount = 0;

    // Helper for upserting a post
    const upsertPost = async ({
      title,
      content,
      category,
      price,
      imageUrl,
      location,
      organizationId,
      linkedEntityType,
      linkedEntityId,
    }) => {
      const id = crypto.randomUUID();
      await client.query(
        `
        INSERT INTO "post" (
          id, title, content, category, price, "imageUrl", location,
          "organizationId", "linkedEntityType", "linkedEntityId",
          status, "isEmergency", "viewCount", "shareCount", "createdAt"
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10,
          'PUBLISHED', false, 0, 0, NOW()
        )
        ON CONFLICT ("linkedEntityType", "linkedEntityId")
        DO UPDATE SET
          title = EXCLUDED.title,
          content = EXCLUDED.content,
          category = EXCLUDED.category,
          price = EXCLUDED.price,
          "imageUrl" = EXCLUDED."imageUrl",
          location = EXCLUDED.location,
          "organizationId" = EXCLUDED."organizationId",
          status = 'PUBLISHED'
        `,
        [
          id,
          title,
          content,
          category,
          price != null ? price : null,
          imageUrl || null,
          location || null,
          organizationId,
          linkedEntityType,
          linkedEntityId,
        ]
      );
    };

    // 3. Backfill Services
    const servicesRes = await client.query(`
      SELECT s.id, s.name, s.description, s.price, s."imageAssetId", s."organizationId"
      FROM "serviceCatalogItem" s
      WHERE s."isActive" = true OR s."isActive" IS NULL
    `);
    for (const s of servicesRes.rows) {
      const org = orgMap.get(s.organizationId);
      if (!org || isTestOrDemoOrg(s.organizationId, org.name)) continue;

      const locText = org.loc_address || org.address || 'Calabar';
      const body = s.description
        ? `${s.description}\n\n📍 ${locText}`
        : `Verified professional service offered by ${org.name}.\n\n📍 ${locText}`;

      await upsertPost({
        title: s.name,
        content: body,
        category: 'Services',
        price: s.price ? Number(s.price) : null,
        imageUrl: s.imageAssetId,
        location: locText,
        organizationId: s.organizationId,
        linkedEntityType: 'SERVICE',
        linkedEntityId: s.id,
      });
      serviceCount++;
    }
    console.log(`✅ Backfilled ${serviceCount} Service posts.`);

    // 4. Backfill Retail Products
    const retailRes = await client.query(`
      SELECT p.id, p.name, p.description, p.price, p."imageAssetId", p."organizationId"
      FROM "retailProduct" p
    `);
    for (const p of retailRes.rows) {
      const org = orgMap.get(p.organizationId);
      if (!org || isTestOrDemoOrg(p.organizationId, org.name)) continue;

      const locText = org.loc_address || org.address || 'Calabar';
      const body = p.description
        ? `${p.description}\n\n📍 Available at ${org.name} (${locText})`
        : `Available at ${org.name}.\n\n📍 ${locText}`;

      await upsertPost({
        title: p.name,
        content: body,
        category: 'Marketplace',
        price: p.price ? Number(p.price) : null,
        imageUrl: p.imageAssetId,
        location: locText,
        organizationId: p.organizationId,
        linkedEntityType: 'RETAIL_PRODUCT',
        linkedEntityId: p.id,
      });
      retailCount++;
    }
    console.log(`✅ Backfilled ${retailCount} Retail Marketplace posts.`);

    // 5. Backfill Restaurant Menu Items
    const menuRes = await client.query(`
      SELECT m.id, m.name, m.description, m.price, m."imageUrl", m."organizationId"
      FROM "menuItem" m
      WHERE m."isAvailable" = true OR m."isAvailable" IS NULL
    `);
    for (const m of menuRes.rows) {
      const org = orgMap.get(m.organizationId);
      if (!org || isTestOrDemoOrg(m.organizationId, org.name)) continue;

      const locText = org.loc_address || org.address || 'Calabar';
      const body = m.description
        ? `${m.description}\n\n📍 Prepared fresh at ${org.name} (${locText})`
        : `Prepared fresh at ${org.name}.\n\n📍 ${locText}`;

      await upsertPost({
        title: m.name,
        content: body,
        category: 'Food',
        price: m.price ? Number(m.price) : null,
        imageUrl: m.imageUrl,
        location: locText,
        organizationId: m.organizationId,
        linkedEntityType: 'MENU_ITEM',
        linkedEntityId: m.id,
      });
      menuCount++;
    }
    console.log(`✅ Backfilled ${menuCount} Food / Menu Item posts.`);

    // 6. Backfill Jobs
    const jobsRes = await client.query(`
      SELECT j.id, j.title, j.description, j.pay, j.area, j."organizationId"
      FROM "job" j
    `);
    for (const j of jobsRes.rows) {
      const org = orgMap.get(j.organizationId);
      if (!org || isTestOrDemoOrg(j.organizationId, org.name)) continue;

      const locText = j.area || org.loc_address || org.address || 'Calabar, Cross River';
      const body = j.description || `Job opening at ${org.name}.\n\n📍 ${locText}`;

      await upsertPost({
        title: j.title,
        content: body,
        category: 'Jobs',
        price: null,
        imageUrl: null,
        location: locText,
        organizationId: j.organizationId,
        linkedEntityType: 'JOB',
        linkedEntityId: j.id,
      });
      jobCount++;
    }
    console.log(`✅ Backfilled ${jobCount} Job opening posts.`);

    await client.query('COMMIT');
    console.log('🎉 Catalog-to-Feed Backfill Successfully Committed!');

    // Total post count check
    const totalPostsRes = await client.query('SELECT count(*) FROM "post"');
    console.log(`📊 Total Posts in Feed now: ${totalPostsRes.rows[0].count}`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Backfill failed, transaction rolled back:', err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main().catch(console.error);
