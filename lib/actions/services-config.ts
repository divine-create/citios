'use server';

import { db } from '@/src/prisma/db';
import { requireSystemAdmin } from '@/lib/rbac';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';
import {
  type ServicesVerticalConfig,
  DEFAULT_SERVICES_CONFIG,
} from '@/lib/services-config-constants';

export type { ServicesVerticalConfig };

const CONFIG_SLUG = 'platform-services-config';

/**
 * Public/Resident read: Get current platform services configuration.
 * Safe fallback to DEFAULT_SERVICES_CONFIG if not yet configured or on db error.
 */
export async function getServicesConfig(): Promise<ServicesVerticalConfig> {
  try {
    const listing = await db.orm.public.DiscoveryListing.where({ slug: CONFIG_SLUG }).all().first();
    if (listing?.metadata) {
      const parsed = JSON.parse(listing.metadata);
      return {
        ...DEFAULT_SERVICES_CONFIG,
        ...parsed,
      };
    }
  } catch (err) {
    console.warn('[getServicesConfig] Error reading config from db:', err);
  }
  return DEFAULT_SERVICES_CONFIG;
}

/**
 * Admin action: Save services vertical configuration.
 * Strictly protected by requireSystemAdmin().
 */
export async function saveServicesConfig(payload: Partial<ServicesVerticalConfig>) {
  const session = await requireSystemAdmin();

  const current = await getServicesConfig();
  const updated: ServicesVerticalConfig = {
    ...current,
    ...payload,
    updatedAt: new Date().toISOString(),
    updatedBy: session.user?.name || session.user?.email || 'admin',
  };

  const metadata = JSON.stringify(updated);

  const existing = await db.orm.public.DiscoveryListing.where({ slug: CONFIG_SLUG }).all().first();

  if (existing) {
    await db.orm.public.DiscoveryListing.where({ id: existing.id }).update({
      metadata,
      title: 'Platform Services Configuration',
      description: 'HQ Control configuration for Services vertical features and verified providers.',
      isActive: true,
    });
  } else {
    const city = (await db.orm.public.City.all().first()) || null;
    const org = (await db.orm.public.Organization.all().first()) || null;

    if (!city || !org) {
      throw new Error('System bootstrap incomplete: no anchor city or organization found.');
    }

    await db.orm.public.DiscoveryListing.create({
      id: uuidv4(),
      organizationId: org.id,
      cityId: city.id,
      vertical: 'SERVICES',
      slug: CONFIG_SLUG,
      title: 'Platform Services Configuration',
      description: 'HQ Control configuration for Services vertical features and verified providers.',
      metadata,
      isActive: true,
    });
  }

  // Revalidate relevant routes
  try {
    revalidatePath('/services');
    revalidatePath('/services/[category]');
    revalidatePath('/hq/services');
    revalidatePath('/hq/verticals');
  } catch {}

  return { success: true, config: updated };
}

/**
 * Admin action: Toggle verification status for a specific service provider organization.
 */
export async function toggleProviderVerification(organizationId: string, verify: boolean) {
  await requireSystemAdmin();

  const current = await getServicesConfig();
  const verifiedSet = new Set(current.verifiedOrgIds || []);

  if (verify) {
    verifiedSet.add(organizationId);
  } else {
    verifiedSet.delete(organizationId);
  }

  const updatedOrgIds = Array.from(verifiedSet);
  await saveServicesConfig({
    verifiedOrgIds: updatedOrgIds,
  });

  return { success: true, verifiedOrgIds: updatedOrgIds };
}

export interface ServiceProviderAdminItem {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  servicesCount: number;
  isVerified: boolean;
  rating: number | null;
  reviewCount: number;
}

/**
 * Admin action: Fetch all service providers with verification state for HQ management.
 */
export async function getServicesProvidersAdminList(): Promise<ServiceProviderAdminItem[]> {
  await requireSystemAdmin();

  const config = await getServicesConfig();
  const verifiedSet = new Set(config.verifiedOrgIds || []);

  const { isTestOrDemoOrganization } = await import('@/lib/storefront-filter');

  const [orgs, catalogItems, contacts, locs, reviews] = await Promise.all([
    db.orm.public.Organization.where({ type: 'SERVICES' }).all(),
    db.orm.public.ServiceCatalogItem.where({ isActive: true }).all(),
    db.orm.public.OrganizationContactPoint.all(),
    db.orm.public.Location.all(),
    db.orm.public.Review.all(),
  ]);

  const cleanOrgs = orgs.filter((o) => !isTestOrDemoOrganization(o));

  const itemsCountMap = new Map<string, number>();
  for (const it of catalogItems) {
    itemsCountMap.set(it.organizationId, (itemsCountMap.get(it.organizationId) || 0) + 1);
  }

  const contactMap = new Map<string, { phone: string | null; whatsapp: string | null }>();
  for (const cp of contacts) {
    if (!contactMap.has(cp.organizationId)) {
      contactMap.set(cp.organizationId, { phone: null, whatsapp: null });
    }
    const entry = contactMap.get(cp.organizationId)!;
    if (cp.type === 'WHATSAPP' && cp.value) {
      entry.whatsapp = cp.value;
    } else if (cp.type === 'PHONE' && cp.value) {
      entry.phone = cp.value;
      if (!entry.whatsapp) entry.whatsapp = cp.value;
    }
  }

  const locationMap = new Map<string, string>();
  for (const loc of locs) {
    if (loc.address && !locationMap.has(loc.organizationId)) {
      locationMap.set(loc.organizationId, loc.address);
    }
  }

  const reviewsMap = new Map<string, { sum: number; count: number }>();
  for (const r of reviews) {
    if (!reviewsMap.has(r.organizationId)) {
      reviewsMap.set(r.organizationId, { sum: 0, count: 0 });
    }
    const entry = reviewsMap.get(r.organizationId)!;
    entry.sum += r.rating;
    entry.count += 1;
  }

  return cleanOrgs.map((o) => {
    const contact = contactMap.get(o.id);
    const revStat = reviewsMap.get(o.id);
    const avgRating = revStat && revStat.count > 0 ? Number((revStat.sum / revStat.count).toFixed(1)) : null;

    return {
      id: o.id,
      name: o.name,
      description: o.description,
      address: locationMap.get(o.id) || null,
      phone: contact?.phone || null,
      whatsapp: contact?.whatsapp || null,
      servicesCount: itemsCountMap.get(o.id) || 0,
      isVerified: verifiedSet.has(o.id),
      rating: avgRating,
      reviewCount: revStat?.count || 0,
    };
  });
}
