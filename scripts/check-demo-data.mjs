import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Delete all demo delivery dispatches, settlements, jobs, driver profiles, vehicles, fleets
    await client.query(`DELETE FROM "deliveryDispatch"`).catch(() => {});
    await client.query(`DELETE FROM "deliveryJob"`).catch(() => {});
    await client.query(`DELETE FROM "logisticsSettlement"`).catch(() => {});
    console.log('Cleared demo deliveryJob / deliveryDispatch / logisticsSettlement records.');

    // 2. Delete any PROMOTIONS demo discovery listings
    await client.query(`DELETE FROM "discoveryListing" WHERE vertical = 'PROMOTIONS'`).catch(() => {});

    // 3. Delete all test/demo discovery listings (e.g. Olumo Bistro, Bistro *, *Test*, etc.)
    const demoListings = await client.query(`
      DELETE FROM "discoveryListing"
      WHERE slug ILIKE '%test%'
         OR slug ILIKE 'olumo-%'
         OR slug ILIKE 'bistro-%'
         OR title ILIKE '%test%'
         OR title ILIKE 'Olumo %'
         OR title ILIKE 'Bistro %'
      RETURNING id, slug, title
    `);
    console.log('Deleted demo discoveryListings:', demoListings.rowCount);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error cleaning demo data:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
