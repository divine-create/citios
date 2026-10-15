import test from 'node:test';
import assert from 'node:assert';
import { db } from '../src/prisma/db';
import {
  getCurrentCity,
  getActiveCities,
  setCitySubdomainForTesting,
  setCityCookieForTesting,
} from './city';

test('City Subdomain & Hyperlocal Routing Suite', async (t) => {
  // Ensure both Calabar and Lagos exist
  let calabar = await db.orm.public.City.where({ slug: 'calabar' }).all().first();
  if (!calabar) {
    calabar = await db.orm.public.City.create({
      name: 'Calabar',
      slug: 'calabar',
      country: 'Nigeria',
      timezone: 'Africa/Lagos',
      currency: 'NGN',
      isActive: true,
    });
  }

  let lagos = await db.orm.public.City.where({ slug: 'lagos' }).all().first();
  if (!lagos) {
    lagos = await db.orm.public.City.create({
      name: 'Lagos',
      slug: 'lagos',
      country: 'Nigeria',
      timezone: 'Africa/Lagos',
      currency: 'NGN',
      isActive: true,
    });
  }

  await t.test('1. Subdomain (Rung 0) Priority: Calabar Subdomain', async () => {
    // Simulate calabar.9jalive.online
    setCitySubdomainForTesting('calabar');
    setCityCookieForTesting(null);

    const city = await getCurrentCity();
    assert.ok(city, 'City resolved');
    assert.strictEqual(city.slug, 'calabar', 'Subdomain locks city to Calabar');
    assert.strictEqual(city.name, 'Calabar');
  });

  await t.test('2. Subdomain (Rung 0) Priority: Lagos Subdomain', async () => {
    // Simulate lagos.9jalive.online
    setCitySubdomainForTesting('lagos');
    setCityCookieForTesting(null);

    const city = await getCurrentCity();
    assert.ok(city, 'City resolved');
    assert.strictEqual(city.slug, 'lagos', 'Subdomain locks city to Lagos');
    assert.strictEqual(city.name, 'Lagos');
  });

  await t.test('3. Subdomain Overrides Cookie', async () => {
    // Cookie says Lagos, but user is visiting calabar.9jalive.online
    setCitySubdomainForTesting('calabar');
    setCityCookieForTesting('lagos');

    const city = await getCurrentCity();
    assert.ok(city, 'City resolved');
    assert.strictEqual(city.slug, 'calabar', 'Subdomain header overrides cookie selection');
  });

  await t.test('4. Apex Portal (No Subdomain): Fallback to Cookie', async () => {
    // Simulate apex 9jalive.online where no subdomain is present
    setCitySubdomainForTesting(null);
    setCityCookieForTesting('calabar');

    const city = await getCurrentCity();
    assert.ok(city, 'City resolved');
    assert.strictEqual(city.slug, 'calabar', 'Apex uses cookie selection');

    // Switch cookie to lagos
    setCityCookieForTesting('lagos');
    const updatedCity = await getCurrentCity();
    assert.strictEqual(updatedCity?.slug, 'lagos', 'Apex reflects city switch to Lagos');
  });

  await t.test('5. Apex Portal Default Fallback', async () => {
    // No subdomain and no cookie -> falls back to first active city
    setCitySubdomainForTesting(null);
    setCityCookieForTesting(null);

    const city = await getCurrentCity();
    assert.ok(city, 'City resolved');
    const allCities = await getActiveCities();
    assert.strictEqual(city.id, allCities[0].id, 'Falls back to first active city');
  });
});
