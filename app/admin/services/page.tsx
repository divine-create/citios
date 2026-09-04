
import { ServicesAdminView } from '@/components/ServicesAdminView';
import { getServicesAdminData } from '@/lib/actions/services';
import { redirect } from 'next/navigation';
import { requireOrgAccess } from '@/lib/rbac';

export default async function ServicesAdminPage() {
  await requireOrgAccess('LOGISTICS');
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
