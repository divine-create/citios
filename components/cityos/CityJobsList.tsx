'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { Briefcase, MapPin, Search, ExternalLink, Building2, ArrowRight } from 'lucide-react';
import { Pill } from '@/components/cityos/CityUI';
import { getCityJobs } from '@/app/actions/org';
import { JOB_CATEGORIES, parseJobDescription, formatJobTypeLabel } from '@/lib/job-utils';
import { cn } from '@/lib/utils';

export default function CityJobsList({ initialJobs }: { initialJobs?: any[] }) {
  const [cat, setCat] = useState<string>('All');
  const [q, setQ] = useState('');
  const [jobs, setJobs] = useState<any[]>(initialJobs ?? []);
  const [loading, setLoading] = useState(!initialJobs);

  useEffect(() => {
    if (initialJobs) return;
    getCityJobs().then((j) => {
      setJobs(j);
      setLoading(false);
    });
  }, [initialJobs]);

  const filtered = useMemo(() => {
    let list = jobs;
    if (cat !== 'All') list = list.filter((j) => j.category === cat);
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      list = list.filter((j) =>
        `${j.title} ${j.organization?.name || ''} ${j.area || ''} ${j.category || ''} ${j.description || ''}`
          .toLowerCase()
          .includes(s)
      );
    }
    return list;
  }, [cat, q, jobs]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-teal-950 to-teal-800 text-white p-7 md:p-9 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-56 h-56 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 ring-1 ring-white/15 text-[10px] font-black uppercase tracking-widest">
            <Briefcase className="w-3 h-3" /> Calabar Job Board
          </span>
          <h1 className="mt-3 text-2xl md:text-4xl font-black tracking-tight">Verified Open Roles in Calabar</h1>
          <p className="mt-2 text-teal-50/85 text-[13px] font-medium max-w-2xl leading-relaxed">
            Discover verified career opportunities across banking, engineering, healthcare, sales, hospitality, logistics, and public service in Calabar and Cross River State.
          </p>
          <div className="mt-5 flex flex-col sm:flex-row gap-2 sm:items-center">
            <div className="flex-1 flex items-center gap-2 bg-white/95 rounded-xl px-3.5 py-2.5 text-slate-500">
              <Search className="w-4 h-4 shrink-0" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search job titles, companies, sectors, or Calabar areas…"
                className="flex-1 bg-transparent outline-none text-[13px] font-medium text-slate-900 placeholder:text-slate-400"
              />
            </div>
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
                cat === c
                  ? 'bg-teal-800 text-white ring-teal-800 shadow-sm'
                  : 'bg-white text-slate-600 ring-slate-200 hover:ring-teal-300'
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      <section>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="h-44 rounded-2xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : filtered.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((j) => {
              const orgName = j.organization?.name || 'Verified Employer';
              const parsed = parseJobDescription(j.description);
              const is9jaLiveProfileJob = Boolean(j.hasCityOSProfile);

              return (
                <div
                  key={j.id}
                  className="group bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-lg hover:border-teal-200/80 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        {j.organization?.logoAssetId ? (
                          <img
                            src={j.organization.logoAssetId}
                            alt={orgName}
                            className="w-10 h-10 rounded-xl object-cover shrink-0 mt-0.5 border border-slate-100"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center shrink-0 mt-0.5">
                            <Building2 className="w-5 h-5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <Link
                            href={`/jobs/${j.id}`}
                            className="text-[14px] font-black text-ink hover:text-teal-800 transition-colors leading-snug block"
                          >
                            {j.title}
                          </Link>
                          <div className="mt-1 flex items-center flex-wrap gap-1.5 text-[12px] font-bold text-slate-600">
                            <span className="text-slate-400 font-semibold">Posted by:</span>
                            {is9jaLiveProfileJob && j.organization?.id ? (
                              <Link
                                href={`/org/${j.organization.id}`}
                                className="text-teal-800 hover:underline truncate"
                              >
                                {orgName}
                              </Link>
                            ) : (
                              <span className="text-slate-800 truncate">{orgName}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      {j.category && (
                        <span className="shrink-0 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                          {j.category}
                        </span>
                      )}
                    </div>

                    <p className="text-[12px] text-slate-500 font-medium leading-relaxed mt-3 line-clamp-2">
                      {parsed.summary}
                    </p>
                  </div>

                  <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center flex-wrap gap-2">
                        <Pill tone="slate" className="!px-2.5">
                          {formatJobTypeLabel(j.type)}
                        </Pill>
                        <span className="text-[12px] font-black text-teal-800">
                          {j.pay || 'Competitive'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] font-bold text-slate-400">
                        <span className="inline-flex items-center gap-1 truncate">
                          <MapPin className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                          {j.area || 'Calabar, Cross River'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        href={`/jobs/${j.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-[11px] font-bold transition-colors"
                      >
                        Details
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                      {parsed.applyUrl ? (
                        <a
                          href={parsed.applyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-800 text-white hover:bg-teal-900 text-[11px] font-black transition-colors shadow-sm"
                        >
                          See Job
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      ) : is9jaLiveProfileJob && j.organization?.id ? (
                        <Link
                          href={`/org/${j.organization.id}`}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-800 text-white hover:bg-teal-900 text-[11px] font-black transition-colors shadow-sm"
                        >
                          View Profile
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl bg-white border border-dashed border-slate-200 p-12 text-center">
            <p className="text-4xl mb-3">🔎</p>
            <p className="text-[14px] font-black text-ink">No roles match that filter</p>
            <p className="text-[12px] text-slate-400 font-medium mt-1">
              Clear the search or select another industry tab to view all open roles in Calabar.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}