import React from 'react';
import { requireMembership } from '@/lib/actions/tenant';
import { db } from '@/src/prisma/db';
import VariantManager from '@/components/restaurantos/management/VariantManager';

export default async function VariantsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await requireMembership(slug, ['OWNER', 'MANAGER', 'ADMIN']);

  const settings = await db.orm.public.RestaurantSettings.where({ organizationId: slug }).all().first();
  const menuItems = await db.orm.public.MenuItem.where({ organizationId: slug }).all();
  const variants = await db.orm.public.MenuItemVariant.where({ organizationId: slug }).all();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Menu Variants</h1>
        <p className="text-slate-500 mt-2">
          Configure size, portion, or style variants (e.g. Small, Regular, Large, Family Pack) with distinct prices for each dish or drink.
        </p>
      </div>

      <VariantManager
        slug={slug}
        menuItems={JSON.parse(JSON.stringify(menuItems))}
        variants={JSON.parse(JSON.stringify(variants))}
        settings={settings ? JSON.parse(JSON.stringify(settings)) : null}
      />
    </div>
  );
}
