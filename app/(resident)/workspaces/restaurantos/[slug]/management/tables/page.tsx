import React from 'react';
import { requireMembership } from '@/lib/actions/tenant';
import { getTables } from '@/lib/actions/restaurantos';
import { TablesManager } from '@/components/restaurantos/management/TablesManager';

export const metadata = {
  title: 'Table Management - RestaurantOS',
};

export default async function TablesPage({
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
  const tables = await getTables(slug, locationId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Table Management</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Manage your restaurant's floor plan, table capacities, and live statuses.
          </p>
        </div>
      </div>

      <TablesManager 
        organizationId={slug}
        locationId={locationId}
        initialTables={tables}
      />
    </div>
  );
}
