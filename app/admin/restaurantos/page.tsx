import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/src/prisma/db';

export default async function AdminRestaurantOSRedirect({ searchParams }: { searchParams: Promise<{ org?: string }> }) {
  const resolvedParams = await searchParams;
  let orgId = resolvedParams.org || null;

  if (!orgId) {
    const session = await getServerSession(authOptions);
    if (session?.user?.personId) {
      const memberships = await db.orm.public.Membership.where({ personId: session.user.personId }).all();
      for (const m of memberships) {
        const org = await db.orm.public.Organization.where({ id: m.organizationId }).all().first();
        if (org && org.type === 'RESTAURANT') {
          orgId = org.id;
          break;
        }
      }
    }
  }

  if (orgId) {
    redirect(`/workspaces/restaurantos/${orgId}`);
  }

  redirect('/restaurantos');
}
