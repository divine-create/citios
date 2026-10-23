import React from 'react';
import { requireMembership } from '@/lib/actions/tenant';
import { db } from '@/src/prisma/db';
import RecipeManager from '@/components/restaurantos/management/RecipeManager';

export default async function RecipesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requireMembership(slug, ['OWNER', 'MANAGER', 'ADMIN']);

  let settings = await db.orm.public.RestaurantSettings.where({ organizationId: slug }).all().first();
  if (!settings) {
    settings = await db.orm.public.RestaurantSettings.create({
      organizationId: slug,
      enableRecipes: true,
      enableInventory: true,
    });
  } else if (!settings.enableRecipes || !settings.enableInventory) {
    settings = await db.orm.public.RestaurantSettings.where({ organizationId: slug }).update({
      enableRecipes: true,
      enableInventory: true,
    });
  }

  const recipes = await db.orm.public.RestaurantRecipe.where({ organizationId: slug }).all();
  const menu = await db.orm.public.MenuItem.where({ organizationId: slug }).all();
  const inventory = await db.orm.public.RestaurantInventoryItem.where({ organizationId: slug }).all();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Recipes</h1>
        <p className="text-slate-500 mt-2">Map menu items to inventory ingredients for tracking stock consumption and food costs.</p>
      </div>

      <RecipeManager slug={slug} recipes={recipes} menu={menu} inventory={inventory} settings={settings} />
    </div>
  );
}
