'use client';

import React, { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CreditCard, CheckCircle2, XCircle, ShieldCheck, Loader2 } from 'lucide-react';
import { verifyOrderPayment } from '@/app/actions/payment';

export default function SandboxPaymentView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reference = searchParams.get('reference') || 'UNKNOWN-REF';
  const amountKobo = parseInt(searchParams.get('amount') || '0', 10);
  const email = searchParams.get('email') || '';

  const [loading, setLoading] = useState(false);
  const [simError, setSimError] = useState<string | null>(null);

  const amountNaira = (amountKobo / 100).toLocaleString();

  const handleSimulateSuccess = async () => {
    setLoading(true);
    setSimError(null);
    try {
      await verifyOrderPayment(reference);
      router.push(`/pay/success?reference=${encodeURIComponent(reference)}`);
    } catch (e) {
      console.error(e);
      setSimError('Simulation failed. Please try again.');
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/cart');
  };

  return (
    <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
      {/* Paystack Branded Top Banner */}
      <div className="bg-[#001428] text-white p-6 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#00C3F7] flex items-center justify-center font-black text-slate-900 text-sm">
              P
            </div>
            <span className="font-bold tracking-tight text-lg text-white">paystack</span>
          </div>
          <span className="text-[10px] uppercase font-black tracking-widest px-2.5 py-1 rounded-full bg-amber-400 text-slate-900">
            TEST MODE
          </span>
        </div>
        <div className="mt-6">
          <div className="text-xs text-slate-400 font-medium">Paying</div>
          <div className="text-3xl font-black text-white tracking-tight mt-0.5">
            ₦{amountNaira}
          </div>
          <div className="text-xs text-slate-300 mt-1 truncate">{email}</div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Payment Reference</div>
          <div className="text-xs font-mono font-bold text-slate-700 break-all">{reference}</div>
        </div>

        <div className="space-y-3">
          {simError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-xs font-bold text-red-600">
              {simError}
            </div>
          )}
          <button
            onClick={handleSimulateSuccess}
            disabled={loading}
            className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm rounded-2xl shadow-md shadow-emerald-900/10 hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Simulate Successful Payment
              </>
            )}
          </button>

          <button
            onClick={handleCancel}
            disabled={loading}
            className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-2xl transition-colors flex items-center justify-center gap-2"
          >
            <XCircle className="w-4 h-4 text-slate-400" />
            Cancel Transaction
          </button>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
          <span>Secured by CityConnect Paystack Gateway</span>
        </div>
      </div>
    </div>
  );
}
