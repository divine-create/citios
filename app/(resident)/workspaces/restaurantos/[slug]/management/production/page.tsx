import React from 'react';
import { requireMembership } from '@/lib/actions/tenant';
import { db } from '@/src/prisma/db';
import ProductionManager from '@/components/restaurantos/management/ProductionManager';
import { getRestaurantOSData } from '@/lib/actions/restaurantos';

export default async function ProductionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requireMembership(slug, ['OWNER', 'MANAGER', 'ADMIN']);

  const settings = await db.orm.public.RestaurantSettings.where({ organizationId: slug }).all().first();
  if (!settings?.enableInventory || !settings?.enableRecipes) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
        <h2 className="text-xl font-black text-slate-900">Production Disabled</h2>
        <p className="text-slate-500 mt-2">Enable both Inventory and Recipes in the Capability Center to use bulk production runs.</p>
      </div>
    );
  }

  // Fetch the data
  const data = await getRestaurantOSData(slug);

  return (
    <div className="p-4 sm:p-8">
      <ProductionManager 
        organizationId={slug}
        recipes={data.recipes || []}
        inventory={data.inventory || []}
        productionRuns={data.productionRuns || []}
      />
    </div>
  );
}
