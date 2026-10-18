
import { EventsAdminView } from '@/components/EventsAdminView';
import { getEventsAdminData } from '@/lib/actions/events';
import { redirect } from 'next/navigation';
import { requireOrgAccess, resolveTenantOrg } from '@/lib/rbac';

export default async function EventsAdminPage({ searchParams }: { searchParams?: Promise<{ org?: string }> }) {
  const params = searchParams ? await searchParams : {};
  const resolvedOrgId = await resolveTenantOrg('EVENT_ORGANIZER', params.org);
  await requireOrgAccess(resolvedOrgId);
  const initialData = await getEventsAdminData(resolvedOrgId);
  
  if (!initialData) {
    redirect('/');
  }

  return (
    <div className="flex-1 relative max-h-screen overflow-y-auto bg-slate-50">
        <EventsAdminView initialData={initialData} />
    </div>
  );
}
