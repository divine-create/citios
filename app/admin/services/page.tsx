
import { ServicesAdminView } from '@/components/ServicesAdminView';
import { getServicesAdminData } from '@/lib/actions/services';
import { redirect } from 'next/navigation';
import { requireOrgAccess, resolveTenantOrg } from '@/lib/rbac';

export default async function ServicesAdminPage() {
  const resolvedOrgId = await resolveTenantOrg('LOGISTICS');
  await requireOrgAccess(resolvedOrgId);
  const initialData = await getServicesAdminData();
  
  if (!initialData) {
    redirect('/');
  }

  return (
    <div className="flex-1 relative max-h-screen overflow-y-auto bg-slate-50">
        <ServicesAdminView initialData={initialData} />
    </div>
  );
}

