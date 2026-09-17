'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Ticket, Check, Users } from 'lucide-react';
import { getEvent, fmtNaira, DEMO_USER } from '@/lib/demo/cityos';
import { FallbackImg, Pill, LocationRow, DemoBanner } from '@/components/cityos/CityUI';
import { useWallet } from '@/components/cityos/WalletStore';
import { cn } from '@/lib/utils';

export default function CityEventDetail({ id }: { id: string }) {
  const e = getEvent(id);
  const { spend, balance } = useWallet();
  const [state, setState] = useState<'idle' | 'booked' | 'low'>('idle');
  const [ref] = useState(() => `TK-${String(Math.floor(1000 + Math.random() * 9000))}`);

  if (!e) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-4">
        <h1 className="text-lg font-black text-ink">That event is not in the demo city.</h1>
        <Link href="/events" className="inline-block px-5 py-2.5 rounded-xl bg-teal-800 text-white text-xs font-black hover:bg-teal-900">Back to events</Link>
      </div>
    );
  }

  const book = () => {
    if (state === 'booked') return;
    if (e.ticket > 0) {
      const ok = spend(e.ticket, `Ticket · ${e.title}`);
      if (!ok) {
        setState('low');
        return;
      }
    }
    setState('booked');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
      <nav className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
        <Link href="/events" className="hover:text-teal-800">Events</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-700 truncate">{e.title}</span>
      </nav>

      <div className="relative rounded-3xl overflow-hidden">
        <FallbackImg src={e.image} alt={e.title} className="h-52 md:h-64 w-full" />
        <div className="absolute bottom-3 left-3 right-3 flex gap-2 flex-wrap">
          <Pill tone="orange">{e.tag}</Pill>
          <Pill tone="teal">{`${e.date} · ${e.time}`}</Pill>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <h1 className="text-xl font-black text-ink">{e.title}</h1>
        <p className="text-xs text-slate-500 font-medium mt-1">{`Hosted by ${e.host}`}</p>
        <LocationRow text={`${e.address} · ${e.venue}`} className="text-xs mt-2" />
        <p className="text-[13px] text-slate-600 leading-relaxed mt-3">{e.desc}</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <p className="text-xs font-black text-ink uppercase tracking-widest mb-3">Programme</p>
        <div className="space-y-2">
          {e.lineup.map((l, i) => (
            <div key={l} className="flex items-center gap-3">
              <span className="w-5 h-5 rounded-full bg-teal-50 text-teal-800 text-[10px] font-black flex items-center justify-center shrink-0">
                {i + 1}
              </span>
              <span className="text-[12px] font-bold text-slate-600">{l}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Your spot</p>
            <p className="text-[15px] font-black text-ink">{e.ticket > 0 ? `${fmtNaira(e.ticket)} · 1 ticket` : 'Free · reserve 1 spot'}</p>
          </div>
          <button
            onClick={book}
            disabled={state === 'booked'}
            className={cn(
              'inline-flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black transition-all',
              state === 'booked' ? 'bg-emerald-600 text-white' : 'bg-teal-800 hover:bg-teal-900 text-white',
            )}
          >
            {state === 'booked' ? (<><Check className="w-4 h-4" /> Reserved · {ref}</>) : (<><Ticket className="w-4 h-4" /> {e.ticket > 0 ? `Buy ticket ${fmtNaira(e.ticket)}` : 'Reserve free'}</>)}
          </button>
        </div>
        {state === 'low' ? (
          <p className="text-[11px] font-bold text-red-600 mt-2">Wallet balance is too low for the ticket. Top up on your profile.</p>
        ) : null}
        {state === 'booked' ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 mt-4 animate-in zoom-in-95 duration-300">
            <p className="text-[12px] text-emerald-700 font-medium">
              {`${DEMO_USER.name}, your entry for ${e.title} is saved. Present ${ref} at the gate — keke parking is along the venue fence.`}
            </p>
            <p className="text-[11px] font-bold text-emerald-600 mt-1">{`Wallet balance: ${fmtNaira(balance)}`}</p>
          </div>
        ) : null}
        <p className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium mt-3">
          <Users className="w-3 h-3" /> Arrive 20 minutes early · venue check-in is paperless.
        </p>
      </div>

      <DemoBanner />
    </div>
  );
}