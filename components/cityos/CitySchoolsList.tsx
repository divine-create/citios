'use client';

import { GraduationCap } from 'lucide-react';

import { CityCard, FallbackImg, Stars, Pill, LocationRow, DemoBanner } from '@/components/cityos/CityUI';

export default function CitySchoolsList() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-black text-ink">Schools in Calabar</h1>
        <p className="text-xs text-slate-500 font-medium">
          Admissions desks, registrars and intake offices across the city — request info in-app.
        </p>
      </div>

      <DemoBanner />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="col-span-full rounded-2xl border border-dashed border-slate-200 p-8 text-center bg-white">
          <p className="text-[13px] font-black text-ink">No schools listed</p>
          <p className="text-[11px] text-slate-400 font-medium mt-1">School directory data has not been added yet.</p>
        </div>
      </div>
    </div>
  );
}