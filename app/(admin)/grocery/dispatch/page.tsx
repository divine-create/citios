import React from 'react';
import DispatchHub from '@/components/grocery/DispatchHub';
import { Metadata } from 'next';
import { requireOrgAccess } from '@/lib/rbac';

export const metadata: Metadata = {
  title: 'Dispatch Hub | Grocery Admin',
  description: 'Coordinate completed orders with CityRide drivers.',
};

export default async function DispatchPage() {
  await requireOrgAccess('RETAIL');
  return (
    <main className="h-full min-h-screen bg-slate-50">
      <DispatchHub />
    </main>
  );
}
