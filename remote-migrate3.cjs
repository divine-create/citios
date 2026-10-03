const { Client } = require('pg');

async function migrate() {
  const client = new Client({
    connectionString: "postgresql://postgres.ipkvkzlpifjlmrbxcjsm:001citiconnect@aws-1-eu-west-1.pooler.supabase.com:5432/postgres"
  });

  try {
    await client.connect();
    
    try {
      await client.query('ALTER TABLE "customerData" ADD COLUMN "personId" text UNIQUE');
      console.log('Added personId to customerData');
    } catch(e) { console.error('personId exists or error', e.message); }

    try {
      await client.query('ALTER TABLE "deliveryJob" ADD COLUMN "organizationId" text');
      console.log('Added organizationId to deliveryJob');
    } catch(e) { console.error('orgId exists or error', e.message); }

    try {
      await client.query('ALTER TABLE "deliveryJob" ADD COLUMN "locationId" text');
      console.log('Added locationId to deliveryJob');
    } catch(e) { console.error('locationId exists or error', e.message); }

    try {
      await client.query('ALTER TABLE "deliveryJob" ADD COLUMN "dropoffAddress" text');
      console.log('Added dropoffAddress to deliveryJob');
    } catch(e) { console.error('dropoffAddress exists or error', e.message); }

  } finally {
    await client.end();
  }
}
migrate();
