import React from 'react';
import { requireMembership } from '@/lib/actions/tenant';
import { getRestaurantShifts } from '@/lib/actions/restaurantos';
import { ShiftsManager } from '@/components/restaurantos/management/ShiftsManager';

export const metadata = {
  title: 'Shift Management - RestaurantOS',
};

export default async function ShiftsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ location?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const locationId = sp.location;

  await requireMembership(slug, ['OWNER', 'ADMIN', 'MANAGER'], locationId);
  
  const shifts = await getRestaurantShifts(slug);
  const locationShifts = locationId ? shifts.filter(s => s.locationId === locationId) : shifts;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Shift Management</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Cash register shifts, safe drops, and employee hours.
          </p>
        </div>
      </div>

      <ShiftsManager 
        organizationId={slug}
        locationId={locationId}
        initialShifts={locationShifts}
      />
    </div>
  );
}
