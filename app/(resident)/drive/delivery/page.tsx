import DeliveryTrack from '@/components/cityos/DeliveryTrack';
import { getPublicDeliveryTracking } from '@/lib/actions/logistics-tracking';

export const dynamic = 'force-dynamic';

export default async function DeliveryTrackPage({
  searchParams,
}: {
  searchParams?: Promise<{ ref?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const ref = resolvedParams?.ref;
  const trackingData = ref ? await getPublicDeliveryTracking(ref) : null;

  return <DeliveryTrack initialTracking={trackingData} initialRef={ref} />;
}
