import { getHotelOrgs } from '@/lib/actions/resident';
import { getVerticalsConfig } from '@/lib/actions/verticals-config';
import VerticalPausedNotice from '@/components/cityos/VerticalPausedNotice';
import CityStayList from '@/components/cityos/CityStayList';

export const dynamic = 'force-dynamic';

export default async function StayPage() {
  const config = await getVerticalsConfig();
  if (!config.houses) {
    return <VerticalPausedNotice verticalName="CityHomes & Stays" verticalId="houses" />;
  }

  const hotels = await getHotelOrgs();
  return <CityStayList hotels={hotels} />;
}