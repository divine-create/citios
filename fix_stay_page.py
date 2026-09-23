import sys

with open('app/(resident)/stay/page.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

good = '''import { getHotelOrgs } from '@/lib/actions/resident';
import CityStayList from '@/components/cityos/CityStayList';

export const dynamic = 'force-dynamic';

export default async function StayPage() {
  const hotels = await getHotelOrgs();
  return <CityStayList hotels={hotels} />;
}'''
with open('app/(resident)/stay/page.tsx', 'w', encoding='utf-8') as f:
    f.write(good)
