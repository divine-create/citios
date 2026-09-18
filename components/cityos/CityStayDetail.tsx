'use client';

import Link from 'next/link';
import { BedDouble } from 'lucide-react';

/**
 * Hotel detail. CityStay has no wired accommodation discovery yet — the
 * simulated hotel catalog and the wallet-debited "room hold" flow were
 * removed with the demo purge. Canonical hotel reservations already exist in
 * lib/actions/hotel.ts (HotelOS) but there is no resident-facing room
 * registry to browse yet. This renders an honest "not connected" state until
 * that wiring exists.
 */
export default function CityStayDetail({ slug }: { slug: string }) {
  void slug;
  return (
    <div className="max-w-lg mx-auto text-center py-20 space-y-4">
      <div className="w-16 h-16 mx-auto rounded-3xl bg-slate-100 text-slate-500 flex items-center justify-center">
        <BedDouble className="w-7 h-7" />
      </div>
      <h1 className="text-lg font-black text-ink">Hotel bookings aren&apos;t connected yet</h1>
      <p className="text-sm text-slate-500 max-w-sm mx-auto">
        CityOS can&apos;t list hotels or take bookings yet — a resident-facing room registry is
        not part of the live system. Participating hotels manage reservations through HotelOS.
      </p>
      <Link href="/stay" className="inline-block px-5 py-2.5 rounded-xl bg-teal-800 text-white text-xs font-black hover:bg-teal-900 transition-colors">
        Back to hotels
      </Link>
    </div>
  );
}
