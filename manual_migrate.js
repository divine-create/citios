import { Client } from 'pg';

const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

async function run() {
  const client = new Client({
    connectionString: dbUrl,
  });

  await client.connect();

  console.log("Connected to DB, running manual migrations...");
  try {
    await client.query(`ALTER TABLE "public"."deliveryJob" ADD COLUMN "retailOrderId" text;`);
    console.log("Added column");
  } catch(e) {
    console.error("Error adding column:", e.message);
  }

  try {
    await client.query(`ALTER TABLE "public"."deliveryJob" ADD CONSTRAINT "deliveryJob_retailOrderId_key" UNIQUE ("retailOrderId");`);
    console.log("Added unique constraint");
  } catch(e) {
    console.error("Error adding unique constraint:", e.message);
  }

  try {
    await client.query(`ALTER TABLE "public"."deliveryJob" ADD CONSTRAINT "deliveryJob_retailOrderId_fkey" FOREIGN KEY ("retailOrderId") REFERENCES "public"."retailOrder" ("id");`);
    console.log("Added foreign key constraint");
  } catch(e) {
    console.error("Error adding foreign key constraint:", e.message);
  }
  
  await client.end();
  console.log("Done.");
}

run();
