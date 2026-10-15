'use client';

import Link from 'next/link';
import { Wrench, ArrowRight, Clock, Calendar, Briefcase } from 'lucide-react';
import { fmtNaira } from '@/lib/format';

export interface CityServicesOrg {
  id: string;
  name: string;
  description?: string | null;
}

export interface BookableServiceItem {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  durationMinutes: number;
  organizationId: string;
  orgName: string;
}

export default function CityServices({
  orgs,
  services = [],
}: {
  orgs: CityServicesOrg[];
  services?: BookableServiceItem[];
}) {
  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-16">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-black text-ink">Services</h1>
        <p className="text-xs text-slate-500 font-medium">
          Skilled trades, pro maintenance, and personal services across the city.
        </p>
      </div>

      {/* Bookable Services Grid */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-black text-ink">Book a Pro</h2>
          <Link href="/tasks" className="text-[11px] font-bold text-teal-800 hover:underline">
            All City Tasks →
          </Link>
        </div>

        {services.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((s) => (
              <Link
                key={s.id}
                href={`/service/${s.id}`}
                className="group bg-white rounded-2xl border border-slate-100 p-5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md truncate max-w-[150px]">
                      {s.orgName}
                    </span>
                    <span className="text-xs font-black text-slate-900 shrink-0">
                      {fmtNaira(s.price)}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm group-hover:text-teal-800 transition-colors">
                    {s.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {s.description || "Professional service delivered by verified local providers."}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1 font-medium">
                    <Clock size={13} /> {s.durationMinutes} min
                  </span>
                  <span className="font-bold text-teal-800 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    Book Now <ArrowRight size={13} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center bg-white">
            <p className="text-[13px] font-black text-ink">No bookable services yet</p>
            <p className="text-[11px] text-slate-400 font-medium mt-1">
              Service providers publish bookable work through ServiceOS.
            </p>
          </div>
        )}
      </section>

      {/* Service Businesses Directory */}
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
            {orgs.map((o) => (
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
            ))}
          </div>
        )}
      </section>

      {/* Merchant CTA */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-teal-900 text-white p-5 flex items-center gap-4">
        <span className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
          <Wrench className="w-5 h-5" />
        </span>
        <div className="flex-1">
          <p className="text-sm font-black">Run a service business?</p>
          <p className="text-[11px] text-teal-100/70 font-medium mt-0.5">
            Register on CityOS to publish your services, schedule appointments, and manage jobs in a workspace.
          </p>
        </div>
        <Link
          href="/business/register"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white text-teal-900 text-xs font-black hover:bg-teal-50 transition-colors shrink-0"
        >
          Get started <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
