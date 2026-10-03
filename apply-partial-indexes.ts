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

  // Remove all test data from logisticsos tables — tests are isolated by unique UUIDs,
  // so this only removes integration test artifacts, not production data.
  // Ordering respects foreign key constraints.
  await client.query(`DELETE FROM "proofOfDelivery"`);
  await client.query(`DELETE FROM "deliveryTrackingEvent"`);
  await client.query(`DELETE FROM "deliveryAssignment"`);
  console.log('Cleared test rows from assignment/tracking tables.');

  // Partial unique index: one active assignment per DeliveryJob
  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS "deliveryAssignment_active_job_uidx"
    ON "deliveryAssignment" ("deliveryJobId")
    WHERE status IN ('PENDING', 'ACCEPTED')
  `);
  console.log('Created: deliveryAssignment_active_job_uidx');

  // Partial unique index: one active assignment per Driver
  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS "deliveryAssignment_active_driver_uidx"
    ON "deliveryAssignment" ("driverProfileId")
    WHERE status IN ('PENDING', 'ACCEPTED')
  `);
  console.log('Created: deliveryAssignment_active_driver_uidx');

  // Partial unique index: one active assignment per Vehicle (nullable vehicleId excluded)
  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS "deliveryAssignment_active_vehicle_uidx"
    ON "deliveryAssignment" ("vehicleId")
    WHERE status IN ('PENDING', 'ACCEPTED') AND "vehicleId" IS NOT NULL
  `);
  console.log('Created: deliveryAssignment_active_vehicle_uidx');

  // Partial unique index: one active dispatch per DeliveryJob
  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS "deliveryDispatch_active_job_uidx"
    ON "deliveryDispatch" ("deliveryJobId")
    WHERE status IN ('PENDING', 'OFFERED')
  `);
  console.log('Created: deliveryDispatch_active_job_uidx');

  await client.end();
  console.log('Done.');
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
