import 'dotenv/config';
// @ts-ignore
import postgres from 'pg';

const client = new postgres.Client({
  connectionString: process.env.DIRECT_URL,
});

async function main() {
  await client.connect();
  // Fix schema drift: deliveryJob status default must be 'REQUESTED' not 'PENDING'
  await client.query(`ALTER TABLE "deliveryJob" ALTER COLUMN status SET DEFAULT 'REQUESTED'`);
  console.log('Fixed deliveryJob.status default -> REQUESTED');
  await client.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });
