import CityJobDetail from '@/components/cityos/CityJobDetail';

export default async function CityJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="py-6">
      <CityJobDetail id={id} />
    </div>
  );
}