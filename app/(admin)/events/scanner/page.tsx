import ScannerApp from '@/components/events/ScannerApp';
import { requireOrgAccess } from '@/lib/rbac';

export default async function ScannerPage() {
  await requireOrgAccess('EVENT_ORGANIZER');
  return <ScannerApp />;
}
