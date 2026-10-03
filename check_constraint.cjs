const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.ipkvkzlpifjlmrbxcjsm:001citiconnect@aws-1-eu-west-1.pooler.supabase.com:5432/postgres' });
client.connect().then(() => client.query("SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'deliveryJob_status_check_f97d15b0';")).then(res => { console.log(res.rows); client.end(); });
