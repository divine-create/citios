const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/cityos',
  });
  await client.connect();

  try {
    await client.query(`DROP TABLE IF EXISTS "LogisticsSettings" CASCADE;`);
    await client.query(`DROP TABLE IF EXISTS "LogisticsSettlement" CASCADE;`);
    await client.query(`DROP TABLE IF EXISTS "logisticsSettings" CASCADE;`);
    await client.query(`DROP TABLE IF EXISTS "logisticsSettlement" CASCADE;`);

    // Let Prisma generate the correct table name by using @@map?
    // No, I'll just look at what Prisma Next wants. Prisma next translates PascalCase model to PascalCase or camelCase?
    // Wait, in my `contract.json` check above:
    // "model": "LogisticsSettings", "table": "logisticsSettings"
    // So it wants `logisticsSettings` (camelCase).
    
    await client.query(`
      CREATE TABLE "logisticsSettings" (
        "id" TEXT NOT NULL,
        "organizationId" TEXT NOT NULL,
        "platformFeeRate" DECIMAL(65,30) NOT NULL DEFAULT 0.10,
        "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "logisticsSettings_pkey" PRIMARY KEY ("id")
      );
    `);
    
    await client.query(`
      CREATE UNIQUE INDEX "logisticsSettings_organizationId_key" ON "logisticsSettings"("organizationId");
    `);

    await client.query(`
      CREATE TABLE "logisticsSettlement" (
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
      CREATE UNIQUE INDEX "logisticsSettlement_deliveryJobId_key" ON "logisticsSettlement"("deliveryJobId");
    `);
    await client.query(`
      CREATE UNIQUE INDEX "logisticsSettlement_quoteId_key" ON "logisticsSettlement"("quoteId");
    `);
    await client.query(`
      CREATE UNIQUE INDEX "logisticsSettlement_transactionId_key" ON "logisticsSettlement"("transactionId");
    `);
    await client.query(`
      CREATE UNIQUE INDEX "uniq_provider_idem_settlement" ON "logisticsSettlement"("providerId", "idempotencyKey");
    `);

    console.log("Tables recreated!");
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
