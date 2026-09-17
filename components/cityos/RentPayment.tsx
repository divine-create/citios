'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Wallet, Check, ShieldCheck, ChevronRight, Building2, Download, AlertCircle } from 'lucide-react';
import { getProperty, fmtNaira, DEMO_USER } from '@/lib/demo/cityos';
import { FallbackImg, Pill, Money, DemoBanner } from '@/components/cityos/CityUI';
import { useWallet } from '@/components/cityos/WalletStore';
import { cn } from '@/lib/utils';

export default function RentPayment({ id }: { id: string }) {
  const router = useRouter();
  const p = getProperty(id);
  const { spend, balance } = useWallet();
  const [paid, setPaid] = useState(false);
  const [low, setLow] = useState(false);

  if (!p) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-4">
        <h1 className="text-lg font-black text-ink">Listing not found</h1>
        <Link href="/house" className="inline-block px-5 py-2.5 rounded-xl bg-teal-800 text-white text-xs font-black">Back to listings</Link>
      </div>
    );
  }

  const rent = p.pricePerYear / 12;

  const pay = () => {
    if (paid) return;
    const ok = spend(rent, `Rent · ${p.title}`);
    if (!ok) {
      setLow(true);
      return;
    }
    setLow(false);
    setPaid(true);
    window.setTimeout(() => router.push('/pay/success'), 1300);
    try {
      window.localStorage.setItem(
        'cityos-demo-order',
        JSON.stringify({
          ref: 'CC-RENT-0187',
          method: 'rent',
          items: [{ name: p.title, qty: 1, price: rent }],
          subtotal: rent,
          deliveryFee: 0,
          total: rent,
          placedAt: new Date().toISOString(),
        }),
      );
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
      <nav className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
        <Link href="/house" className="hover:text-teal-800">CityHouse</Link>
        <ChevronRight className="w-3 h-3" />
        <Link href={`/house/${p.id}`} className="hover:text-teal-800 truncate">{p.title}</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-700">Rent payment</span>
      </nav>

      <div className="rounded-3xl bg-gradient-to-br from-teal-900 to-teal-700 text-white p-6 md:p-8 relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-start gap-4">
          <FallbackImg src={p.image} alt={p.title} className="w-20 h-20 rounded-2xl shrink-0 ring-2 ring-white/20" />
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 text-[10px] font-black text-teal-100 uppercase tracking-widest">
              <Building2 className="w-3.5 h-3.5" /> CityHouse rent · est. {p.area}
            </p>
            <h1 className="text-xl font-black mt-1">{p.title}</h1>
            <p className="text-[12px] text-teal-100/80 font-medium mt-0.5">{`Tenant: ${DEMO_USER.name} · Invoice ${p.id.toUpperCase()}-2026`}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
        <div className="md:col-span-3 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-3">
            <p className="text-xs font-black text-ink uppercase tracking-widest">What you are paying</p>
            <div className="flex justify-between text-[13px] font-medium text-slate-600">
              <span>Monthly rent</span>
              <span className="font-black text-ink tabular-nums">{fmtNaira(rent)}</span>
            </div>
            <div className="flex justify-between text-[13px] font-medium text-slate-600">
              <span>Service &amp; maintenance</span>
              <span className="font-black text-ink tabular-nums">{fmtNaira(0)}</span>
            </div>
            <div className="h-px bg-slate-100" />
            <div className="flex justify-between items-baseline">
              <span className="text-sm font-black text-ink">Due today</span>
              <Money amount={rent} className="text-2xl" />
            </div>
            <p className="rounded-xl bg-emerald-50 text-emerald-700 text-[11px] font-bold px-3 py-2">
              ✓ Due every 12th · next invoice mid-October
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <p className="inline-flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
              <Wallet className="w-3.5 h-3.5" /> Pay from CityPay wallet
            </p>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
              <div>
                <p className="text-[13px] font-black text-ink">CityPay Wallet</p>
                <p className="text-[11px] font-bold text-slate-400">{`${DEMO_USER.walletId} · available ${fmtNaira(balance)}`}</p>
              </div>
              <Pill tone="blue">Instant</Pill>
            </div>
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-100 p-5 sticky top-24 space-y-3">
            <p className="text-xs font-black text-ink uppercase tracking-widest">Review</p>
            <div className="space-y-2 text-[12px] font-bold">
              <div className="flex justify-between"><span className="text-slate-500">Listing</span><span className="text-slate-700 text-right">{p.title}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Landlord</span><span className="text-slate-700">{p.landlord}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Method</span><span className="text-teal-800">CityPay Wallet</span></div>
            </div>
            <div className="h-px bg-slate-100" />
            <Money amount={rent} className="text-2xl block" />
            <button
              onClick={pay}
              disabled={paid}
              className={cn(
                'w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl text-xs font-black transition-all',
                paid ? 'bg-emerald-600 text-white' : 'bg-teal-800 hover:bg-teal-900 text-white',
              )}
            >
              {paid ? (<><Check className="w-4 h-4" /> Paid — confirming…</>) : (<><ShieldCheck className="w-4 h-4" /> {`Pay ${fmtNaira(rent)} now`}</>)}
            </button>
            {low ? (
              <p className="inline-flex items-center gap-1.5 text-[11px] font-bold text-red-600">
                <AlertCircle className="w-3.5 h-3.5" /> Wallet balance is too low — top up on your profile.
              </p>
            ) : null}
            <p className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-medium">
              <ShieldCheck className="w-3 h-3" /> Demo payment — no real money moves.
            </p>
            <button className="w-full inline-flex items-center justify-center gap-1.5 text-[11px] font-bold text-slate-400 hover:text-teal-800 py-1">
              <Download className="w-3.5 h-3.5" /> Download rent receipt
            </button>
          </div>
        </div>
      </div>

      <DemoBanner />
    </div>
  );
}