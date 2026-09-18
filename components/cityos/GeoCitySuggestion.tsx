'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Navigation, X } from 'lucide-react';
import { useCity } from '@/components/cityos/CityProvider';
import { switchCity } from '@/app/actions/city';
import { detectNearestCity, getAskedCities, rememberAskedCity, type SuggestedCity } from '@/lib/geo';

/**
 * One-time "you seem to be in <city>" suggestion.
 *
 * Rules (deliberate, see the city-resolution design):
 *  - Only when there is a real choice (2+ active cities).
 *  - Never silent: it *offers* a switch; it never performs one.
 *  - At most once per detected city, per browser (localStorage).
 *  - Skipped entirely when the detected city is already being browsed.
 *  - Any failure (denied permission, timeout, no nearby city) yields nothing.
 */
export default function GeoCitySuggestion() {
  const { city, cities } = useCity();
  const router = useRouter();
  const [suggestion, setSuggestion] = useState<SuggestedCity | null>(null);
  const [pending, startTransition] = useTransition();

  const currentSlug = city?.slug;
  const cityCount = cities.length;

  useEffect(() => {
    // No ambiguity to resolve, or no city resolved at all -> stay quiet.
    if (!currentSlug || cityCount <= 1) return;

    let cancelled = false;

    (async () => {
      const found = await detectNearestCity();
      if (cancelled || !found) return;
      if (found.slug === currentSlug) return;            // already browsing it
      if (getAskedCities().includes(found.slug)) return; // asked before — never nag
      setSuggestion(found);
    })();

    return () => {
      cancelled = true;
    };
  }, [currentSlug, cityCount]);

  if (!suggestion) return null;

  const accept = async () => {
    const target = suggestion;
    setSuggestion(null);
    rememberAskedCity(target.slug);
    await switchCity(target.slug);
    startTransition(() => router.refresh());
  };

  const dismiss = () => {
    rememberAskedCity(suggestion.slug);
    setSuggestion(null);
  };

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-[360px] z-[55] animate-in fade-in slide-in-from-bottom-3 duration-300">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl p-4">
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center shrink-0">
            <Navigation className="w-4 h-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-black text-ink">
              Looks like you&apos;re in {suggestion.name}
            </p>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              You&apos;re browsing {city?.name}. Switch to see what&apos;s around {suggestion.name}?
            </p>
            <div className="flex items-center gap-2 mt-3">
              <button
                type="button"
                onClick={accept}
                disabled={pending}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-[11px] font-black transition-colors disabled:opacity-60"
              >
                <MapPin className="w-3.5 h-3.5" />
                Switch to {suggestion.name}
              </button>
              <button
                type="button"
                onClick={dismiss}
                className="px-3 py-2 rounded-xl text-[11px] font-black text-slate-500 hover:text-slate-700 transition-colors"
              >
                Not now
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={dismiss}
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
