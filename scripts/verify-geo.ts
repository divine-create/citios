// Verifies the nearest-city logic behind the geolocation suggestion, using
// the real City coordinates from the DB and the same haversine formula +
// 150 km radius used by `suggestCityForCoordinates`. Read-only.
import { db } from '../src/prisma/db.js';

const MAX_SUGGESTION_RADIUS_KM = 150;

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

// Sample device positions: city centres, a mid-distance city, and far away.
const SAMPLES: { label: string; latitude: number; longitude: number }[] = [
  { label: 'Calabar city centre', latitude: 4.9757, longitude: 8.3417 },
  { label: 'Lagos city centre', latitude: 6.5244, longitude: 3.3792 },
  { label: 'Lagos suburb (Ikeja)', latitude: 6.6018, longitude: 3.3515 },
  { label: 'Enugu (~200km from Calabar)', latitude: 6.4402, longitude: 7.494 },
  { label: 'Abuja (far from both)', latitude: 9.0765, longitude: 7.3986 },
  { label: 'London (far from both)', latitude: 51.5072, longitude: -0.1276 },
];

async function verifyGeo() {
  const cities = (await db.orm.public.City.where({ isActive: true }).all()).filter(
    (c) => c.latitude !== null && c.longitude !== null,
  );

  console.log(`CITIES WITH COORDS: ${cities.map((c) => c.name).join(', ')}\n`);

  for (const s of SAMPLES) {
    let best: { name: string; distanceKm: number } | null = null;
    for (const c of cities) {
      const d = distanceKm(s.latitude, s.longitude, c.latitude as number, c.longitude as number);
      if (!best || d < best.distanceKm) best = { name: c.name, distanceKm: d };
    }
    const suggestion =
      best && best.distanceKm <= MAX_SUGGESTION_RADIUS_KM
        ? `SUGGEST ${best.name} (${Math.round(best.distanceKm)}km)`
        : `NO SUGGESTION (nearest ${best?.name} at ${Math.round(best?.distanceKm ?? 0)}km)`;
    console.log(`${s.label.padEnd(34)} -> ${suggestion}`);
  }

  console.log('\nGEO VERIFY DONE');
  process.exit(0);
}

verifyGeo().catch((e) => { console.error(e); process.exit(1); });