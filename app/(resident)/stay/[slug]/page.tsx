import CityStayDetail from '@/components/cityos/CityStayDetail';

export default async function StayDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <CityStayDetail slug={slug} />;
}