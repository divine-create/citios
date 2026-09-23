import { getEducationOrgs } from '@/lib/actions/resident';
import CitySchoolsList from '@/components/cityos/CitySchoolsList';

export const dynamic = 'force-dynamic';

export default async function SchoolsPage() {
  const schools = await getEducationOrgs();
  return <CitySchoolsList schools={schools} />;
}