import { ManagerDashboard } from "@/components/hotel/ManagerDashboard";
import { Metadata } from "next";
import { requireOrgAccess, resolveTenantOrg } from '@/lib/rbac';
import { getHotelAdminData, getNightAuditReports, getOutletsData, getRoomBlocks } from '@/lib/actions/hotel';

export const metadata: Metadata = {
  title: "General Manager Portal - CityConnect",
  description: "Hotel Manager Dashboard for CityConnect.",
};

export default async function ManagerPage() {
  const resolvedOrgId = await resolveTenantOrg('HOTEL');
  await requireOrgAccess(resolvedOrgId);
  const organizationId = resolvedOrgId;
  const data = await getHotelAdminData(organizationId);
  const [roomBlocks, nightAuditReports, outletsData] = organizationId
    ? await Promise.all([getRoomBlocks(organizationId), getNightAuditReports(organizationId), getOutletsData(organizationId)])
    : [[], [], null];

  return (
    <ManagerDashboard
      organizationId={organizationId}
      initialHotel={data?.hotel ?? null}
      initialRooms={data?.rooms ?? []}
      initialReservations={data?.reservations ?? []}
      initialRateRules={data?.rateRules ?? []}
      initialInventoryItems={data?.inventoryItems ?? []}
      initialRoomBlocks={roomBlocks}
      initialNightAuditReports={nightAuditReports}
      initialOutlets={outletsData?.outlets ?? []}
      initialOutletItems={outletsData?.items ?? []}
    />
  );
}
