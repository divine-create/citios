import React from 'react';
import { requireSystemAdmin } from '@/lib/rbac';
import { getServicesConfig, getServicesProvidersAdminList } from '@/lib/actions/services-config';
import AdminServicesSettings from '@/components/hq/AdminServicesSettings';

export const metadata = {
  title: 'Services Governance & Verification - HQ Command',
};

export const dynamic = 'force-dynamic';

export default async function HQServicesGovernancePage() {
  await requireSystemAdmin();

  const [config, providers] = await Promise.all([
    getServicesConfig(),
    getServicesProvidersAdminList(),
  ]);

  return <AdminServicesSettings initialConfig={config} initialProviders={providers} />;
}
