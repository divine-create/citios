import React from 'react';
import { requireMembership } from '@/lib/actions/tenant';
import { db } from '@/src/prisma/db';
import ModifierManager from '@/components/restaurantos/management/ModifierManager';

export default async function ModifiersPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requireMembership(slug, ['OWNER', 'MANAGER', 'ADMIN']);

  const settings = await db.orm.public.RestaurantSettings.where({ organizationId: slug }).all().first();
  if (!settings?.enableModifiers) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
        <h2 className="text-xl font-black text-slate-900">Modifiers Disabled</h2>
        <p className="text-slate-500 mt-2">Enable modifiers in the Capability Center to use this feature.</p>
      </div>
    );
  }

  const groups = await db.orm.public.ModifierGroup.where({ organizationId: slug }).all();
  const options = await db.orm.public.ModifierOption.all(); // Naive fetch, we filter below anyway
  const inventory = settings.enableInventory ? await db.orm.public.RestaurantInventoryItem.where({ organizationId: slug }).all() : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Modifier Groups</h1>
        <p className="text-slate-500 mt-2">Create groups of options (e.g. Size, Extras) to attach to menu items.</p>
      </div>

      <ModifierManager slug={slug} groups={groups} options={options} inventory={inventory} settings={settings} />
    </div>
  );
}
