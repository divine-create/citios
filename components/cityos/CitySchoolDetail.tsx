'use client';

import { useState } from 'react';
import Link from 'next/link';
import { GraduationCap, ChevronRight, Check, Mail, School } from 'lucide-react';
import { getSchool, DEMO_USER } from '@/lib/demo/cityos';
import { getOrg } from '@/lib/demo/universe/orgs';
import { FallbackImg, Pill, Stars, LocationRow, DemoBanner } from '@/components/cityos/CityUI';

export default function CitySchoolDetail({ slug }: { slug: string }) {
  const s = getSchool(slug);
  const [asked, setAsked] = useState(false);
  const uniOrg = s?.osSlug ? getOrg(s.osSlug) : undefined;

  if (!s) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-4">
        <h1 className="text-lg font-black text-ink">That school is not in the demo city.</h1>
        <Link href="/schools" className="inline-block px-5 py-2.5 rounded-xl bg-teal-800 text-white text-xs font-black hover:bg-teal-900">Back to schools</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
      <nav className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
        <Link href="/schools" className="hover:text-teal-800">Schools</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-700 truncate">{s.name}</span>
      </nav>

      <div className="relative rounded-3xl overflow-hidden">
        <FallbackImg src={s.image} alt={s.name} className="h-52 md:h-72 w-full" gradient="from-slate-900 to-slate-700" />
        <div className="absolute bottom-3 left-3 right-3 flex gap-2 flex-wrap">
          <Pill tone="teal">{s.level}</Pill>
          <Pill tone="green">{s.term}</Pill>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-xl font-black text-ink">{s.name}</h1>
            <p className="text-xs text-slate-500 font-medium mt-1">{s.tagline}</p>
            <LocationRow text={`${s.address} · ${s.area}`} className="text-xs mt-1.5" />
          </div>
          <Stars rating={s.rating} />
        </div>
        <p className="text-[13px] text-slate-600 leading-relaxed mt-3">{s.desc}</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <p className="inline-flex items-center gap-1.5 text-xs font-black text-ink uppercase tracking-widest mb-3">
          <GraduationCap className="w-4 h-4 text-teal-700" /> Programmes & desks
        </p>
        <div className="flex flex-wrap gap-2">
          {s.programs.map((p) => <Pill key={p} tone="blue">{p}</Pill>)}
        </div>
      </div>

      {uniOrg?.os ? (
        <Link
          href={`/workspaces/${uniOrg.os}/${uniOrg.slug}`}
          className="flex items-center gap-4 rounded-2xl border border-teal-100 bg-teal-50/60 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all"
        >
          <span className="w-11 h-11 rounded-xl bg-teal-800 text-white flex items-center justify-center shrink-0">
            <School className="w-5 h-5" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-black text-ink">{`Managed on ${uniOrg.osLabel.toLowerCase()}`}</p>
            <p className="text-[11px] font-bold text-slate-400">Open the school workspace to operate it.</p>
          </div>
          <ChevronRight className="w-4 h-4 text-teal-800 shrink-0" />
        </Link>
      ) : null}

      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        {asked ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 animate-in zoom-in-95 duration-300">
            <p className="flex items-center gap-2 text-sm font-black text-emerald-800">
              <Check className="w-4 h-4" /> Request logged
            </p>
            <p className="text-[12px] text-emerald-700 font-medium mt-1">
              {`The ${s.name} desk will reach ${DEMO_USER.name} within one working day on ${s.contact}.`}
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm font-black text-ink">Request admission info</p>
            <p className="text-[12px] text-slate-500 font-medium mt-1 mb-4">
              One tap — the desk replies on the number you registered with CityOS.
            </p>
            <button
              onClick={() => setAsked(true)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-black transition-colors"
            >
              <Mail className="w-4 h-4" /> Request info
            </button>
          </>
        )}
      </div>

      <DemoBanner />
    </div>
  );
}