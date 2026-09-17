'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Check, CalendarCheck } from 'lucide-react';
import { getClinic, fmtNaira, DEMO_USER } from '@/lib/demo/cityos';
import { FallbackImg, Pill, Stars, LocationRow, DemoBanner } from '@/components/cityos/CityUI';
import { useWallet } from '@/components/cityos/WalletStore';
import { cn } from '@/lib/utils';

export default function CityCareDetail({ slug }: { slug: string }) {
  const c = getClinic(slug);
  const { spend, balance } = useWallet();
  const [booked, setBooked] = useState<string | null>(null);
  const [low, setLow] = useState(false);

  if (!c) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-4">
        <h1 className="text-lg font-black text-ink">That clinic is not in the demo city.</h1>
        <Link href="/care" className="inline-block px-5 py-2.5 rounded-xl bg-teal-800 text-white text-xs font-black hover:bg-teal-900">Back to City Care</Link>
      </div>
    );
  }

  const book = (doctor: (typeof c.doctors)[number]) => {
    if (booked) return;
    const ok = doctor.fee === 0 || spend(doctor.fee, `Consultation · ${doctor.name}, ${c.name}`);
    if (!ok) {
      setLow(true);
      return;
    }
    setBooked(doctor.name);
    setLow(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
      <nav className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
        <Link href="/care" className="hover:text-teal-800">City Care</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-700 truncate">{c.name}</span>
      </nav>

      <div className="relative rounded-3xl overflow-hidden">
        <FallbackImg src={c.banner} alt={c.name} className="h-52 md:h-72 w-full" gradient="from-teal-900 to-teal-700" />
        <div className="absolute bottom-3 left-3 right-3 flex gap-2 flex-wrap">
          <Pill tone="green">{c.type}</Pill>
          <Pill tone="teal">{c.hours}</Pill>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-xl font-black text-ink">{c.name}</h1>
            <p className="text-xs text-slate-500 font-medium mt-1">{c.tagline}</p>
            <LocationRow text={`${c.address} · ${c.area}`} className="text-xs mt-1.5" />
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Stars rating={c.rating} />
            <span className="text-[10px] font-bold text-slate-400">{c.reviews}</span>
          </div>
        </div>
        <p className="text-[13px] text-slate-600 leading-relaxed mt-3">{c.desc}</p>
        <div className="flex flex-wrap gap-2 mt-4">
          {c.services.map((s) => <Pill key={s} tone="blue">{s}</Pill>)}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <p className="inline-flex items-center gap-1.5 text-xs font-black text-ink uppercase tracking-widest mb-4">
          <CalendarCheck className="w-4 h-4 text-teal-700" /> Doctors & appointments
        </p>
        <div className="space-y-3">
          {c.doctors.map((d) => {
            const done = booked === d.name;
            return (
              <div key={d.name} className="rounded-xl border border-slate-100 p-4 flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-teal-700 to-teal-500 text-white flex items-center justify-center text-sm font-black shrink-0">
                  {d.name.split(' ').slice(0, 2).map((n) => n[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-black text-ink">{d.name}</p>
                  <p className="text-[11px] font-bold text-teal-800">{d.specialty}</p>
                  <p className="text-[11px] font-medium text-slate-400 mt-0.5">{`${d.slots} · ${d.fee === 0 ? 'Free' : fmtNaira(d.fee)} consult`}</p>
                </div>
                <button
                  onClick={() => book(d)}
                  disabled={!!booked}
                  className={cn(
                    'px-4 py-2.5 rounded-xl text-[11px] font-black shrink-0 transition-all inline-flex items-center gap-1.5',
                    done ? 'bg-emerald-600 text-white' : booked ? 'bg-slate-50 text-slate-400' : 'bg-teal-800 hover:bg-teal-900 text-white',
                  )}
                >
                  {done ? (<><Check className="w-3.5 h-3.5" /> Booked</>) : booked ? 'Booked' : `Book ${d.fee === 0 ? 'free' : fmtNaira(d.fee)}`}
                </button>
              </div>
            );
          })}
        </div>

        {booked ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 mt-4 animate-in zoom-in-95 duration-300">
            <p className="flex items-center gap-2 text-sm font-black text-emerald-800">
              <Check className="w-4 h-4" /> Appointment confirmed
            </p>
            <p className="text-[12px] text-emerald-700 font-medium mt-1">
              {`${DEMO_USER.name} · ${booked} · ${c.name}. You will get a reminder 30 minutes before your slot.`}
            </p>
            <p className="text-[11px] font-bold text-emerald-600">{`Wallet balance: ${fmtNaira(balance)}`}</p>
          </div>
        ) : null}
        {low ? (
          <p className="text-[11px] font-bold text-red-600 mt-3">Wallet balance is too low for this consult. Top up on your profile.</p>
        ) : null}
      </div>

      <DemoBanner />
    </div>
  );
}