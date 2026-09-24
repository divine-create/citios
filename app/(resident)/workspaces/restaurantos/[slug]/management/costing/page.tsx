import React from 'react';
import { requireMembership } from '@/lib/actions/tenant';
import { db } from '@/src/prisma/db';
import CostingDashboard from '@/components/restaurantos/management/CostingDashboard';

export default async function CostingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requireMembership(slug, ['OWNER', 'MANAGER', 'ADMIN']);

  const settings = await db.orm.public.RestaurantSettings.where({ organizationId: slug }).all().first();
  if (!settings?.enableFoodCosting) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
        <h2 className="text-xl font-black text-slate-900">Food Costing Disabled</h2>
        <p className="text-slate-500 mt-2">Enable food costing in the Capability Center to analyze margins.</p>
      </div>
    );
  }

  const menu = await db.orm.public.MenuItem.where({ organizationId: slug }).all();
  const recipes = await db.orm.public.RestaurantRecipe.where({ organizationId: slug }).all();
  const inventory = await db.orm.public.RestaurantInventoryItem.where({ organizationId: slug }).all();
  
  // We should ideally fetch Recipe Ingredients here, but since this is a summary page, 
  // we'll pass the base data to the client component to render the cost states.
  const recipeIds = recipes.map((r: any) => r.id);
  // @ts-ignore
  const ingredients = recipeIds.length > 0 ? await db.orm.public.RestaurantRecipeIngredient.where({ recipeId: { in: recipeIds } }).all() : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Theoretical Food Costing</h1>
        <p className="text-slate-500 mt-2">Analyze ingredient costs and gross margins across your menu.</p>
      </div>

      <CostingDashboard slug={slug} menu={menu} recipes={recipes} ingredients={ingredients} inventory={inventory} settings={settings} />
    </div>
  );
}
