import { getHotelOrgs } from '@/lib/actions/resident';
import CityStayList from '@/components/cityos/CityStayList';

export const dynamic = 'force-dynamic';

export default async function StayPage() {
  const hotels = await getHotelOrgs();
  return <CityStayList hotels={hotels} />;
}