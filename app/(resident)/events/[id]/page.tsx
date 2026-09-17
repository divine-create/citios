import CityEventDetail from '@/components/cityos/CityEventDetail';

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CityEventDetail id={id} />;
}