const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.ipkvkzlpifjlmrbxcjsm:001citiconnect@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true'
});

async function migrate() {
  await client.connect();
  try {
    console.log('Adding compareAtPrice, parentId, variantName...');
    await client.query(`
      ALTER TABLE "retailProduct"
      ADD COLUMN IF NOT EXISTS "compareAtPrice" double precision,
      ADD COLUMN IF NOT EXISTS "parentId" text,
      ADD COLUMN IF NOT EXISTS "variantName" text;
    `);

    console.log('Adding constraint...');
    await client.query(`
      ALTER TABLE "retailProduct"
      DROP CONSTRAINT IF EXISTS "retailProduct_parentId_fkey";
    `);
    
    await client.query(`
      ALTER TABLE "retailProduct"
      ADD CONSTRAINT "retailProduct_parentId_fkey"
      FOREIGN KEY ("parentId") REFERENCES "retailProduct"("id") ON DELETE CASCADE;
    `);
    console.log('Done!');
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

migrate();
