'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BedDouble, ChevronRight, ShieldCheck, Check, BadgeCheck } from 'lucide-react';
import { getHotel, fmtNaira } from '@/lib/demo/cityos';
import { FallbackImg, Pill, Stars, LocationRow, DemoBanner, Money } from '@/components/cityos/CityUI';
import { useWallet } from '@/components/cityos/WalletStore';
import { cn } from '@/lib/utils';

export default function CityStayDetail({ slug }: { slug: string }) {
  const h = getHotel(slug);
  const { balance, spend } = useWallet();
  const [state, setState] = useState<'idle' | 'held' | 'low'>('idle');
  const [ref] = useState(() => `STAY-${String(Math.floor(100 + Math.random() * 900))}`);

  if (!h) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-4">
        <h1 className="text-lg font-black text-ink">That hotel is not available.</h1>
        <Link href="/stay" className="inline-block px-5 py-2.5 rounded-xl bg-teal-800 text-white text-xs font-black hover:bg-teal-900">Back to hotels</Link>
      </div>
    );
  }

  const hold = () => {
    if (state === 'held') return;
    const ok = spend(h.pricePerNight, `Hotel hold · ${h.name}`);
    setState(ok ? 'held' : 'low');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
      <nav className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
        <Link href="/stay" className="hover:text-teal-800">Hotels Tonight</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-700 truncate">{h.name}</span>
      </nav>

      <div className="relative rounded-3xl overflow-hidden">
        <FallbackImg src={h.image} alt={h.name} className="h-56 md:h-80 w-full" gradient="from-teal-900 to-teal-700" />
        <div className="absolute bottom-3 left-3 right-3 flex gap-2 flex-wrap">
          {h.tags.map((t: any) => <Pill key={t} tone="teal">{t}</Pill>)}
          {h.nearStadium ? <Pill tone="orange">Near stadium</Pill> : null}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col sm:flex-row sm:items-end gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-black text-ink">{h.name}</h1>
            <Stars rating={h.rating} />
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">{h.tagline}</p>
          <LocationRow text={`${h.address} · ${h.area}`} className="text-xs mt-1.5" />
        </div>
        <div className="text-left sm:text-right shrink-0">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tonight</p>
          <p className="text-2xl font-black text-ink">{fmtNaira(h.pricePerNight)}</p>
          <p className="text-[11px] font-bold text-slate-400">{`upto ${h.guests} guests · refundable hold`}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
        <div className="md:col-span-3 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <h2 className="text-base font-black text-ink mb-1">The room</h2>
            <p className="text-[13px] text-slate-600 leading-relaxed">{h.desc}</p>
            <div className="flex items-center gap-2 pt-4 border-t border-slate-100 mt-4">
              <BadgeCheck className="w-4 h-4 text-teal-700" />
              <p className="text-[12px] font-black text-ink">{`Listed on CityOS · ${h.reviews} reviews`}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <h2 className="text-base font-black text-ink mb-3">Amenities</h2>
            <div className="flex flex-wrap gap-2">
              {h.amenities.map((a: any) => <Pill key={a} tone="teal">{a}</Pill>)}
            </div>
          </div>

          {state === 'held' ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 space-y-1 animate-in zoom-in-95 duration-300">
              <p className="flex items-center gap-2 text-sm font-black text-emerald-800">
                <Check className="w-4 h-4" /> Room held for tonight · {ref}
              </p>
              <p className="text-[12px] text-emerald-700 font-medium">
                {`Deposit ${fmtNaira(h.pricePerNight)} paid from CityPay. Present this reference at the ${h.area} front desk — the hold is refunded on check-in.`}
              </p>
              <p className="text-[11px] font-bold text-emerald-600">{`Wallet balance after: ${fmtNaira(balance)}`}</p>
              <Link href={`/drive/ride`} className="inline-flex items-center gap-1 mt-2 text-[12px] font-black text-teal-800 hover:underline">
                Add a ride to the hotel <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : null}
        </div>

        <div className="md:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-100 p-5 sticky top-24 space-y-3">
            <p className="inline-flex items-center gap-1.5 text-xs font-black text-ink uppercase tracking-widest">
              <BedDouble className="w-4 h-4 text-teal-700" /> Book tonight
            </p>
            <div className="space-y-2 text-[12px] font-bold">
              <div className="flex justify-between"><span className="text-slate-500">Booking</span><span className="text-slate-700">{h.name}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Night of</span><span className="text-slate-700">{new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric' })}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Guests</span><span className="text-slate-700">{h.guests}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Guest</span><span className="text-slate-700">Resident</span></div>
            </div>
            <div className="h-px bg-slate-100" />
            <Money amount={h.pricePerNight} className="text-2xl block" />
            <button
              onClick={hold}
              disabled={state === 'held'}
              className={cn(
                'w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl text-xs font-black transition-all',
                state === 'held' ? 'bg-emerald-600 text-white' : 'bg-teal-800 hover:bg-teal-900 text-white',
              )}
            >
              {state === 'held' ? (<><Check className="w-4 h-4" /> Held — {ref}</>) : (<><ShieldCheck className="w-4 h-4" /> {`Hold with CityPay · ${fmtNaira(h.pricePerNight)}`}</>)}
            </button>
            {state === 'low' ? (
              <p className="text-[11px] font-bold text-red-600">Wallet balance is too low for this hold. Top up on your profile.</p>
            ) : null}
            <p className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-medium">
              <ShieldCheck className="w-3 h-3" /> Refundable at the desk · demo payment only
            </p>
          </div>
        </div>
      </div>

      <DemoBanner />
    </div>
  );
}