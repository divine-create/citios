import { ManagerDashboard } from "@/components/hotel/ManagerDashboard";
import { Metadata } from "next";
import { requireOrgAccess } from '@/lib/rbac';
import { getHotelAdminData, getNightAuditReports, getOutletsData, getRoomBlocks } from '@/lib/actions/hotel';

export const metadata: Metadata = {
  title: "General Manager Portal - CityConnect",
  description: "Hotel Manager Dashboard for CityConnect.",
};

export default async function ManagerPage() {
  await requireOrgAccess('HOTEL');
  const data = await getHotelAdminData();
  const organizationId = data?.hotel?.id ?? null;
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
