/**
 * CityOS Core Geography Context
 *
 * This utility standardizes how we resolve the target city context across CityOS,
 * strictly separating Home, Physical, Discovery, and Transaction contexts.
 */

import { db } from '@/src/prisma/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export type CityResolutionContext = {
  // The user's declared home city from their profile
  homeCityId?: string;
  // Where the user is physically located right now (derived from headers/IP)
  physicalCityId?: string;
  // The city they are explicitly browsing (e.g. from the URL /lagos/hotels)
  discoveryCityId?: string;
  // The operational city where a transaction/fulfillment occurs
  transactionCityId?: string;
};

/**
 * Resolves the primary active city for discovery/display purposes.
 * Priority: Discovery (URL) > Physical (IP/Headers) > Home (Profile)
 */
export async function resolveActiveCity(
  explicitCityId?: string,
  headersProvider?: { get(key: string): string | null }
): Promise<string | null> {
  // 1. Explicit Discovery Context (Highest Priority)
  if (explicitCityId) return explicitCityId;

  // 2. Physical Context (e.g. from Cloudflare/Vercel geolocation headers)
  // Example header: x-vercel-ip-city
  if (headersProvider) {
    const geoCity = headersProvider.get('x-vercel-ip-city');
    if (geoCity) {
      // In a real implementation we would look up the slug or name.
      const match = await db.orm.public.City.where({ name: geoCity }).all().first();
      if (match) return match.id;
    }
  }

  // 3. Home Context (Profile Fallback)
  const session = await getServerSession(authOptions);
  if (session?.user?.personId) {
    const person = await db.orm.public.Person.where({ id: session.user.personId }).all().first();
    if (person?.homeCityId) {
      return person.homeCityId;
    }
  }

  // No city resolved
  return null;
}
