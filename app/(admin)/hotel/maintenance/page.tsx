import { requireOrgAccess } from '@/lib/rbac';
import { getHotelAdminData, getMaintenanceTickets } from '@/lib/actions/hotel';
import MaintenanceView from '@/components/hotel/MaintenanceView';

export const metadata = {
  title: 'Maintenance | CityConnect Hotel Management',
  description: 'Maintenance ticketing for hotel rooms and facilities.',
};

export default async function MaintenancePage() {
  await requireOrgAccess('HOTEL');
  const hotelData = await getHotelAdminData();
  const organizationId = hotelData?.hotel?.id ?? null;
  const tickets = organizationId ? await getMaintenanceTickets(organizationId) : [];

  return (
    <main className="h-full w-full">
      <MaintenanceView
        organizationId={organizationId}
        rooms={hotelData?.rooms ?? []}
        initialTickets={tickets}
      />
    </main>
  );
}
