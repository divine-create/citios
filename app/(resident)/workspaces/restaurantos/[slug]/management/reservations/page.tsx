import React from 'react';
import { requireMembership } from '@/lib/actions/tenant';
import { getReservations, getTables } from '@/lib/actions/restaurantos';
import { ReservationsManager } from '@/components/restaurantos/management/ReservationsManager';

export const metadata = {
  title: 'Reservations - RestaurantOS',
};

export default async function ReservationsPage({
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
  
  const [reservations, tables] = await Promise.all([
    getReservations(slug, locationId),
    getTables(slug, locationId)
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Reservations</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Dine-in table reservations and booking management.
          </p>
        </div>
      </div>

      <ReservationsManager 
        organizationId={slug}
        locationId={locationId}
        initialReservations={reservations}
        tables={tables}
      />
    </div>
  );
}
