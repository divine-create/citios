import AdminDashboard from '@/components/school/AdminDashboard';
import { Metadata } from 'next';
import { requireOrgAccess } from '@/lib/rbac';

export const metadata: Metadata = {
  title: 'Super Admin Portal | CityConnect School Management',
  description: 'Global Command Center for School Administration',
};

export default async function SuperAdminPage() {
  await requireOrgAccess('SCHOOL');
  return <AdminDashboard />;
}
