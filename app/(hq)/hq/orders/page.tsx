import React from 'react';
import { requireSystemAdmin } from '@/lib/rbac';
import { getHQManagedOrders } from '@/lib/actions/hq-managed-business';
import HQManagedOrdersConsole from '@/components/hq/HQManagedOrdersConsole';

export default async function HQOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireSystemAdmin();

  const sp = await searchParams;
  const status = typeof sp.status === 'string' ? sp.status : undefined;
  const orgId = typeof sp.orgId === 'string' ? sp.orgId : undefined;

  const orders = await getHQManagedOrders({
    status,
    organizationId: orgId,
  });

  return (
    <div className="max-w-7xl mx-auto">
      <HQManagedOrdersConsole initialOrders={orders} />
    </div>
  );
}
