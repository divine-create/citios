'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wallet, CreditCard, Landmark, ShieldCheck, Loader2, ChevronRight, Truck, Lock, AlertCircle } from 'lucide-react';
import { getProduct, getBusiness, fmtNaira, DEMO_USER } from '@/lib/demo/cityos';
import { useCart } from '@/components/cityos/CartStore';
import { useWallet } from '@/components/cityos/WalletStore';
import { Money, Pill } from '@/components/cityos/CityUI';
import { cn } from '@/lib/utils';

const METHODS = [
  { id: 'wallet', label: 'CityPay Wallet', sub: 'Tap to use CityPay', icon: Wallet },
  { id: 'card', label: 'Bank card', sub: 'Visa / Mastercard · saved', icon: CreditCard },
  { id: 'transfer', label: 'Bank transfer', sub: 'GTBank · reference shown', icon: Landmark },
] as const;

type MethodId = 'wallet' | 'card' | 'transfer';

export default function CheckoutView() {
  const router = useRouter();
  const { lines, subtotal, deliveryFee, clear } = useCart();
  const { spend, balance } = useWallet();
  const [method, setMethod] = useState<MethodId>('wallet');
  const [processing, setProcessing] = useState(false);
  const [walletError, setWalletError] = useState(false);

  if (lines.length === 0 && !processing) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-4">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-teal-50 text-teal-800 flex items-center justify-center">
          <Wallet className="w-7 h-7" />
        </div>
        <h1 className="text-lg font-black text-ink">Nothing to pay for</h1>
        <p className="text-sm text-slate-500">Add a few items from the market first, then check out.</p>
      </div>
    );
  }

  const total = subtotal + deliveryFee;
  const walletOk = method === 'wallet' ? balance - total >= 0 : true;

  const pay = () => {
    if (processing) return;
    const order = {
      ref: `CC-${2841 + Math.floor(Math.random() * 90)}`,
      method,
      items: lines.map((l) => {
        const p = getProduct(l.productId);
        return { name: p?.name ?? l.productId, qty: l.qty, price: p?.price ?? 0 };
      }),
      subtotal,
      deliveryFee,
      total,
      placedAt: new Date().toISOString(),
    };
    if (method === 'wallet') {
      const ok = spend(total, `CityPay order ${order.ref}`);
      if (!ok) {
        setWalletError(true);
        return;
      }
    }
    setWalletError(false);
    setProcessing(true);
    try {
      window.localStorage.setItem('cityos-demo-order', JSON.stringify(order));
    } catch {
      /* storage unavailable */
    }
    window.setTimeout(() => {
      clear();
      router.push('/pay/success');
    }, 1400);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-xl font-black text-ink">CityPay checkout</h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5">One payment, instant settlement, full trail.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-4">
          {/* Items */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Your items</p>
            {lines.map((l) => {
              const p = getProduct(l.productId);
              if (!p) return null;
              const biz = getBusiness(p.bizSlug);
              return (
                <div key={l.productId} className="flex items-center gap-3 py-1.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-black text-ink truncate">{p.name}</p>
                    <p className="text-[11px] font-bold text-slate-400">{`${biz?.name} · ${l.qty} × ${p.unit}`}</p>
                  </div>
                  <span className="text-[13px] font-black text-slate-700 tabular-nums">{fmtNaira(p.price * l.qty)}</span>
                </div>
              );
            })}
          </div>

          {/* Delivery address */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <p className="inline-flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
              <Truck className="w-3.5 h-3.5" /> Deliver to
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center text-sm font-black">
                {DEMO_USER.initials}
              </div>
              <div>
                <p className="text-[13px] font-black text-ink">{`${DEMO_USER.name} · ${DEMO_USER.area}`}</p>
                <p className="text-[11px] text-slate-400 font-medium">CityDrive will match a rider to {bizArea(lines)} on checkout.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Payment */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
            <p className="text-xs font-black text-ink uppercase tracking-widest">Pay with</p>
            {METHODS.map((m) => (
              <button
                key={m.id}
                onClick={() => setMethod(m.id)}
                className={cn(
                  'w-full flex items-center gap-3 p-3.5 rounded-xl ring-1 transition-all text-left',
                  method === m.id ? 'bg-teal-50 ring-teal-600' : 'bg-slate-50/50 ring-slate-200 hover:ring-teal-300',
                )}
              >
                <m.icon className={cn('w-5 h-5', method === m.id ? 'text-teal-800' : 'text-slate-400')} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-black text-ink">{m.label}</p>
                  <p className="text-[11px] font-bold text-slate-400">{m.id === 'wallet' ? `Balance ${fmtNaira(balance)}` : m.sub}</p>
                </div>
                <span
                  className={cn(
                    'w-4 h-4 rounded-full ring-2 flex items-center justify-center',
                    method === m.id ? 'ring-teal-700' : 'ring-slate-200',
                  )}
                >
                  {method === m.id ? <span className="w-2 h-2 rounded-full bg-teal-700" /> : null}
                </span>
              </button>
            ))}

            {method === 'wallet' ? (
              <div className="rounded-xl bg-slate-50 p-3.5 flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500">Wallet balance</span>
                <span className={cn('text-sm font-black', walletOk ? 'text-emerald-700' : 'text-red-600')}>{fmtNaira(balance)}</span>
              </div>
            ) : null}
            {walletError ? (
              <p className="inline-flex items-center gap-1.5 text-[11px] font-bold text-red-600">
                <AlertCircle className="w-3.5 h-3.5" /> Wallet balance is too low — top up on your profile.
              </p>
            ) : null}

            <div className="flex justify-between text-[13px] font-medium text-slate-600 pt-1">
              <span>Subtotal</span>
              <span className="font-black text-ink tabular-nums">{fmtNaira(subtotal)}</span>
            </div>
            <div className="flex justify-between text-[13px] font-medium text-slate-600">
              <span>Delivery</span>
              <span className="font-black text-ink tabular-nums">{fmtNaira(deliveryFee)}</span>
            </div>
            <div className="h-px bg-slate-100" />
            <div className="flex justify-between items-baseline">
              <span className="text-sm font-black text-ink">Total</span>
              <Money amount={total} className="text-xl" />
            </div>

            <button
              onClick={pay}
              disabled={processing}
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl bg-teal-800 hover:bg-teal-900 disabled:opacity-60 text-white text-xs font-black transition-all"
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Processing payment…
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  {`Pay ${fmtNaira(total)} · CityPay`}
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
            <p className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" /> Demo payment — no real money moves.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function bizArea(lines: { productId: string }[]): string {
  for (const l of lines) {
    const p = getProduct(l.productId);
    if (p) {
      const biz = getBusiness(p.bizSlug);
      if (biz) return biz.area;
    }
  }
  return 'Marian Road';
}