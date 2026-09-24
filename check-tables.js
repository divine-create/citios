import pkg from 'pg';
const { Client } = pkg;
const client = new Client({ connectionString: process.env.DIRECT_URL });
await client.connect();
const res = await client.query('SELECT tablename FROM pg_tables WHERE schemaname=\'public\' AND tablename ILIKE \'%shift%\'');
console.log('Matching tables:', res.rows.map(r => r.tablename));
await client.end();
