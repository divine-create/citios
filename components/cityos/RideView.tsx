'use client';

import { useState } from 'react';
import type { ComponentType } from 'react';
import Link from 'next/link';
import { MapPin, Navigation, Phone, Share2, Car, Clock, Loader2, Waves, Check } from 'lucide-react';
import { fmtNaira } from '@/lib/format';
import { Pill, DemoBanner } from '@/components/cityos/CityUI';
import { useCity } from '@/components/cityos/CityProvider';
import { cn } from '@/lib/utils';

const HOME = 'State Housing Estate';

// CityDrive ride product config (fare estimates only — never persisted).
// Owned by the Ride surface; no canonical transport entity exists yet.
interface RideArea {
  name: string;
  near: string;
}

const RIDE_AREAS: RideArea[] = [
  { name: 'Marian Road', near: 'City centre · market line' },
  { name: 'Watt Market', near: 'Busy all morning' },
  { name: 'Ekorinim', near: 'Quiet residential' },
  { name: 'Bogobiri', near: 'Restaurants & stadium' },
  { name: 'State Housing Estate', near: 'Home base' },
  { name: 'University of Calabar', near: 'Campus gate' },
  { name: 'Margaret Ekpo Airport', near: 'Airport road' },
  { name: 'Eight Miles', near: 'Outskirts' },
];

interface RideClass {
  id: string;
  name: string;
  tagline: string;
  baseFare: number;
  perKm: number;
  eta: string;
  pax: number;
  icon: ComponentType<{ className?: string }>;
}
const RIDE_CLASSES: RideClass[] = [
  { id: 'keke', name: 'CityKeke', tagline: 'Quick trips, city fares', baseFare: 800, perKm: 250, eta: '3 min', pax: 3, icon: Car },
  { id: 'solo', name: 'CitySolo', tagline: 'Sedan for the everyday', baseFare: 1200, perKm: 400, eta: '5 min', pax: 4, icon: Car },
  { id: 'go', name: 'CityGo', tagline: 'SUV comfort, family-sized', baseFare: 1800, perKm: 650, eta: '8 min', pax: 6, icon: Car },
];

function estimateDistance(from: string, to: string): number {
  const a = RIDE_AREAS.findIndex((r) => r.name === from);
  const b = RIDE_AREAS.findIndex((r) => r.name === to);
  if (a >= 0 && b >= 0) return Math.max(1.5, Math.abs(a - b) * 2.2);
  return 3.5;
}

export default function RideView() {
  const cityName = useCity().city?.name ?? 'CityOS';
  const [pickup, setPickup] = useState(HOME);
  const [dest, setDest] = useState('Marian Road');
  const [klass, setKlass] = useState(RIDE_CLASSES[1]);
  const [phase, setPhase] = useState<'idle' | 'matching' | 'matched'>('idle');

  const from = RIDE_AREAS.find((r) => r.name === pickup);
  const to = RIDE_AREAS.find((r) => r.name === dest);
  const dist = estimateDistance(pickup, dest);
  const fare = Math.round(klass.baseFare + klass.perKm * dist);
  const eta = `${klass.eta} for rider, ~${Math.max(6, Math.round(dist * 3.2))} min trip`;

  const request = () => {
    setPhase('matching');
    window.setTimeout(() => setPhase('matched'), 1800);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-ink flex items-center gap-2">
            <Navigation className="w-5 h-5 text-teal-800" /> City Ride
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">{`Keke, solo or SUV — moving ${cityName} with fair naira fares.`}</p>
        </div>
        <Pill tone="blue">CityDrive mobility</Pill>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3 space-y-4">
          {/* Pickup / destination */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center pt-1">
                <span className="w-3 h-3 rounded-full bg-teal-700" />
                <span className="w-0.5 h-10 bg-slate-200" />
                <span className="w-3 h-3 rounded-full bg-orange-500" />
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pickup</p>
                  <p className="text-[14px] font-black text-ink">{pickup}</p>
                  <p className="text-[11px] text-slate-400 font-medium">{from?.near}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Destination</p>
                  <p className="text-[14px] font-black text-ink">{dest}</p>
                  <p className="text-[11px] text-slate-400 font-medium">{to?.near}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Set pickup</p>
                <div className="flex flex-wrap gap-1.5">
                  {RIDE_AREAS.slice(0, 5).map((r) => (
                    <button
                      key={r.name}
                      onClick={() => setPickup(r.name)}
                      className={cn(
                        'px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors',
                        pickup === r.name ? 'bg-teal-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
                      )}
                    >
                      {r.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Set destination</p>
                <div className="flex flex-wrap gap-1.5">
                  {RIDE_AREAS.map((r) => (
                    <button
                      key={r.name}
                      onClick={() => setDest(r.name)}
                      className={cn(
                        'px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors',
                        dest === r.name ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
                      )}
                    >
                      {r.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ride classes */}
          <div className="space-y-2.5">
            <p className="text-xs font-black text-ink uppercase tracking-widest px-1">Pick a ride</p>
            {RIDE_CLASSES.map((r) => {
              const rFare = Math.round(r.baseFare + r.perKm * dist);
              const active = klass.id === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => setKlass(r)}
                  disabled={phase !== 'idle'}
                  className={cn(
                    'w-full flex items-center gap-4 p-4 rounded-2xl ring-1 transition-all text-left disabled:opacity-60',
                    active ? 'bg-teal-50 ring-2 ring-teal-700 shadow-sm' : 'bg-white ring-slate-200 hover:ring-teal-300',
                  )}
                >
                  <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center', active ? 'bg-teal-800 text-white' : 'bg-slate-100 text-slate-500')}>
                    <r.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-black text-ink">{r.name}</p>
                    <p className="text-[11px] text-slate-400 font-medium">{r.tagline}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-[14px] font-black text-ink tabular-nums">{fmtNaira(rFare)}</p>
                      <p className="text-[10px] text-slate-400 font-bold">{`~${Math.round(dist * 3.2)} min`}</p>
                    </div>
                    <span
                      className={cn(
                        'w-4 h-4 rounded-full ring-2 flex items-center justify-center',
                        active ? 'ring-teal-700' : 'ring-slate-200',
                      )}
                    >
                      {active ? <span className="w-2 h-2 rounded-full bg-teal-700" /> : null}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Booking panel */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-100 p-5 sticky top-24 space-y-4">
            {phase === 'idle' ? (
              <>
                <p className="text-xs font-black text-ink uppercase tracking-widest">Trip summary</p>
                <div className="space-y-2.5 text-[13px] font-medium text-slate-600">
                  <div className="flex justify-between"><span>Pickup</span><span className="font-black text-ink">{pickup}</span></div>
                  <div className="flex justify-between"><span>Destination</span><span className="font-black text-ink">{dest}</span></div>
                  <div className="flex justify-between"><span>Distance</span><span className="font-black text-ink">{`${dist.toFixed(1)} km`}</span></div>
                  <div className="h-px bg-slate-100" />
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm font-black text-ink">Estimated fare</span>
                    <span className="text-2xl font-black text-ink tabular-nums">{fmtNaira(fare)}</span>
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 text-[11px] text-slate-500 font-medium flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-teal-700" />
                  {eta}
                </div>
                <button
                  onClick={request}
                  className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-black transition-all"
                >
                  <Car className="w-4 h-4" /> Request a {klass.name}
                </button>
              </>
            ) : phase === 'matching' ? (
              <div className="py-8 text-center space-y-4">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-teal-50 text-teal-800 flex items-center justify-center animate-pulse">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
                <p className="text-sm font-black text-ink">Finding your rider…</p>
                <p className="text-xs text-slate-400">Holding your {klass.name} fare of {fmtNaira(fare)} at CityDrive’s city rate.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-2xl bg-emerald-50 ring-1 ring-emerald-100 p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4" strokeWidth={3} />
                  </div>
                  <div>
                    <p className="text-[13px] font-black text-emerald-800">Rider matched</p>
                    <p className="text-[11px] font-bold text-emerald-600">Nsi Okon · Toyota Corolla · 3 min away</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white ring-1 ring-slate-100 rounded-2xl p-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-700 to-teal-500 text-white flex items-center justify-center text-base font-black">
                    NO
                  </div>
                  <div className="flex-1">
                    <p className="text-[14px] font-black text-ink">Nsi Okon</p>
                    <p className="text-[11px] font-bold text-slate-400">Toyota Corolla · AB-772-CR</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] font-black text-amber-500">★ 4.8</span>
                      <span className="text-[11px] text-slate-400 font-bold">3,860 trips</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-black text-teal-800 tabular-nums">{fmtNaira(fare)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-teal-800 text-white text-[11px] font-bold">
                    <Phone className="w-3.5 h-3.5" /> Call
                  </button>
                  <button className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-50 text-slate-600 text-[11px] font-bold">
                    <Share2 className="w-3.5 h-3.5" /> Share trip
                  </button>
                </div>
                <button onClick={() => setPhase('idle')} className="w-full py-2 text-[11px] font-bold text-slate-400 hover:text-red-500 transition-colors">
                  Cancel &amp; start again
                </button>
              </div>
            )}
            <p className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-medium">
              <Waves className="w-3 h-3" /> Demo ride flow — driver matching is simulated.
            </p>
          </div>

          <div className="hidden lg:block mt-4 rounded-2xl bg-slate-50 border border-slate-100 p-4 text-[11px] text-slate-500 font-medium leading-relaxed">
            <p className="font-black text-ink mb-1.5">Popular route fares</p>
            <p className="text-[12px] text-slate-500 font-medium leading-relaxed">
              Fares are estimated from your pickup and destination selection — choose your route above to see the price.
            </p>
          </div>
        </div>
      </div>

      <DemoBanner />
    </div>
  );
}