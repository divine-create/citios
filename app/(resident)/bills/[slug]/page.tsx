import CityBillDetail from '@/components/cityos/CityBillDetail';

export default async function BillDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <CityBillDetail slug={slug} />;
}