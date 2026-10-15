'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Wallet, CreditCard, Landmark, ShieldCheck, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { useMoney } from '@/components/cityos/CityProvider';
import { useCart } from '@/components/cityos/CartStore';
import { getResidentWallet } from '@/app/actions/resident_wallet';
import { processMerchantCheckout } from '@/app/actions/checkout';
import { PriceTag } from '@/components/cityos/CityUI';
import { cn } from '@/lib/utils';

type MethodId = 'wallet' | 'card' | 'transfer';

export default function CheckoutView() {
  const { fmt } = useMoney();
  const router = useRouter();
  const { lines, subtotal, deliveryFee, removeOrg, syncCart } = useCart();
  
  const [method, setMethod] = useState<MethodId>('wallet');
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [processing, setProcessing] = useState<string | null>(null); // orgId being processed
  const [errorMsg, setErrorMsg] = useState('');
  
  useEffect(() => {
    async function fetchWallet() {
      try {
        const wallet = await getResidentWallet();
        if (wallet && wallet.id) {
          setWalletBalance(wallet.balance);
        } else {
          setWalletBalance(0);
        }
      } catch (e) {
        setWalletBalance(0);
      }
    }
    fetchWallet();
  }, []);

  if (lines.length === 0) {
    return (
      <div className="max-w-md mx-auto py-20 text-center animate-in fade-in duration-500">
        <h1 className="text-2xl font-black text-ink mb-2">Nothing to check out</h1>
        <p className="text-sm text-slate-500 mb-6">Your bag is empty.</p>
        <Link href="/explore" className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-teal-800 text-white text-sm font-bold hover:bg-teal-900 transition-colors shadow-sm shadow-teal-900/20">
          Explore CityOS
        </Link>
      </div>
    );
  }

  // Group by merchant
  const groupedLines = lines.reduce((acc, l) => {
    if (!acc[l.orgId]) {
      acc[l.orgId] = { orgName: l.orgName, items: [], total: 0 };
    }
    acc[l.orgId].items.push(l);
    if (l.kind !== 'service') {
      acc[l.orgId].total += l.price * l.qty;
    }
    return acc;
  }, {} as Record<string, { orgName: string; items: any[]; total: number }>);

  const handleCheckoutOrg = async (orgId: string, orgTotal: number) => {
    if (processing) return;
    setErrorMsg('');
    
    if (method === 'wallet' && walletBalance !== null && walletBalance < orgTotal) {
      setErrorMsg('Insufficient wallet balance for this merchant. Please fund your wallet or select another payment method.');
      return;
    }

    setProcessing(orgId);
    
    try {
      const idempotencyKey = `checkout_${orgId}_${Date.now()}`;
      const res = await processMerchantCheckout(orgId, method, idempotencyKey);
      
      if (!res.success) {
        throw new Error(res.errors?.[0] || res.message || 'Payment failed.');
      }

      if (res.requiresPaymentAction && res.authorizationUrl) {
        removeOrg(orgId);
        window.location.href = res.authorizationUrl; // Redirect to Monnify/Paystack
      } else {
        removeOrg(orgId);
        await syncCart();
        if (res.orderId) {
          router.push(`/orders/${res.orderId}`);
        } else {
          router.push(`/pay/success?ref=${res.reference || 'internal'}`);
        }
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'An unexpected error occurred during checkout.');
      setProcessing(null);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20">
      <div>
        <Link href="/cart" className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-ink transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Cart
        </Link>
        <h1 className="text-2xl font-black text-ink">Checkout</h1>
      </div>

      {errorMsg && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-start gap-3 border border-red-100">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm font-bold">{errorMsg}</p>
        </div>
      )}

      <div className="bg-white rounded-[24px] border border-slate-100 overflow-hidden p-6 space-y-4">
        <h2 className="text-sm font-black text-ink">Payment Method</h2>
        
        <button 
          onClick={() => setMethod('wallet')}
          className={cn("w-full flex items-center justify-between p-4 rounded-xl border text-left transition-all", 
            method === 'wallet' ? "border-teal-800 bg-teal-50 shadow-[0_0_0_1px_#115e59]" : "border-slate-100 hover:border-slate-200"
          )}
        >
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", method === 'wallet' ? "bg-teal-800 text-white" : "bg-slate-50 text-slate-400")}>
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-black text-ink">CityOS Wallet</p>
              <p className="text-[11px] font-bold text-slate-500">
                {walletBalance !== null ? `Balance: ${fmt(walletBalance)}` : 'Loading...'}
              </p>
            </div>
          </div>
          <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center", method === 'wallet' ? "border-teal-800" : "border-slate-200")}>
            {method === 'wallet' && <div className="w-2.5 h-2.5 bg-teal-800 rounded-full" />}
          </div>
        </button>

        <button 
          onClick={() => setMethod('card')}
          className={cn("w-full flex items-center justify-between p-4 rounded-xl border text-left transition-all", 
            method === 'card' ? "border-teal-800 bg-teal-50 shadow-[0_0_0_1px_#115e59]" : "border-slate-100 hover:border-slate-200"
          )}
        >
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", method === 'card' ? "bg-teal-800 text-white" : "bg-slate-50 text-slate-400")}>
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-black text-ink">Credit / Debit Card</p>
              <p className="text-[11px] font-bold text-slate-500">Secure gateway</p>
            </div>
          </div>
          <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center", method === 'card' ? "border-teal-800" : "border-slate-200")}>
            {method === 'card' && <div className="w-2.5 h-2.5 bg-teal-800 rounded-full" />}
          </div>
        </button>

        <button 
          onClick={() => setMethod('transfer')}
          className={cn("w-full flex items-center justify-between p-4 rounded-xl border text-left transition-all", 
            method === 'transfer' ? "border-teal-800 bg-teal-50 shadow-[0_0_0_1px_#115e59]" : "border-slate-100 hover:border-slate-200"
          )}
        >
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", method === 'transfer' ? "bg-teal-800 text-white" : "bg-slate-50 text-slate-400")}>
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-black text-ink">Bank Transfer</p>
              <p className="text-[11px] font-bold text-slate-500">Pay via bank account</p>
            </div>
          </div>
          <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center", method === 'transfer' ? "border-teal-800" : "border-slate-200")}>
            {method === 'transfer' && <div className="w-2.5 h-2.5 bg-teal-800 rounded-full" />}
          </div>
        </button>
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-black text-ink">Merchant Obligations</h2>
        <p className="text-xs text-slate-500 leading-relaxed mb-4">
          Your cart contains items from multiple merchants. You must checkout with each merchant separately.
        </p>

        {Object.entries(groupedLines).map(([orgId, group]) => (
          <div key={orgId} className="bg-white rounded-[24px] border border-slate-100 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
              <h3 className="text-sm font-black text-ink uppercase tracking-wide">{group.orgName}</h3>
              {group.total > 0 ? (
                <PriceTag amount={group.total} />
              ) : (
                <span className="text-[11px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md">Quote on Request</span>
              )}
            </div>
            
            <div className="p-4 space-y-3">
              {group.items.map((l: any, i: number) => (
                <div key={i} className="flex justify-between items-start">
                  <div>
                    <p className="text-[13px] font-bold text-ink">{l.qty}x {l.name}</p>
                    {l.kind === 'service' && <p className="text-[10px] text-teal-700 font-bold bg-teal-50 px-1.5 py-0.5 rounded uppercase w-max mt-1">Service Request</p>}
                  </div>
                  {l.kind !== 'service' && <p className="text-[12px] font-black text-slate-600">{fmt(l.price * l.qty)}</p>}
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-slate-50 bg-slate-50/30">
              <button
                onClick={() => handleCheckoutOrg(orgId, group.total)}
                disabled={processing !== null}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-ink text-white text-sm font-black hover:bg-slate-800 disabled:opacity-50 transition-colors"
              >
                {processing === orgId ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                ) : (
                  <><ShieldCheck className="w-4 h-4" /> {group.total > 0 ? `Checkout ${group.orgName}` : `Request Service from ${group.orgName}`}</>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
