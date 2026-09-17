'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Wrench, ChevronRight, ShieldCheck, Check, UserCheck, Timer } from 'lucide-react';
import { getTask, fmtNaira, DEMO_USER } from '@/lib/demo/cityos';
import { FallbackImg, Pill, Stars, DemoBanner, Money } from '@/components/cityos/CityUI';
import { useWallet } from '@/components/cityos/WalletStore';
import { cn } from '@/lib/utils';

export default function CityTaskDetail({ id }: { id: string }) {
  const t = getTask(id);
  const { spend, balance } = useWallet();
  const [state, setState] = useState<'idle' | 'booked' | 'low'>('idle');
  const [ref] = useState(() => `TASK-${String(Math.floor(1000 + Math.random() * 9000))}`);

  if (!t) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-4">
        <h1 className="text-lg font-black text-ink">That service is not in the demo city.</h1>
        <Link href="/tasks" className="inline-block px-5 py-2.5 rounded-xl bg-teal-800 text-white text-xs font-black hover:bg-teal-900">Back to City Tasks</Link>
      </div>
    );
  }

  const book = () => {
    if (state === 'booked') return;
    const ok = spend(t.from, `Deposit · ${t.name} (${t.pro})`);
    setState(ok ? 'booked' : 'low');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
      <nav className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
        <Link href="/tasks" className="hover:text-teal-800">City Tasks</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-700 truncate">{t.name}</span>
      </nav>

      <div className="relative rounded-3xl overflow-hidden">
        <FallbackImg src={t.image} alt={t.name} className="h-48 md:h-64 w-full" gradient="from-slate-900 to-teal-800" />
        <div className="absolute bottom-3 left-3 right-3 flex gap-2 flex-wrap">
          <Pill tone="teal">{t.category}</Pill>
          <Pill tone="blue">{`ETA ${t.eta}`}</Pill>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-xl font-black text-ink">{t.name}</h1>
            <p className="text-xs text-slate-500 font-medium mt-1">{t.area}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Deposit to book</p>
            <p className="text-2xl font-black text-ink">{fmtNaira(t.from)}</p>
          </div>
        </div>
        <p className="text-[13px] text-slate-600 leading-relaxed mt-3">{t.desc}</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-6 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-700 to-teal-500 text-white flex items-center justify-center text-sm font-black shrink-0">
          {t.pro.split(' ').map((n) => n[0]).slice(0, 2).join('')}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-black text-ink">{t.pro}</p>
          <p className="text-[11px] font-bold text-teal-800">{`${t.category} pro · ${t.eta}`}</p>
          <Stars rating={t.rating} className="mt-0.5" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <p className="inline-flex items-center gap-1.5 text-xs font-black text-ink uppercase tracking-widest">
          <Wrench className="w-4 h-4 text-teal-700" /> Book this job
        </p>
        <div className="space-y-2 text-[12px] font-bold mt-3">
          <div className="flex justify-between"><span className="text-slate-500">Pro</span><span className="text-slate-700">{t.pro}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Client</span><span className="text-slate-700">{DEMO_USER.name}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Deposit</span><span className="text-teal-800">CityPay wallet</span></div>
        </div>
        <div className="h-px bg-slate-100 my-3" />
        <Money amount={t.from} className="text-2xl block" />
        <button
          onClick={book}
          disabled={state === 'booked'}
          className={cn(
            'w-full mt-3 inline-flex items-center justify-center gap-2 py-3.5 rounded-xl text-xs font-black transition-all',
            state === 'booked' ? 'bg-emerald-600 text-white' : 'bg-teal-800 hover:bg-teal-900 text-white',
          )}
        >
          {state === 'booked' ? (<><Check className="w-4 h-4" /> Booked · {ref}</>) : (<><UserCheck className="w-4 h-4" /> {`Book & pay deposit ${fmtNaira(t.from)}`}</>)}
        </button>
        {state === 'low' ? (
          <p className="text-[11px] font-bold text-red-600 mt-2">Wallet balance is too low for this deposit. Top up on your profile.</p>
        ) : null}
        <p className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-medium mt-2">
          <ShieldCheck className="w-3 h-3" /> Works guaranteed · demo payment only
        </p>
        <p className="flex items-center justify-center gap-1 text-[10px] text-slate-400 font-medium mt-1">
          <Timer className="w-3 h-3" /> Visits run between 8 AM and 6 PM
        </p>
      </div>

      {state === 'booked' ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 space-y-1 animate-in zoom-in-95 duration-300">
          <p className="flex items-center gap-2 text-sm font-black text-emerald-800">
            <Check className="w-4 h-4" /> {t.pro} is assigned · {ref}
          </p>
          <p className="text-[12px] text-emerald-700 font-medium">
            {`Deposit ${fmtNaira(t.from)} paid from CityPay. ${t.pro} will call to confirm the visit window today — the balance settles when the job is done.`}
          </p>
          <p className="text-[11px] font-bold text-emerald-600">{`Wallet balance: ${fmtNaira(balance)}`}</p>
        </div>
      ) : null}

      <DemoBanner />
    </div>
  );
}