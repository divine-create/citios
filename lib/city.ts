// ============================================================================
// CITY RESOLUTION (server-side)
// ----------------------------------------------------------------------------
// Single source of truth for "which city is the current session browsing".
// Resolution order:
//   1. The `cc_city` cookie (explicit selection, persists across sessions)
//   2. If exactly one city is active, that city (single-city deployments
//      never show a picker)
//   3. First active city (stable fallback — the seed's only city)
//
// The city is NEVER taken from client input: only from the cookie, which is
// written exclusively by the `switchCity` server action after validating the
// slug against the canonical City table.
// ============================================================================

import { cookies } from 'next/headers';
import { db } from '@/src/prisma/db';

export const CITY_COOKIE = 'cc_city';

export interface CityRecord {
  id: string;
  slug: string;
  name: string;
  country: string;
  currency: string;
  timezone: string;
}

export async function getActiveCities(): Promise<CityRecord[]> {
  const cities = await db.orm.public.City.where({ isActive: true }).all();
  return JSON.parse(JSON.stringify(cities)) as CityRecord[];
}

/** Resolve a city by slug, or null when the slug is unknown/inactive. */
export async function getCityBySlug(slug: string): Promise<CityRecord | null> {
  const normalized = (slug || '').trim().toLowerCase();
  if (!normalized) return null;
  const city = await db.orm.public.City.where({ slug: normalized }).all().first();
  if (!city || !city.isActive) return null;
  return JSON.parse(JSON.stringify(city)) as CityRecord;
}

/**
 * The current session's city. Returns null only when no active city exists
 * at all (unseeded database) — callers should degrade gracefully.
 */
export async function getCurrentCity(): Promise<CityRecord | null> {
  const cities = await getActiveCities();
  if (cities.length === 0) return null;

  const cookieStore = await cookies();
  const slug = cookieStore.get(CITY_COOKIE)?.value;
  if (slug) {
    const selected = cities.find((c) => c.slug === slug.toLowerCase());
    if (selected) return selected;
  }

  if (cities.length === 1) return cities[0];
  return cities[0];
}
