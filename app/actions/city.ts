'use server';

import { cookies } from 'next/headers';
import { CITY_COOKIE, getActiveCities, getCityBySlug, getCurrentCity } from '@/lib/city';

/** City context for the client: the active city plus every selectable city. */
export async function getCityContext() {
  const [city, cities] = await Promise.all([getCurrentCity(), getActiveCities()]);
  return { city, cities };
}

/**
 * Switch the session's city. The slug is validated against the canonical
 * City table before the cookie is written — client values are never trusted.
 * The client calls router.refresh() afterwards so the server tree re-renders
 * with the new city.
 */
export async function switchCity(slug: string) {
  const city = await getCityBySlug(slug);
  if (!city) {
    return { ok: false as const, error: 'Unknown or inactive city.' };
  }

  const cookieStore = await cookies();
  cookieStore.set(CITY_COOKIE, city.slug, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });

  return { ok: true as const, city: { slug: city.slug, name: city.name } };
}

// Haversine great-circle distance in km. Not exported: every export in a
// 'use server' module must be an async server action.
function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Beyond this radius we make no suggestion at all — a position in the middle
// of nowhere must not silently drag someone into a far-away city's catalog.
const MAX_SUGGESTION_RADIUS_KM = 150;

/**
 * Nearest active city to a set of coordinates, or null when nothing is close
 * enough. The browser supplies the position; the *city* is always decided
 * server-side from the canonical City table.
 */
export async function suggestCityForCoordinates(latitude: number, longitude: number) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;

  const cities = (await getActiveCities()).filter(
    (c) => c.latitude !== null && c.longitude !== null,
  );
  if (cities.length === 0) return null;

  let best: { city: (typeof cities)[number]; distanceKm: number } | null = null;
  for (const city of cities) {
    const d = distanceKm(latitude, longitude, city.latitude as number, city.longitude as number);
    if (!best || d < best.distanceKm) best = { city, distanceKm: d };
  }

  if (!best || best.distanceKm > MAX_SUGGESTION_RADIUS_KM) return null;

  return {
    slug: best.city.slug,
    name: best.city.name,
    distanceKm: Math.round(best.distanceKm),
  };
}

