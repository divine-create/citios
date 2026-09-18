'use client';

import Link from 'next/link';
import { Wrench, ArrowRight } from 'lucide-react';
import { Pill } from '@/components/cityos/CityUI';

export interface CityServicesOrg {
  id: string;
  name: string;
  description?: string | null;
}

export default function CityServices({ orgs }: { orgs: CityServicesOrg[] }) {
  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-black text-ink">Services</h1>
        <p className="text-xs text-slate-500 font-medium">
          Skilled trades and local services across the city.
        </p>
      </div>

      <section>
        <h2 className="text-base font-black text-ink mb-3 flex items-center justify-between">
          Book a pro
          <Link href="/tasks" className="text-[11px] font-bold text-teal-800 hover:underline">All City Tasks →</Link>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="col-span-full rounded-2xl border border-dashed border-slate-200 p-8 text-center bg-white">
            <p className="text-[13px] font-black text-ink">No bookable services yet</p>
            <p className="text-[11px] text-slate-400 font-medium mt-1">Service providers publish bookable work through ServiceOS.</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-white border border-slate-100 p-5">
        <h2 className="text-base font-black text-ink mb-3 flex items-center justify-between">
          Service businesses on CityOS
          <span className="text-[11px] font-bold text-slate-400">{orgs.length} live on CityOS</span>
        </h2>
        {orgs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
            <p className="text-[13px] font-black text-ink">No service businesses registered yet</p>
            <p className="text-[11px] text-slate-400 font-medium mt-1">Service providers appear here as they join CityOS.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {orgs.map((o) => {
              return (
                <Link
                  key={o.id}
                  href={`/org/${o.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 hover:shadow-md hover:-translate-y-0.5 transition-all"
                >
                  <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-800 to-teal-500 text-white flex items-center justify-center text-lg shrink-0">
                    {o.name.slice(0, 1)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-black text-ink truncate">{o.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 truncate">{o.description || 'Local services'}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-teal-900 text-white p-5 flex items-center gap-4">
        <span className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
          <Wrench className="w-5 h-5" />
        </span>
        <div className="flex-1">
          <p className="text-sm font-black">Run a service business?</p>
          <p className="text-[11px] text-teal-100/70 font-medium mt-0.5">Register on CityOS to publish your services and manage jobs in a workspace.</p>
        </div>
        <Link href="/business/register" className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white text-teal-900 text-xs font-black hover:bg-teal-50 transition-colors shrink-0">
          Get started <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
