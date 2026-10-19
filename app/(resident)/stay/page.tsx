import { getAllStays } from '@/lib/actions/stays';
import { getVerticalsConfig } from '@/lib/actions/verticals-config';
import VerticalPausedNotice from '@/components/cityos/VerticalPausedNotice';
import CityStayList from '@/components/cityos/CityStayList';

export const dynamic = 'force-dynamic';

export default async function StayPage() {
  const config = await getVerticalsConfig();
  if (!config.houses) {
    return <VerticalPausedNotice verticalName="Stay" verticalId="houses" />;
  }

  const stays = await getAllStays();
  return <CityStayList hotels={stays} />;
}