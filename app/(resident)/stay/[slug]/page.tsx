import { getStayByIdOrSlug } from '@/lib/actions/stays';
import { getVerticalsConfig } from '@/lib/actions/verticals-config';
import VerticalPausedNotice from '@/components/cityos/VerticalPausedNotice';
import CityStayDetail from '@/components/cityos/CityStayDetail';
import { notFound } from 'next/navigation';
import { getOrganizationReviews } from '@/lib/actions/reviews';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/src/prisma/db';

export const dynamic = 'force-dynamic';

export default async function StayDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const config = await getVerticalsConfig();
  if (!config.houses) {
    return <VerticalPausedNotice verticalName="Stay" verticalId="houses" />;
  }

  const { slug } = await params;
  const stay = await getStayByIdOrSlug(slug);
  if (!stay) notFound();

  const orgId = stay.organizationId || (stay.isHotelOrg ? stay.id : null);
  let reviewsBundle = null;
  if (orgId) {
    try {
      reviewsBundle = await getOrganizationReviews(orgId);
    } catch (err) {
      console.error('[StayDetailPage] Failed to fetch organization reviews:', err);
    }
  }

  const session = await getServerSession(authOptions);
  const isLoggedIn = Boolean(session?.user?.personId);
  let isManager = Boolean(stay.canManage);

  if (!isManager && session?.user?.personId && orgId) {
    try {
      const membership = await db.orm.public.Membership.where({
        organizationId: orgId,
        personId: session.user.personId,
      }).first();
      if (membership) {
        isManager = true;
      }
    } catch {}
  }

  return (
    <CityStayDetail
      stay={JSON.parse(JSON.stringify(stay))}
      reviewsBundle={reviewsBundle ? JSON.parse(JSON.stringify(reviewsBundle)) : null}
      isManager={isManager}
      isLoggedIn={isLoggedIn}
    />
  );
}