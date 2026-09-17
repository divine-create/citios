import CityCareDetail from '@/components/cityos/CityCareDetail';

export default async function CareDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <CityCareDetail slug={slug} />;
}