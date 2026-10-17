'use server';

import { db } from '@/src/prisma/db';
import { requireSystemAdmin } from '@/lib/rbac';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';

export type VerticalId = 'jobs' | 'houses' | 'shops' | 'food' | 'services' | 'events';

export interface PlatformVerticalsConfig {
  jobs: boolean;
  houses: boolean;
  shops: boolean;
  food: boolean;
  services: boolean;
  events: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

export interface VerticalDefinition {
  id: VerticalId;
  name: string;
  description: string;
  path: string;
  iconKey: string;
  badge: string;
}

export const VERTICAL_DEFINITIONS: Record<VerticalId, VerticalDefinition> = {
  jobs: {
    id: 'jobs',
    name: 'CityJobs',
    description: 'Local job vacancies, talent hiring, gig listings, and applications.',
    path: '/jobs',
    iconKey: 'jobs',
    badge: 'Careers',
  },
  houses: {
    id: 'houses',
    name: 'CityHomes & Stays',
    description: 'Apartments, short lets, hotel rooms, and house rentals.',
    path: '/stay',
    iconKey: 'stay',
    badge: 'Real Estate & Hospitality',
  },
  shops: {
    id: 'shops',
    name: 'CityMart & Retail',
    description: 'Hyperlocal shopping, grocery stores, pharmacies, and merchant markets.',
    path: '/market',
    iconKey: 'shop',
    badge: 'Retail',
  },
  food: {
    id: 'food',
    name: 'CityFood & Restaurants',
    description: 'Local kitchens, restaurants, food menus, and delivery dispatch.',
    path: '/food',
    iconKey: 'all',
    badge: 'Dining & Delivery',
  },
  services: {
    id: 'services',
    name: 'CityServices & Trades',
    description: 'Home repairs, AC servicing, electrical, plumbing, auto, and verified pros.',
    path: '/services',
    iconKey: 'services',
    badge: 'Home Trades & Pro Services',
  },
  events: {
    id: 'events',
    name: 'CityEvents & Culture',
    description: 'Conferences, festivals, parties, ticket booking, and nightlife.',
    path: '/events',
    iconKey: 'events',
    badge: 'Events & Tickets',
  },
};

export const DEFAULT_VERTICALS_CONFIG: PlatformVerticalsConfig = {
  jobs: true,
  houses: true,
  shops: true,
  food: true,
  services: true,
  events: true,
};

const CONFIG_SLUG = 'platform-verticals-config';

/**
 * Public/Resident read: Get current platform verticals configuration.
 * Safe fallback to DEFAULT_VERTICALS_CONFIG if not yet configured or on db error.
 */
export async function getVerticalsConfig(): Promise<PlatformVerticalsConfig> {
  try {
    const listing = await db.orm.public.DiscoveryListing.where({ slug: CONFIG_SLUG }).all().first();
    if (listing?.metadata) {
      const parsed = JSON.parse(listing.metadata);
      return {
        ...DEFAULT_VERTICALS_CONFIG,
        ...parsed,
      };
    }
  } catch (err) {
    console.warn('[getVerticalsConfig] Error reading config from db:', err);
  }
  return DEFAULT_VERTICALS_CONFIG;
}

/**
 * Admin action: Save platform-wide vertical toggle states.
 * Strictly protected by requireSystemAdmin().
 */
export async function saveVerticalsConfig(payload: Partial<PlatformVerticalsConfig>) {
  const session = await requireSystemAdmin();

  const current = await getVerticalsConfig();
  const updated: PlatformVerticalsConfig = {
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
      title: 'Platform Verticals Configuration',
      summary: 'HQ Control configuration for active CityOS verticals.',
      verified: true,
    });
  } else {
    // Resolve fallback category
    let category = await db.orm.public.DiscoveryCategory.all().first();
    if (!category) {
      category = await db.orm.public.DiscoveryCategory.create({
        id: uuidv4(),
        name: 'System Config',
        slug: 'system-config',
      });
    }

    await db.orm.public.DiscoveryListing.create({
      id: uuidv4(),
      categoryId: category.id,
      title: 'Platform Verticals Configuration',
      slug: CONFIG_SLUG,
      summary: 'HQ Control configuration for active CityOS verticals.',
      metadata,
      verified: true,
      kind: 'COMMERCIAL',
    });
  }

  // Revalidate relevant routes
  try {
    revalidatePath('/');
    revalidatePath('/hq/verticals');
    revalidatePath('/jobs');
    revalidatePath('/stay');
    revalidatePath('/market');
    revalidatePath('/food');
    revalidatePath('/services');
    revalidatePath('/events');
  } catch {}

  return { success: true, config: updated };
}
