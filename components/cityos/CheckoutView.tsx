'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Wallet, CreditCard, Landmark, ShieldCheck, Loader2, AlertCircle, ArrowLeft, PhoneCall, MessageSquare, MapPin } from 'lucide-react';
import { useMoney } from '@/components/cityos/CityProvider';
import { useCart } from '@/components/cityos/CartStore';
import { getResidentWallet } from '@/app/actions/resident_wallet';
import { processMerchantCheckout, getResidentCheckoutDefaults } from '@/app/actions/checkout';
import { getCheckoutConfig, PlatformCheckoutConfig } from '@/lib/actions/checkout-settings';
import { PriceTag } from '@/components/cityos/CityUI';
import { cn } from '@/lib/utils';

type MethodId = 'wallet' | 'whatsapp' | 'card' | 'transfer';

export default function CheckoutView() {
  const { fmt } = useMoney();
  const router = useRouter();
  const { lines, subtotal, deliveryFee, removeOrg, syncCart } = useCart();
  
  const [method, setMethod] = useState<MethodId>('whatsapp');
  const [substitutionRule, setSubstitutionRule] = useState<'call' | 'replace' | 'refund'>('call');
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [processing, setProcessing] = useState<string | null>(null); // orgId being processed
  const [errorMsg, setErrorMsg] = useState('');
  const [checkoutConfig, setCheckoutConfig] = useState<PlatformCheckoutConfig | null>(null);
  
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

    getResidentCheckoutDefaults().then((def) => {
      if (def) {
        if (def.phone) setCustomerPhone(def.phone);
        if (def.deliveryAddress) setDeliveryAddress(def.deliveryAddress);
      }
    }).catch(() => {});

    getCheckoutConfig().then((cfg) => {
      if (cfg) {
        setCheckoutConfig(cfg);
        const isCurrentEnabled =
          (method === 'whatsapp' && cfg.enableWhatsApp) ||
          (method === 'wallet' && cfg.enableWallet) ||
          (method === 'card' && cfg.enableCard) ||
          (method === 'transfer' && cfg.enableTransfer);

        if (!isCurrentEnabled) {
          if (cfg.defaultMethod && (
            (cfg.defaultMethod === 'whatsapp' && cfg.enableWhatsApp) ||
            (cfg.defaultMethod === 'wallet' && cfg.enableWallet) ||
            (cfg.defaultMethod === 'card' && cfg.enableCard) ||
            (cfg.defaultMethod === 'transfer' && cfg.enableTransfer)
          )) {
            setMethod(cfg.defaultMethod);
          } else if (cfg.enableWhatsApp) {
            setMethod('whatsapp');
          } else if (cfg.enableWallet) {
            setMethod('wallet');
          } else if (cfg.enableCard) {
            setMethod('card');
          } else if (cfg.enableTransfer) {
            setMethod('transfer');
          }
        }
      }
    }).catch(() => {});
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
      const res = await processMerchantCheckout(orgId, method, idempotencyKey, undefined, {
        customerPhone,
        deliveryAddress,
        deliveryNotes,
        substitutionPreference: substitutionRule,
      });
      
      if (!res.success) {
        throw new Error(res.errors?.[0] || res.message || 'Payment failed.');
      }

      if (method === 'whatsapp' && res.whatsappUrl) {
        removeOrg(orgId);
        await syncCart();
        window.open(res.whatsappUrl, '_blank');
        if (res.orderId) {
          router.push(`/orders/${res.orderId}`);
        } else {
          router.push('/orders');
        }
        return;
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

      {/* Delivery Destination & Contact Info */}
      <div className="bg-white rounded-[24px] border border-slate-100 overflow-hidden p-6 space-y-4 shadow-xs">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-emerald-600" />
          <h2 className="text-sm font-black text-ink">Delivery Destination & Phone</h2>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-black uppercase text-slate-400 block mb-1">
              Delivery Address / Landmark (Calabar)
            </label>
            <input
              type="text"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="e.g. 14 Marian Road, Near Total Fuel Station, Calabar"
              className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-700 transition-colors"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-black uppercase text-slate-400 block mb-1">
                Contact Phone (WhatsApp)
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="e.g. 0803 123 4567"
                className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-700 transition-colors"
              />
            </div>
            <div>
              <label className="text-[11px] font-black uppercase text-slate-400 block mb-1">
                Delivery Instructions (Optional)
              </label>
              <input
                type="text"
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                placeholder="e.g. Yellow gate, call on arrival"
                className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-700 transition-colors"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Glovo Out-of-stock Substitution Preferences */}
      <div className="bg-white rounded-[24px] border border-slate-100 overflow-hidden p-6 space-y-4">
        <div className="flex items-center gap-2">
          <PhoneCall className="w-4 h-4 text-[#FF385C]" />
          <h2 className="text-sm font-black text-ink">If an item is out of stock</h2>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          How should the merchant or courier handle items that are out of stock?
        </p>

        <div className="space-y-2.5">
          {[
            { id: 'call', label: '📞 Call me to choose a replacement', desc: 'The rider or merchant will call your phone' },
            { id: 'replace', label: '🔄 Pick the closest replacement', desc: 'Merchant will choose the most similar brand or weight' },
            { id: 'refund', label: '❌ Do not replace (refund item)', desc: 'Automatically credit your CityOS wallet balance' },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setSubstitutionRule(opt.id as any)}
              className={cn(
                'w-full flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all',
                substitutionRule === opt.id
                  ? 'border-[#222222] bg-neutral-50/80 shadow-xs'
                  : 'border-slate-100 hover:border-slate-200'
              )}
            >
              <div
                className={cn(
                  'w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0',
                  substitutionRule === opt.id ? 'border-[#FF385C]' : 'border-slate-300'
                )}
              >
                {substitutionRule === opt.id && <div className="w-2 h-2 rounded-full bg-[#FF385C]" />}
              </div>
              <div>
                <p className="text-[13px] font-bold text-[#222222]">{opt.label}</p>
                <p className="text-[11px] text-slate-500">{opt.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-[24px] border border-slate-100 overflow-hidden p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-ink">Payment Method</h2>
          {checkoutConfig?.allowPayOnDelivery && (
            <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
              Pay on Delivery Available
            </span>
          )}
        </div>

        {(checkoutConfig === null || checkoutConfig.enableWhatsApp) && (
          <button 
            onClick={() => setMethod('whatsapp')}
            className={cn("w-full flex items-center justify-between p-4 rounded-xl border text-left transition-all", 
              method === 'whatsapp' ? "border-emerald-600 bg-emerald-50/80 shadow-[0_0_0_1px_#059669]" : "border-slate-100 hover:border-slate-200"
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", method === 'whatsapp' ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-600")}>
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-black text-ink">WhatsApp Direct Order</p>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded-full">POPULAR</span>
                </div>
                <p className="text-[11px] font-bold text-slate-500">Send order directly to merchant on WhatsApp for instant confirmation</p>
              </div>
            </div>
            <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center", method === 'whatsapp' ? "border-emerald-600" : "border-slate-200")}>
              {method === 'whatsapp' && <div className="w-2.5 h-2.5 bg-emerald-600 rounded-full" />}
            </div>
          </button>
        )}
        
        {(checkoutConfig === null || checkoutConfig.enableWallet) && (
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
        )}

        {(checkoutConfig === null || checkoutConfig.enableCard) && (
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
        )}

        {(checkoutConfig === null || checkoutConfig.enableTransfer) && (
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
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-black text-ink">Merchant Obligations</h2>
        <p className="text-xs text-slate-500 leading-relaxed mb-4">
          Your cart contains items from multiple merchants. You must checkout with each merchant separately.
        </p>

        {Object.entries(groupedLines).map(([orgId, group]) => {
          const isBelowMin = !!(checkoutConfig?.minOrderAmount && group.total > 0 && group.total < checkoutConfig.minOrderAmount);
          return (
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

              {isBelowMin && (
                <div className="px-4 py-2 bg-amber-50 border-t border-amber-100 flex items-center gap-2 text-xs font-bold text-amber-800">
                  <span>⚠️ Minimum order for checkout is {fmt(checkoutConfig!.minOrderAmount)}. Add {fmt(checkoutConfig!.minOrderAmount - group.total)} more.</span>
                </div>
              )}

              <div className="p-4 border-t border-slate-50 bg-slate-50/30">
                <button
                  onClick={() => handleCheckoutOrg(orgId, group.total)}
                  disabled={processing !== null || isBelowMin}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white text-sm font-black transition-all disabled:opacity-50",
                    method === 'whatsapp'
                      ? "bg-[#25D366] hover:bg-[#20ba59] text-white shadow-md shadow-emerald-600/20 active:scale-[0.99]"
                      : "bg-ink hover:bg-slate-800"
                  )}
                >
                  {processing === orgId ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                  ) : isBelowMin ? (
                    <>Min Order: {fmt(checkoutConfig!.minOrderAmount)}</>
                  ) : method === 'whatsapp' ? (
                    <><MessageSquare className="w-4 h-4" /> Order from {group.orgName} via WhatsApp</>
                  ) : (
                    <><ShieldCheck className="w-4 h-4" /> {group.total > 0 ? `Checkout ${group.orgName}` : `Request Service from ${group.orgName}`}</>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
