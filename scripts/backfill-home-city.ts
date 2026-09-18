// Phase 2 backfill:
//  1. Set geographic centers on the seeded cities (used by the future
//     geolocation suggestion to pick the nearest city).
//  2. Give every Person a homeCityId so the resolution ladder has a fallback
//     when no city cookie exists. Default is the first active city (Calabar);
//     the Lagos org's owner is homed in Lagos.
// Idempotent: only fills values that are currently null.
import { db } from '../src/prisma/db.js';

const COORDS: Record<string, { latitude: number; longitude: number }> = {
  calabar: { latitude: 4.9757, longitude: 8.3417 },
  lagos: { latitude: 6.5244, longitude: 3.3792 },
};

async function backfill() {
  // 1. Coordinates
  for (const [slug, coords] of Object.entries(COORDS)) {
    const city = await db.orm.public.City.where({ slug }).all().first();
    if (!city) {
      console.log(`skip coords: no city '${slug}'`);
      continue;
    }
    if (city.latitude === null || city.longitude === null) {
      await db.orm.public.City.where({ id: city.id }).update(coords);
      console.log(`coords set: ${city.name} (${coords.latitude}, ${coords.longitude})`);
    }
  }

  const calabar = await db.orm.public.City.where({ slug: 'calabar' }).all().first();
  const lagos = await db.orm.public.City.where({ slug: 'lagos' }).all().first();

  // 2. Home city — default everyone to Calabar
  if (calabar) {
    const persons = await db.orm.public.Person.all();
    let updated = 0;
    for (const p of persons) {
      if (!p.homeCityId) {
        await db.orm.public.Person.where({ id: p.id }).update({ homeCityId: calabar.id });
        updated++;
      }
    }
    console.log(`homeCityId backfilled to Calabar: ${updated} person(s)`);
  }

  // 3. Lagos org owner is homed in Lagos
  if (lagos) {
    const ident = await db.orm.public.PersonIdentifier
      .where({ type: 'EMAIL', normalizedValue: 'admin@ekomart.local' })
      .all()
      .first();
    if (ident) {
      const person = await db.orm.public.Person.where({ id: ident.personId }).all().first();
      if (person && person.homeCityId !== lagos.id) {
        await db.orm.public.Person.where({ id: person.id }).update({ homeCityId: lagos.id });
        console.log('homeCityId set: admin@ekomart.local -> Lagos');
      }
    }
  }

  console.log('Backfill complete.');
  process.exit(0);
}

backfill().catch((e) => { console.error(e); process.exit(1); });