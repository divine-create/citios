import { requireMembership } from '@/lib/actions/tenant';
import { getKitchenTickets } from '@/lib/actions/restaurantos';
import { getCanonicalOrganization } from '@/app/actions/org';
import KDSWorkspace from '@/components/restaurantos/kds/KDSWorkspace';
import { redirect } from 'next/navigation';

export default async function KDSPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    await requireMembership(slug);
  } catch (err) {
    redirect('/');
  }

  const tickets = await getKitchenTickets(slug);
  const org = await getCanonicalOrganization(slug);

  return <KDSWorkspace initialTickets={tickets} org={org} slug={slug} />;
}
