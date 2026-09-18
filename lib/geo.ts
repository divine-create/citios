// ============================================================================
// BROWSER GEOLOCATION (client-only helpers)
// ----------------------------------------------------------------------------
// The browser supplies a position; the *city* is decided server-side by
// `suggestCityForCoordinates`. Nothing here is ever trusted as a city choice:
// a detected city is only ever used to *offer* a switch the user can decline.
//
// Failure policy: every path returns null rather than throwing. Permission
// denied, unavailable API, timeout, insecure context, or no nearby city all
// mean "no suggestion" — the city picker remains the always-available fallback.
// ============================================================================

import { suggestCityForCoordinates } from '@/app/actions/city';

export interface SuggestedCity {
  slug: string;
  name: string;
  distanceKm: number;
}

/**
 * One-shot position read. Returns null when the browser can't or won't
 * provide a position. If permission was previously denied we don't even ask
 * (a denied prompt is never shown again by browsers anyway).
 */
export async function getBrowserPosition(
  timeoutMs = 8000,
): Promise<{ latitude: number; longitude: number } | null> {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return null;

  try {
    if ('permissions' in navigator) {
      const status = await (navigator as Navigator & {
        permissions: { query: (d: { name: string }) => Promise<{ state: string }> };
      }).permissions.query({ name: 'geolocation' });
      if (status.state === 'denied') return null;
    }
  } catch {
    // Permissions API unsupported or the query threw — fall through and ask.
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: { latitude: number; longitude: number } | null) => {
      if (!settled) {
        settled = true;
        resolve(value);
      }
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => finish({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => finish(null),
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 5 * 60 * 1000 },
    );
  });
}

/** Nearest active city to the device, or null when nothing is close enough. */
export async function detectNearestCity(): Promise<SuggestedCity | null> {
  const position = await getBrowserPosition();
  if (!position) return null;
  return suggestCityForCoordinates(position.latitude, position.longitude);
}

// ----------------------------------------------------------------------------
// "Already suggested" bookkeeping (localStorage, per browser).
// A city is offered at most once: dismissing or accepting it records the slug,
// so we never nag about the same city again. Moving to a *different* city
// produces a different slug and can be offered once more.
// ----------------------------------------------------------------------------

const ASKED_KEY = 'cc_geo_asked_cities';

export function getAskedCities(): string[] {
  try {
    const raw = localStorage.getItem(ASKED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === 'string') : [];
  } catch {
    return [];
  }
}

export function rememberAskedCity(slug: string) {
  try {
    const next = Array.from(new Set([...getAskedCities(), slug]));
    localStorage.setItem(ASKED_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable (private mode / disabled) — degrade to no memory.
  }
}
