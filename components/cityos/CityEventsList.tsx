'use client';

import { Calendar } from 'lucide-react';
import { DEMO_EVENTS } from '@/lib/demo/cityos';
import { CityCard, FallbackImg, Pill, LocationRow, DemoBanner } from '@/components/cityos/CityUI';

export default function CityEventsList() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-black text-ink">Events in Calabar</h1>
        <p className="text-xs text-slate-500 font-medium">
          Rehearsals, fairs and neighbourhood derbies — reserve your spot or grab a ticket through CityOS.
        </p>
      </div>

      <DemoBanner />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {DEMO_EVENTS.map((e) => (
          <CityCard key={e.id} href={`/events/${e.id}`} className="flex flex-col">
            <FallbackImg src={e.image} alt={e.title} className="h-32 w-full" />
            <div className="p-4 flex-1 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <Pill tone="orange">{e.tag}</Pill>
                <span className="text-[10px] font-bold text-slate-400">{e.price}</span>
              </div>
              <p className="text-[13px] font-black text-ink leading-snug line-clamp-2">{e.title}</p>
              <LocationRow text={e.venue} className="text-[10px] max-w-[80%] truncate" />
              <div className="mt-auto pt-1 flex items-center justify-between">
                <span className="text-[10px] font-black text-teal-800 uppercase">{`${e.date} · ${e.time}`}</span>
              </div>
            </div>
          </CityCard>
        ))}
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-teal-900 to-teal-700 text-white p-5 flex items-center gap-4">
        <span className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
          <Calendar className="w-5 h-5" />
        </span>
        <div>
          <p className="text-sm font-black">Keke parking is reserved along the fence</p>
          <p className="text-[12px] text-teal-100/70 font-medium">See each event page for the venue note.</p>
        </div>
      </div>
    </div>
  );
}