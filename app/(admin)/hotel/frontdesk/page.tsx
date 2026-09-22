import React from 'react';
import FrontDeskCalendar from '@/components/hotel/FrontDeskCalendar';
import { requireOrgAccess, resolveTenantOrg } from '@/lib/rbac';
import { getHotelAdminData } from '@/lib/actions/hotel';

export const metadata = {
  title: 'Front Desk | CityConnect Hotel Management',
  description: 'Manage reservations, room statuses, and front desk operations.',
};

export default async function FrontDeskPage() {
  const resolvedOrgId = await resolveTenantOrg('HOTEL');
  await requireOrgAccess(resolvedOrgId);
  const data = await getHotelAdminData(resolvedOrgId);

  return (
    <main className="h-screen w-full overflow-hidden">
      <FrontDeskCalendar
        organizationId={data?.hotel?.id ?? null}
        initialRooms={data?.rooms ?? []}
        initialReservations={data?.reservations ?? []}
      />
    </main>
  );
}
