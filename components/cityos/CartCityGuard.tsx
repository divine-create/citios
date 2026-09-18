'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ShoppingCart, X } from 'lucide-react';
import { useCart } from '@/components/cityos/CartStore';
import { useCity } from '@/components/cityos/CityProvider';
import { switchCity } from '@/app/actions/city';

/**
 * City/cart trust layer.
 *
 * Two jobs, both about never letting a bag silently straddle two cities:
 *  1. Resolve a withheld cross-city add (the store you're in belongs to another
 *     city than the bag you already have).
 *  2. Warn, ambiently, that the bag you carry was built elsewhere, and offer a
 *     one-tap jump back to that city.
 *
 * Nothing here is automatic: every resolution is a user choice.
 */
export default function CartCityGuard() {
  const { lines, count, isForeignCart, cartCitySlug, pendingCityLine, confirmPendingCity, cancelPendingCity, clear } = useCart();
  const { city, cities } = useCity();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Dismissing the notice hides it for the current situation only — it must
  // never touch the bag itself (dismissal is not a decision about the bag).
  const [dismissedNotice, setDismissedNotice] = useState(false);

  useEffect(() => {
    setDismissedNotice(false);
  }, [city?.slug, cartCitySlug, lines.length]);

  const cityNameFor = (slug: string | null | undefined) =>
    cities.find((c) => c.slug === slug)?.name ?? slug ?? '';

  // 1. A cross-city add is waiting on a decision.
  if (pendingCityLine) {
    const target = cityNameFor(pendingCityLine.citySlug);
    const current = cityNameFor(cartCitySlug);
    return (
      <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={cancelPendingCity} />
        <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-5 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-start gap-3">
            <span className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <ShoppingCart className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-black text-ink">This item is from {target}</p>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-relaxed">
                Your bag has {count} item{count === 1 ? '' : 's'} from {current}. A bag can only be
                checked out in one city — start a {target} bag, or keep your {current} bag?
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            <button
              type="button"
              onClick={confirmPendingCity}
              className="flex-1 h-11 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-[11px] font-black transition-colors"
            >
              Start a {target} bag
            </button>
            <button
              type="button"
              onClick={cancelPendingCity}
              className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-[11px] font-black transition-colors"
            >
              Keep my {current} bag
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. The bag belongs to another city than the one being browsed.
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
              Your bag is from {bagCityName}
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
                Go to {bagCityName} bag
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={clear}
                className="px-3 py-2 rounded-xl text-[11px] font-black text-slate-500 hover:text-rose-500 transition-colors"
              >
                Clear bag
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
