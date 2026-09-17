import CityCommunityDetail from '@/components/cityos/CityCommunityDetail';

export default async function CityCommunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="py-6">
      <CityCommunityDetail id={id} />
    </div>
  );
}