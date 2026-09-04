
import { HealthcareAdminView } from '@/components/HealthcareAdminView';
import { getHealthcareAdminData } from '@/lib/actions/healthcare';
import { redirect } from 'next/navigation';
import { requireOrgAccess } from '@/lib/rbac';

export default async function HealthcareAdminPage() {
  await requireOrgAccess(['HEALTHCARE', 'PHARMACY']);
  const initialData = await getHealthcareAdminData();
  
  if (!initialData) {
    redirect('/');
  }

  return (
    <div className="flex-1 relative max-h-screen overflow-y-auto bg-slate-50">
        <HealthcareAdminView initialData={initialData} />
    </div>
  );
}
