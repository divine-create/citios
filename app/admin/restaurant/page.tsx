
import { RestaurantAdminView } from '@/components/RestaurantAdminView';
import { getRestaurantAdminData } from '@/lib/actions/restaurant';
import { redirect } from 'next/navigation';
import { requireOrgAccess } from '@/lib/rbac';

export default async function RestaurantAdminPage() {
  await requireOrgAccess('RESTAURANT');
  const initialData = await getRestaurantAdminData();
  
  if (!initialData) {
    // If no restaurant exists yet, we could show an empty state, 
    // but redirecting to home is safer for now if unseeded.
    redirect('/');
  }

  return (
    <div className="flex-1 relative max-h-screen overflow-y-auto bg-slate-50">
        <RestaurantAdminView initialData={initialData} />
    </div>
  );
}
