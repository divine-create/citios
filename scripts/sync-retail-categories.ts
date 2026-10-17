import 'dotenv/config';
import pg from 'pg';
import crypto from 'crypto';
import { classifyRetailProduct, inferStoreProfileTaxonomy } from '../lib/taxonomy/retail-categorizer';

const { Pool } = pg;

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    const tablesRes = await client.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
    );
    const tableNames = tablesRes.rows.map((r: any) => r.table_name);
    const resolveTable = (candidates: string[]) => {
      for (const c of candidates) {
        const found = tableNames.find((t: string) => t.toLowerCase() === c.toLowerCase());
        if (found) return `"${found}"`;
      }
      throw new Error(`Could not find table for candidates: ${candidates.join(', ')}`);
    };

    const T_ORG = resolveTable(['organization', 'Organization']);
    const T_LISTING = resolveTable(['discoveryListing', 'DiscoveryListing', 'discovery_listing']);
    const T_CATEGORY = resolveTable(['retailCategory', 'RetailCategory', 'retail_category']);
    const T_PRODUCT = resolveTable(['retailProduct', 'RetailProduct', 'retail_product']);

    const orgsRes = await client.query(
      `SELECT id, name, "storeCategory" FROM ${T_ORG} WHERE type = 'RETAIL'`
    );
    console.log(`Found ${orgsRes.rows.length} RETAIL organization(s) to categorize.`);

    for (const org of orgsRes.rows) {
      const prodRes = await client.query(
        `SELECT id, name, description, price FROM ${T_PRODUCT} WHERE "organizationId" = $1`,
        [org.id]
      );
      const products = prodRes.rows;

      const taxonomy = inferStoreProfileTaxonomy(products, org.storeCategory);

      // Update Organization.storeCategory
      await client.query(
        `UPDATE ${T_ORG} SET "storeCategory" = $1 WHERE id = $2`,
        [taxonomy.storeCategory, org.id]
      );

      // Update DiscoveryListing.metadata.aisles
      const listRes = await client.query(
        `SELECT id, metadata FROM ${T_LISTING} WHERE "organizationId" = $1`,
        [org.id]
      );
      for (const row of listRes.rows) {
        let meta: any = {};
        try {
          if (row.metadata) meta = JSON.parse(row.metadata);
        } catch {}
        meta.aisles = taxonomy.aisles;
        await client.query(
          `UPDATE ${T_LISTING} SET metadata = $1 WHERE id = $2`,
          [JSON.stringify(meta), row.id]
        );
      }

      // Fetch existing categories
      const catRes = await client.query(
        `SELECT id, name FROM ${T_CATEGORY} WHERE "organizationId" = $1`,
        [org.id]
      );
      const catByName = new Map<string, string>(
        catRes.rows.map((c: any) => [c.name.toLowerCase().trim(), c.id])
      );

      const summary = new Map<string, number>();
      const usedCatIds = new Set<string>();

      for (const p of products) {
        const classified = classifyRetailProduct({
          name: p.name,
          description: p.description,
          price: p.price,
          storeCategory: taxonomy.storeCategory,
        });

        const key = classified.inStoreCategory.toLowerCase().trim();
        let catId = catByName.get(key);
        if (!catId) {
          catId = crypto.randomUUID();
          await client.query(
            `INSERT INTO ${T_CATEGORY} (id, "organizationId", name, description) VALUES ($1, $2, $3, $4)`,
            [catId, org.id, classified.inStoreCategory, `${classified.inStoreCategory} at ${org.name}`]
          );
          catByName.set(key, catId);
        }

        usedCatIds.add(catId);

        await client.query(
          `UPDATE ${T_PRODUCT} SET "categoryId" = $1, "globalCategory" = $2 WHERE id = $3`,
          [catId, classified.globalCategory, p.id]
        );

        summary.set(classified.inStoreCategory, (summary.get(classified.inStoreCategory) || 0) + 1);
      }

      // Clean up unused categories for this organization
      if (usedCatIds.size > 0) {
        await client.query(
          `DELETE FROM ${T_CATEGORY} WHERE "organizationId" = $1 AND id != ALL($2::text[])`,
          [org.id, Array.from(usedCatIds)]
        );
      }

      console.log(`\n✅ ${org.name} (${org.id})`);
      console.log(`   Store Sector: ${taxonomy.storeCategory}`);
      console.log(`   In-Store Aisles (${summary.size}):`);
      for (const [aisle, count] of Array.from(summary.entries()).sort((a, b) => b[1] - a[1])) {
        console.log(`     - ${aisle}: ${count} item(s)`);
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
