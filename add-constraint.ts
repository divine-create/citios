import 'dotenv/config';
// @ts-ignore
import postgres from 'pg';

const client = new postgres.Client({
  connectionString: process.env.DIRECT_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  await client.connect();
  console.log('Connected to Supabase.');
  
  try {
    await client.query(`
      ALTER TABLE "deliveryTrackingEvent"
      ADD CONSTRAINT "DeliveryTrackingEvent_provider_job_idem_key" 
      UNIQUE ("providerId", "deliveryJobId", "idempotencyKey")
    `);
    console.log('Created idempotency constraint on DeliveryTrackingEvent');
  } catch (e: any) {
    if (!e.message.includes('already exists')) {
      console.error(e);
    } else {
      console.log('Constraint already exists');
    }
  }

  await client.end();
}

main();
