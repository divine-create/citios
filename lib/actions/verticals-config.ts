'use server';

import { db } from '@/src/prisma/db';
import { requireSystemAdmin } from '@/lib/rbac';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';

import {
  type PlatformVerticalsConfig,
  type VerticalId,
  DEFAULT_VERTICALS_CONFIG,
} from '@/lib/verticals-constants';

export type { PlatformVerticalsConfig, VerticalId };

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
      description: 'HQ Control configuration for active CityOS verticals.',
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
      vertical: 'SETTINGS',
      slug: CONFIG_SLUG,
      title: 'Platform Verticals Configuration',
      description: 'HQ Control configuration for active CityOS verticals.',
      metadata,
      isActive: true,
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
    revalidatePath('/wallet');
    revalidatePath('/profile');
    revalidatePath('/checkout');
  } catch {}

  return { success: true, config: updated };
}
