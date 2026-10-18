import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function inspect() {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();

  console.log('--- HOTEL ORGANIZATIONS ---');
  const orgs = await c.query(`SELECT id, name, type, "imageUrl", "coverImage", metadata FROM "organization" WHERE name ILIKE '%hogis%' OR name ILIKE '%channel view%' OR name ILIKE '%axari%' OR name ILIKE '%chelsea%'`);
  for (const o of orgs.rows) {
    console.log(`[Org] ${o.name} | id: ${o.id}`);
    console.log(`  imageUrl: ${o.imageUrl}`);
    console.log(`  coverImage: ${o.coverImage}`);
    if (o.metadata) console.log(`  metadata: ${o.metadata.slice(0, 150)}...`);
  }

  console.log('\n--- EVENTS IN DB ---');
  const events = await c.query(`SELECT id, title, location, "imageUrl", date FROM "event" LIMIT 10`);
  for (const e of events.rows) {
    console.log(`[Event] ${e.title} -> ${e.imageUrl}`);
  }

  console.log('\n--- RETAIL PRODUCTS ---');
  const products = await c.query(`SELECT id, name, "imageAssetId" FROM "retailProduct" WHERE "imageAssetId" IS NOT NULL LIMIT 10`);
  for (const p of products.rows) {
    console.log(`[Product] ${p.name} -> ${p.imageAssetId}`);
  }

  await c.end();
}

inspect().catch(console.error).finally(() => process.exit(0));
