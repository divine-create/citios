import React from 'react';
import { requireMembership } from '@/lib/actions/tenant';
import { db } from '@/src/prisma/db';
import CapabilityManager from '@/components/restaurantos/management/CapabilityManager';
import GeneralSettings from '@/components/restaurantos/management/GeneralSettings';

export default async function CapabilitiesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requireMembership(slug, ['OWNER', 'MANAGER', 'ADMIN']);

  const settings = await db.orm.public.RestaurantSettings.where({ organizationId: slug }).all().first();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Settings & Capabilities</h1>
        <p className="text-slate-500 mt-2 max-w-2xl">
          Configure your daily operations, taxes, service fees, and enable advanced capabilities like Inventory or Food Costing to adapt RestaurantOS to your specific needs.
        </p>
      </div>

      <GeneralSettings organizationId={slug} initialSettings={settings} />

      <div className="pt-6 border-t border-slate-200">
        <h2 className="text-xl font-black text-slate-900 mb-6">Advanced Capabilities</h2>
        <CapabilityManager organizationId={slug} initialSettings={settings} />
      </div>
    </div>
  );
}
