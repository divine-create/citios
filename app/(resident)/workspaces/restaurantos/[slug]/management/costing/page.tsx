import React from 'react';
import { requireMembership } from '@/lib/actions/tenant';
import { db } from '@/src/prisma/db';
import CostingDashboard from '@/components/restaurantos/management/CostingDashboard';
import { getRecipes } from '@/lib/actions/restaurantos';

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

  const [menu, recipesRaw, inventory] = await Promise.all([
    db.orm.public.MenuItem.where({ organizationId: slug }).all(),
    getRecipes(slug),
    db.orm.public.RestaurantInventoryItem.where({ organizationId: slug }).all(),
  ]);
  
  // Auto-heal / match: If any recipe is unlinked to menuItemId but matches a menu item by name, link it
  const recipes = await Promise.all(
    (recipesRaw as any[]).map(async (r) => {
      if (!r.menuItemId && r.name) {
        const matchingMenuItem = (menu as any[]).find(
          (m) => m.name.trim().toLowerCase() === r.name.trim().toLowerCase()
        );
        if (matchingMenuItem) {
          const alreadyClaimed = (recipesRaw as any[]).some(
            (other) => other.id !== r.id && other.menuItemId === matchingMenuItem.id
          );
          if (!alreadyClaimed) {
            await db.orm.public.RestaurantRecipe.where({ id: r.id }).update({ menuItemId: matchingMenuItem.id }).catch(() => {});
            return { ...r, menuItemId: matchingMenuItem.id };
          }
        }
      }
      return r;
    })
  );

  const ingredients = recipes.flatMap((r: any) => r.ingredients || []);

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
