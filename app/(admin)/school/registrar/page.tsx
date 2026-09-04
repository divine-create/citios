import RegistrarDashboard from '@/components/school/RegistrarDashboard';
import { Metadata } from 'next';
import { requireOrgAccess } from '@/lib/rbac';

export const metadata: Metadata = {
  title: 'Admissions & Registrar Portal | CityConnect',
  description: 'Manage prospective students, enrollments, and academic records.',
};

export default async function RegistrarPage() {
  await requireOrgAccess('SCHOOL');
  return <RegistrarDashboard />;
}
