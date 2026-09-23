'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wallet, CreditCard, Landmark, ShieldCheck, Loader2, ChevronRight, Truck, Lock, AlertCircle } from 'lucide-react';
import { useMoney } from '@/components/cityos/CityProvider';
import { useCart } from '@/components/cityos/CartStore';

import { Money, Pill } from '@/components/cityos/CityUI';
import { cn } from '@/lib/utils';
import { initiateCheckout } from '@/app/actions/payment';

const METHODS = [
  { id: 'card', label: 'Debit / Credit Card', sub: 'Visa, Mastercard, Verve via Paystack', icon: CreditCard },
  { id: 'transfer', label: 'Bank Transfer / USSD', sub: 'Direct bank transfer via Paystack', icon: Landmark },
] as const;

type MethodId = 'card' | 'card' | 'transfer';

export default function CheckoutView() {
  const { fmt } = useMoney();
  const router = useRouter();
  const { lines, subtotal, deliveryFee, clear } = useCart();
  
  const [method, setMethod] = useState<MethodId>('card');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [processing, setProcessing] = useState(false);
  

  // Split the shared cart by line kind. Retail and food are different
  // canonical order pipelines (RetailOrder vs RestaurantOrder), so a mixed
  // cart cannot be checked out in one pass — the resident resolves it by
  // checking out each kind separately.
  const retailLines = lines.filter((l) => l.kind === 'retail');
  const foodLines = lines.filter((l) => l.kind === 'food');
  const foodOnly = foodLines.length > 0 && retailLines.length === 0;
  const hasMixed = retailLines.length > 0 && foodLines.length > 0;

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
  

  const pay = async () => {
    if (processing || hasMixed) return;


    setProcessing(true);

    try {
      const checkoutKind = foodOnly ? 'food' : 'retail';
      const activeLines = foodOnly ? foodLines : retailLines;

      const res = await initiateCheckout({
        kind: checkoutKind,
        deliveryAddress,
          items: activeLines.map((l) => ({
          productId: l.productId,
          qty: l.qty,
          name: l.name,
        })),
        method,
      });

      if (res.error) {
        alert(res.error);
        setProcessing(false);
        return;
      }

      if (res.success && res.redirectUrl) {
        clear();
        if (res.redirectUrl.startsWith('http') && !res.redirectUrl.includes(window.location.host)) {
          // External Paystack checkout URL
          window.location.href = res.redirectUrl;
        } else {
          router.push(res.redirectUrl);
        }
      }
    } catch (err) {
      console.error(err);
      alert('Failed to process payment: ' + (err as Error).message);
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-ink">Checkout</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-10 items-start">
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Your items</p>
            {hasMixed && (
              <div className="mb-3 p-3 bg-amber-50 text-amber-900 text-xs font-medium rounded-xl flex gap-2 items-start leading-relaxed">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 opacity-70" />
                <div>This cart mixes market items and food orders. They are placed with different merchants â€” check out each separately. Remove one type of item, or complete this checkout and come back.</div>
              </div>
            )}
            {lines.map((l) => {
              return (
                <div key={l.productId} className="flex items-center gap-3 py-1.5">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-black text-ink line-clamp-1">{l.name}</div>
                    <div className="text-[10px] font-medium text-slate-500">{l.orgName} â€¢ {l.qty}x</div>
                  </div>
                  <div className="text-xs font-bold text-ink whitespace-nowrap">
                    {fmt(l.price * l.qty)}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xs font-black text-slate-700 uppercase tracking-widest">Delivery Details</h2>
              <Pill className="bg-emerald-50 text-emerald-800 text-[10px] border-0"><Truck className="w-3 h-3 mr-1" /> Today</Pill>
            </div>
            <div className="p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                <Truck className="w-4 h-4 text-slate-400" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-ink leading-tight">Delivery Address</h3>
                  <textarea className="w-full mt-2 p-2 border border-slate-200 rounded text-xs text-slate-700" placeholder="Enter your delivery address..." value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} required={!foodOnly} />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <h2 className="text-xs font-black text-slate-700 uppercase tracking-widest">Payment Method</h2>
            </div>
            <div className="p-2 space-y-1">
              {METHODS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-xl transition-all text-left",
                    method === m.id ? "bg-teal-50 ring-1 ring-teal-200" : "hover:bg-slate-50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                      method === m.id ? "bg-teal-800 text-white" : "bg-slate-100 text-slate-400"
                    )}>
                      <m.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className={cn("font-bold text-sm leading-tight", method === m.id ? "text-teal-900" : "text-slate-700")}>
                        {m.label}
                      </div>
                      <div className={cn("text-xs", method === m.id ? "text-teal-700" : "text-slate-500")}>
                        {m.sub}
                      </div>
                    </div>
                  </div>
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                    method === m.id ? "border-teal-600" : "border-slate-200"
                  )}>
                    {method === m.id && <div className="w-2.5 h-2.5 rounded-full bg-teal-600" />}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-slate-50 rounded-3xl p-6 space-y-6 sticky top-24">
            <h2 className="text-sm font-black text-ink flex items-center gap-2">
              Order summary
            </h2>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-slate-600 font-medium">
                <span>Subtotal</span>
                <span className="font-bold text-ink"><Money amount={subtotal} /></span>
              </div>
              <div className="flex justify-between text-slate-600 font-medium">
                <span>{foodOnly ? 'Pickup' : 'Delivery'}</span>
                <span className="font-bold text-ink">
                  {foodOnly
                    ? <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">No delivery fee</span>
                    : <Money amount={deliveryFee} />}
                </span>
              </div>
            </div>
            
            <div className="pt-4 border-t border-slate-200 space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-black text-ink">Total</span>
                <span className="text-2xl font-black text-teal-900"><Money amount={total} /></span>
              </div>

              {!cardOk && (
                <div className="p-3 bg-rose-50 text-rose-800 text-xs font-medium rounded-xl flex gap-2 items-start leading-relaxed">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 opacity-70" />
                  <div>Insufficient card balance. Please add funds or switch payment method.</div>
                </div>
              )}

              {cardError && (
                <div className="text-rose-600 text-xs font-bold text-center">
                  Payment declined.
                </div>
              )}

              <button 
                onClick={pay}
                disabled={processing || hasMixed}
                className="w-full h-14 flex items-center justify-center gap-2 bg-teal-800 text-white rounded-xl text-sm font-black hover:bg-teal-900 transition-all disabled:opacity-50 disabled:active:scale-100 active:scale-[0.98] shadow-sm"
              >
                {processing ? <Loader2 className="w-5 h-5 animate-spin opacity-50" /> : <Lock className="w-4 h-4 opacity-70" />}
                {processing ? 'Processing securely...' : `Pay ${fmt(total)}`}
              </button>
              <div className="text-center">
                <p className="text-[10px] text-slate-400 font-medium px-4">Payments are secured by CityPay infrastructure.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}













