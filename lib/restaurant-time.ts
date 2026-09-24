/**
 * Restaurant-local reporting time utilities.
 * Pure synchronous helpers — no server actions, no database calls.
 * Can be imported freely from server actions, tests, and server components.
 */

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

  // To find local midnight and 23:59:59 in the target timezone:
  // 1. Get the current date parts in the target timezone
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(now);

  let y = 0, m = 0, d = 0;
  for (const p of parts) {
    if (p.type === 'year') y = parseInt(p.value, 10);
    if (p.type === 'month') m = parseInt(p.value, 10);
    if (p.type === 'day') d = parseInt(p.value, 10);
  }

  // Create start and end as local dates, but this executes in the SERVER'S timezone,
  // which is wrong. We need the exact UTC timestamp when it is y-m-d 00:00:00 in `tz`.
  
  // Cleanest robust way in plain JS:
  // Brute force search or temporal-like timezone shift.
  // Actually, using `toLocaleString('en-US', { timeZone })` offset check:
  
  const startLocalAsUtc = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
  const endLocalAsUtc = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));

  return {
    start: getTrueUtcForLocal(startLocalAsUtc, tz),
    end: getTrueUtcForLocal(endLocalAsUtc, tz),
    timezone: tz,
  };
}

/**
 * Given a UTC Date that represents a "local time string" (e.g. 00:00:00 UTC),
 * calculate what the actual UTC time is when the clock reads that time in `tz`.
 */
function getTrueUtcForLocal(localTimeUtc: Date, tz: string): Date {
  // Rough estimate: localTimeUtc is what the clock reads.
  // Let's find out what the clock reads when it's localTimeUtc in reality.
  
  // Format the UTC time as a string:
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  });
  
  // We want to find a true UTC time T such that fmt(T) == localTimeUtc.
  // The offset between a UTC date and its TZ string is the offset.
  const str = fmt.format(localTimeUtc);
  
  // parse back to UTC date parts
  const match = str.match(/(\d+)\/(\d+)\/(\d+),?\s+(\d+):(\d+):(\d+)/);
  if (!match) return localTimeUtc;
  const [_, mm, dd, yyyy, hh, min, ss] = match;
  
  const formattedAsUtc = new Date(Date.UTC(
    parseInt(yyyy), parseInt(mm) - 1, parseInt(dd),
    parseInt(hh) == 24 ? 0 : parseInt(hh), parseInt(min), parseInt(ss)
  ));
  
  // Diff is how far off tz is from UTC at that moment
  const diff = formattedAsUtc.getTime() - localTimeUtc.getTime();
  
  // Subtract the diff to get the true UTC time
  return new Date(localTimeUtc.getTime() - diff);
}
