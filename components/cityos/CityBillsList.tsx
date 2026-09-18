'use client';

import { Receipt } from 'lucide-react';
import { DemoBanner } from '@/components/cityos/CityUI';

export default function CityBillsList() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-black text-ink">Bills & Airtime</h1>
        <p className="text-xs text-slate-500 font-medium">
          Power, water, data and cable — paid through CityPay, credited to your reference instantly.
        </p>
      </div>

      <DemoBanner />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="col-span-full rounded-2xl border border-dashed border-slate-200 p-8 text-center bg-white">
          <p className="text-[13px] font-black text-ink">No bills due</p>
          <p className="text-[11px] text-slate-400 font-medium mt-1">You have no pending bills at this time.</p>
        </div>
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-teal-900 to-teal-700 text-white p-5 flex items-center gap-4">
        <span className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
          <Receipt className="w-5 h-5" />
        </span>
        <div>
          <p className="text-sm font-black">No queues. No airtime stress.</p>
          <p className="text-[12px] text-teal-100/70 font-medium">Reference numbers stay saved in Activity.</p>
        </div>
      </div>
    </div>
  );
}