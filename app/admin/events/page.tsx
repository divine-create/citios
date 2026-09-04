
import { EventsAdminView } from '@/components/EventsAdminView';
import { getEventsAdminData } from '@/lib/actions/events';
import { redirect } from 'next/navigation';
import { requireOrgAccess } from '@/lib/rbac';

export default async function EventsAdminPage() {
  await requireOrgAccess('EVENT_ORGANIZER');
  const initialData = await getEventsAdminData();
  
  if (!initialData) {
    redirect('/');
  }

  return (
    <div className="flex-1 relative max-h-screen overflow-y-auto bg-slate-50">
        <EventsAdminView initialData={initialData} />
    </div>
  );
}
