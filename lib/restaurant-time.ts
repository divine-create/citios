/**
 * Restaurant-local reporting time utilities.
 * Pure synchronous helpers — no server actions, no database calls.
 * Can be imported freely from server actions, tests, and server components.
 */

import * as TemporalPolyfill from '@js-temporal/polyfill';
const Temporal = TemporalPolyfill.Temporal;

/**
 * Return the start and end of the restaurant-local calendar day for a given
 * IANA timezone string (e.g. "Africa/Lagos"). Defaults to UTC when the
 * timezone is unknown or unsupported.
 *
 * The returned Date objects are UTC timestamps and can be compared directly
 * against UTC-stored Prisma timestamps.
 */
export function getRestaurantDayBounds(timezone: string = 'UTC'): {
  start: Date;
  end: Date;
  timezone: string;
} {
  let tz = timezone;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
  } catch {
    console.warn(`[restaurant-time] Unknown timezone "${tz}", falling back to UTC`);
    tz = 'UTC';
  }

  try {
    const zdt = Temporal.Now.zonedDateTimeISO(tz);
    const startZdt = zdt.startOfDay();
    const endZdt = startZdt.add({ days: 1 }).subtract({ milliseconds: 1 });

    return {
      start: new Date(startZdt.epochMilliseconds),
      end: new Date(endZdt.epochMilliseconds),
      timezone: tz,
    };
  } catch {
    // Ultimate fallback to UTC
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
    return { start, end, timezone: 'UTC' };
  }
}

