import CityTaskDetail from '@/components/cityos/CityTaskDetail';

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CityTaskDetail id={id} />;
}