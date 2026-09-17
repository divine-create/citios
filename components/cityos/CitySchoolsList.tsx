'use client';

import { GraduationCap } from 'lucide-react';
import { DEMO_SCHOOLS } from '@/lib/demo/cityos';
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
        {DEMO_SCHOOLS.map((s) => (
          <CityCard key={s.slug} href={`/schools/${s.slug}`} className="flex flex-col">
            <div className="relative">
              <FallbackImg src={s.image} alt={s.name} className="h-36 w-full" gradient="from-slate-900 to-slate-700" />
              <span className="absolute top-2 left-2">
                <Pill tone="teal">{s.level}</Pill>
              </span>
            </div>
            <div className="p-4 flex-1 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[14px] font-black text-ink truncate">{s.name}</p>
                  <LocationRow text={s.area} className="text-[10px]" />
                </div>
                <Stars rating={s.rating} className="shrink-0" />
              </div>
              <p className="text-[12px] text-slate-500 font-medium leading-snug line-clamp-2">{s.tagline}</p>
              <p className="mt-auto pt-2 text-[11px] font-black text-teal-800">{s.term}</p>
            </div>
          </CityCard>
        ))}
      </div>
    </div>
  );
}