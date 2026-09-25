import React from 'react';
import { requireMembership } from '@/lib/actions/tenant';
import { EmptyState } from '@/components/ui';
import { CalendarDays } from 'lucide-react';

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ location?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const locationId = sp.location;

  await requireMembership(slug, ['OWNER', 'ADMIN', 'MANAGER'], locationId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Reservations</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Dine-in table reservations and booking management.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm p-16">
        <EmptyState 
          icon={<CalendarDays size={32} />}
          title="Coming Soon"
          description="This module is scheduled for the next development phase. Stay tuned!"
        />
      </div>
    </div>
  );
}
