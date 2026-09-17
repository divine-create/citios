'use client';

import Link from 'next/link';
import { ArrowRight, Briefcase, BadgeCheck, Users, CalendarDays, ClipboardList, CheckCircle2 } from 'lucide-react';
import { getOrg } from '@/lib/demo/universe/orgs';
import { getShopOSDataset } from '@/lib/demo/universe/shopos';
import { getServiceOSDataset } from '@/lib/demo/universe/serviceos';
import { getSchoolOSDataset } from '@/lib/demo/universe/schoolos';
import { getJobsByOrg } from '@/lib/demo/universe/jobs';
import { fmtNaira } from '@/lib/demo/cityos';
import { Pill, Stars, LocationRow, DemoBanner, VerifiedBadge } from '@/components/cityos/CityUI';

export default function OrgProfile({ slug }: { slug: string }) {
  const org = getOrg(slug);

  if (!org) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-4">
        <p className="text-5xl">🏢</p>
        <h1 className="text-lg font-black text-ink">That organization is not in the demo city.</h1>
        <p className="text-sm text-slate-500">Open the Demo Access page to explore the demo universe.</p>
        <Link href="/demo/access" className="inline-block px-5 py-2.5 rounded-xl bg-teal-800 text-white text-xs font-black hover:bg-teal-900 transition-colors">
          Demo access
        </Link>
      </div>
    );
  }

  const shop = org.os === 'shopos' ? getShopOSDataset(org.slug) : undefined;
  const svc = org.os === 'serviceos' ? getServiceOSDataset(org.slug) : undefined;
  const school = org.os === 'schoolos' ? getSchoolOSDataset(org.slug) : undefined;
  const jobs = getJobsByOrg(org.id);

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${org.gradient} text-white p-7 md:p-9`}>
        <div className="absolute -right-14 -top-14 w-60 h-60 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-end gap-4 justify-between">
          <div className="flex items-center gap-4">
            <span className="w-16 h-16 rounded-2xl bg-white/15 ring-1 ring-white/20 flex items-center justify-center text-3xl shrink-0">
              {org.emoji}
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-black tracking-tight">{org.name}</h1>
                <VerifiedBadge label="Verified" />
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Stars rating={org.rating} />
                <span className="text-[11px] font-bold text-white/70">{`${org.reviews} reviews`}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {org.os ? <Pill tone="blue">{org.osLabel}</Pill> : <Pill tone="teal">{org.osLabel}</Pill>}
          </div>
        </div>
      </div>

      {/* Fact bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: org.address, sub: `${org.area} · ${org.category}` },
          { label: org.hours.split('·')[0].trim(), sub: org.hours.split('·')[1]?.trim() ?? 'Open' },
          { label: `${org.staff} staff`, sub: `Operates from ${(org.osLabel ?? 'CityOS').toLowerCase()}` },
          { label: `${org.customers.toLocaleString()} customers served`, sub: `Since ${org.joined}` },
        ].map((cell, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4">
            <p className="text-[12px] font-black text-ink leading-snug">{cell.label}</p>
            <p className="text-[11px] text-slate-400 font-medium mt-1">{cell.sub}</p>
          </div>
        ))}
      </div>

      {/* Manage CTA */}
      {org.os ? (
        <Link
          href={`/workspaces/${org.os}/${org.slug}`}
          className="flex items-center gap-4 rounded-2xl border border-teal-100 bg-teal-50/60 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all"
        >
          <span className="w-11 h-11 rounded-xl bg-teal-800 text-white flex items-center justify-center shrink-0">
            {org.os === 'shopos' ? <ClipboardList className="w-5 h-5" /> : org.os === 'serviceos' ? <Users className="w-5 h-5" /> : <CalendarDays className="w-5 h-5" />}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-black text-ink">{`${org.category} — managed from its ${org.osLabel.toLowerCase()}.`}</p>
            <p className="text-[11px] font-bold text-slate-400">Open the workspace to operate it.</p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-800 text-white text-xs font-black hover:bg-teal-900 transition-colors shrink-0">
            Manage <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </Link>
      ) : null}

      {/* About */}
      <section className="bg-white rounded-2xl border border-slate-100 p-5 md:p-6">
        <h2 className="text-base font-black text-ink mb-2">About</h2>
        <p className="text-[13px] text-slate-600 leading-relaxed">{org.desc}</p>
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <LocationRow text={`${org.address} · ${org.area}`} className="text-[11px]" />
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
            <CheckCircle2 className="w-3.5 h-3.5" /> Verified on CityOS
          </span>
        </div>
      </section>

      {/* OS-specific listings */}
      {svc ? (
        <section>
          <h2 className="text-base font-black text-ink mb-3 flex items-center justify-between">
            Services
            <span className="text-[11px] font-bold text-slate-400">{svc.services.length} live services</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {svc.services.slice(0, 6).map((s) => (
              <div key={s.id} className="bg-white rounded-2xl border border-slate-100 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[13px] font-black text-ink leading-snug">{s.name}</p>
                  <Pill tone="blue">{s.category}</Pill>
                </div>
                <p className="text-[12px] text-slate-500 font-medium mt-1 line-clamp-2">{s.desc}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-[12px] font-black text-teal-900">{`from ${fmtNaira(s.from)}`}</span>
                  <Stars rating={s.rating} />
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {school ? (
        <section>
          <h2 className="text-base font-black text-ink mb-3 flex items-center justify-between">
            School life
            <span className="text-[11px] font-bold text-slate-400">{school.classes.length} classes</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {school.classes.slice(0, 6).map((c) => (
              <div key={c.id} className="bg-white rounded-2xl border border-slate-100 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[13px] font-black text-ink">{c.name}</p>
                  <Pill tone="teal">{c.level}</Pill>
                </div>
                <p className="text-[12px] text-slate-500 font-medium mt-1">{`${c.students} students · ${c.teacher}`}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-[11px] font-bold text-slate-500">{c.room}</span>
                  <span className="text-[11px] font-black text-teal-800">{`${school.teachers.length} teachers`}</span>
                </div>
              </div>
            ))}
          </div>
          {school.admissions?.length ? (
            <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
              <BadgeCheck className="w-3.5 h-3.5 text-teal-700" />
              {`${school.admissions.length} admission applications on file this term`}
            </p>
          ) : null}
        </section>
      ) : null}

      {shop ? (
        <section>
          <h2 className="text-base font-black text-ink mb-3 flex items-center justify-between">
            Products
            <span className="text-[11px] font-bold text-slate-400">{shop.products.length} items in store</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {shop.products.slice(0, 6).map((p) => (
              <div key={p.id} className="bg-white rounded-2xl border border-slate-100 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[13px] font-black text-ink leading-snug">{p.name}</p>
                  <Pill tone="blue">{p.category}</Pill>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-[12px] font-black text-teal-900">{fmtNaira(p.price)}</span>
                  <span className="text-[11px] font-bold text-slate-400">{p.stock} left</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Jobs */}
      {jobs.length ? (
        <section>
          <h2 className="text-base font-black text-ink mb-3 flex items-center justify-between">
            Jobs
            <Link href="/jobs" className="text-[11px] font-bold text-teal-800 hover:underline">All city jobs →</Link>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {jobs.slice(0, 3).map((j) => (
              <Link key={j.id} href={`/jobs/${j.id}`} className="bg-white rounded-2xl border border-slate-100 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[13px] font-black text-ink truncate">{j.title}</p>
                    <p className="text-[11px] font-bold text-slate-400 truncate">{j.area} · {j.category}</p>
                  </div>
                  <Pill tone="blue">{j.type}</Pill>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-teal-800">
                    <Briefcase className="w-3.5 h-3.5" /> {j.pay}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">{j.posted}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <DemoBanner />
    </div>
  );
}