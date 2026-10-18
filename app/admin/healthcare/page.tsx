
import { HealthcareAdminView } from '@/components/HealthcareAdminView';
import { getHealthcareAdminData } from '@/lib/actions/healthcare';
import { redirect } from 'next/navigation';
import { requireOrgAccess, resolveTenantOrg } from '@/lib/rbac';

export default async function HealthcareAdminPage({ searchParams }: { searchParams?: Promise<{ org?: string }> }) {
  const params = searchParams ? await searchParams : {};
  const resolvedOrgId = await resolveTenantOrg(['HEALTHCARE', 'PHARMACY'], params.org);
  await requireOrgAccess(resolvedOrgId);
  const initialData = await getHealthcareAdminData(resolvedOrgId);
  
  if (!initialData) {
    redirect('/');
  }

  return (
    <div className="flex-1 relative max-h-screen overflow-y-auto bg-slate-50">
        <HealthcareAdminView initialData={initialData} />
    </div>
  );
}
