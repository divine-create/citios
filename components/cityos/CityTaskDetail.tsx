'use client';

import Link from 'next/link';
import { Wrench } from 'lucide-react';

/**
 * Service task detail. CityTasks has no canonical resident-facing service
 * catalog yet — ServiceCatalogItem/ServiceJob live behind ServiceOS
 * organizations (app/actions/service.ts), but the resident surface has no
 * registry of published catalog items. The demo task catalog and the
 * wallet-debited deposit flow were removed with the demo purge. Honest
 * "not connected" state until services are published to the city.
 */
export default function CityTaskDetail({ id }: { id: string }) {
  void id;
  return (
    <div className="max-w-lg mx-auto text-center py-20 space-y-4">
      <div className="w-16 h-16 mx-auto rounded-3xl bg-slate-100 text-slate-500 flex items-center justify-center">
        <Wrench className="w-7 h-7" />
      </div>
      <h1 className="text-lg font-black text-ink">Service bookings aren&apos;t connected yet</h1>
      <p className="text-sm text-slate-500 max-w-sm mx-auto">
        CityOS can&apos;t show or book services yet — service providers publish work through
        ServiceOS, and a public service catalog for residents is coming.
      </p>
      <Link href="/tasks" className="inline-block px-5 py-2.5 rounded-xl bg-teal-800 text-white text-xs font-black hover:bg-teal-900 transition-colors">
        Back to City Tasks
      </Link>
    </div>
  );
}
