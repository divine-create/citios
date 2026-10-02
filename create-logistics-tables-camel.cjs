const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/cityos',
  });
  await client.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS "logisticsSettings" (
        "id" TEXT NOT NULL,
        "organizationId" TEXT NOT NULL,
        "platformFeeRate" DECIMAL(65,30) NOT NULL DEFAULT 0.10,
        "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "logisticsSettings_pkey" PRIMARY KEY ("id")
      );
    `);
    
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "logisticsSettings_organizationId_key" ON "logisticsSettings"("organizationId");
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "logisticsSettlement" (
        "id" TEXT NOT NULL,
        "providerId" TEXT NOT NULL,
        "deliveryJobId" TEXT NOT NULL,
        "quoteId" TEXT NOT NULL,
        "grossAmount" DECIMAL(65,30) NOT NULL,
        "fees" DECIMAL(65,30) NOT NULL,
        "providerAmount" DECIMAL(65,30) NOT NULL,
        "currency" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "idempotencyKey" TEXT,
        "transactionId" TEXT,
        "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "settledAt" TIMESTAMPTZ(3),

        CONSTRAINT "logisticsSettlement_pkey" PRIMARY KEY ("id")
      );
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "logisticsSettlement_deliveryJobId_key" ON "logisticsSettlement"("deliveryJobId");
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "logisticsSettlement_quoteId_key" ON "logisticsSettlement"("quoteId");
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "logisticsSettlement_transactionId_key" ON "logisticsSettlement"("transactionId");
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uniq_provider_idem_settlement" ON "logisticsSettlement"("providerId", "idempotencyKey");
    `);

    console.log("Tables created (camelCase)!");
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
