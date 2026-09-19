// Compact registry summary: total cities, per-state counts, sample slugs. Read-only.
import { db } from '../src/prisma/db.js';

async function main() {
  const cities = await db.orm.public.City.all();
  console.log(`TOTAL CITIES: ${cities.length}`);

  const byState = new Map<string, number>();
  for (const c of cities) {
    const s = c.state ?? '(none)';
    byState.set(s, (byState.get(s) ?? 0) + 1);
  }
  const sorted = [...byState.entries()].sort((a, b) => b[1] - a[1]);
  for (const [s, n] of sorted) console.log(`  ${s}: ${n}`);

  // Duplicate-name check (same LGA name in different states is expected)
  const byName = new Map<string, string[]>();
  for (const c of cities) {
    byName.set(c.name, [...(byName.get(c.name) ?? []), c.slug]);
  }
  const dupes = [...byName.entries()].filter(([, slugs]) => slugs.length > 1);
  console.log(`DUPLICATE NAMES ACROSS STATES: ${dupes.length}`);
  console.log(`SAMPLES: ${dupes.slice(0, 5).map(([n, slugs]) => `${n} -> ${slugs.join(', ')}`).join(' | ')}`);

  // Active + no-coords count (geolocation coverage)
  const withCoords = cities.filter((c) => c.latitude !== null && c.longitude !== null);
  console.log(`CITIES WITH COORDS: ${withCoords.length} -> ${withCoords.map((c) => c.name).join(', ')}`);

  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });