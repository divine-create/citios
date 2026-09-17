'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Briefcase, MapPin, Users, Search, ArrowRight } from 'lucide-react';
import { CITY_JOBS, JOB_CATEGORIES } from '@/lib/demo/universe/jobs';
import { SectionHead, Pill, DemoBanner } from '@/components/cityos/CityUI';
import { getOrg } from '@/lib/demo/universe/orgs';
import { cn } from '@/lib/utils';

export default function CityJobsList() {
  const [cat, setCat] = useState('All');
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    let list = CITY_JOBS;
    if (cat !== 'All') list = list.filter((j) => j.category === cat);
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      list = list.filter((j) => `${j.title} ${j.orgName} ${j.area}`.toLowerCase().includes(s));
    }
    return list;
  }, [cat, q]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-teal-950 to-teal-800 text-white p-7 md:p-9 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-56 h-56 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 ring-1 ring-white/15 text-[10px] font-black uppercase tracking-widest">
            <Briefcase className="w-3 h-3" /> CityJobs
          </span>
          <h1 className="mt-3 text-2xl md:text-4xl font-black tracking-tight">Every open role in the city</h1>
          <p className="mt-2 text-teal-50/85 text-[13px] font-medium max-w-2xl leading-relaxed">
            {`CityJobs aggregates every open role in the demo — ${CITY_JOBS.length} roles across pickers, riders, technicians, teachers and gigs.`}
          </p>
          <div className="mt-5 flex flex-col sm:flex-row gap-2 sm:items-center">
            <div className="flex-1 flex items-center gap-2 bg-white/95 rounded-xl px-3.5 py-2.5 text-slate-500">
              <Search className="w-4 h-4" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search roles, employers or areas…"
                className="flex-1 bg-transparent outline-none text-[13px] font-medium placeholder:text-slate-400"
              />
            </div>
            <span className="text-[11px] font-bold text-teal-100/80 sm:px-2">{`${filtered.length} roles`}</span>
          </div>
        </div>
      </div>

      <section>
        <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
          {JOB_CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={cn(
                'px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ring-1',
                cat === c ? 'bg-teal-800 text-white ring-teal-800 shadow-sm' : 'bg-white text-slate-600 ring-slate-200 hover:ring-teal-300',
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      <section>
        {filtered.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((j) => {
              const org = getOrg(j.orgId);
              return (
                <Link
                  key={j.id}
                  href={`/jobs/${j.id}`}
                  className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all flex flex-col"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xl shrink-0">{org?.emoji ?? '💼'}</span>
                      <p className="text-[13px] font-black text-ink truncate">{j.title}</p>
                    </div>
                  </div>
                  <p className="text-[11px] font-bold text-slate-400 mt-1">{`${j.orgName} · ${j.area}`}</p>
                  <p className="text-[12px] text-slate-500 font-medium leading-snug mt-2 line-clamp-2">{j.desc}</p>
                  <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <span className="flex items-center gap-1 text-[11px] font-black text-teal-800">
                        <Pill tone="slate" className="!px-2">{j.type}</Pill> {j.pay}
                      </span>
                      <span className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                        <span className="inline-flex items-center gap-0.5"><MapPin className="w-3 h-3" /> {j.area}</span>
                        <span className="inline-flex items-center gap-0.5"><Users className="w-3 h-3" /> {j.applicants} applicants</span>
                        <span>{j.posted}</span>
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-teal-700 shrink-0" />
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl bg-white border border-dashed border-slate-200 p-12 text-center">
            <p className="text-4xl mb-3">🔎</p>
            <p className="text-[14px] font-black text-ink">No roles match that filter</p>
            <p className="text-[12px] text-slate-400 font-medium mt-1">Clear the search to see the full demo board.</p>
          </div>
        )}
      </section>

      <DemoBanner />
    </div>
  );
}