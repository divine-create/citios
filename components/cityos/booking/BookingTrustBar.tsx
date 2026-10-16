'use client';

import React from 'react';
import { Zap, ShieldCheck, Wifi, CreditCard, Sparkles } from 'lucide-react';

export default function BookingTrustBar() {
  const perks = [
    {
      icon: Zap,
      title: '24/7 Power Guaranteed',
      desc: 'Dual generator & solar backup',
      color: 'text-amber-500 bg-amber-500/10',
    },
    {
      icon: ShieldCheck,
      title: 'Free Cancellation',
      desc: 'Stay flexible on most rooms',
      color: 'text-emerald-500 bg-emerald-500/10',
    },
    {
      icon: Wifi,
      title: 'Tested High-Speed Wi-Fi',
      desc: 'Verified streaming & work speeds',
      color: 'text-blue-500 bg-blue-500/10',
    },
    {
      icon: CreditCard,
      title: 'Pay at Property or CityPay',
      desc: 'No upfront deposit required',
      color: 'text-indigo-500 bg-indigo-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 select-none">
      {perks.map((p, idx) => {
        const Icon = p.icon;
        return (
          <div
            key={idx}
            className="flex items-center gap-3 p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow"
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${p.color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-black text-slate-900 truncate">{p.title}</h4>
              <p className="text-[11px] text-slate-500 truncate">{p.desc}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
