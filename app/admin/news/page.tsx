
import { NewsAdminView } from '@/components/NewsAdminView';
import { getNewsAdminData } from '@/lib/actions/news';
import { redirect } from 'next/navigation';
import { requireOrgAccess } from '@/lib/rbac';

export default async function NewsAdminPage() {
  await requireOrgAccess('PUBLISHER');
  const initialData = await getNewsAdminData();
  
  if (!initialData) {
    redirect('/');
  }

  return (
    <div className="flex-1 relative max-h-screen overflow-y-auto bg-slate-50">
        <NewsAdminView initialData={initialData} />
    </div>
  );
}
