import pkg from 'pg';
const { Client } = pkg;
const client = new Client({ connectionString: process.env.DIRECT_URL });
await client.connect();
const res = await client.query('UPDATE "restaurantInventoryItem" SET "cost" = 0 WHERE "cost" IS NULL;');
console.log('Updated rows:', res.rowCount);
await client.end();
