'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Phone, Truck, Share2, MessageCircle, MapPin, PackageCheck, Navigation } from 'lucide-react';
import { DELIVERY_ROUTE_STOPS, fmtNaira } from '@/lib/demo/cityos';
import { Pill, DemoBanner } from '@/components/cityos/CityUI';
import { cn } from '@/lib/utils';

const DRIVER = { name: 'Samuel Edem', car: 'Toyota Corolla', plate: 'TL-941-CR', phone: '0803 456 7890', rating: 4.9, trips: 2140 };

interface StoredOrder {
  ref: string;
  items: { name: string; qty: number; price: number }[];
  total: number;
}

export default function DeliveryTrack() {
  const [order, setOrder] = useState<StoredOrder | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('cityos-demo-order');
      if (raw) setOrder(JSON.parse(raw));
    } catch {
      /* no saved order */
    }
    const t = window.setInterval(() => setProgress((p) => (p < 62 ? p + 1 : p)), 2000);
    const clear = window.setTimeout(() => window.clearInterval(t), 62000);
    return () => {
      window.clearInterval(t);
      window.clearTimeout(clear);
    };
  }, []);

  const stops = DELIVERY_ROUTE_STOPS;
  const currentStopIdx = stops.findIndex((s) => s.state === 'current');
  const doneCount = stops.filter((s) => s.state === 'done').length + (progress > 0 ? 1 : 0);
  const remaining = stops.length - doneCount;
  const eta = Math.max(4, 14 - Math.floor(progress / 9));

  const routePath = stops.map((s) => `${s.x},${s.y}`).join(' ');

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-ink flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-teal-800" />
            {`Delivery ${order?.ref ?? 'CC-2841'} · on the way`}
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">{`${eta} min to ${stops[stops.length - 1].area}`}</p>
        </div>
        <Pill tone="teal"><span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />Rider en route</Pill>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Map */}
        <div className="lg:col-span-3 space-y-4">
          <div className="rounded-3xl overflow-hidden border border-slate-100 bg-slate-50 relative aspect-[4/3]">
            {/* stylized city map */}
            <div className="absolute inset-0 bg-gradient-to-br from-teal-50 via-white to-orange-50/40" />
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path d="M-5,30 L105,28" stroke="#A7D7C9" strokeWidth="0.6" fill="none" opacity="0.6" />
              <path d="M-5,66 L105,64" stroke="#A7D7C9" strokeWidth="0.5" fill="none" opacity="0.5" />
              <path d="M22,-5 L20,105" stroke="#C9D6E9" strokeWidth="0.5" fill="none" opacity="0.5" />
              <path d="M64,-5 L62,105" stroke="#C9D6E9" strokeWidth="0.5" fill="none" opacity="0.5" />
              <path d="M18,70 C 30,40 45,34 62,28" stroke="#199B7F" strokeWidth="1.2" fill="none" strokeDasharray="1.6 1.6" opacity="0.5" />
              <rect x="2" y="8" width="30" height="9" fill="#BEE3F6" opacity="0.35" rx="2" />
              <text x="6" y="14" fontSize="2.6" fontWeight="700" fill="#1278C8" opacity="0.6">CALABAR RIVER</text>
            </svg>

            {/* stops */}
            {stops.map((s) => (
              <div
                key={s.label}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${s.x}%`, top: `${s.y}%` }}
              >
                <div
                  className={cn(
                    'w-3.5 h-3.5 rounded-full ring-4',
                    s.state === 'done' && 'bg-teal-700 ring-teal-100',
                    s.state === 'current' && 'bg-orange-500 ring-orange-100 animate-pulse',
                    s.state === 'next' && 'bg-slate-200 ring-slate-100',
                  )}
                />
                <div
                  className={cn(
                    'mt-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-black whitespace-nowrap',
                    s.state === 'current' ? 'bg-white text-orange-600 shadow' : s.state === 'done' ? 'text-slate-400' : 'text-slate-500',
                  )}
                >
                  {s.label.split('·')[0].split(',')[0]}
                </div>
              </div>
            ))}

            {/* rider marker */}
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${24 + progress * 0.9}%`, top: `${64 - progress * 0.72}%` }}
            >
              <div className="w-9 h-9 rounded-full bg-teal-800 text-white flex items-center justify-center shadow-lg ring-4 ring-white">
                <Truck className="w-4 h-4" />
              </div>
            </div>

            <div className="absolute bottom-3 left-3 rounded-xl bg-white/90 backdrop-blur px-3 py-2 shadow text-[10px] font-bold text-slate-600 inline-flex items-center gap-1.5">
              <Navigation className="w-3 h-3 text-teal-700" /> Live demo track · Calabar metro
            </div>
          </div>

          {/* progress bar */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <div className="flex items-center justify-between text-[11px] font-black text-slate-500 uppercase tracking-widest mb-3">
              <span>From Marian Road</span>
              <span className="text-orange-600">{`${remaining} stop${remaining === 1 ? '' : 's'} left`}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal-700 to-teal-400 transition-all duration-1000"
                style={{ width: `${Math.min(100, progress + 20)}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-2 text-[11px] text-slate-400 font-bold">
              <span>{`${doneCount}/${stops.length} stops done`}</span>
              <span>{`${eta} min ETA`}</span>
            </div>
          </div>
        </div>

        {/* Driver + order */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Your rider</p>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-700 to-teal-500 text-white flex items-center justify-center text-base font-black">
                SE
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-black text-ink">{DRIVER.name}</p>
                <p className="text-[11px] font-bold text-slate-400">{`${DRIVER.car} · ${DRIVER.plate}`}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] font-black text-amber-500">{`★ ${DRIVER.rating}`}</span>
                  <span className="text-[11px] text-slate-400 font-bold">{`${DRIVER.trips} trips`}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4">
              <button className="inline-flex flex-col items-center gap-1 py-2.5 rounded-xl bg-teal-800 text-white text-[11px] font-bold hover:bg-teal-900 transition-colors">
                <Phone className="w-4 h-4" /> Call
              </button>
              <button className="inline-flex flex-col items-center gap-1 py-2.5 rounded-xl bg-slate-50 text-slate-600 text-[11px] font-bold hover:bg-slate-100 transition-colors">
                <MessageCircle className="w-4 h-4" /> Message
              </button>
              <button className="inline-flex flex-col items-center gap-1 py-2.5 rounded-xl bg-slate-50 text-slate-600 text-[11px] font-bold hover:bg-slate-100 transition-colors">
                <Share2 className="w-4 h-4" /> Share
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Order contents</p>
            {order ? (
              <div className="space-y-2">
                {order.items.map((it, i) => (
                  <div key={i} className="flex justify-between text-[13px]">
                    <span className="text-slate-600 font-medium">{`${it.qty} × ${it.name}`}</span>
                    <span className="font-black text-ink">{fmtNaira(it.price * it.qty)}</span>
                  </div>
                ))}
                <div className="h-px bg-slate-100" />
                <div className="flex justify-between text-[13px] font-black text-ink">
                  <span>Paid via CityPay</span>
                  <span>{fmtNaira(order.total)}</span>
                </div>
              </div>
            ) : (
              <p className="text-[13px] text-slate-500 font-medium">
                Palm oil 1L, wild ogbono, crayfish — from your latest demo order.
              </p>
            )}
          </div>

          <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
            <p className="text-[12px] text-slate-500 font-medium leading-relaxed">
              <span className="font-black text-ink">Destination:</span> Flat 3, Bluebird Court, {stops[stops.length - 1].area}. Leave with security if away.
            </p>
          </div>

          <Link href="/" className="block text-center text-[11px] font-bold text-slate-400 hover:text-teal-800 transition-colors">
            ← Back to CityOS home
          </Link>
        </div>
      </div>

      <DemoBanner />
    </div>
  );
}