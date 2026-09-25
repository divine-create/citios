import React from 'react';
import { requireMembership } from '@/lib/actions/tenant';
import { getExpenses } from '@/lib/actions/restaurantos';
import { ExpensesManager } from '@/components/restaurantos/management/ExpensesManager';

export const metadata = {
  title: 'Expenses - RestaurantOS',
};

export default async function ExpensesPage({
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
  
  const expenses = await getExpenses(slug, locationId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Expenses</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Payouts, operating expenses, and cash drawer withdrawals.
          </p>
        </div>
      </div>

      <ExpensesManager 
        organizationId={slug}
        locationId={locationId}
        initialExpenses={expenses}
      />
    </div>
  );
}
