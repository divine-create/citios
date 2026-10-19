import { getStayByIdOrSlug } from '@/lib/actions/stays';
import { getVerticalsConfig } from '@/lib/actions/verticals-config';
import VerticalPausedNotice from '@/components/cityos/VerticalPausedNotice';
import CityStayDetail from '@/components/cityos/CityStayDetail';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function StayDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const config = await getVerticalsConfig();
  if (!config.houses) {
    return <VerticalPausedNotice verticalName="Stay" verticalId="houses" />;
  }

  const { slug } = await params;
  const stay = await getStayByIdOrSlug(slug);
  if (!stay) notFound();

  return <CityStayDetail stay={JSON.parse(JSON.stringify(stay))} />;
}