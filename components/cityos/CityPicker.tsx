'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, ChevronDown, Loader2, MapPin, Navigation, Search } from 'lucide-react';
import { useCity } from '@/components/cityos/CityProvider';
import { switchCity } from '@/app/actions/city';
import { detectNearestCity } from '@/lib/geo';
import { cn } from '@/lib/utils';

/**
 * City switcher — a two-level cascading selection:
 *   step 1: pick your STATE (searchable, shows LGA counts)
 *   step 2: pick your LOCAL GOVERNMENT within that state (searchable)
 *
 * The registry can hold hundreds of LGAs, so each level is filtered as you
 * type. With a single active city it renders as a plain, non-interactive chip
 * so users are never asked to "select" anything.
 */
export default function CityPicker({ className }: { className?: string }) {
  const { city, cities } = useCity();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [detecting, setDetecting] = useState(false);
  const [geoNote, setGeoNote] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [step, setStep] = useState<'state' | 'lga'>('state');
  const [selectedState, setSelectedState] = useState<string | null>(null);

  // Single (or zero) active cities: nothing to choose — render read-only.
  if (!city || cities.length <= 1) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 text-slate-400 font-bold uppercase tracking-widest',
          className,
        )}
      >
        <MapPin className="w-3 h-3" />
        {city?.name ?? 'CityOS'}
      </span>
    );
  }

  // States derived from the registry itself; cities without a state (should
  // not happen post-backfill) are defensively grouped under "Other".
  const states = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of cities) {
      const s = c.state ?? 'Other';
      counts.set(s, (counts.get(s) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [cities]);

  const stateLgas = useMemo(() => {
    if (!selectedState) return [];
    return cities.filter((c) => (c.state ?? 'Other') === selectedState);
  }, [cities, selectedState]);

  const filteredStates = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return states;
    return states.filter(([s]) => s.toLowerCase().includes(q));
  }, [states, query]);

  const filteredLgas = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stateLgas;
    return stateLgas.filter((c) => c.name.toLowerCase().includes(q) || c.slug.includes(q));
  }, [stateLgas, query]);

  async function pick(slug: string) {
    setOpen(false);
    setQuery('');
    await switchCity(slug);
    // Re-render the whole server tree so the new city flows through
    // CityProvider into every consuming component.
    startTransition(() => router.refresh());
  }

  function openPicker() {
    setOpen(true);
    setGeoNote(null);
    setQuery('');
    // Start at the state level every time the picker opens.
    setStep('state');
    setSelectedState(city?.state ?? null);
  }

  function chooseState(s: string) {
    setSelectedState(s);
    setStep('lga');
    setQuery('');
  }

  /**
   * Explicit, user-initiated detection. Unlike the passive banner this always
   * runs when asked (the user is actively requesting it) and reports failure
   * instead of staying silent.
   */
  async function useMyLocation() {
    setDetecting(true);
    setGeoNote(null);
    const found = await detectNearestCity();
    setDetecting(false);

    if (!found) {
      setGeoNote('No supported city near you — pick one below.');
      return;
    }

    if (found.slug === city?.slug) {
      setGeoNote(`You're already browsing ${found.name}.`);
      return;
    }

    await pick(found.slug);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setGeoNote(null); }}
        disabled={pending}
        className={cn(
          'inline-flex items-center gap-1 font-bold uppercase tracking-widest text-slate-500 hover:text-slate-700 transition-colors',
          pending && 'opacity-60',
          className,
        )}
      >
        <MapPin className="w-3 h-3" />
        {city.name}
        <ChevronDown className="w-3 h-3" />
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-2 z-50 w-64 bg-white rounded-2xl border border-slate-100 shadow-2xl p-1.5">
            {/* Step 2 header: chosen state + back to states */}
            {step === 'lga' && selectedState ? (
              <button
                type="button"
                onClick={() => { setStep('state'); setQuery(''); }}
                className="w-full flex items-center gap-2 px-2 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
              >
                <ArrowLeft className="w-3 h-3" />
                {selectedState}
              </button>
            ) : (
              <p className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Select your state
              </p>
            )}

            {/* Search — each level is filtered as you type. */}
            <div className="px-1.5 pb-1.5">
              <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-2.5 py-2">
                <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={step === 'state' ? 'Search state…' : 'Search local government…'}
                  className="w-full bg-transparent text-[12px] font-bold text-ink placeholder:text-slate-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto">
              {step === 'state' ? (
                filteredStates.length === 0 ? (
                  <p className="px-3 py-6 text-center text-[12px] font-bold text-slate-400">
                    No state matches &ldquo;{query}&rdquo;.
                  </p>
                ) : (
                  filteredStates.map(([s, n]) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => chooseState(s)}
                      className={cn(
                        'w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-[13px] font-bold transition-colors',
                        s === selectedState
                          ? 'bg-teal-50 text-teal-900'
                          : 'text-slate-600 hover:bg-slate-50',
                      )}
                    >
                      <span className="min-w-0 text-left truncate">{s}</span>
                      <span className="text-[10px] font-bold text-slate-400 shrink-0">{n} LGA{n === 1 ? '' : 's'}</span>
                    </button>
                  ))
                )
              ) : (
                filteredLgas.length === 0 ? (
                  <p className="px-3 py-6 text-center text-[12px] font-bold text-slate-400">
                    No local government matches &ldquo;{query}&rdquo;.
                  </p>
                ) : (
                  filteredLgas.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => pick(c.slug)}
                      className={cn(
                        'w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-[13px] font-bold transition-colors',
                        c.slug === city.slug
                          ? 'bg-teal-50 text-teal-900'
                          : 'text-slate-600 hover:bg-slate-50',
                      )}
                    >
                      <span className="min-w-0 text-left truncate">{c.name}</span>
                      {c.slug === city.slug ? <Check className="w-4 h-4 text-teal-700 shrink-0" /> : null}
                    </button>
                  ))
                )
              )}
            </div>

            <div className="border-t border-slate-100 mt-1.5 pt-1.5">
              <button
                type="button"
                onClick={useMyLocation}
                disabled={detecting}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors disabled:opacity-60"
              >
                {detecting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-700" />
                ) : (
                  <Navigation className="w-3.5 h-3.5 text-teal-700" />
                )}
                {detecting ? 'Detecting…' : 'Use my location'}
              </button>
              {geoNote ? (
                <p className="px-3 pb-1 text-[10px] font-bold text-slate-400">{geoNote}</p>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
