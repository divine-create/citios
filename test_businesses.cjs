const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres.ipkvkzlpifjlmrbxcjsm:001citiconnect@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true' });

async function run() {
  const orgs = await pool.query('SELECT type, COUNT(*) as count FROM "Organization" GROUP BY type ORDER BY count DESC');
  console.log('--- Organization Types ---');
  orgs.rows.forEach(r => console.log(`${r.type}: ${r.count}`));
  
  const sample = await pool.query('SELECT name, type, description FROM "Organization" LIMIT 10');
  console.log('\n--- Sample Businesses ---');
  sample.rows.forEach(r => console.log(`- ${r.name} (${r.type}): ${r.description ? r.description.substring(0, 50) + '...' : 'No description'}`));
  
  await pool.end();
}
run();
