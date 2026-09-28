import { db } from '@/src/prisma/db';
async function run() {
  const q = await db.orm.public.LedgerEntry.include('wallet', (w: any) => w.include('organization', 'person')).include('transaction', (t: any) => t.include('payment')).limit(1).all();
  console.log(q);
}
run().catch(console.error);
