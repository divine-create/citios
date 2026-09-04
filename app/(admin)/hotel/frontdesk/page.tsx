import React from 'react';
import FrontDeskCalendar from '@/components/hotel/FrontDeskCalendar';
import { requireOrgAccess } from '@/lib/rbac';

export const metadata = {
  title: 'Front Desk | CityConnect Hotel Management',
  description: 'Manage reservations, room statuses, and front desk operations.',
};

export default async function FrontDeskPage() {
  await requireOrgAccess('HOTEL');
  return (
    <main className="h-screen w-full overflow-hidden">
      <FrontDeskCalendar />
    </main>
  );
}
