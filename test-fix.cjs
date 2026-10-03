const fs = require('fs');
const { Client } = require('pg');

async function fixDb() {
  const client = new Client({
    connectionString: "postgresql://postgres.ipkvkzlpifjlmrbxcjsm:001citiconnect@aws-1-eu-west-1.pooler.supabase.com:5432/postgres"
  });
  await client.connect();
  
  try { await client.query('ALTER TABLE "deliveryJob" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()'); } catch(e) {}
  try { await client.query('ALTER TABLE "deliveryJob" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4()'); } catch(e) {}

  await client.end();
}

function fixTs() {
  // Fix commerce.ts
  let commerce = fs.readFileSync('app/actions/commerce.ts', 'utf8');
  commerce = commerce.replace(
    /RETURNING "stockQuantity"\r?\n\s*`\.affectedCount\(\);/,
    `\`.affectedCount();`
  );
  fs.writeFileSync('app/actions/commerce.ts', commerce);

  // Fix retail.ts
  let retail = fs.readFileSync('lib/actions/retail.ts', 'utf8');
  retail = retail.replace(
    /RETURNING "stockQuantity"\r?\n\s*`\.affectedCount\(\);/g,
    `\`.affectedCount();`
  );
  fs.writeFileSync('lib/actions/retail.ts', retail);
}

fixDb().then(fixTs);
