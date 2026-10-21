import 'dotenv/config';
import pg from 'pg';

const client = new pg.Client({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  await client.connect();
  console.log('Connected to database.');

  const queries = [
    `ALTER TABLE "deliveryJob" ADD COLUMN IF NOT EXISTS "trackingReference" TEXT UNIQUE;`,
    `ALTER TABLE "deliveryJob" ADD COLUMN IF NOT EXISTS "pickupContactName" TEXT;`,
    `ALTER TABLE "deliveryJob" ADD COLUMN IF NOT EXISTS "pickupContactPhone" TEXT;`,
    `ALTER TABLE "deliveryJob" ADD COLUMN IF NOT EXISTS "dropoffContactName" TEXT;`,
    `ALTER TABLE "deliveryJob" ADD COLUMN IF NOT EXISTS "dropoffContactPhone" TEXT;`,
    `ALTER TABLE "deliveryJob" ADD COLUMN IF NOT EXISTS "packageDescription" TEXT;`,
    `ALTER TABLE "deliveryJob" ADD COLUMN IF NOT EXISTS "packageWeightKg" DOUBLE PRECISION;`,
    `ALTER TABLE "deliveryJob" ADD COLUMN IF NOT EXISTS "serviceLevel" TEXT DEFAULT 'STANDARD';`,
    `ALTER TABLE "deliveryJob" ADD COLUMN IF NOT EXISTS "recipientOtp" TEXT;`,
    `ALTER TABLE "deliveryJob" ADD COLUMN IF NOT EXISTS "cancellationReason" TEXT;`,
    `ALTER TABLE "deliveryJob" ADD COLUMN IF NOT EXISTS "failureReason" TEXT;`,
    `ALTER TABLE "deliveryJob" ADD COLUMN IF NOT EXISTS "customerDataId" TEXT;`,
    `ALTER TABLE "deliveryJob" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT NOW();`,

    `CREATE INDEX IF NOT EXISTS "deliveryJob_customerDataId_idx" ON "deliveryJob" ("customerDataId");`,
    `CREATE INDEX IF NOT EXISTS "deliveryJob_trackingReference_idx" ON "deliveryJob" ("trackingReference");`,

    `ALTER TABLE "logisticsSettings" ADD COLUMN IF NOT EXISTS "isNetworkParticipant" BOOLEAN DEFAULT false;`,
    `ALTER TABLE "logisticsSettings" ADD COLUMN IF NOT EXISTS "serviceRadiusKm" DOUBLE PRECISION;`,
  ];

  for (const q of queries) {
    try {
      await client.query(q);
      console.log('Success:', q.trim());
    } catch (e) {
      console.error('Error running:', q, e.message);
    }
  }

  await client.end();
  console.log('Migration complete.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
