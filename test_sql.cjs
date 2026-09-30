require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const pNoOrg = await pool.query('SELECT COUNT(*) as count FROM "RetailProduct" WHERE "organizationId" NOT IN (SELECT id FROM "Organization")');
  console.log('Products without org:', pNoOrg.rows[0].count);
  
  const pNoLoc = await pool.query('SELECT COUNT(*) as count FROM "RetailProduct" WHERE "organizationId" NOT IN (SELECT "organizationId" FROM "Location")');
  console.log('Products in org without location:', pNoLoc.rows[0].count);
  
  const pBadPrice = await pool.query('SELECT COUNT(*) as count FROM "RetailProduct" WHERE price < 0 OR price IS NULL');
  console.log('Products with invalid price:', pBadPrice.rows[0].count);
  
  const pNoStock = await pool.query('SELECT COUNT(*) as count FROM "RetailProduct" WHERE "stockQuantity" <= 0 OR "stockQuantity" IS NULL');
  console.log('Products out of stock:', pNoStock.rows[0].count);
  
  await pool.end();
}
run();
