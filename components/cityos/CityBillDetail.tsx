'use client';

import Link from 'next/link';
import { Receipt } from 'lucide-react';

/**
 * Bill detail. CityBills has no canonical biller/ledger model yet (see the
 * canonical architecture audit) — the simulated CityPay bill-payment flow was
 * removed with the demo purge. This renders an honest "not connected" state
 * until billers, invoices and a real payment rail exist.
 */
export default function CityBillDetail({ slug }: { slug: string }) {
  void slug;
  return (
    <div className="max-w-lg mx-auto text-center py-20 space-y-4">
      <div className="w-16 h-16 mx-auto rounded-3xl bg-slate-100 text-slate-500 flex items-center justify-center">
        <Receipt className="w-7 h-7" />
      </div>
      <h1 className="text-lg font-black text-ink">Bill payments aren&apos;t connected yet</h1>
      <p className="text-sm text-slate-500 max-w-sm mx-auto">
        CityOS can&apos;t show or pay bills yet — biller accounts and real payment rails are not
        part of the live system. Nothing here is billable.
      </p>
      <Link href="/bills" className="inline-block px-5 py-2.5 rounded-xl bg-teal-800 text-white text-xs font-black hover:bg-teal-900 transition-colors">
        Back to Bills
      </Link>
    </div>
  );
}
