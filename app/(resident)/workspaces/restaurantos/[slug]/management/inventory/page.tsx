import React from 'react';
import { requireMembership } from '@/lib/actions/tenant';
import { getInventoryItems, getStockMovements, getOrganizationUnits } from '@/lib/actions/restaurantos';
import InventoryManager from '@/components/restaurantos/management/InventoryManager';

export default async function InventoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requireMembership(slug, ['OWNER', 'MANAGER', 'ADMIN', 'INVENTORY_STAFF', 'CHEF']);

  const [items, movements, units] = await Promise.all([
    getInventoryItems(slug),
    getStockMovements(slug),
    getOrganizationUnits(slug)
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Inventory & Units</h1>
        <p className="text-slate-500 mt-2 max-w-2xl">
          Track raw materials, sub-assemblies, finished goods, and manage units of measurement. Stock levels deduct automatically when recipes are produced or items are sold.
        </p>
      </div>

      <InventoryManager slug={slug} items={items} movements={movements} units={units} />
    </div>
  );
}
