const { Client } = require('pg');

async function migrate() {
  const client = new Client({
    connectionString: "postgresql://postgres.ipkvkzlpifjlmrbxcjsm:001citiconnect@aws-1-eu-west-1.pooler.supabase.com:5432/postgres"
  });

  try {
    await client.connect();
    
    try {
      await client.query(\`ALTER TABLE "CustomerData" ADD COLUMN "personId" text UNIQUE\`);
      console.log('Added personId to CustomerData');
    } catch(e) { console.error('personId exists or error', e.message); }

    try {
      await client.query(\`ALTER TABLE "DeliveryJob" ADD COLUMN "organizationId" text\`);
      console.log('Added organizationId to DeliveryJob');
    } catch(e) { console.error('orgId exists or error', e.message); }

    try {
      await client.query(\`ALTER TABLE "DeliveryJob" ADD COLUMN "locationId" text\`);
      console.log('Added locationId to DeliveryJob');
    } catch(e) { console.error('locationId exists or error', e.message); }

    try {
      await client.query(\`ALTER TABLE "DeliveryJob" ADD COLUMN "dropoffAddress" text\`);
      console.log('Added dropoffAddress to DeliveryJob');
    } catch(e) { console.error('dropoffAddress exists or error', e.message); }

  } finally {
    await client.end();
  }
}
migrate();
