import HousekeepingView from "@/components/hotel/HousekeepingView";
import { requireOrgAccess } from '@/lib/rbac';
import { getHotelAdminData, getHousekeepingTasks } from '@/lib/actions/hotel';

export default async function HousekeepingPage() {
  await requireOrgAccess('HOTEL');
  const data = await getHotelAdminData();
  const organizationId = data?.hotel?.id ?? null;
  const initialTasks = organizationId ? await getHousekeepingTasks(organizationId) : [];

  return <HousekeepingView initialTasks={initialTasks} organizationId={organizationId} />;
}
