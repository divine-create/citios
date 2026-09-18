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
