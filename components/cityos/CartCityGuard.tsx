'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ShoppingCart, UtensilsCrossed, X } from 'lucide-react';
import { useCart } from '@/components/cityos/CartStore';
import { useCity } from '@/components/cityos/CityProvider';
import { switchCity } from '@/app/actions/city';

/**
 * City & Store Trust Guard.
 *
 * 1. Resolves cross-city additions (city isolation).
 * 2. Resolves cross-store food additions (Glovo single-merchant on-demand isolation).
 * 3. Alerts if a saved cart was built in another city.
 */
export default function CartCityGuard() {
  const {
    lines,
    count,
    isForeignCart,
    cartCitySlug,
    pendingCityLine,
    confirmPendingCity,
    cancelPendingCity,
    pendingStoreLine,
    confirmPendingStore,
    cancelPendingStore,
    clear,
  } = useCart();
  const { city, cities } = useCity();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dismissedNotice, setDismissedNotice] = useState(false);

  useEffect(() => {
    setDismissedNotice(false);
  }, [city?.slug, cartCitySlug, lines.length]);

  const cityNameFor = (slug: string | null | undefined) =>
    cities.find((c) => c.slug === slug)?.name ?? slug ?? '';

  // 1. Cross-city add is waiting on a decision.
  if (pendingCityLine) {
    const target = cityNameFor(pendingCityLine.citySlug);
    const current = cityNameFor(cartCitySlug);
    return (
      <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={cancelPendingCity} />
        <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-start gap-3">
            <span className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <ShoppingCart className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-black text-slate-900">This item is from {target}</p>
              <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                Your basket has {count} item{count === 1 ? '' : 's'} from {current}. A delivery order can only be
                checked out in one city — start a {target} basket, or keep your {current} basket?
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2.5 mt-5">
            <button
              type="button"
              onClick={confirmPendingCity}
              className="flex-1 h-11 rounded-2xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-black transition-colors"
            >
              Start {target} basket
            </button>
            <button
              type="button"
              onClick={cancelPendingCity}
              className="flex-1 h-11 rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors"
            >
              Keep {current} basket
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Glovo Single-Store Food/Express Isolation Guard
  if (pendingStoreLine) {
    const newStoreName = pendingStoreLine.orgName || 'New Kitchen';
    const currentStoreName = lines[0]?.orgName || 'Current Store';
    return (
      <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={cancelPendingStore} />
        <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-start gap-3">
            <span className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
              <UtensilsCrossed className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-black text-slate-900">Start a new basket?</p>
              <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                You already have items from <strong className="text-slate-800">{currentStoreName}</strong> in your basket. On-demand delivery requires a single kitchen per trip.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2.5 mt-5">
            <button
              type="button"
              onClick={confirmPendingStore}
              className="flex-1 h-11 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-black transition-all shadow-md shadow-orange-600/20 active:scale-95"
            >
              Start {newStoreName} basket
            </button>
            <button
              type="button"
              onClick={cancelPendingStore}
              className="flex-1 h-11 rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all"
            >
              Keep {currentStoreName}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. The bag belongs to another city than the one being browsed.
  if (!isForeignCart || lines.length === 0 || dismissedNotice) return null;

  const bagCityName = cityNameFor(cartCitySlug);

  const goToBagCity = async () => {
    if (!cartCitySlug) return;
    await switchCity(cartCitySlug);
    startTransition(() => router.refresh());
  };

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-[380px] z-[54] animate-in fade-in slide-in-from-bottom-3 duration-300">
      <div className="bg-white rounded-2xl border border-amber-100 shadow-2xl p-4">
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <ShoppingCart className="w-4 h-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-black text-ink">
              Your basket is from {bagCityName}
            </p>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              {count} item{count === 1 ? '' : 's'} waiting. You&apos;re browsing {city?.name}.
            </p>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <button
                type="button"
                onClick={goToBagCity}
                disabled={pending}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-[11px] font-black transition-colors disabled:opacity-60"
              >
                Go to {bagCityName} basket
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={clear}
                className="px-3 py-2 rounded-xl text-[11px] font-black text-slate-500 hover:text-rose-500 transition-colors"
              >
                Clear basket
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDismissedNotice(true)}
            aria-label="Dismiss"
            className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
