import { getVerticalsConfig } from '@/lib/actions/verticals-config';
import { getCityEvents } from '@/app/actions/org';
import VerticalPausedNotice from '@/components/cityos/VerticalPausedNotice';
import CityEventsList from '@/components/cityos/CityEventsList';

export const dynamic = 'force-dynamic';

export default async function EventsPage() {
  const [config, events] = await Promise.all([
    getVerticalsConfig(),
    getCityEvents(),
  ]);

  if (!config.events) {
    return <VerticalPausedNotice verticalName="Events" verticalId="events" />;
  }

  return <CityEventsList initialEvents={events} />;
}