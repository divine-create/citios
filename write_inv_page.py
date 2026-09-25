import os

os.makedirs('app/(resident)/workspaces/restaurantos/[slug]/management/inventory', exist_ok=True)

content = '''import React from 'react';
import { requireMembership } from '@/lib/actions/tenant';
import { getInventoryItems, getStockMovements } from '@/lib/actions/restaurantos';
import InventoryManager from '@/components/restaurantos/management/InventoryManager';

export default async function InventoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requireMembership(slug, ['OWNER', 'MANAGER', 'ADMIN', 'INVENTORY_STAFF', 'CHEF']);

  const [items, movements] = await Promise.all([
    getInventoryItems(slug),
    getStockMovements(slug)
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Inventory</h1>
        <p className="text-slate-500 mt-2 max-w-2xl">
          Track raw materials, sub-assemblies, and finished goods. Stock levels deduct automatically when recipes are produced or items are sold.
        </p>
      </div>

      <InventoryManager slug={slug} items={items} movements={movements} />
    </div>
  );
}
'''

with open('app/(resident)/workspaces/restaurantos/[slug]/management/inventory/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
