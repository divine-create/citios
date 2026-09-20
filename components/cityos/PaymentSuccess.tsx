'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Package, ArrowRight, ShoppingBag, ShieldCheck } from 'lucide-react';
import { verifyOrderPayment } from '@/app/actions/payment';

export default function PaymentSuccess() {
  const searchParams = useSearchParams();
  const reference = searchParams.get('reference');
  const [verifying, setVerifying] = useState(Boolean(reference));

  useEffect(() => {
    if (reference) {
      verifyOrderPayment(reference).finally(() => {
        setVerifying(false);
      });
    }
  }, [reference]);

  return (
    <div className="max-w-md mx-auto text-center py-16 px-4 space-y-6 animate-in fade-in zoom-in-95 duration-400">
      <div className="w-20 h-20 mx-auto rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-900/5">
        <CheckCircle2 className="w-10 h-10" />
      </div>

      <div>
        <span className="text-[11px] font-black uppercase tracking-widest px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full">
          Payment Confirmed
        </span>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-3">
          Order placed successfully!
        </h1>
        <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
          The merchant has been notified and is getting your order ready.
        </p>
      </div>

      {reference && (
        <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-left max-w-sm mx-auto">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Payment Reference
          </div>
          <div className="text-xs font-mono font-bold text-slate-700 mt-0.5 break-all">
            {reference}
          </div>
        </div>
      )}

      <div className="space-y-2.5 max-w-sm mx-auto pt-2">
        <Link
          href="/orders"
          className="w-full py-3.5 px-4 rounded-2xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-black shadow-md shadow-teal-950/10 flex items-center justify-center gap-2 transition-all"
        >
          <Package className="w-4 h-4" />
          Track Order in My Orders
          <ArrowRight className="w-4 h-4 ml-auto" />
        </Link>

        <Link
          href="/"
          className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
        >
          <ShoppingBag className="w-4 h-4 text-slate-400" />
          Continue Shopping
        </Link>
      </div>

      <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 pt-4">
        <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
        <span>Transaction secured by Paystack & CityConnect Ledger</span>
      </div>
    </div>
  );
}
