const { Client } = require('pg');
async function run() {
  const client = new Client({ connectionString: 'postgresql://postgres.ipkvkzlpifjlmrbxcjsm:001citiconnect@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true' });
  await client.connect();
  const sqls = [
    `ALTER TABLE "deliveryPricingRule" ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';`,
    `ALTER TABLE "deliveryQuote" ALTER COLUMN "expiresAt" TYPE TIMESTAMPTZ(3) USING "expiresAt" AT TIME ZONE 'UTC';`,
    `ALTER TABLE "deliveryQuote" ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';`,
    `ALTER TABLE "deliveryQuote" ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'UTC';`
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
