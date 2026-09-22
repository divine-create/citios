import OrganizerDashboard from "@/components/events/OrganizerDashboard";
import { requireOrgAccess, resolveTenantOrg } from '@/lib/rbac';
import { getEventsAdminData } from '@/lib/actions/events';

export default async function OrganizerPage() {
  const resolvedOrgId = await resolveTenantOrg('EVENT_ORGANIZER');
  await requireOrgAccess(resolvedOrgId);
  const data = await getEventsAdminData(resolvedOrgId);
  const event = data?.events?.[0];

  if (!event) {
    return <div className="p-8 text-center">No events found.</div>;
  }

  return <OrganizerDashboard 
    event={event} 
    ticketTiers={event.ticketTiers || []} 
    tickets={event.tickets || []} 
    persons={data?.persons || []} 
  />;
}
