'use server';

import { db } from '@/src/prisma/db';
import { requireMembership } from '@/lib/actions/tenant';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';

export type MerchantFulfillmentMode = 'PLATFORM_FLEET' | 'IN_HOUSE_COURIER' | 'PICKUP_ONLY';

export interface MerchantDeliverySettings {
  fulfillmentMode: MerchantFulfillmentMode;
  isDeliveryActive: boolean;
  maxDeliveryRadiusKm: number;
  freeDeliveryThreshold: number; // 0 = disabled
  customDeliveryFee: number | null; // Optional flat customer fee
  kitchenPrepMinutes: number;
  inHouseCourierName: string | null;
  inHouseCourierPhone: string | null;
  updatedAt?: string;
  updatedBy?: string;
}

const DEFAULT_MERCHANT_DELIVERY_SETTINGS: MerchantDeliverySettings = {
  fulfillmentMode: 'PLATFORM_FLEET',
  isDeliveryActive: true,
  maxDeliveryRadiusKm: 8.0,
  freeDeliveryThreshold: 0,
  customDeliveryFee: null,
  kitchenPrepMinutes: 15,
  inHouseCourierName: null,
  inHouseCourierPhone: null,
};

export async function getDefaultMerchantDeliverySettings(): Promise<MerchantDeliverySettings> {
  return DEFAULT_MERCHANT_DELIVERY_SETTINGS;
}

/**
 * Public/Internal read: Get delivery and fulfillment preferences for a merchant organization.
 */
export async function getMerchantDeliverySettings(
  organizationId: string
): Promise<MerchantDeliverySettings> {
  try {
    const slug = `merchant-delivery-${organizationId}`;
    
    // Check dedicated listing or primary organization listing
    const listing =
      (await db.orm.public.DiscoveryListing.where({ slug }).all().first()) ||
      (await db.orm.public.DiscoveryListing.where({ organizationId }).all().first());

    if (listing?.metadata) {
      try {
        const parsed = JSON.parse(listing.metadata);
        const settings = parsed.deliverySettings || parsed;
        if (settings.fulfillmentMode || settings.maxDeliveryRadiusKm !== undefined) {
          return {
            ...DEFAULT_MERCHANT_DELIVERY_SETTINGS,
            ...settings,
          };
        }
      } catch {}
    }
  } catch (err: any) {
    console.warn('[getMerchantDeliverySettings] Error reading settings:', err.message);
  }

  return DEFAULT_MERCHANT_DELIVERY_SETTINGS;
}

/**
 * Authenticated Merchant action: Update fulfillment mode and delivery preferences.
 * Protected by requireMembership() with OWNER, MANAGER, or ADMIN roles.
 */
export async function updateMerchantDeliverySettings(
  organizationId: string,
  payload: Partial<MerchantDeliverySettings>
): Promise<{ success: boolean; settings: MerchantDeliverySettings }> {
  const { session } = await requireMembership(organizationId, ['OWNER', 'MANAGER', 'ADMIN']);

  const current = await getMerchantDeliverySettings(organizationId);

  const updated: MerchantDeliverySettings = {
    ...current,
    ...payload,
    maxDeliveryRadiusKm: Math.max(1, Math.min(25, payload.maxDeliveryRadiusKm ?? current.maxDeliveryRadiusKm)),
    freeDeliveryThreshold: Math.max(0, payload.freeDeliveryThreshold ?? current.freeDeliveryThreshold),
    kitchenPrepMinutes: Math.max(5, Math.min(120, payload.kitchenPrepMinutes ?? current.kitchenPrepMinutes)),
    updatedAt: new Date().toISOString(),
    updatedBy: session?.user?.name || session?.user?.email || 'Merchant Admin',
  };

  const slug = `merchant-delivery-${organizationId}`;
  const existingDedicated = await db.orm.public.DiscoveryListing.where({ slug }).all().first();

  if (existingDedicated) {
    await db.orm.public.DiscoveryListing.where({ id: existingDedicated.id }).update({
      metadata: JSON.stringify(updated),
    });
  } else {
    // Check primary listing for org
    const primaryListing = await db.orm.public.DiscoveryListing.where({ organizationId }).all().first();
    if (primaryListing) {
      let meta: Record<string, any> = {};
      try {
        meta = JSON.parse(primaryListing.metadata || '{}');
      } catch {}
      meta.deliverySettings = updated;
      await db.orm.public.DiscoveryListing.where({ id: primaryListing.id }).update({
        metadata: JSON.stringify(meta),
      });
    } else {
      // Find anchor city
      const city = (await db.orm.public.City.all().first()) || null;
      if (!city) throw new Error('No active city found for listing creation');

      await db.orm.public.DiscoveryListing.create({
        id: uuidv4(),
        organizationId,
        cityId: city.id,
        vertical: 'RESTAURANT',
        slug,
        title: 'Merchant Delivery Settings',
        description: 'Fulfillment and delivery preferences',
        metadata: JSON.stringify(updated),
        isActive: true,
      });
    }
  }

  try {
    revalidatePath(`/workspaces/restaurantos/${organizationId}`);
    revalidatePath(`/workspaces/restaurantos/${organizationId}/management/delivery`);
    revalidatePath(`/checkout`);
  } catch {}

  return {
    success: true,
    settings: updated,
  };
}
