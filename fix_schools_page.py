import sys

with open('app/(resident)/schools/page.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

good = '''import { getEducationOrgs } from '@/lib/actions/resident';
import CitySchoolsList from '@/components/cityos/CitySchoolsList';

export const dynamic = 'force-dynamic';

export default async function SchoolsPage() {
  const schools = await getEducationOrgs();
  return <CitySchoolsList schools={schools} />;
}'''
with open('app/(resident)/schools/page.tsx', 'w', encoding='utf-8') as f:
    f.write(good)
