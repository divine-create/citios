'use client';

import Link from 'next/link';
import { Building2 } from 'lucide-react';

/**
 * Rent payment. CityHouse has no canonical Property/Listing model and no
 * landlord/tenant ledger — the simulated wallet-debited rent flow was removed
 * with the demo purge. Honest "not connected" state until a listings and
 * payments architecture exists.
 */
export default function RentPayment({ id }: { id: string }) {
  void id;
  return (
    <div className="max-w-lg mx-auto text-center py-20 space-y-4">
      <div className="w-16 h-16 mx-auto rounded-3xl bg-slate-100 text-slate-500 flex items-center justify-center">
        <Building2 className="w-7 h-7" />
      </div>
      <h1 className="text-lg font-black text-ink">Rent payments aren&apos;t connected yet</h1>
      <p className="text-sm text-slate-500 max-w-sm mx-auto">
        CityOS can&apos;t process rent yet — property listings and landlord payments are not part
        of the live system.
      </p>
      <Link href="/house" className="inline-block px-5 py-2.5 rounded-xl bg-teal-800 text-white text-xs font-black hover:bg-teal-900 transition-colors">
        Back to listings
      </Link>
    </div>
  );
}
