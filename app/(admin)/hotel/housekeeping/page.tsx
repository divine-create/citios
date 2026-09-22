import HousekeepingView from "@/components/hotel/HousekeepingView";
import { requireOrgAccess, resolveTenantOrg } from '@/lib/rbac';
import { getHotelAdminData, getHousekeepingTasks } from '@/lib/actions/hotel';

export default async function HousekeepingPage() {
  const resolvedOrgId = await resolveTenantOrg('HOTEL');
  await requireOrgAccess(resolvedOrgId);
  const organizationId = resolvedOrgId;
  const data = await getHotelAdminData(organizationId);
  const initialTasks = organizationId ? await getHousekeepingTasks(organizationId) : [];

  return <HousekeepingView initialTasks={initialTasks} organizationId={organizationId} />;
}
