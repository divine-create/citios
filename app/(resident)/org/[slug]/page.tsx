import OrgProfile from '@/components/cityos/OrgProfile';

export default async function OrgPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <OrgProfile slug={slug} />;
}