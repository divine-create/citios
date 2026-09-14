import HotelDashboard from "@/components/hotel/HotelDashboard";
import { Metadata } from "next";
import { getHotelAdminData } from "@/lib/actions/hotel";

export const metadata: Metadata = {
  title: "Hotel OS - CityConnect",
  description: "Hotel Operations System",
};

export default async function HotelOSPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; org?: string }>;
}) {
  const resolvedParams = await searchParams;
  // Simple role testing override via URL parameter. Defaults to MANAGER.
  const userRole = (resolvedParams.role?.toUpperCase() as any) || "MANAGER";
  
  const adminData = await getHotelAdminData();
  const orgId = resolvedParams.org || adminData?.hotel?.id || null;

  return (
    <HotelDashboard 
      organizationId={orgId} 
      userRole={userRole} 
      initialRooms={adminData?.rooms || []}
      initialReservations={adminData?.reservations || []}
    />
  );
}
