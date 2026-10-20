'use server';

import { db } from '@/src/prisma/db';
import { requireSystemAdmin } from '@/lib/rbac';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';

export interface PlatformCheckoutConfig {
  enableWhatsApp: boolean;
  enableWallet: boolean;
  enableCard: boolean;
  enableTransfer: boolean;
  defaultMethod: 'whatsapp' | 'wallet' | 'card' | 'transfer';
  conciergeWhatsAppNumber: string;
  allowPayOnDelivery: boolean;
  requireDeliveryAddress: boolean;
  minOrderAmount: number;
  updatedAt?: string;
  updatedBy?: string;
}

const DEFAULT_CHECKOUT_CONFIG: PlatformCheckoutConfig = {
  enableWhatsApp: true,
  enableWallet: false,
  enableCard: false,
  enableTransfer: false,
  defaultMethod: 'whatsapp',
  conciergeWhatsAppNumber: '2348065373747',
  allowPayOnDelivery: false,
  requireDeliveryAddress: false,
  minOrderAmount: 0,
};

const CONFIG_SLUG = 'platform-checkout-config';

/**
 * Public/Resident read: Get current platform checkout configuration.
 * Enforces WhatsApp-only checkout and disables delivery for now.
 */
export async function getCheckoutConfig(): Promise<PlatformCheckoutConfig> {
  try {
    const listing = await db.orm.public.DiscoveryListing.where({ slug: CONFIG_SLUG }).all().first();
    if (listing?.metadata) {
      const parsed = JSON.parse(listing.metadata);
      return {
        ...DEFAULT_CHECKOUT_CONFIG,
        ...parsed,
      };
    }
  } catch (err) {
    console.warn('[getCheckoutConfig] Error reading config from db:', err);
  }
  return DEFAULT_CHECKOUT_CONFIG;
}

/**
 * Admin action: Save platform-wide checkout settings.
 * Strictly protected by requireSystemAdmin().
 */
export async function saveCheckoutConfig(payload: Partial<PlatformCheckoutConfig>) {
  const session = await requireSystemAdmin();

  // Validate that at least ONE payment method remains active
  const candidate: PlatformCheckoutConfig = {
    ...DEFAULT_CHECKOUT_CONFIG,
    ...(await getCheckoutConfig()),
    ...payload,
    updatedAt: new Date().toISOString(),
    updatedBy: session.user.name || session.user.email || 'Admin',
  };

  const hasAtLeastOneMethod =
    candidate.enableWhatsApp ||
    candidate.enableWallet ||
    candidate.enableCard ||
    candidate.enableTransfer;

  if (!hasAtLeastOneMethod) {
    throw new Error('At least one checkout method must remain enabled for residents.');
  }

  // Ensure defaultMethod points to an enabled method
  if (candidate.defaultMethod === 'whatsapp' && !candidate.enableWhatsApp) {
    candidate.defaultMethod = candidate.enableWallet
      ? 'wallet'
      : candidate.enableCard
      ? 'card'
      : 'transfer';
  } else if (candidate.defaultMethod === 'wallet' && !candidate.enableWallet) {
    candidate.defaultMethod = candidate.enableWhatsApp
      ? 'whatsapp'
      : candidate.enableCard
      ? 'card'
      : 'transfer';
  } else if (candidate.defaultMethod === 'card' && !candidate.enableCard) {
    candidate.defaultMethod = candidate.enableWhatsApp
      ? 'whatsapp'
      : candidate.enableWallet
      ? 'wallet'
      : 'transfer';
  } else if (candidate.defaultMethod === 'transfer' && !candidate.enableTransfer) {
    candidate.defaultMethod = candidate.enableWhatsApp
      ? 'whatsapp'
      : candidate.enableWallet
      ? 'wallet'
      : 'card';
  }

  // Sanitize concierge WhatsApp phone
  if (candidate.conciergeWhatsAppNumber) {
    let clean = candidate.conciergeWhatsAppNumber.replace(/[^\d+]/g, '');
    if (clean.startsWith('+')) clean = clean.substring(1);
    if (clean.startsWith('0')) clean = '234' + clean.substring(1);
    candidate.conciergeWhatsAppNumber = clean;
  }

  // Locate anchor org and city to satisfy DiscoveryListing foreign keys
  const city = (await db.orm.public.City.all().first()) || null;
  const org = (await db.orm.public.Organization.all().first()) || null;

  if (!city || !org) {
    throw new Error('System bootstrap incomplete: no anchor city or organization found.');
  }

  const existing = await db.orm.public.DiscoveryListing.where({ slug: CONFIG_SLUG }).all().first();
  const metadataString = JSON.stringify(candidate);

  if (existing) {
    await db.orm.public.DiscoveryListing.where({ id: existing.id }).update({
      metadata: metadataString,
      title: '9jaLive Checkout & Payment Configuration',
      description: 'Platform-level active payment methods and checkout rules',
      isActive: true,
    });
  } else {
    await db.orm.public.DiscoveryListing.create({
      id: uuidv4(),
      organizationId: org.id,
      cityId: city.id,
      vertical: 'SETTINGS',
      slug: CONFIG_SLUG,
      title: '9jaLive Checkout & Payment Configuration',
      description: 'Platform-level active payment methods and checkout rules',
      metadata: metadataString,
      isActive: true,
    });
  }

  try {
    revalidatePath('/checkout');
    revalidatePath('/cart');
    revalidatePath('/hq/checkout');
  } catch {}

  return { success: true, config: candidate };
}

/**
 * Admin action: Update or provision a merchant's dedicated WhatsApp ordering number.
 */
export async function updateMerchantWhatsAppContact(organizationId: string, whatsappNumber: string) {
  await requireSystemAdmin();

  if (!whatsappNumber || !whatsappNumber.trim()) {
    throw new Error('Phone number cannot be empty.');
  }

  let clean = whatsappNumber.trim().replace(/[^\d+]/g, '');
  if (clean.startsWith('+')) clean = clean.substring(1);
  if (clean.startsWith('0')) clean = '234' + clean.substring(1);

  const existing = await db.orm.public.OrganizationContactPoint.where({
    organizationId,
    type: 'WHATSAPP',
  }).all().first();

  if (existing) {
    await db.orm.public.OrganizationContactPoint.where({ id: existing.id }).update({
      value: clean,
      isVerified: true,
    });
  } else {
    await db.orm.public.OrganizationContactPoint.create({
      organizationId,
      type: 'WHATSAPP',
      value: clean,
      isPrimary: true,
      isVerified: true,
    });
  }

  try {
    revalidatePath(`/hq/managed/${organizationId}`);
    revalidatePath(`/org/${organizationId}`);
  } catch {}

  return { success: true, whatsappNumber: clean };
}
