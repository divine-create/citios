import { db } from '@/src/prisma/db';

export async function hasEntitlement(organizationId: string, featureCode: string): Promise<boolean> {
  // Organizations without any subscription get no entitlements.
  const sub = await db.orm.public.Subscription
    .where({ organizationId, status: 'ACTIVE' })
    .all()
    .first();

  if (!sub) return false;

  const entitlement = await db.orm.public.PlanEntitlement
    .where({ planId: sub.planId, featureCode })
    .all()
    .first();

  return !!entitlement;
}

export async function checkUsageLimit(organizationId: string, resourceCode: string, currentUsage: number): Promise<boolean> {
  const sub = await db.orm.public.Subscription
    .where({ organizationId, status: 'ACTIVE' })
    .all()
    .first();

  if (!sub) return false;

  const limit = await db.orm.public.PlanLimit
    .where({ planId: sub.planId, resourceCode })
    .all()
    .first();

  if (!limit) return true; // No limit defined means unlimited

  return currentUsage < limit.limit;
}

/**
 * Throws a structured error if the organization lacks the given feature entitlement.
 * Use this inside server actions to enforce plan boundaries server-side.
 */
export async function requireEntitlement(organizationId: string, featureCode: string): Promise<void> {
  const entitled = await hasEntitlement(organizationId, featureCode);
  if (!entitled) {
    throw new Error(`ENTITLEMENT_REQUIRED:${featureCode}`);
  }
}

/**
 * Throws if currentUsage has already reached or exceeded the plan limit.
 * Returns silently if within limit or no limit is defined.
 */
export async function requireWithinLimit(organizationId: string, resourceCode: string, currentUsage: number): Promise<void> {
  const withinLimit = await checkUsageLimit(organizationId, resourceCode, currentUsage);
  if (!withinLimit) {
    throw new Error(`LIMIT_EXCEEDED:${resourceCode}`);
  }
}

export const FEAT_PROCUREMENT = 'CITYMART_PROCUREMENT';
export const FEAT_MULTI_LOCATION = 'CITYMART_MULTI_LOCATION';
export const LIMIT_PRODUCTS = 'CITYMART_PRODUCTS';
