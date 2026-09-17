import OrgProfile from '@/components/cityos/OrgProfile';

export default async function OrgPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrgProfile id={id} />;
}