import React from 'react';
import { requireMembership } from '@/lib/actions/tenant';
import { getFinancialSummary } from '@/lib/actions/restaurantos';
import { RevenueManager } from '@/components/restaurantos/management/RevenueManager';

export const metadata = {
  title: 'Revenue Analytics - RestaurantOS',
};

export default async function RevenuePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ location?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const locationId = sp.location;

  await requireMembership(slug, ['OWNER', 'ADMIN', 'MANAGER', 'FINANCE'], locationId);
  
  const summary = await getFinancialSummary(slug, locationId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Revenue & Analytics</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Real-time financial performance and order statistics.
          </p>
        </div>
      </div>

      <RevenueManager summary={summary} />
    </div>
  );
}
