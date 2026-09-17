'use client';

import { Wrench } from 'lucide-react';
import { DEMO_TASKS, fmtNaira } from '@/lib/demo/cityos';
import { CityCard, FallbackImg, Stars, Pill, DemoBanner } from '@/components/cityos/CityUI';

export default function CityTasksList() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-black text-ink">City Tasks</h1>
        <p className="text-xs text-slate-500 font-medium">
          Vetted trades from the Paradise Home Services network — book with a deposit, pay by CityPay.
        </p>
      </div>

      <DemoBanner />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {DEMO_TASKS.map((t) => (
          <CityCard key={t.id} href={`/tasks/${t.id}`} className="flex flex-col">
            <FallbackImg src={t.image} alt={t.name} className="h-32 w-full" gradient="from-slate-900 to-teal-800" />
            <div className="p-4 flex-1 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[14px] font-black text-ink truncate">{t.name}</p>
                  <p className="text-[11px] font-bold text-teal-800">{t.category}</p>
                </div>
                <Pill tone="blue">{`from ${fmtNaira(t.from)}`}</Pill>
              </div>
              <p className="text-[12px] text-slate-500 font-medium leading-snug line-clamp-2">{t.desc}</p>
              <div className="mt-auto pt-2 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-6 h-6 rounded-full bg-teal-50 text-teal-800 flex items-center justify-center text-[10px] font-black shrink-0">
                    {t.pro.slice(0, 1)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-black text-ink truncate">{t.pro}</p>
                    <div className="flex items-center gap-1">
                      <Stars rating={t.rating} />
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-slate-400 shrink-0">{t.eta}</span>
              </div>
            </div>
          </CityCard>
        ))}
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-teal-900 text-white p-5 flex items-center gap-4">
        <span className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
          <Wrench className="w-5 h-5" />
        </span>
        <div>
          <p className="text-sm font-black">Paradise Home Services</p>
          <p className="text-[12px] text-teal-100/70 font-medium">Deposits hold the slot; the balance settles after the job.</p>
        </div>
      </div>
    </div>
  );
}