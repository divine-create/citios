import React from 'react';
import { requireSystemAdmin } from '@/lib/rbac';
import { getManagedBusinessesList } from '@/lib/actions/hq-managed-business';
import ManagedBusinessesHub from '@/components/hq/ManagedBusinessesHub';

export default async function HQManagedBusinessesPage() {
  await requireSystemAdmin();

  const businesses = await getManagedBusinessesList();

  return (
    <div className="max-w-7xl mx-auto">
      <ManagedBusinessesHub initialBusinesses={businesses} />
    </div>
  );
}
