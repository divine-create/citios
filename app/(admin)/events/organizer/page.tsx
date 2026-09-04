import OrganizerDashboard from "@/components/events/OrganizerDashboard";
import { requireOrgAccess } from '@/lib/rbac';

export default async function OrganizerPage() {
  await requireOrgAccess('EVENT_ORGANIZER');
  return <OrganizerDashboard />;
}
