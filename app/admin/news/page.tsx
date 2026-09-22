
import { NewsAdminView } from '@/components/NewsAdminView';
import { getNewsAdminData } from '@/lib/actions/news';
import { redirect } from 'next/navigation';
import { requireOrgAccess, resolveTenantOrg } from '@/lib/rbac';

export default async function NewsAdminPage() {
  const resolvedOrgId = await resolveTenantOrg('PUBLISHER');
  await requireOrgAccess(resolvedOrgId);
  const initialData = await getNewsAdminData(resolvedOrgId);
  
  if (!initialData) {
    redirect('/');
  }

  return (
    <div className="flex-1 relative max-h-screen overflow-y-auto bg-slate-50">
        <NewsAdminView initialData={initialData} />
    </div>
  );
}
