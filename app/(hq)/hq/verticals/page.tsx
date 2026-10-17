import React from 'react';
import { requireSystemAdmin } from '@/lib/rbac';
import { getVerticalsConfig } from '@/lib/actions/verticals-config';
import AdminVerticalsConfig from '@/components/hq/AdminVerticalsConfig';
import { Layers } from 'lucide-react';

export const metadata = {
  title: 'City Verticals Governance - HQ Command',
};

export default async function HQVerticalsPage() {
  await requireSystemAdmin();
  const initialConfig = await getVerticalsConfig();

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-purple-400" />
            <h1 className="text-3xl font-black text-white tracking-tight">City Verticals Master Switch</h1>
          </div>
          <p className="text-slate-400 mt-1">
            Govern which commercial verticals are active across CityOS. Disabled verticals are instantly hidden from residents.
          </p>
        </div>
      </div>

      <AdminVerticalsConfig initialConfig={initialConfig} />
    </div>
  );
}
