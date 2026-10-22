import 'dotenv/config';
import pg from 'pg';
import { isTestOrDemoOrganization, isTestOrDemoProduct } from '../lib/storefront-filter.js';

const { Pool } = pg;

const AUTHENTIC_RETAIL_ORG_IDS = new Set([
  'istore-calabar',
  'cygroup-calabar',
  'software-guru-tech-calabar',
  'e2abab57-3b85-4d46-84d4-d1f6fc21de28', // Gumbo hairs (registered by resident Edna Aquah)
]);

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    console.log('=== STARTING DEMO STORE PURGE ===');

    // 1. Correct Ascentech Services Limited if it is typed as RETAIL
    const fixAscentech = await client.query(`
      UPDATE "organization"
      SET type = 'SERVICES'
      WHERE id = '8f91dfd5-9194-42eb-8ee3-ca661382550d' AND type = 'RETAIL'
      RETURNING id, name, type
    `);
    if (fixAscentech.rowCount && fixAscentech.rowCount > 0) {
      console.log('Updated Ascentech Services Limited to type SERVICES.');
    }

    // 2. Fetch all RETAIL organizations
    const orgsRes = await client.query(`
      SELECT id, name, type, "createdAt"
      FROM "organization"
      WHERE type = 'RETAIL'
    `);

    const demoOrgs = orgsRes.rows.filter((o) => {
      if (AUTHENTIC_RETAIL_ORG_IDS.has(o.id)) return false;
      return true; // Any other retail org not in authentic whitelist is a demo/test store
    });

    const demoOrgIds = demoOrgs.map((o) => o.id);
    console.log(`Found ${demoOrgIds.length} demo retail organizations to purge.`);

    if (demoOrgIds.length === 0) {
      console.log('No demo retail organizations found to remove.');
      return;
    }

    await client.query('BEGIN');

    // 3. Delete dependent rows in child tables
    // a. Discovery Listings
    const delListings = await client.query(
      `DELETE FROM "discoveryListing" 
       WHERE "organizationId" = ANY($1::text[])
          OR (vertical = 'RETAIL' AND slug ILIKE ANY(ARRAY['corner-%', 'test-%', 'reject-%', 'kano-%', 'demo-%', 'widget-%']))
       RETURNING id`,
      [demoOrgIds]
    );
    console.log(`Deleted ${delListings.rowCount} demo discovery listings.`);

    // b. Social / Feed interactions
    await client.query(
      `DELETE FROM "postLike" WHERE "postId" IN (SELECT id FROM "post" WHERE "organizationId" = ANY($1::text[]))`,
      [demoOrgIds]
    );
    await client.query(
      `DELETE FROM "comment" WHERE "postId" IN (SELECT id FROM "post" WHERE "organizationId" = ANY($1::text[]))`,
      [demoOrgIds]
    );
    await client.query(
      `DELETE FROM "post" WHERE "organizationId" = ANY($1::text[])`,
      [demoOrgIds]
    );

    // c. Retail stock, purchases, and orders
    await client.query(
      `DELETE FROM "retailPurchaseOrderItem" WHERE "productId" IN (SELECT id FROM "retailProduct" WHERE "organizationId" = ANY($1::text[]))`,
      [demoOrgIds]
    );
    await client.query(
      `DELETE FROM "retailOrderItem" WHERE "orderId" IN (SELECT id FROM "retailOrder" WHERE "organizationId" = ANY($1::text[]))`,
      [demoOrgIds]
    );
    await client.query(
      `DELETE FROM "retailOrderItem" WHERE "productId" IN (SELECT id FROM "retailProduct" WHERE "organizationId" = ANY($1::text[]))`,
      [demoOrgIds]
    );
    await client.query(
      `DELETE FROM "retailLocationStock" WHERE "productId" IN (SELECT id FROM "retailProduct" WHERE "organizationId" = ANY($1::text[]))`,
      [demoOrgIds]
    );
    await client.query(
      `DELETE FROM "retailStockMovement" WHERE "organizationId" = ANY($1::text[])`,
      [demoOrgIds]
    );
    await client.query(
      `DELETE FROM "retailStockMovement" WHERE "productId" IN (SELECT id FROM "retailProduct" WHERE "organizationId" = ANY($1::text[]))`,
      [demoOrgIds]
    );
    await client.query(
      `DELETE FROM "payment" WHERE "retailOrderId" IN (SELECT id FROM "retailOrder" WHERE "organizationId" = ANY($1::text[]))`,
      [demoOrgIds]
    );
    await client.query(
      `DELETE FROM "retailOrder" WHERE "organizationId" = ANY($1::text[])`,
      [demoOrgIds]
    );

    // d. Retail products
    const delProducts = await client.query(
      `DELETE FROM "retailProduct" 
       WHERE "organizationId" = ANY($1::text[])
          OR name ILIKE ANY(ARRAY['widget%', 'standard bread', 'test item%', 'sample product%'])
       RETURNING id`,
      [demoOrgIds]
    );
    console.log(`Deleted ${delProducts.rowCount} demo retail products.`);

    // e. Retail categories & notifications
    await client.query(
      `DELETE FROM "retailCategory" WHERE "organizationId" = ANY($1::text[])`,
      [demoOrgIds]
    );
    await client.query(
      `DELETE FROM "retailNotification" WHERE "organizationId" = ANY($1::text[])`,
      [demoOrgIds]
    );

    // f. Wallets & Ledger
    await client.query(
      `DELETE FROM "ledgerEntry" WHERE "walletId" IN (SELECT id FROM "wallet" WHERE "organizationId" = ANY($1::text[]))`,
      [demoOrgIds]
    );
    await client.query(
      `DELETE FROM "wallet" WHERE "organizationId" = ANY($1::text[])`,
      [demoOrgIds]
    );
    await client.query(
      `DELETE FROM "payout" WHERE "organizationId" = ANY($1::text[])`,
      [demoOrgIds]
    );

    // g. Customers & Relationships
    await client.query(
      `DELETE FROM "customerData" WHERE "relationshipId" IN (SELECT id FROM "relationship" WHERE "organizationId" = ANY($1::text[]))`,
      [demoOrgIds]
    );
    await client.query(
      `DELETE FROM "relationship" WHERE "organizationId" = ANY($1::text[])`,
      [demoOrgIds]
    );

    // h. Locations & Memberships
    await client.query(
      `DELETE FROM "location" WHERE "organizationId" = ANY($1::text[])`,
      [demoOrgIds]
    );
    await client.query(
      `DELETE FROM "membership" WHERE "organizationId" = ANY($1::text[])`,
      [demoOrgIds]
    );

    // i. Organizations
    const delOrgs = await client.query(
      `DELETE FROM "organization" WHERE id = ANY($1::text[]) RETURNING id, name`,
      [demoOrgIds]
    );
    console.log(`Successfully purged ${delOrgs.rowCount} demo retail organizations!`);

    await client.query('COMMIT');

    // 4. Verification queries
    const remainingOrgs = await client.query(`
      SELECT id, name, type FROM "organization" WHERE type = 'RETAIL' ORDER BY name
    `);
    const remainingProds = await client.query(`
      SELECT "organizationId", count(*)::int AS count 
      FROM "retailProduct" 
      GROUP BY "organizationId"
    `);
    const remainingListings = await client.query(`
      SELECT id, title, slug, "organizationId" FROM "discoveryListing" WHERE vertical = 'RETAIL'
    `);

    console.log('\n=== REMAINING RETAIL STORES IN DATABASE ===');
    for (const o of remainingOrgs.rows) {
      const pCount = remainingProds.rows.find((r) => r.organizationId === o.id)?.count || 0;
      console.log(` - [${o.id}] ${o.name} (${pCount} products)`);
    }

    console.log('\n=== REMAINING RETAIL DISCOVERY LISTINGS ===');
    for (const l of remainingListings.rows) {
      console.log(` - [${l.id}] ${l.title} (${l.slug}) -> org: ${l.organizationId}`);
    }

    console.log('\n=== PURGE COMPLETE ===');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Purge error:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
