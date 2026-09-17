'use client';

import Link from 'next/link';
import { ArrowLeft, Check, MapPin, Users, Clock, Briefcase, Send } from 'lucide-react';
import { getJob, getJobsByOrg } from '@/lib/demo/universe/jobs';
import { SectionHead, Pill, DemoBanner } from '@/components/cityos/CityUI';
import { getOrg } from '@/lib/demo/universe/orgs';
import { useDemoApp } from '@/lib/demo/app/store';
import { cn } from '@/lib/utils';

export default function CityJobDetail({ id }: { id: string }) {
  const job = getJob(id);
  const { isApplied, applyJob } = useDemoApp();
  const applied = isApplied(id);

  if (!job) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-4">
        <p className="text-5xl">💼</p>
        <h1 className="text-lg font-black text-ink">That role is not in the demo board.</h1>
        <Link href="/jobs" className="inline-block px-5 py-2.5 rounded-xl bg-teal-800 text-white text-xs font-black hover:bg-teal-900 transition-colors">
          Back to CityJobs
        </Link>
      </div>
    );
  }

  const org = getOrg(job.orgId);
  const related = getJobsByOrg(job.orgId).filter((r) => r.id !== job.id).slice(0, 2);

  const apply = () => {
    applyJob(id);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <Link href="/jobs" className="inline-flex items-center gap-1.5 text-[12px] font-black text-slate-500 hover:text-teal-800 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> All jobs
      </Link>

      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-teal-950 to-teal-800 text-white p-7 md:p-9">
        <div className="absolute -right-14 -top-14 w-56 h-56 rounded-full bg-indigo-500/15 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-2xl">{org?.emoji ?? '💼'}</span>
            <Pill tone="orange">{job.type}</Pill>
          </div>
          <h1 className="mt-4 text-2xl md:text-3xl font-black tracking-tight">{job.title}</h1>
          <p className="mt-1.5 text-teal-50/85 text-[13px] font-medium">{`${job.orgName} · ${job.category}`}</p>
          <div className="mt-5 flex flex-wrap gap-4 text-[12px] font-bold text-teal-100/90">
            <span className="inline-flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {job.area}</span>
            <span className="inline-flex items-center gap-1.5"><Briefcase className="w-4 h-4" /> {job.pay}</span>
            <span className="inline-flex items-center gap-1.5"><Users className="w-4 h-4" /> {job.applicants} applicants</span>
            <span className="inline-flex items-center gap-1.5"><Clock className="w-4 h-4" /> {job.posted}</span>
          </div>
          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={apply}
              className={cn(
                'inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black shadow-lg transition-colors',
                applied ? 'bg-emerald-500 text-white' : 'bg-white text-teal-950 hover:bg-teal-50',
              )}
            >
              {applied ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
              {applied ? 'Application sent' : 'Apply with CityProfile'}
            </button>
            {job.spots ? <span className="text-[11px] font-bold text-teal-100/80">{`${job.spots} ${job.spots === 1 ? 'spot' : 'spots'} open`}</span> : null}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <section className="bg-white rounded-2xl border border-slate-100 p-6">
            <h2 className="text-base font-black text-ink mb-2">About the role</h2>
            <p className="text-[13px] text-slate-600 leading-relaxed">{job.desc}</p>
          </section>

          <section className="bg-white rounded-2xl border border-slate-100 p-6">
            <SectionHead title="What we need" />
            <ul className="space-y-2">
              {job.requirements.map((r, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[13px] font-medium text-slate-600">
                  <span className="w-5 h-5 rounded-full bg-teal-50 text-teal-800 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                  {r}
                </li>
              ))}
            </ul>
          </section>

          <section className="bg-white rounded-2xl border border-slate-100 p-6">
            <SectionHead title="What you get" more="Perks are demo cards" />
            <div className="flex flex-wrap gap-2">
              {job.perks.map((p) => (
                <Pill key={p} tone="green">{p}</Pill>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl bg-white border border-slate-100 p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Hiring organization</p>
            {org ? (
              <Link href={org.os ? `/workspaces/${org.os}/${org.id}` : `/org/${org.id}`} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-teal-50 transition-colors">
                <span className="text-2xl">{org.emoji}</span>
                <div className="min-w-0">
                  <p className="text-[13px] font-black text-ink truncate">{org.name}</p>
                  <p className="text-[10px] font-bold text-slate-400">{org.area}</p>
                </div>
              </Link>
            ) : null}
            <div className="mt-3 text-[11px] font-bold text-slate-400 space-y-1">
              <p className="flex items-center gap-1.5"><MapPin className="w-3 h-3 text-teal-700" /> {org?.address ?? job.area}</p>
              <p className="flex items-center gap-1.5"><Clock className="w-3 h-3 text-teal-700" /> Posted {job.posted}</p>
            </div>
          </div>

          {related.length ? (
            <div className="rounded-2xl bg-white border border-slate-100 p-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">More from {job.orgName}</p>
              <div className="space-y-2">
                {related.map((r) => (
                  <Link key={r.id} href={`/jobs/${r.id}`} className="block p-3 rounded-xl hover:bg-teal-50/60 transition-colors">
                    <p className="text-[12px] font-black text-ink leading-snug">{r.title}</p>
                    <p className="text-[10px] font-bold text-teal-800 mt-0.5">{r.pay} · {r.area}</p>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <DemoBanner />
    </div>
  );
}