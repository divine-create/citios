import ScannerApp from '@/components/events/ScannerApp';
import { requireOrgAccess, resolveTenantOrg } from '@/lib/rbac';
import { getEventsAdminData } from '@/lib/actions/events';

export default async function ScannerPage({
  searchParams,
}: {
  searchParams?: Promise<{ event?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const selectedEventId = resolvedParams?.event;

  const resolvedOrgId = await resolveTenantOrg('EVENT_ORGANIZER');
  await requireOrgAccess(resolvedOrgId);
  const data = await getEventsAdminData(resolvedOrgId);

  const events = data?.events || [];
  const event = (selectedEventId ? events.find((e: any) => e.id === selectedEventId) : null) || events[0];

  if (!event) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8 text-center font-sans">
        <h2 className="text-xl font-bold">No active events found</h2>
        <p className="text-xs text-zinc-400 mt-1 max-w-sm">
          There are no events registered for this organization to scan admission tickets.
        </p>
      </div>
    );
  }

  return (
    <ScannerApp 
      event={event} 
      tickets={event.tickets || []} 
      registrations={event.registrations || []}
      persons={data?.persons || []} 
      events={events}
    />
  );
}
