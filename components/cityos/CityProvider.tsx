'use client';

import { createContext, useContext } from 'react';

// Server-resolved city info, injected once per request by the (resident)
// server layout and shared with every client component through context.
// Client components never decide the city themselves — they consume it.
export interface CityInfo {
  id: string;
  slug: string;
  name: string;
  country: string;
  currency: string;
  timezone: string;
}

interface CityContextValue {
  city: CityInfo | null;
  cities: CityInfo[];
}

const CityContext = createContext<CityContextValue>({ city: null, cities: [] });

export function CityProvider({
  city,
  cities,
  children,
}: {
  city: CityInfo | null;
  cities: CityInfo[];
  children: React.ReactNode;
}) {
  return <CityContext.Provider value={{ city, cities }}>{children}</CityContext.Provider>;
}

/** Current browsing city (or null on an unseeded database) + selectable cities. */
export function useCity() {
  return useContext(CityContext);
}

/** Convenience: city display name with a neutral fallback. */
export function useCityName(fallback = 'CityOS') {
  return useContext(CityContext).city?.name ?? fallback;
}
