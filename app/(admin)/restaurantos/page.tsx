import RestaurantOSWorkspace from '@/components/cityos/workspaces/RestaurantOSWorkspace';
import { requireOrgAccess } from '@/lib/rbac';

export default async function RestaurantOSPage({ searchParams }: { searchParams: Promise<{ org?: string }> }) {
  const resolvedParams = await searchParams;
  let orgId = resolvedParams.org || null;
  let session = null;

  if (!orgId) {
    session = await requireOrgAccess('RESTAURANT');
    orgId = session?.user?.memberships?.find((m) => m.organizationType === 'RESTAURANT')?.organizationId || null;
  }

  return <RestaurantOSWorkspace slug={orgId || ''} />;
}
