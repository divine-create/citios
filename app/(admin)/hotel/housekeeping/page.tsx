import HousekeepingView from "@/components/hotel/HousekeepingView";
import { requireOrgAccess } from '@/lib/rbac';

export default async function HousekeepingPage() {
  await requireOrgAccess('HOTEL');
  return <HousekeepingView />;
}
