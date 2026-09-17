'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Calendar, MapPin, Tag } from 'lucide-react';
import { CityCard, FallbackImg, Pill } from '@/components/cityos/CityUI';
import { getCityEvents } from '@/app/actions/org';

export default function CityEventsList() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCityEvents().then(e => {
      setEvents(e);
      setLoading(false);
    });
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-black text-ink">Events in Calabar</h1>
        <p className="text-xs text-slate-500 font-medium">
          Rehearsals, fairs and neighbourhood derbies — reserve your spot or grab a ticket through CityOS.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {events.map((e) => (
          <CityCard key={e.id} href={`/events/${e.id}`} className="flex flex-col">
            <FallbackImg src={undefined} alt={e.title} className="h-32 w-full" />
            <div className="p-4 flex-1 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <Pill tone="orange">Event</Pill>
                <span className="text-[10px] font-bold text-slate-400">{e.price === 0 ? 'Free' : e.price}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-black text-ink leading-snug line-clamp-2">{e.title}</p>
                <p className="text-[11px] font-bold text-slate-400 mt-1 line-clamp-1">{e.organization?.name || 'Organization'}</p>
              </div>
            </div>
            <div className="px-4 pb-4 mt-auto pt-3 border-t border-slate-50 flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400">
                <Calendar className="w-3 h-3 text-slate-300" />
                {new Date(e.date).toLocaleDateString()}
              </span>
              <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-300" />
                {e.location || 'TBA'}
              </span>
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