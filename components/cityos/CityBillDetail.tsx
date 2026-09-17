'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, ShieldCheck, Check, Receipt } from 'lucide-react';
import { getBill, BILL_KIND_ICONS, fmtNaira, DEMO_USER } from '@/lib/demo/cityos';
import { Pill, DemoBanner, Money } from '@/components/cityos/CityUI';
import { useWallet } from '@/components/cityos/WalletStore';
import { cn } from '@/lib/utils';

export default function CityBillDetail({ slug }: { slug: string }) {
  const b = getBill(slug);
  const { spend, balance } = useWallet();
  const [amount, setAmount] = useState<number | null>(null);
  const [state, setState] = useState<'idle' | 'paid' | 'low'>('idle');
  const [ref] = useState(() => `BILL-${String(Math.floor(1000 + Math.random() * 9000))}`);

  if (!b) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-4">
        <h1 className="text-lg font-black text-ink">That biller is not in the demo city.</h1>
        <Link href="/bills" className="inline-block px-5 py-2.5 rounded-xl bg-teal-800 text-white text-xs font-black hover:bg-teal-900">Back to Bills</Link>
      </div>
    );
  }

  const Icon = BILL_KIND_ICONS[b.kind];
  const presets = Array.from(
    new Set([b.balance, Math.min(b.balance, 10000), Math.min(b.balance, 2500)]),
  ).filter((v) => v > 0);
  const payAmount = amount ?? b.balance;

  const pay = () => {
    if (state === 'paid') return;
    const ok = spend(payAmount, `Bill payment · ${b.name}`);
    setState(ok ? 'paid' : 'low');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
      <nav className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
        <Link href="/bills" className="hover:text-teal-800">Bills & Airtime</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-700 truncate">{b.name}</span>
      </nav>

      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-teal-950 to-teal-800 text-white p-6 md:p-8 relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-teal-400/20 blur-3xl" />
        <div className="relative flex items-start gap-4">
          <span className="w-14 h-14 rounded-2xl bg-white/10 ring-1 ring-white/15 flex items-center justify-center shrink-0">
            <Icon className="w-7 h-7" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-black text-teal-100 uppercase tracking-widest">CityPay · biller</p>
            <h1 className="text-xl font-black mt-1">{b.name}</h1>
            <p className="text-[12px] text-teal-100/80 font-medium mt-0.5">{`${b.note} · ${b.due}`}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Balance due</p>
            <p className="text-2xl font-black text-ink">{fmtNaira(b.balance)}</p>
          </div>
          <Pill tone={b.due.includes('2 days') || b.due.includes('4 days') ? 'orange' : 'blue'}>{b.due}</Pill>
        </div>

        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Pay amount</p>
          <div className="flex gap-2 flex-wrap">
            {presets.map((p) => (
              <button
                key={p}
                onClick={() => setAmount(p)}
                className={cn(
                  'px-4 py-2 rounded-full text-xs font-black ring-1 transition-all',
                  payAmount === p ? 'bg-teal-800 text-white ring-teal-800' : 'bg-white text-slate-600 ring-slate-200 hover:ring-teal-300',
                )}
              >
                {p === b.balance ? 'Full balance' : fmtNaira(p)}
              </button>
            ))}
          </div>
        </div>

        <div className="h-px bg-slate-100" />

        <div className="flex items-center justify-between text-[13px] font-medium text-slate-600">
          <span>Charged to</span>
          <span className="font-black text-ink">{`${DEMO_USER.name} · ${DEMO_USER.walletId}`}</span>
        </div>
        <div className="flex items-center justify-between text-[13px] font-medium text-slate-600">
          <span>Wallet balance</span>
          <span className="font-black text-ink tabular-nums">{fmtNaira(balance)}</span>
        </div>
        <div className="h-px bg-slate-100" />
        <div className="flex justify-between items-baseline">
          <span className="text-sm font-black text-ink">Total</span>
          <Money amount={payAmount} className="text-2xl" />
        </div>

        <button
          onClick={pay}
          disabled={state === 'paid'}
          className={cn(
            'w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl text-xs font-black transition-all',
            state === 'paid' ? 'bg-emerald-600 text-white' : 'bg-teal-800 hover:bg-teal-900 text-white',
          )}
        >
          {state === 'paid' ? (<><Check className="w-4 h-4" /> Paid · {ref}</>) : (<><ShieldCheck className="w-4 h-4" /> {`Pay ${fmtNaira(payAmount)} via CityPay`}</>)}
        </button>
        {state === 'low' ? (
          <p className="text-[11px] font-bold text-red-600">Wallet balance is too low. Top up on your profile.</p>
        ) : null}
        <p className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-medium">
          <ShieldCheck className="w-3 h-3" /> Demo payment — credit is simulated.
        </p>
      </div>

      {state === 'paid' ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 space-y-1 animate-in zoom-in-95 duration-300">
          <p className="flex items-center gap-2 text-sm font-black text-emerald-800">
            <Receipt className="w-4 h-4" /> {ref} · settled instantly
          </p>
          <p className="text-[12px] text-emerald-700 font-medium">
            {`${fmtNaira(payAmount)} credited to ${b.note}. Your ${b.name} account is now ${fmtNaira(Math.max(0, b.balance - payAmount))} to date.`}
          </p>
          <p className="text-[11px] font-bold text-emerald-600">{`Wallet balance: ${fmtNaira(balance)}`}</p>
        </div>
      ) : null}

      <DemoBanner />
    </div>
  );
}