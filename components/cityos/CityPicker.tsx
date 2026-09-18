'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronDown, MapPin } from 'lucide-react';
import { useCity } from '@/components/cityos/CityProvider';
import { switchCity } from '@/app/actions/city';
import { cn } from '@/lib/utils';

/**
 * City switcher chip. Shows the active city; opens a picker when more than
 * one city is available. With a single active city it renders as a plain,
 * non-interactive chip so users are never asked to "select" anything.
 */
export default function CityPicker({ className }: { className?: string }) {
  const { city, cities } = useCity();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

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

  async function pick(slug: string) {
    setOpen(false);
    await switchCity(slug);
    // Re-render the whole server tree so the new city flows through
    // CityProvider into every consuming component.
    startTransition(() => router.refresh());
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
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
          <div className="absolute left-0 top-full mt-2 z-50 w-56 bg-white rounded-2xl border border-slate-100 shadow-2xl p-1.5">
            <p className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Choose your city
            </p>
            {cities.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => pick(c.slug)}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-bold transition-colors',
                  c.slug === city.slug
                    ? 'bg-teal-50 text-teal-900'
                    : 'text-slate-600 hover:bg-slate-50',
                )}
              >
                <span>{c.name}</span>
                {c.slug === city.slug ? <Check className="w-4 h-4 text-teal-700" /> : null}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
