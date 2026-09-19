// Seeds every Nigerian Local Government Area as an active City, sourced from
// lib/data/nigeria.ts (774 LGAs across 36 states + FCT).
//
// Slug scheme: state-qualified (`surulere-lagos`, `surulere-oyo`) because LGA
// names repeat across states. Coordinates are left null — the geolocation
// suggestion only fires for cities with real coordinates (enrich later from a
// public LGA-coordinates dataset).
//
// Idempotent: safe to run repeatedly.
import { db } from '../src/prisma/db.js';
import { NIGERIAN_STATES } from '../lib/data/nigeria.js';

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function seedLgas() {
  const states = Object.entries(NIGERIAN_STATES as Record<string, string[]>);
  console.log(`Seeding LGAs for ${states.length} state(s)...`);

  let created = 0;
  let existing = 0;

  for (const [state, lgas] of states) {
    const stateSlug = slugify(state);
    for (const lga of lgas) {
      const slug = `${slugify(lga)}-${stateSlug}`;
      const exists = await db.orm.public.City.where({ slug }).all().first();
      if (exists) {
        existing++;
        continue;
      }
      await db.orm.public.City.create({
        name: lga,
        slug,
        state,
        country: 'Nigeria',
        timezone: 'Africa/Lagos',
        currency: 'NGN',
        isActive: true,
      });
      created++;
    }
    console.log(`${state}: done (${lgas.length} LGAs)`);
  }

  // Backfill the state column on legacy cities (created before the state
  // column existed): Calabar -> Cross River, Lagos -> Lagos.
  const legacy = (await db.orm.public.City.all()).filter((c) => !c.state);
  for (const c of legacy) {
    const stateMatch = states.find(([s]) => s === c.name)?.[0]
      ?? (c.slug === 'calabar' ? 'Cross River' : null)
      ?? (c.slug === 'lagos' ? 'Lagos' : null);
    if (stateMatch) {
      await db.orm.public.City.where({ id: c.id }).update({ state: stateMatch });
      console.log(`state set: ${c.name} -> ${stateMatch}`);
    }
  }

  const total = await db.orm.public.City.all();
  console.log(`LGA seeding complete: ${created} created, ${existing} already present, ${total.length} cities total.`);
  process.exit(0);
}

seedLgas().catch((e) => { console.error(e); process.exit(1); });