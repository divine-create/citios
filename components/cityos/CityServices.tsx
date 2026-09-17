'use client';

import Link from 'next/link';
import { Wrench, ArrowRight } from 'lucide-react';
import { DEMO_TASKS, fmtNaira } from '@/lib/demo/cityos';
import { SERVICEOS_ORGS } from '@/lib/demo/universe/orgs';
import { CityCard, FallbackImg, Stars, Pill, DemoBanner } from '@/components/cityos/CityUI';

export default function CityServices() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-black text-ink">Services</h1>
        <p className="text-xs text-slate-500 font-medium">
          Skilled trades and local services across Calabar — book with a deposit, pay by CityPay.
        </p>
      </div>

      <DemoBanner />

      <section>
        <h2 className="text-base font-black text-ink mb-3 flex items-center justify-between">
          Book a pro
          <Link href="/tasks" className="text-[11px] font-bold text-teal-800 hover:underline">All City Tasks →</Link>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {DEMO_TASKS.slice(0, 6).map((t) => (
            <CityCard key={t.id} href={`/tasks/${t.id}`} className="flex flex-col">
              <FallbackImg src={t.image} alt={t.name} className="h-28 w-full" gradient="from-slate-900 to-teal-800" />
              <div className="p-4 flex-1 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[13px] font-black text-ink truncate">{t.name}</p>
                    <p className="text-[10px] font-bold text-teal-800">{t.category}</p>
                  </div>
                  <Pill tone="blue">{`from ${fmtNaira(t.from)}`}</Pill>
                </div>
                <p className="text-[12px] text-slate-500 font-medium leading-snug line-clamp-2">{t.desc}</p>
                <div className="mt-auto pt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-teal-50 text-teal-800 flex items-center justify-center text-[10px] font-black shrink-0">
                      {t.pro.slice(0, 1)}
                    </span>
                    <p className="text-[11px] font-black text-ink truncate">{t.pro}</p>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 shrink-0">{t.eta}</span>
                </div>
              </div>
            </CityCard>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-white border border-slate-100 p-5">
        <h2 className="text-base font-black text-ink mb-3 flex items-center justify-between">
          Service businesses on CityOS
          <span className="text-[11px] font-bold text-slate-400">{SERVICEOS_ORGS.length} live on CityOS</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {SERVICEOS_ORGS.map((o) => {
            return (
              <Link
                key={o.id}
                href={`/org/${o.id}`}
                className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <span className={`w-11 h-11 rounded-xl bg-gradient-to-br ${o.gradient} text-white flex items-center justify-center text-lg shrink-0`}>
                  {o.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-black text-ink truncate">{o.name}</p>
                  <p className="text-[10px] font-bold text-slate-400 truncate">{o.category}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-teal-900 text-white p-5 flex items-center gap-4">
        <span className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
          <Wrench className="w-5 h-5" />
        </span>
        <div className="flex-1">
          <p className="text-sm font-black">Paradise Home Services network</p>
          <p className="text-[11px] text-teal-100/70 font-medium mt-0.5">Deposits hold the slot; the balance settles after the job.</p>
        </div>
        <Link href="/demo/access" className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white text-teal-900 text-xs font-black hover:bg-teal-50 transition-colors shrink-0">
          Business workspace <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}