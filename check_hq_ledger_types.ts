import { db } from '@/src/prisma/db';
async function run() {
  try {
    const paymentAgg = await db.orm.public.Payment.aggregate((a) => ({ count: a.count(), vol: a.sum('amount') }));
    console.log("paymentAgg:", paymentAgg);
  } catch(e) { console.error("payment agg fail", e); }
  try {
    const le = await db.orm.public.LedgerEntry.where((le) => le.walletId.in(['a', 'b'])).limit(1).all();
    console.log("le in query:", le.length);
  } catch(e) { console.error("in fail", e); }
}
run().catch(console.error);
