import React from 'react';
import { requireSystemAdmin } from '@/lib/rbac';
import { getManagedBusinessFullDetails } from '@/lib/actions/hq-managed-business';
import ManagedBusinessStudio from '@/components/hq/ManagedBusinessStudio';

export default async function HQManagedBusinessDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSystemAdmin();
  const { id } = await params;

  const businessData = await getManagedBusinessFullDetails(id);

  return (
    <div className="max-w-7xl mx-auto">
      <ManagedBusinessStudio businessData={businessData} />
    </div>
  );
}
