import { db } from '@/src/prisma/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireMembership } from '@/lib/actions/tenant';

export type LogisticsTenantResolution =
  | { authorized: true; provider: any; allLogisticsMemberships: any[] }
  | { authorized: false; error: 'UNAUTHENTICATED' | 'NO_LOGISTICS_MEMBERSHIP' | 'FORBIDDEN_ORGANIZATION'; provider?: null };

/**
 * Validates that the caller has an active, authorized membership in the provider organization.
 * Used across Logistics server actions for defense-in-depth tenant boundary enforcement.
 * Enforces strict authentication and role checking in all environments without any bypass.
 */
export async function assertProviderAccess(
  providerId: string,
  allowedRoles: string[] = ['OWNER', 'ADMIN', 'MANAGER', 'DISPATCHER']
) {
  return await requireMembership(providerId, allowedRoles);
}

/**
 * Resolves the authenticated logistics company provider for business workspace pages.
 * Enforces strict multi-tenant boundaries:
 * 1. User must have an authenticated session and active account.
 * 2. User must possess a valid membership in at least one non-suspended LOGISTICS organization.
 * 3. If an explicit ?org=<id> parameter is passed, verifies the user belongs to THAT organization.
 * 4. NEVER falls back to an arbitrary organization or the first record in the database.
 */
export async function resolveLogisticsTenant(requestedOrgId?: string): Promise<LogisticsTenantResolution> {
  let session = null;
  try {
    session = await getServerSession(authOptions);
  } catch {
    session = null;
  }

  if (!session?.user?.personId) {
    return { authorized: false, error: 'UNAUTHENTICATED' };
  }

  // Account status validation
  const account = await db.orm.public.Account.where({ personId: session.user.personId }).all().first();
  if (!account || !account.isActive) {
    return { authorized: false, error: 'UNAUTHENTICATED' };
  }

  const memberships = await db.orm.public.Membership
    .where({ personId: session.user.personId })
    .include('organization')
    .all();

  const logisticsMemberships = memberships.filter(
    (m: any) => m.organization?.type === 'LOGISTICS' && m.organization?.status !== 'SUSPENDED'
  );

  if (logisticsMemberships.length === 0) {
    return { authorized: false, error: 'NO_LOGISTICS_MEMBERSHIP' };
  }

  if (requestedOrgId) {
    const match = logisticsMemberships.find((m: any) => m.organizationId === requestedOrgId);
    if (!match) {
      return { authorized: false, error: 'FORBIDDEN_ORGANIZATION' };
    }
    return {
      authorized: true,
      provider: match.organization,
      allLogisticsMemberships: logisticsMemberships,
    };
  }

  return {
    authorized: true,
    provider: logisticsMemberships[0].organization,
    allLogisticsMemberships: logisticsMemberships,
  };
}
