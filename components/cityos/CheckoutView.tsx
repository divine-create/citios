'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Wallet, CreditCard, Landmark, ShieldCheck, Loader2, AlertCircle, ArrowLeft, PhoneCall, MessageSquare, MapPin, Minus, Plus, Trash2, Truck } from 'lucide-react';
import { CalabarAddressPicker } from '@/components/cityos/CalabarAddressPicker';
import { getCheckoutDeliveryEstimate, CheckoutDeliveryEstimate } from '@/lib/actions/checkout-delivery';
import { StabilizedAddress } from '@/lib/mapping/address-stabilizer';
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
  const { lines, subtotal, deliveryFee, setQty, remove, removeOrg, syncCart } = useCart();
  
  const [method, setMethod] = useState<MethodId>('whatsapp');
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [stabilizedAddress, setStabilizedAddress] = useState<StabilizedAddress | null>(null);
  const [deliveryEstimate, setDeliveryEstimate] = useState<CheckoutDeliveryEstimate | null>(null);
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

  // Recalculate dynamic CityDrive delivery estimate whenever address or lines change
  useEffect(() => {
    const firstOrgId = lines[0]?.orgId;
    if (!firstOrgId || !stabilizedAddress?.latitude) return;

    getCheckoutDeliveryEstimate({
      merchantOrgId: firstOrgId,
      dropoffAddressText: stabilizedAddress.formattedAddress,
      dropoffLat: stabilizedAddress.latitude,
      dropoffLng: stabilizedAddress.longitude,
      landmarkId: stabilizedAddress.landmarkId,
      zoneId: stabilizedAddress.zoneId,
    })
      .then((est) => setDeliveryEstimate(est))
      .catch((err) => console.warn('Delivery quote error:', err));
  }, [lines, stabilizedAddress]);

  if (lines.length === 0) {
    return (
      <div className="max-w-md mx-auto py-20 text-center animate-in fade-in duration-500">
        <h1 className="text-2xl font-black text-ink mb-2">Nothing to check out</h1>
        <p className="text-sm text-slate-500 mb-6">Your bag is empty.</p>
        <Link href="/explore" className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-teal-800 text-white text-sm font-bold hover:bg-teal-900 transition-colors shadow-sm shadow-teal-900/20">
          Explore 9jaLive
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

    if (!customerPhone || !customerPhone.trim()) {
      setErrorMsg('Please enter your WhatsApp contact phone number before placing your order so the store can reach you.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setProcessing(orgId);
    
    try {
      const idempotencyKey = `checkout_${orgId}_${Date.now()}`;
      const orgGroup = groupedLines[orgId];
      const effectiveDeliveryFee = deliveryEstimate?.success && typeof deliveryEstimate.deliveryFee === 'number'
        ? deliveryEstimate.deliveryFee
        : 0;
      const effectiveDistanceKm = deliveryEstimate?.success && typeof deliveryEstimate.distanceKm === 'number'
        ? deliveryEstimate.distanceKm
        : undefined;

      const res = await processMerchantCheckout(orgId, 'whatsapp', idempotencyKey, undefined, {
        customerPhone: customerPhone.trim(),
        deliveryAddress: stabilizedAddress?.formattedAddress || deliveryAddress,
        deliveryNotes,
        deliveryFee: effectiveDeliveryFee,
        deliveryDistanceKm: effectiveDistanceKm,
        clientItems: (orgGroup?.items || []).map((i: any) => ({
          productId: i.productId,
          qty: i.qty,
          name: i.name,
          kind: i.kind,
        })),
      });
      
      if (!res.success) {
        throw new Error(res.errors?.[0] || res.message || 'Order preparation failed.');
      }

      if (res.whatsappUrl) {
        removeOrg(orgId);
        await syncCart();
        window.open(res.whatsappUrl, '_blank');
        if (res.orderId) {
          router.push(`/orders/${res.orderId}`);
        } else {
          router.push(`/org/${orgId}`);
        }
        return;
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'An unexpected error occurred during checkout.');
      setProcessing(null);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-in fade-in duration-500 pb-36 sm:pb-24">
      <div>
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-ink transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Continue Shopping
        </button>
        <h1 className="text-2xl font-black text-ink">Checkout</h1>
      </div>

      {errorMsg && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-start gap-3 border border-red-100">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm font-bold">{errorMsg}</p>
        </div>
      )}

      {/* Customer Contact & Order Notes */}
      <div className="bg-white rounded-[24px] border border-slate-100 overflow-hidden p-6 space-y-4 shadow-xs">
        <div className="flex items-center gap-2">
          <PhoneCall className="w-4 h-4 text-emerald-600" />
          <h2 className="text-sm font-black text-ink">Customer Contact & Order Notes</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-black uppercase text-slate-500 block mb-1 flex items-center justify-between">
              <span>Contact Phone (WhatsApp)</span>
              <span className="text-[10px] text-emerald-600 font-bold lowercase">required</span>
            </label>
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="e.g. 0803 123 4567"
              className={cn(
                "w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border focus:outline-none transition-colors",
                !customerPhone.trim() && errorMsg
                  ? "border-rose-400 bg-rose-50/30 focus:border-rose-600"
                  : "border-slate-200 focus:border-teal-700"
              )}
            />
          </div>
          <div>
            <label className="text-[11px] font-black uppercase text-slate-400 block mb-1">
              Order Notes (Optional)
            </label>
            <input
              type="text"
              value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.target.value)}
              placeholder="e.g. Preferred pickup time or special request"
              className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-700 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Delivery Address & CityDrive Logistics */}
      <div className="bg-white rounded-[24px] border border-slate-100 overflow-hidden p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-teal-800" />
            <h2 className="text-sm font-black text-ink">Delivery Address & Landmark</h2>
          </div>
          {deliveryEstimate && deliveryEstimate.success && (
            <span className="text-[11px] font-black text-teal-800 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200 flex items-center gap-1">
              <Truck className="w-3 h-3 text-teal-800" />
              ~{deliveryEstimate.durationMinutes} mins · {fmt(deliveryEstimate.deliveryFee)}
            </span>
          )}
        </div>

        <CalabarAddressPicker
          initialAddress={deliveryAddress}
          onChange={(stabilized) => {
            setDeliveryAddress(stabilized.formattedAddress);
            setStabilizedAddress(stabilized);
          }}
          showMapPreview={false}
        />
      </div>

      <div className="bg-white rounded-[24px] border border-slate-100 overflow-hidden p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-ink">Checkout Channel</h2>
        </div>

        <div 
          className="w-full flex items-center justify-between p-4 rounded-xl border border-emerald-600 bg-emerald-50/80 shadow-[0_0_0_1px_#059669] text-left transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-emerald-600 text-white shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-black text-ink">WhatsApp Direct Order</p>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded-full">ACTIVE</span>
              </div>
              <p className="text-[11px] font-bold text-slate-500">
                Order will be routed to WhatsApp (+2348065373747) for instant confirmation & dispatch
              </p>
            </div>
          </div>
          <div className="w-5 h-5 rounded-full border-2 border-emerald-600 flex items-center justify-center shrink-0">
            <div className="w-2.5 h-2.5 bg-emerald-600 rounded-full" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-black text-ink">Order Summary</h2>
        {Object.keys(groupedLines).length > 1 && (
          <p className="text-xs text-slate-500 leading-relaxed mb-4">
            Your order contains items from multiple merchants. Complete checkout with each merchant below.
          </p>
        )}

        {Object.entries(groupedLines).map(([orgId, group]) => {
          const isBelowMin = !!(checkoutConfig?.minOrderAmount && group.total > 0 && group.total < checkoutConfig.minOrderAmount);
          const deliveryFee = deliveryEstimate?.success ? deliveryEstimate.deliveryFee : 0;
          const grandTotal = group.total + deliveryFee;

          return (
            <div key={orgId} className="bg-white rounded-[24px] border border-slate-100 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-ink uppercase tracking-wide">{group.orgName}</h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {group.items.reduce((sum: number, it: any) => sum + (it.qty || 1), 0)} items
                  </p>
                </div>
                {group.total > 0 ? (
                  <div className="text-right">
                    <PriceTag amount={grandTotal} />
                    {deliveryFee > 0 && (
                      <span className="block text-[10px] text-teal-800 font-bold">
                        incl. {fmt(deliveryFee)} delivery
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-[11px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md">Quote on Request</span>
                )}
              </div>
              
              <div className="p-4 divide-y divide-slate-100">
                {group.items.map((l: any, i: number) => (
                  <div key={l.productId || i} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-bold text-ink line-clamp-1">{l.name}</p>
                      {l.kind === 'service' ? (
                        <p className="text-[10px] text-teal-700 font-bold bg-teal-50 px-1.5 py-0.5 rounded uppercase w-max mt-1">Service Request</p>
                      ) : (
                        <p className="text-[11px] font-bold text-slate-500">{fmt(l.price)} each</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center bg-slate-50 rounded-xl p-0.5 border border-slate-200/80">
                        <button
                          type="button"
                          onClick={() => setQty(l.productId, l.qty - 1)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white text-slate-600 transition-colors"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-7 text-center text-xs font-black text-slate-900">{l.qty}</span>
                        <button
                          type="button"
                          onClick={() => setQty(l.productId, l.qty + 1)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white text-slate-600 transition-colors"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      {l.kind !== 'service' && (
                        <p className="text-[12px] font-black text-slate-900 min-w-[72px] text-right">{fmt(l.price * l.qty)}</p>
                      )}
                      <button
                        type="button"
                        onClick={() => remove(l.productId)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Financial Summary Breakdown */}
                <div className="pt-3 pb-2 space-y-2 -mx-4 px-4 bg-slate-50/70 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
                    <span>Items Subtotal</span>
                    <span className="font-bold text-slate-900">{fmt(group.total)}</span>
                  </div>

                  {deliveryEstimate && deliveryEstimate.success ? (
                    <div className="flex items-center justify-between text-xs text-teal-900 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-teal-800" />
                        <span>CityDrive Delivery ({deliveryEstimate.distanceKm} km · ~{deliveryEstimate.durationMinutes} mins)</span>
                      </div>
                      <span className="font-bold text-teal-800">+{fmt(deliveryEstimate.deliveryFee)}</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5" />
                        <span>CityDrive Delivery</span>
                      </div>
                      <span className="text-[11px] italic">Pick landmark above</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-200/90 flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wider">Grand Total</span>
                    <div className="text-right">
                      <span className="text-base font-black text-ink">{fmt(grandTotal)}</span>
                    </div>
                  </div>
                </div>
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
                    <><Loader2 className="w-4 h-4 animate-spin" /> Processing Order...</>
                  ) : isBelowMin ? (
                    <>Min Order: {fmt(checkoutConfig!.minOrderAmount)}</>
                  ) : method === 'whatsapp' ? (
                    <>
                      <MessageSquare className="w-4 h-4" />
                      Order via WhatsApp • {fmt(grandTotal)}
                    </>
                  ) : (
                    <><ShieldCheck className="w-4 h-4" /> {grandTotal > 0 ? `Checkout • ${fmt(grandTotal)}` : `Request Service from ${group.orgName}`}</>
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
