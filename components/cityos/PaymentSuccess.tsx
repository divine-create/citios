'use client';

import Link from 'next/link';
import { Check, Truck, MapPin, Receipt, ChevronRight, PartyPopper, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { fmtNaira } from '@/lib/demo/cityos';
import { Pill } from '@/components/cityos/CityUI';
import { useWallet } from '@/components/cityos/WalletStore';

interface StoredOrder {
  ref: string;
  method: string;
  items: { name: string; qty: number; price: number }[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  placedAt: string;
}

export default function PaymentSuccess() {
  const [order, setOrder] = useState<StoredOrder | null>(null);
  const [steps, setSteps] = useState(1);
  const { balance } = useWallet();

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('cityos-demo-order');
      if (raw) setOrder(JSON.parse(raw));
    } catch {
      /* no saved order */
    }
  }, []);

  useEffect(() => {
    if (!order) return;
    const t1 = window.setTimeout(() => setSteps(2), 900);
    const t2 = window.setTimeout(() => setSteps(3), 1900);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [order]);

  if (!order) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-4">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
          <Check className="w-7 h-7" />
        </div>
        <h1 className="text-lg font-black text-ink">Payment received</h1>
        <p className="text-sm text-slate-500">Your demo order went through. Track it with CityDrive.</p>
        <Link href="/drive/delivery" className="inline-block px-5 py-2.5 rounded-xl bg-teal-800 text-white text-xs font-black hover:bg-teal-900">Track delivery</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="rounded-3xl bg-gradient-to-br from-emerald-700 to-emerald-600 text-white p-8 text-center relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <div className="mx-auto w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-xl mb-4 animate-in zoom-in-75 duration-500">
            <Check className="w-8 h-8 text-emerald-700" strokeWidth={3} />
          </div>
          <h1 className="text-2xl font-black tracking-tight">Payment successful</h1>
          <p className="text-emerald-50/90 text-sm font-medium mt-1.5">
            {`Order ${order.ref} confirmed · settled instantly on CityPay`}
          </p>
          <div className="inline-flex items-center gap-1.5 mt-4 px-3 py-1.5 rounded-full bg-white/10 ring-1 ring-white/20 text-[11px] font-black uppercase tracking-widest">
            <PartyPopper className="w-3.5 h-3.5" /> Paid with {order.method === 'wallet' ? 'CityPay Wallet' : order.method}
          </div>
        </div>
      </div>

      {/* Live status timeline */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <p className="text-xs font-black text-ink uppercase tracking-widest mb-4">Live order status</p>
        <div className="space-y-4">
          {[
            { label: 'Payment confirmed', sub: `${order.placedAt ? new Date(order.placedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'now'} · CityPay`, done: true },
            { label: 'Store is packing your items', sub: 'Calabar Fresh Market · Marian Road', done: steps >= 2 },
            { label: 'Rider assigned', sub: 'Samuel Edem will pick up in ~15 min', done: steps >= 3 },
          ].map((s, i) => (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={s.done ? 'w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center' : 'w-6 h-6 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center'}>
                  {s.done ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : <span className="text-[10px] font-black">{(i + 1).toString()}</span>}
                </div>
                {i < 2 ? <div className={s.done ? 'w-0.5 flex-1 bg-emerald-200' : 'w-0.5 flex-1 bg-slate-100'} /> : null}
              </div>
              <div className="pb-4">
                <p className={s.done ? 'text-[13px] font-black text-ink' : 'text-[13px] font-bold text-slate-400'}>{s.label}</p>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">{s.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Receipt */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <p className="inline-flex items-center gap-1.5 text-xs font-black text-ink uppercase tracking-widest mb-4">
          <Receipt className="w-4 h-4" /> Receipt · {order.ref}
        </p>
        <div className="space-y-2.5">
          {order.items.map((it, i) => (
            <div key={i} className="flex justify-between text-[13px]">
              <span className="text-slate-600 font-medium">{`${it.qty} × ${it.name}`}</span>
              <span className="font-black text-ink tabular-nums">{fmtNaira(it.price * it.qty)}</span>
            </div>
          ))}
          <div className="h-px bg-slate-100 my-1" />
          <div className="flex justify-between text-[13px] text-slate-500 font-medium">
            <span>Delivery (CityDrive)</span>
            <span className="font-black text-ink">{fmtNaira(order.deliveryFee)}</span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-sm font-black text-ink">Total paid</span>
            <span className="text-2xl font-black text-ink">{fmtNaira(order.total)}</span>
          </div>
          {order.method === 'wallet' ? (
            <div className="flex justify-between items-center text-[13px] text-slate-500 font-medium">
              <span className="inline-flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5 text-teal-700" /> Wallet balance now</span>
              <span className="font-black text-teal-900">{fmtNaira(balance)}</span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link href="/drive/delivery" className="flex-1 inline-flex items-center justify-center gap-2 py-3.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-black transition-colors">
          <Truck className="w-4 h-4" /> Track delivery with CityDrive <ChevronRight className="w-4 h-4" />
        </Link>
        <Link href="/" className="flex-1 inline-flex items-center justify-center gap-2 py-3.5 rounded-xl bg-white ring-1 ring-slate-200 text-slate-700 hover:ring-teal-300 text-xs font-black transition-all">
          <MapPin className="w-4 h-4 text-teal-700" /> Back to CityOS home
        </Link>
      </div>

      <div className="rounded-2xl border border-dashed border-brand-300 bg-brand-50/70 px-4 py-3">
        <p className="text-xs text-brand-900/80 leading-relaxed font-medium">
          <span className="font-bold text-brand-900">Demo order.</span> The reference, timeline and receipt above are simulated — no money was charged.
        </p>
      </div>
    </div>
  );
}