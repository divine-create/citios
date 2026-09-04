import PickerApp from '@/components/grocery/PickerApp';
import { requireOrgAccess } from '@/lib/rbac';

export default async function PickerPage() {
  await requireOrgAccess('RETAIL');
  return <PickerApp />;
}
