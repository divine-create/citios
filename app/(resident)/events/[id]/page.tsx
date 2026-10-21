import { getVerticalsConfig } from '@/lib/actions/verticals-config';
import VerticalPausedNotice from '@/components/cityos/VerticalPausedNotice';
import CityEventDetail from '@/components/cityos/CityEventDetail';

export const dynamic = 'force-dynamic';

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const config = await getVerticalsConfig();
  if (!config.events) {
    return <VerticalPausedNotice verticalName="Events" verticalId="events" />;
  }

  const { id } = await params;
  return <CityEventDetail id={id} />;
}
