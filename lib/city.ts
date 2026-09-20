// ============================================================================
// CITY RESOLUTION (server-side)
// ----------------------------------------------------------------------------
// Single source of truth for "which city is the current session browsing".
// Resolution order:
//   1. The `cc_city` cookie (explicit selection, persists across sessions)
//   2. The signed-in Person's homeCityId (zero-prompt default for residents)
//   3. The first active city (single-city deployments never show a picker)
//
// The city is NEVER taken from client input: the cookie is written only by the
// `switchCity` server action after validating the slug against the canonical
// City table, and the home city is read straight from the Person row.
// ============================================================================

import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth';
import { db } from '@/src/prisma/db';
import { authOptions } from '@/lib/auth';

export const CITY_COOKIE = 'cc_city';

export interface CityRecord {
  id: string;
  slug: string;
  name: string;
  country: string;
  /** State/region (e.g. a Nigerian LGA's state) — null for legacy records. */
  state: string | null;
  currency: string;
  timezone: string;
  // Geographic center — consumed by the nearest-city geolocation suggestion.
  latitude: number | null;
  longitude: number | null;
  /** ISO timestamp — used to order the registry (oldest first). */
  createdAt: string;
}

export async function getActiveCities(): Promise<CityRecord[]> {
  const cities = await db.orm.public.City.where({ isActive: true }).all();
  const parsed = JSON.parse(JSON.stringify(cities)) as CityRecord[];
  // Oldest first: the first city ever created (the seed's home city) is the
  // stable fallback at the bottom of the resolution ladder, even with
  // hundreds of cities in the registry.
  parsed.sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0));
  return parsed;
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
 * The signed-in person's home city, if they have one and it's an active city.
 * Returns null for anonymous sessions (falls through the ladder).
 */
async function getHomeCity(cities: CityRecord[]): Promise<CityRecord | null> {
  try {
    const session = await getServerSession(authOptions);
    const personId = session?.user?.personId;
    if (!personId) return null;

    const person = await db.orm.public.Person.where({ id: personId }).all().first();
    if (!person?.homeCityId) return null;

    return cities.find((c) => c.id === person.homeCityId) ?? null;
  } catch {
    // Any session/DB hiccup must never break rendering — skip this rung.
    return null;
  }
}

/**
 * The current session's city. Returns null only when no active city exists
 * at all (unseeded database) — callers should degrade gracefully.
 */
export async function getCurrentCity(): Promise<CityRecord | null> {
  const cities = await getActiveCities();
  if (cities.length === 0) return null;

  // 1. Explicit selection (cookie)
  const cookieStore = await cookies();
  const slug = cookieStore.get(CITY_COOKIE)?.value;
  if (slug) {
    const selected = cities.find((c) => c.slug === slug.toLowerCase());
    if (selected) return selected;
  }

  // 2. Resident's home city
  const homeCity = await getHomeCity(cities);
  if (homeCity) return homeCity;

  // 3. Single active city, else the first active city as a stable fallback.
  return cities[0];
}
