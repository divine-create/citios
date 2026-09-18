'use client';

import { Wrench } from 'lucide-react';
import { fmtNaira } from '@/lib/demo/cityos';
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
        <div className="col-span-full rounded-2xl border border-dashed border-slate-200 p-8 text-center bg-white">
          <p className="text-[13px] font-black text-ink">No tasks available</p>
        </div>
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