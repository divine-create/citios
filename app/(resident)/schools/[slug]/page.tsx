import CitySchoolDetail from '@/components/cityos/CitySchoolDetail';

export default async function SchoolDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <CitySchoolDetail slug={slug} />;
}