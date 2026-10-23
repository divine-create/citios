import React from 'react';
import { requireMembership } from '@/lib/actions/tenant';
import { db } from '@/src/prisma/db';
import MenuManager from '@/components/restaurantos/management/MenuManager';
import { getMenuItems, getRecipes } from '@/lib/actions/restaurantos';

export default async function MenuPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requireMembership(slug, ['OWNER', 'MANAGER', 'ADMIN']);

  const [settings, menu, recipes, locations] = await Promise.all([
    db.orm.public.RestaurantSettings.where({ organizationId: slug }).all().first(),
    getMenuItems(slug),
    getRecipes(slug),
    db.orm.public.Location.where({ organizationId: slug }).all(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Menu Items</h1>
        <p className="text-slate-500 mt-2">Manage what your restaurant sells and controls basic pricing.</p>
      </div>

      <MenuManager slug={slug} menu={menu} recipes={recipes} settings={settings} locations={locations} />
    </div>
  );
}
