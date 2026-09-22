import { db } from '@/src/prisma/db';
import { requireMembership } from './tenant';

export async function hasEntitlement(organizationId: string, featureCode: string): Promise<boolean> {
  // Check if organization has an active subscription that includes this feature
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
