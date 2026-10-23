import React from 'react';
import { requireMembership } from '@/lib/actions/tenant';
import { getOrganizationUnits, getUnitsWithUsage } from '@/lib/actions/restaurantos';
import UnitManager from '@/components/restaurantos/management/UnitManager';

export default async function UnitsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requireMembership(slug, ['OWNER', 'MANAGER', 'ADMIN', 'INVENTORY_STAFF', 'CHEF']);

  const [units, usage] = await Promise.all([
    getOrganizationUnits(slug),
    getUnitsWithUsage(slug),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Units of Measurement</h1>
        <p className="text-slate-500 mt-2 max-w-2xl">
          Configure standard and custom measurement units for your raw ingredients, prep recipes, and finished goods.
        </p>
      </div>

      <UnitManager slug={slug} initialUnits={units} initialUsage={usage} />
    </div>
  );
}
