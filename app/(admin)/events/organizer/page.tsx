import OrganizerDashboard from "@/components/events/OrganizerDashboard";
import { requireOrgAccess, resolveTenantOrg } from '@/lib/rbac';
import { getEventsAdminData } from '@/lib/actions/events';

export default async function OrganizerPage({
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
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center">
        <h2 className="text-xl font-black text-slate-900">No events found</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          You haven&apos;t created any events under this organization yet. Create your first event using the Universal Event Creator.
        </p>
      </div>
    );
  }

  return (
    <OrganizerDashboard 
      event={event} 
      ticketTiers={event.ticketTiers || []} 
      tickets={event.tickets || []} 
      registrations={event.registrations || []}
      persons={data?.persons || []} 
      events={events}
    />
  );
}
