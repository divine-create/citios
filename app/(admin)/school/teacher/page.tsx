import TeacherDashboard from '@/components/school/TeacherDashboard';
import { requireOrgAccess } from '@/lib/rbac';

export default async function TeacherPortalPage() {
  await requireOrgAccess('SCHOOL');
  return <TeacherDashboard />;
}
