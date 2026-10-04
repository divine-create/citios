'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Wallet, CreditCard, Landmark, ShieldCheck, Loader2, ArrowLeft, Truck, MapPin, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useMoney } from '@/components/cityos/CityProvider';
import { useCart } from '@/components/cityos/CartStore';
import { cn } from '@/lib/utils';
import { initiateCheckout } from '@/app/actions/payment';

const METHODS = [
  { id: 'card', label: 'Debit or Credit Card', sub: 'Visa, Mastercard, Verve', icon: CreditCard },
  { id: 'transfer', label: 'Bank Transfer / USSD', sub: 'Pay directly from your bank', icon: Landmark },
] as const;

type MethodId = 'card' | 'transfer';

export default function CheckoutView() {
  const { fmt } = useMoney();
  const router = useRouter();
  const { lines, subtotal, deliveryFee, clear } = useCart();
  
  const [method, setMethod] = useState<MethodId>('card');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Multi-step UI state
  const [step, setStep] = useState<1 | 2>(1);

  // Split the shared cart by line kind
  const retailLines = lines.filter((l) => l.kind === 'retail');
  const foodLines = lines.filter((l) => l.kind === 'food');
  const foodOnly = foodLines.length > 0 && retailLines.length === 0;
  const hasMixed = retailLines.length > 0 && foodLines.length > 0;
  const activeLines = foodOnly ? foodLines : retailLines;
  const checkoutKind = foodOnly ? 'food' : 'retail';

  if (lines.length === 0 && !processing) {
    return (
      <div className="max-w-md mx-auto text-center py-20 px-4">
        <div className="w-20 h-20 mx-auto rounded-full bg-slate-50 flex items-center justify-center mb-6 shadow-sm border border-slate-100">
          <Wallet className="w-8 h-8 text-slate-400" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 mb-2">Nothing to pay for</h1>
        <p className="text-slate-500 mb-8">Add a few items from the market first, then check out.</p>
        <Link href="/market" className="px-6 py-3 rounded-2xl bg-ink text-white font-black hover:bg-slate-800 transition-colors shadow-md">
          Go to Market
        </Link>
      </div>
    );
  }

  // Preview total
  const previewTotal = subtotal + deliveryFee;

  const handleNextStep = () => {
    if (step === 1 && deliveryAddress.trim().length > 5) {
      setStep(2);
      setErrorMsg('');
    } else if (step === 1) {
      setErrorMsg('Please enter a complete delivery address.');
    }
  };

  const pay = async () => {
    if (processing || hasMixed) return;

    setProcessing(true);
    setErrorMsg('');

    try {
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
        setErrorMsg(res.error);
        setProcessing(false);
        return;
      }

      if (res.success && res.redirectUrl) {
        clear();
        if (res.redirectUrl.startsWith('http') && !res.redirectUrl.includes(window.location.host)) {
          // External payment gateway redirect
          window.location.href = res.redirectUrl;
        } else {
          router.push(res.redirectUrl);
        }
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to process payment: ' + (err as Error).message);
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* Header */}
      <div>
        <Link href="/cart" className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-ink transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Cart
        </Link>
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Checkout</h1>
      </div>

      {hasMixed && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex gap-3 items-start shadow-sm">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <p className="font-bold mb-1">Mixed Cart Detected</p>
            <p>This cart contains both retail products and restaurant food. They are fulfilled by different systems. We will process your <strong>{checkoutKind}</strong> items first.</p>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex gap-3 items-start shadow-sm animate-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-sm text-rose-900 font-medium">{errorMsg}</div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* MAIN CHECKOUT FLOW */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* STEP 1: DELIVERY */}
          <div className={cn(
            "bg-white rounded-3xl border shadow-sm overflow-hidden transition-all duration-300",
            step === 1 ? "border-slate-300 shadow-md ring-1 ring-slate-100" : "border-slate-100 opacity-60"
          )}>
            <div className="p-6 flex items-center justify-between cursor-pointer" onClick={() => step > 1 && setStep(1)}>
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                  step === 1 ? "bg-ink text-white" : "bg-emerald-100 text-emerald-700"
                )}>
                  {step > 1 ? <CheckCircle2 className="w-5 h-5" /> : "1"}
                </div>
                <h2 className="text-lg font-black text-slate-900">Delivery Details</h2>
              </div>
              {step > 1 && <span className="text-sm font-bold text-ink hover:underline">Edit</span>}
            </div>
            
            {step === 1 && (
              <div className="p-6 pt-0 border-t border-slate-100/50 mt-2">
                <label className="block text-sm font-bold text-slate-700 mb-2">Delivery Address</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-4 text-slate-400 w-5 h-5" />
                  <textarea
                    rows={3}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink transition-all resize-none font-medium"
                    placeholder="Enter your full street address, apartment, and any delivery instructions..."
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                  />
                </div>
                <div className="mt-6 flex justify-end">
                  <button 
                    onClick={handleNextStep}
                    className="px-8 py-3 bg-ink text-white font-black rounded-xl hover:bg-slate-800 transition-colors shadow-md"
                  >
                    Continue to Payment
                  </button>
                </div>
              </div>
            )}
            
            {step > 1 && (
              <div className="px-6 pb-6 pt-0 ml-12 text-sm text-slate-600 font-medium">
                {deliveryAddress}
              </div>
            )}
          </div>

          {/* STEP 2: PAYMENT */}
          <div className={cn(
            "bg-white rounded-3xl border shadow-sm overflow-hidden transition-all duration-300",
            step === 2 ? "border-slate-300 shadow-md ring-1 ring-slate-100" : "border-slate-100 opacity-60"
          )}>
            <div className="p-6 flex items-center gap-4">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                step === 2 ? "bg-ink text-white" : "bg-slate-100 text-slate-400"
              )}>
                2
              </div>
              <h2 className="text-lg font-black text-slate-900">Payment Method</h2>
            </div>
            
            {step === 2 && (
              <div className="p-6 pt-0 border-t border-slate-100/50 mt-2 space-y-3">
                {METHODS.map((m) => {
                  const Icon = m.icon;
                  const isActive = method === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setMethod(m.id)}
                      className={cn(
                        "w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all",
                        isActive 
                          ? "border-ink bg-slate-50 shadow-sm" 
                          : "border-slate-100 hover:border-slate-200 bg-white hover:bg-slate-50"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                        isActive ? "bg-ink text-white" : "bg-slate-100 text-slate-500"
                      )}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-grow">
                        <div className="font-bold text-slate-900">{m.label}</div>
                        <div className="text-xs font-medium text-slate-500">{m.sub}</div>
                      </div>
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
                        isActive ? "border-ink" : "border-slate-200"
                      )}>
                        {isActive && <div className="w-2.5 h-2.5 rounded-full bg-ink" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* ORDER SUMMARY SIDEBAR */}
        <div className="lg:col-span-5">
          <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200/60 sticky top-6">
            <h2 className="text-lg font-black text-slate-900 mb-6">Order Summary</h2>
            
            {/* ITEMS MINI-LIST */}
            <div className="space-y-4 mb-6 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {activeLines.map((l) => (
                <div key={l.productId} className="flex justify-between items-start gap-4 text-sm">
                  <div className="flex gap-3 min-w-0">
                    <div className="w-6 h-6 rounded bg-slate-200 flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-slate-600">
                      {l.qty}x
                    </div>
                    <span className="font-medium text-slate-700 truncate">{l.name}</span>
                  </div>
                  <span className="font-bold text-slate-900 shrink-0">{fmt(l.price * l.qty)}</span>
                </div>
              ))}
            </div>

            {/* TOTALS */}
            <div className="space-y-3 py-4 border-t border-b border-slate-200/80 mb-6 text-sm font-medium text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="text-slate-900">{fmt(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Estimate</span>
                <span className="text-slate-900">{deliveryFee > 0 ? fmt(deliveryFee) : 'Calculated automatically'}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-500 pt-1">
                <span className="flex items-center gap-1"><Truck className="w-3.5 h-3.5" /> Fulfillment</span>
                <span>Powered by LogisticsOS</span>
              </div>
            </div>

            <div className="flex justify-between items-end mb-8">
              <span className="font-bold text-slate-900">Total to Pay</span>
              <span className="text-2xl font-black text-ink">{fmt(previewTotal)}</span>
            </div>

            {/* PAY BUTTON */}
            <button
              onClick={pay}
              disabled={step !== 2 || processing || hasMixed}
              className={cn(
                "flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-black transition-all outline-none",
                step !== 2 || hasMixed
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                  : "bg-ink text-white shadow-lg shadow-ink/20 hover:bg-slate-800 hover:shadow-xl hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
              )}
            >
              {processing ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Authorizing...</>
              ) : (
                <><ShieldCheck className="w-5 h-5" /> Pay {fmt(previewTotal)} Securely</>
              )}
            </button>
            
            <div className="mt-4 flex items-center justify-center gap-2 text-xs font-semibold text-slate-400">
              <ShieldCheck className="w-4 h-4" /> End-to-end encrypted
            </div>
            <div className="mt-2 text-[10px] text-center text-slate-400 font-medium leading-relaxed px-4">
              By clicking pay, you agree that the server will authoritatively recalculate the final price and inventory availability before creating the order.
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
