const { Client } = require('pg');

async function fix() {
  const client = new Client({
    connectionString: "postgresql://postgres.ipkvkzlpifjlmrbxcjsm:001citiconnect@aws-1-eu-west-1.pooler.supabase.com:5432/postgres"
  });
  await client.connect();
  
  try { await client.query('ALTER TABLE "deliveryJob" ADD COLUMN "retailOrderId" text UNIQUE'); } catch(e) {}
  
  // also add default for customerData id
  try { await client.query('ALTER TABLE "customerData" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()'); } catch(e) {}
  try { await client.query('ALTER TABLE "customerData" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4()'); } catch(e) {}

  await client.end();
}
fix();
