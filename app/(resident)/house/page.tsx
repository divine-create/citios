import { getHotelOrgs } from '@/lib/actions/resident';
import CityHouse from '@/components/cityos/CityHouseList';

export const dynamic = 'force-dynamic';

export default async function HouseListPage() {
  const stays = await getHotelOrgs();
  return <CityHouse stays={stays} />;
}