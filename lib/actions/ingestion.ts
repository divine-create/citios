'use server';

import { db } from '@/src/prisma/db';
import { normalizePhoneNumber } from '@/lib/identity';
import { getCityBySlug } from '@/lib/city';
import { v4 as uuidv4 } from 'uuid';

export interface RawOsmElement {
  id: number | string;
  type: 'node' | 'way' | 'relation';
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
}

export interface RawSmeRecord {
  name: string;
  category?: string; // Retail, Restaurant, Service, Healthcare, etc.
  address?: string;
  email?: string;
  phone?: string;
  website?: string;
  whatsapp?: string;
  instagram?: string;
  hours?: string;
  tags?: string[];
  sourceUrl?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
}

// Map directory category string to canonical CityOS OrgType
export function mapDirectoryCategoryToOrgType(category?: string, name?: string): string {
  const cat = `${category || ''} ${name || ''}`.trim().toLowerCase();
  if (['pharmacy', 'chemist', 'drugstore'].some((k) => cat.includes(k))) {
    return 'PHARMACY';
  }
  if (['hospital', 'clinic', 'medical', 'dental', 'health', 'healthcare', 'diagnostics'].some((k) => cat.includes(k))) {
    return 'HEALTHCARE';
  }
  if (['restaurant', 'kitchen', 'fast food', 'food', 'bakery', 'confectionery', 'bars & lounges', 'bar', 'lounge', 'cafe', 'bistro'].some((k) => cat.includes(k))) {
    return 'RESTAURANT';
  }
  if (['hotel', 'apartment', 'apartments', 'resort', 'motel', 'guest house', 'inn', 'suites', 'lodge'].some((k) => cat.includes(k))) {
    return 'HOTEL';
  }
  if (['shopping', 'supermarket', 'mart', 'retail', 'store', 'market', 'mall'].some((k) => cat.includes(k))) {
    return 'RETAIL';
  }
  if (['school', 'academy', 'college', 'creche', 'nursery', 'polytechnic', 'university', 'education'].some((k) => cat.includes(k))) {
    return 'SCHOOL';
  }
  if (['event', 'hall'].some((k) => cat.includes(k))) {
    return 'EVENT_ORGANIZER';
  }
  if (['logistics', 'courier', 'delivery', 'transport'].some((k) => cat.includes(k))) {
    return 'LOGISTICS';
  }
  return 'SERVICES';
}

// Map OSM tags to canonical CityOS OrgType
export function mapOsmTagToOrgType(tags: Record<string, string>): string {
  const amenity = tags.amenity?.toLowerCase();
  const shop = tags.shop?.toLowerCase();
  const tourism = tags.tourism?.toLowerCase();
  const office = tags.office?.toLowerCase();
  const craft = tags.craft?.toLowerCase();

  if (amenity && ['restaurant', 'cafe', 'fast_food', 'bar', 'pub', 'food_court', 'ice_cream'].includes(amenity)) {
    return 'RESTAURANT';
  }
  if (shop) {
    return 'RETAIL';
  }
  if (tourism && ['hotel', 'motel', 'guest_house', 'hostel', 'resort'].includes(tourism)) {
    return 'HOTEL';
  }
  if (amenity && ['school', 'college', 'kindergarten', 'university'].includes(amenity)) {
    return 'SCHOOL';
  }
  if (amenity && ['hospital', 'clinic', 'pharmacy', 'doctors', 'dentist'].includes(amenity)) {
    return amenity === 'pharmacy' ? 'PHARMACY' : 'HEALTHCARE';
  }
  if (office || craft || amenity === 'bank' || amenity === 'post_office') {
    return 'SERVICES';
  }

  return 'SERVICES'; // Default fallback
}

// Generate a clean URL-friendly slug
export function slugifyBusinessName(name: string, citySlug: string, suffix?: string): string {
  const base = `${name}-${citySlug}`
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const idPart = suffix ? `-${suffix.slice(0, 6)}` : `-${Math.random().toString(36).substring(2, 7)}`;
  return `${base}${idPart}`;
}

/**
 * Controlled ingestion for OpenStreetMap (OSM) Overpass elements.
 * Creates an unclaimed Organization, Location, and DiscoveryListing with SourceObservation.
 */
export async function ingestOpenStreetMapData(
  citySlug: string,
  elements: RawOsmElement[],
  options?: { autoPublish?: boolean }
) {
  const autoPublish = options?.autoPublish ?? true;
  const city = await getCityBySlug(citySlug);
  if (!city) {
    throw new Error(`Target city "${citySlug}" not found or inactive in canonical registry.`);
  }

  // Ensure DataSource record exists
  let source = await db.orm.public.DataSource.where({ name: 'OpenStreetMap Nigeria' }).all().first();
  if (!source) {
    source = await db.orm.public.DataSource.create({
      id: uuidv4(),
      name: 'OpenStreetMap Nigeria',
      sourceType: 'GEO_API',
      url: 'https://overpass-api.de/api/interpreter',
      policyJson: JSON.stringify({ license: 'ODbL', attribution: 'OpenStreetMap contributors' }),
      isActive: true,
    });
  }

  const results = {
    total: elements.length,
    created: 0,
    updated: 0,
    skipped: 0,
  };

  for (const el of elements) {
    const tags = el.tags || {};
    const name = tags.name || tags['name:en'] || tags.operator || tags.brand;
    if (!name || name.trim().length < 2) {
      results.skipped++;
      continue;
    }

    const orgType = mapOsmTagToOrgType(tags);
    const street = [tags['addr:housenumber'], tags['addr:street'], tags['addr:suburb'], tags['addr:city'] || city.name]
      .filter(Boolean)
      .join(', ') || tags.address || `${city.name}, Nigeria`;

    const rawPhone = tags.phone || tags['contact:phone'] || tags['contact:mobile'];
    const phone = rawPhone ? normalizePhoneNumber(rawPhone) : null;
    const email = (tags.email || tags['contact:email'] || '').trim().toLowerCase() || null;
    const website = (tags.website || tags['contact:website'] || '').trim() || null;

    // Deduplication check: Match in current city by exact name or verified contact
    const existingLocations = await db.orm.public.Location.where({ cityId: city.id }).all();
    const cityOrgIds = new Set(existingLocations.map((l) => l.organizationId));

    let matchedOrg: any = null;
    if (cityOrgIds.size > 0) {
      const candidates = await db.orm.public.Organization.where((o) => o.id.in(Array.from(cityOrgIds))).all();
      matchedOrg = candidates.find((c) => c.name.toLowerCase() === name.trim().toLowerCase());
    }

    const lat = el.lat ?? (tags['addr:lat'] ? parseFloat(tags['addr:lat']) : null);
    const lon = el.lon ?? (tags['addr:lon'] ? parseFloat(tags['addr:lon']) : null);

    if (matchedOrg) {
      // Record provenance observation
      await db.orm.public.SourceObservation.create({
        id: uuidv4(),
        sourceId: source.id,
        organizationId: matchedOrg.id,
        entityType: 'ORGANIZATION',
        rawPayload: JSON.stringify(el),
        extractedData: JSON.stringify({ name, orgType, street, phone, email, website, lat, lon }),
        confidenceScore: 0.9,
      });
      results.updated++;
    } else {
      // Create new unclaimed Organization, Location, DiscoveryListing, and Contact Points
      const orgId = uuidv4();
      const locationId = uuidv4();
      const listingSlug = slugifyBusinessName(name, city.slug, orgId);

      await db.transaction(async (tx: any) => {
        // 1. Organization (Unclaimed: NO owner membership created)
        await tx.orm.public.Organization.create({
          id: orgId,
          name: name.trim(),
          type: orgType as any,
          description: tags.description || `Local ${orgType.toLowerCase()} in ${city.name}.`,
          address: street,
          status: 'ACTIVE' as any,
        });

        // 2. Physical Location
        await tx.orm.public.Location.create({
          id: locationId,
          organizationId: orgId,
          name: 'Main Location',
          address: street,
          latitude: lat,
          longitude: lon,
          cityId: city.id,
        });

        // 3. Discovery Listing
        await tx.orm.public.DiscoveryListing.create({
          id: uuidv4(),
          organizationId: orgId,
          locationId: locationId,
          cityId: city.id,
          vertical: orgType,
          slug: listingSlug,
          title: name.trim(),
          description: tags.description || `Discover ${name.trim()} in ${city.name}.`,
          isActive: autoPublish,
          metadata: JSON.stringify({
            source: 'OpenStreetMap',
            osmId: el.id,
            osmType: el.type,
            isOpen: true,
            approvalStatus: autoPublish ? 'APPROVED' : 'PENDING_REVIEW',
          }),
        });

        // 4. Contact Points
        if (email) {
          await tx.orm.public.OrganizationContactPoint.create({
            id: uuidv4(),
            organizationId: orgId,
            locationId: locationId,
            sourceId: source.id,
            type: 'EMAIL',
            value: email,
            isPrimary: true,
            isVerified: false,
          });
        }

        if (phone) {
          await tx.orm.public.OrganizationContactPoint.create({
            id: uuidv4(),
            organizationId: orgId,
            locationId: locationId,
            sourceId: source.id,
            type: 'PHONE',
            value: phone,
            isPrimary: !email,
            isVerified: false,
          });
        }

        if (website) {
          await tx.orm.public.OrganizationContactPoint.create({
            id: uuidv4(),
            organizationId: orgId,
            locationId: locationId,
            sourceId: source.id,
            type: 'WEBSITE',
            value: website,
            isPrimary: false,
            isVerified: false,
          });
        }

        // 5. Source Observation
        await tx.orm.public.SourceObservation.create({
          id: uuidv4(),
          sourceId: source.id,
          organizationId: orgId,
          entityType: 'ORGANIZATION',
          rawPayload: JSON.stringify(el),
          extractedData: JSON.stringify({ name, orgType, street, phone, email, website, lat, lon }),
          confidenceScore: 0.9,
        });
      });

      results.created++;
    }
  }

  return results;
}

/**
 * Controlled ingestion for Curated Public SME & Chamber Directories (CSV/JSON records).
 */
export async function ingestCuratedSmeBatch(
  sourceName: string,
  citySlug: string,
  records: RawSmeRecord[],
  optionsOrUrl?: { autoPublish?: boolean; sourceUrl?: string } | string
) {
  const sourceUrl = typeof optionsOrUrl === 'string' ? optionsOrUrl : optionsOrUrl?.sourceUrl;
  const autoPublish = typeof optionsOrUrl === 'object' && optionsOrUrl?.autoPublish !== undefined
    ? optionsOrUrl.autoPublish
    : true;
  const city = await getCityBySlug(citySlug);
  if (!city) {
    throw new Error(`Target city "${citySlug}" not found in canonical registry.`);
  }

  let source = await db.orm.public.DataSource.where({ name: sourceName }).all().first();
  if (!source) {
    source = await db.orm.public.DataSource.create({
      id: uuidv4(),
      name: sourceName,
      sourceType: 'DIRECTORY',
      url: sourceUrl || null,
      policyJson: JSON.stringify({ usage: 'Permitted public business directory' }),
      isActive: true,
    });
  }

  const results = {
    total: records.length,
    created: 0,
    updated: 0,
    skipped: 0,
  };

  // Pre-load existing organizations in this city for fast deduplication across batches
  const existingLocations = await db.orm.public.Location.where({ cityId: city.id }).all();
  const cityOrgIds = new Set(existingLocations.map((l) => l.organizationId));
  const existingOrgs = cityOrgIds.size > 0
    ? await db.orm.public.Organization.where((o) => o.id.in(Array.from(cityOrgIds))).all()
    : [];
  const orgNameMap = new Map<string, any>(existingOrgs.map((o) => [o.name.trim().toLowerCase(), o]));

  for (const rec of records) {
    const name = rec.name?.trim();
    if (!name || name.length < 2) {
      results.skipped++;
      continue;
    }

    const orgType = mapDirectoryCategoryToOrgType(rec.category, name);
    const address = rec.address?.trim() || `${city.name}, Nigeria`;

    const phone = rec.phone ? normalizePhoneNumber(rec.phone) : null;
    const whatsapp = rec.whatsapp ? normalizePhoneNumber(rec.whatsapp) : null;
    const email = (rec.email || '').trim().toLowerCase() || null;
    const website = (rec.website || '').trim() || null;
    const instagram = (rec.instagram || '').trim() || null;

    // Deduplication check from city organization cache
    const matchedOrg = orgNameMap.get(name.toLowerCase());

    if (matchedOrg) {
      await db.orm.public.SourceObservation.create({
        id: uuidv4(),
        sourceId: source.id,
        organizationId: matchedOrg.id,
        entityType: 'ORGANIZATION',
        rawPayload: JSON.stringify(rec),
        extractedData: JSON.stringify({ name, orgType, address, phone, whatsapp, email, website, instagram }),
        confidenceScore: 1.0,
      });

      // Update contact points if missing
      if (email) {
        const existingEmail = await db.orm.public.OrganizationContactPoint.where({
          organizationId: matchedOrg.id,
          type: 'EMAIL',
          value: email,
        }).all().first();

        if (!existingEmail) {
          await db.orm.public.OrganizationContactPoint.create({
            id: uuidv4(),
            organizationId: matchedOrg.id,
            sourceId: source.id,
            type: 'EMAIL',
            value: email,
            isPrimary: true,
            isVerified: false,
          });
        }
      }

      if (phone) {
        const existingPhone = await db.orm.public.OrganizationContactPoint.where({
          organizationId: matchedOrg.id,
          type: 'PHONE',
          value: phone,
        }).all().first();

        if (!existingPhone) {
          await db.orm.public.OrganizationContactPoint.create({
            id: uuidv4(),
            organizationId: matchedOrg.id,
            sourceId: source.id,
            type: 'PHONE',
            value: phone,
            isPrimary: !email,
            isVerified: false,
          });
        }
      }

      if (whatsapp) {
        const existingWa = await db.orm.public.OrganizationContactPoint.where({
          organizationId: matchedOrg.id,
          type: 'WHATSAPP',
          value: whatsapp,
        }).all().first();

        if (!existingWa) {
          await db.orm.public.OrganizationContactPoint.create({
            id: uuidv4(),
            organizationId: matchedOrg.id,
            sourceId: source.id,
            type: 'WHATSAPP',
            value: whatsapp,
            isPrimary: !email && !phone,
            isVerified: false,
          });
        }
      }

      results.updated++;
    } else {
      const orgId = uuidv4();
      const locationId = uuidv4();
      const listingSlug = slugifyBusinessName(name, city.slug, orgId);

      await db.transaction(async (tx: any) => {
        await tx.orm.public.Organization.create({
          id: orgId,
          name,
          type: orgType as any,
          description: rec.description || `Registered ${orgType.toLowerCase()} located in ${city.name}.`,
          address,
          status: 'ACTIVE' as any,
        });

        await tx.orm.public.Location.create({
          id: locationId,
          organizationId: orgId,
          name: 'Main Branch',
          address,
          latitude: rec.latitude ?? null,
          longitude: rec.longitude ?? null,
          cityId: city.id,
        });

        await tx.orm.public.DiscoveryListing.create({
          id: uuidv4(),
          organizationId: orgId,
          locationId: locationId,
          cityId: city.id,
          vertical: orgType,
          slug: listingSlug,
          title: name,
          description: rec.description || `Discover ${name} in ${city.name}.`,
          isActive: autoPublish,
          metadata: JSON.stringify({
            source: sourceName,
            sourceUrl: rec.sourceUrl || null,
            originalCategory: rec.category || null,
            tags: rec.tags || [],
            hours: rec.hours || null,
            instagram: instagram || null,
            verifiedDirectory: true,
            isOpen: true,
            approvalStatus: autoPublish ? 'APPROVED' : 'PENDING_REVIEW',
          }),
        });

        if (email) {
          await tx.orm.public.OrganizationContactPoint.create({
            id: uuidv4(),
            organizationId: orgId,
            locationId: locationId,
            sourceId: source.id,
            type: 'EMAIL',
            value: email,
            isPrimary: true,
            isVerified: false,
          });
        }

        if (phone) {
          await tx.orm.public.OrganizationContactPoint.create({
            id: uuidv4(),
            organizationId: orgId,
            locationId: locationId,
            sourceId: source.id,
            type: 'PHONE',
            value: phone,
            isPrimary: !email,
            isVerified: false,
          });
        }

        if (whatsapp) {
          await tx.orm.public.OrganizationContactPoint.create({
            id: uuidv4(),
            organizationId: orgId,
            locationId: locationId,
            sourceId: source.id,
            type: 'WHATSAPP',
            value: whatsapp,
            isPrimary: !email && !phone,
            isVerified: false,
          });
        }

        if (website) {
          await tx.orm.public.OrganizationContactPoint.create({
            id: uuidv4(),
            organizationId: orgId,
            locationId: locationId,
            sourceId: source.id,
            type: 'WEBSITE',
            value: website,
            isPrimary: false,
            isVerified: false,
          });
        } else if (instagram) {
          await tx.orm.public.OrganizationContactPoint.create({
            id: uuidv4(),
            organizationId: orgId,
            locationId: locationId,
            sourceId: source.id,
            type: 'WEBSITE',
            value: instagram,
            isPrimary: false,
            isVerified: false,
          });
        }

        await tx.orm.public.SourceObservation.create({
          id: uuidv4(),
          sourceId: source.id,
          organizationId: orgId,
          entityType: 'ORGANIZATION',
          rawPayload: JSON.stringify(rec),
          extractedData: JSON.stringify({ name, orgType, address, phone, whatsapp, email, website, instagram }),
          confidenceScore: 1.0,
        });
      });

      orgNameMap.set(name.toLowerCase(), { id: orgId, name });
      results.created++;
    }
  }

  return results;
}
