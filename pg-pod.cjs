const { Client } = require('pg');
async function run() {
  const client = new Client({ connectionString: 'postgresql://postgres.ipkvkzlpifjlmrbxcjsm:001citiconnect@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true' });
  await client.connect();
  const sqls = [
    `TRUNCATE TABLE "proofOfDelivery" CASCADE;`,
    `ALTER TABLE "proofOfDelivery" ADD COLUMN "providerId" TEXT NOT NULL;`,
    `ALTER TABLE "proofOfDelivery" ADD COLUMN "idempotencyKey" TEXT;`,
    `ALTER TABLE "proofOfDelivery" ADD COLUMN "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;`,
    `ALTER TABLE "proofOfDelivery" ADD CONSTRAINT "proofOfDelivery_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "organization"("id") ON DELETE CASCADE;`,
    `ALTER TABLE "proofOfDelivery" ADD CONSTRAINT "uniq_pod_delivery_job" UNIQUE ("deliveryJobId");`,
    `ALTER TABLE "proofOfDelivery" ADD CONSTRAINT "uniq_pod_provider_idem" UNIQUE ("providerId", "idempotencyKey");`
  ];
  for (let s of sqls) {
    try {
      await client.query(s);
      console.log('Success:', s.slice(0, 50));
    } catch(e) { console.error('Error:', e.message); }
  }
  await client.end();
}
run();
