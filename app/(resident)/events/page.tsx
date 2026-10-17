import { getVerticalsConfig } from '@/lib/actions/verticals-config';
import VerticalPausedNotice from '@/components/cityos/VerticalPausedNotice';
import CityEventsList from '@/components/cityos/CityEventsList';

export default async function EventsPage() {
  const config = await getVerticalsConfig();
  if (!config.events) {
    return <VerticalPausedNotice verticalName="CityEvents" verticalId="events" />;
  }

  return <CityEventsList />;
}