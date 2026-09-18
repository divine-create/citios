'use client';

import { MapPin } from 'lucide-react';
import { useCity } from '@/components/cityos/CityProvider';
import { cn } from '@/lib/utils';

/**
 * "This business is in <X> — you're browsing <Y>." Renders nothing when the
 * entity's city matches the city being browsed (or when either is unknown),
 * so it can be dropped into any detail surface unconditionally.
 */
export default function CityMismatchChip({
  citySlug,
  label = 'This business is in',
  className,
}: {
  citySlug?: string | null;
  label?: string;
  className?: string;
}) {
  const { city, cities } = useCity();

  if (!citySlug || !city || citySlug === city.slug) return null;

  const entityCity = cities.find((c) => c.slug === citySlug);
  if (!entityCity) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-xl bg-amber-50 ring-1 ring-amber-100 px-2.5 py-1.5 text-[10px] font-black text-amber-700',
        className,
      )}
    >
      <MapPin className="w-3 h-3" />
      {label} {entityCity.name} — you&apos;re browsing {city.name}
    </span>
  );
}
