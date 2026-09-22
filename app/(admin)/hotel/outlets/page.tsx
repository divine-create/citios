import { requireOrgAccess, resolveTenantOrg } from '@/lib/rbac';
import { getOutletsData, getHotelAdminData } from '@/lib/actions/hotel';
import OutletPOS from '@/components/hotel/OutletPOS';

export const metadata = {
  title: 'Outlets & POS | CityConnect Hotel Management',
  description: 'Restaurant, bar, and club point-of-sale with charge-to-room.',
};

export default async function OutletsPage() {
  const resolvedOrgId = await resolveTenantOrg('HOTEL');
  await requireOrgAccess(resolvedOrgId);
  const hotelData = await getHotelAdminData(resolvedOrgId);
  const organizationId = hotelData?.hotel?.id ?? null;
  const outletsData = organizationId ? await getOutletsData(organizationId) : null;

  return (
    <main className="h-full w-full">
      <OutletPOS
        organizationId={organizationId}
        initialOutlets={outletsData?.outlets ?? []}
        initialItems={outletsData?.items ?? []}
        initialOrders={outletsData?.orders ?? []}
        initialOrderItems={outletsData?.orderItems ?? []}
        checkedInReservations={(hotelData?.reservations ?? []).filter((r: any) => r.status === 'CHECKED_IN')}
        rooms={hotelData?.rooms ?? []}
      />
    </main>
  );
}
