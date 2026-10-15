import test from 'node:test';
import assert from 'node:assert';
import { createRequire } from 'module';
import { v4 as uuidv4 } from 'uuid';

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set to run integration tests.");
}
process.env.NEXTAUTH_URL = "https://9jalive.online";
process.env.NEXT_PUBLIC_APEX_DOMAIN = "9jalive.online";

// Mock Next.js headers & cookies
const require = createRequire(import.meta.url);
const nextHeaders = require('next/headers');
let mockHeaders: Map<string, string> = new Map();
let mockCookies: Record<string, string> = {};

nextHeaders.headers = () => mockHeaders;
nextHeaders.cookies = () => ({
  get: (name: string) => mockCookies[name] ? { name, value: mockCookies[name] } : undefined,
  set: (name: string, value: string) => { mockCookies[name] = value; },
  getAll: () => Object.entries(mockCookies).map(([n, v]) => ({ name: n, value: v })),
});

import { db } from '../src/prisma/db';
import { getCurrentCity, getActiveCities, CITY_COOKIE } from './city';
import { switchCity } from '../app/actions/city';

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

  await t.test('1. Subdomain Header (Rung 0) Priority: Calabar Subdomain', async () => {
    // Simulate calabar.9jalive.online
    mockHeaders = new Map([['x-city-slug', 'calabar']]);
    delete mockCookies[CITY_COOKIE];

    const city = await getCurrentCity();
    assert.ok(city, 'City resolved');
    assert.strictEqual(city.slug, 'calabar', 'Subdomain x-city-slug locks city to Calabar');
    assert.strictEqual(city.name, 'Calabar');
  });

  await t.test('2. Subdomain Header (Rung 0) Priority: Lagos Subdomain', async () => {
    // Simulate lagos.9jalive.online
    mockHeaders = new Map([['x-city-slug', 'lagos']]);
    delete mockCookies[CITY_COOKIE];

    const city = await getCurrentCity();
    assert.ok(city, 'City resolved');
    assert.strictEqual(city.slug, 'lagos', 'Subdomain x-city-slug locks city to Lagos');
    assert.strictEqual(city.name, 'Lagos');
  });

  await t.test('3. Subdomain Overrides Cookie', async () => {
    // Cookie says Lagos, but user is visiting calabar.9jalive.online
    mockHeaders = new Map([['x-city-slug', 'calabar']]);
    mockCookies[CITY_COOKIE] = 'lagos';

    const city = await getCurrentCity();
    assert.ok(city, 'City resolved');
    assert.strictEqual(city.slug, 'calabar', 'Subdomain header overrides cookie selection');
  });

  await t.test('4. Apex Portal (No Subdomain Header): Fallback to Cookie', async () => {
    // Simulate apex 9jalive.online where no x-city-slug header is present
    mockHeaders = new Map();
    mockCookies[CITY_COOKIE] = 'calabar';

    const city = await getCurrentCity();
    assert.ok(city, 'City resolved');
    assert.strictEqual(city.slug, 'calabar', 'Apex uses cookie selection');

    // Switch cookie to lagos
    await switchCity('lagos');
    const updatedCity = await getCurrentCity();
    assert.strictEqual(updatedCity?.slug, 'lagos', 'Apex reflects city switch to Lagos');
  });

  await t.test('5. Apex Portal Default Fallback', async () => {
    // No subdomain and no cookie -> falls back to first active city
    mockHeaders = new Map();
    delete mockCookies[CITY_COOKIE];

    const city = await getCurrentCity();
    assert.ok(city, 'City resolved');
    const allCities = await getActiveCities();
    assert.strictEqual(city.id, allCities[0].id, 'Falls back to first active city');
  });
});
