import CityNewsDetail from '@/components/cityos/CityNewsDetail';

export default async function NewsDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CityNewsDetail id={id} />;
}