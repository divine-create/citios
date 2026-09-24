import React from 'react';
import { requireMembership } from '@/lib/actions/tenant';
import { db } from '@/src/prisma/db';
import CapabilityManager from '@/components/restaurantos/management/CapabilityManager';

export default async function CapabilitiesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requireMembership(slug, ['OWNER', 'MANAGER', 'ADMIN']);

  const settings = await db.orm.public.RestaurantSettings.where({ organizationId: slug }).all().first();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Capabilities</h1>
        <p className="text-slate-500 mt-2 max-w-2xl">
          RestaurantOS adapts to your operational needs. Enable only the capabilities you want to use. You can disable them later without losing your historical data.
        </p>
      </div>

      <CapabilityManager organizationId={slug} initialSettings={settings} />
    </div>
  );
}
