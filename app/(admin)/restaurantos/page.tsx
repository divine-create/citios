import RestaurantOSWorkspace from '@/components/cityos/workspaces/RestaurantOSWorkspace';
import { requireOrgAccess, resolveTenantOrg } from '@/lib/rbac';

export default async function RestaurantOSPage({ searchParams }: { searchParams: Promise<{ org?: string }> }) {
  const resolvedParams = await searchParams;
  let orgId = resolvedParams.org || null;
  let session = null;

  if (!orgId) {
    orgId = await resolveTenantOrg('RESTAURANT');
    session = await requireOrgAccess(orgId);
  }

  return <RestaurantOSWorkspace slug={orgId || ''} />;
}

