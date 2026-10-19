import React from 'react';
import FrontDeskCalendar from '@/components/hotel/FrontDeskCalendar';
import { requireOrgAccess, resolveTenantOrg } from '@/lib/rbac';
import { getHotelAdminData } from '@/lib/actions/hotel';

export const metadata = {
  title: 'Front Desk | 9jaLive Hotel Management',
  description: 'Manage reservations, room statuses, and front desk operations.',
};

export default async function FrontDeskPage({ searchParams }: { searchParams?: Promise<{ org?: string }> }) {
  const params = searchParams ? await searchParams : {};
  const resolvedOrgId = await resolveTenantOrg('HOTEL', params.org);
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
