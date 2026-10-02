const { Client } = require('pg');
async function run() {
  const client = new Client({ connectionString: 'postgresql://postgres.ipkvkzlpifjlmrbxcjsm:001citiconnect@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true' });
  await client.connect();
  const res = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'logisticsDriverProfile'`);
  console.log(res.rows);
  await client.end();
}
run();
