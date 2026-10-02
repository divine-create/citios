const { Client } = require('pg');
async function run() {
  const client = new Client({ connectionString: 'postgresql://postgres.ipkvkzlpifjlmrbxcjsm:001citiconnect@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true' });
  await client.connect();
  const sqls = [
    `CREATE TYPE "DeliveryQuoteStatus" AS ENUM ('CALCULATED', 'OFFERED', 'ACCEPTED', 'EXPIRED', 'CANCELLED');`,
    `CREATE TABLE "deliveryPricingRule" (
      "id" TEXT PRIMARY KEY,
      "providerId" TEXT NOT NULL,
      "version" INTEGER NOT NULL DEFAULT 1,
      "currency" TEXT NOT NULL DEFAULT 'USD',
      "baseFee" NUMERIC NOT NULL,
      "perKmRate" NUMERIC NOT NULL,
      "perKgRate" NUMERIC NOT NULL DEFAULT 0,
      "prioritySurcharge" NUMERIC NOT NULL DEFAULT 0,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "deliveryPricingRule_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "organization"("id") ON DELETE CASCADE,
      UNIQUE("providerId", "version")
    );`,
    `CREATE TABLE "deliveryQuote" (
      "id" TEXT PRIMARY KEY,
      "deliveryJobId" TEXT NOT NULL,
      "providerId" TEXT NOT NULL,
      "status" "DeliveryQuoteStatus" NOT NULL DEFAULT 'CALCULATED',
      "pricingVersion" INTEGER NOT NULL,
      "baseCharge" NUMERIC NOT NULL,
      "distanceCharge" NUMERIC NOT NULL,
      "weightCharge" NUMERIC NOT NULL DEFAULT 0,
      "serviceCharge" NUMERIC NOT NULL DEFAULT 0,
      "subtotal" NUMERIC NOT NULL,
      "tax" NUMERIC NOT NULL DEFAULT 0,
      "total" NUMERIC NOT NULL,
      "currency" TEXT NOT NULL,
      "idempotencyKey" TEXT,
      "expiresAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "deliveryQuote_deliveryJobId_fkey" FOREIGN KEY ("deliveryJobId") REFERENCES "deliveryJob"("id") ON DELETE CASCADE,
      CONSTRAINT "deliveryQuote_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "organization"("id") ON DELETE CASCADE,
      UNIQUE("providerId", "idempotencyKey")
    );`,
    `ALTER TYPE "DeliveryStatus" ADD VALUE IF NOT EXISTS 'PRICED' AFTER 'REQUESTED';`
  ];
  for (let s of sqls) {
    try {
      await client.query(s);
      console.log('Success:', s.slice(0, 30));
    } catch(e) { console.error('Error:', e.message); }
  }
  await client.end();
}
run();
