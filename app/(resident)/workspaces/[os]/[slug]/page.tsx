import ShopDashboard from '@/components/retail/ShopDashboard';
import ServiceOSWorkspace from '@/components/cityos/workspaces/ServiceOSWorkspace';
import SchoolOSWorkspace from '@/components/cityos/workspaces/SchoolOSWorkspace';
import RestaurantOSWorkspace from '@/components/cityos/workspaces/RestaurantOSWorkspace';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/src/prisma/db';

// Workspace OS kinds. The slug is an organization id; access is governed
// server-side by membership inside each workspace's data actions.
const VALID_OS = new Set(['shopos', 'serviceos', 'schoolos', 'restaurantos']);

export default async function WorkspacePage({ params }: { params: Promise<{ os: string; slug: string }> }) {
  const { os, slug } = await params;

  if (!VALID_OS.has(os)) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-4">
        <p className="text-5xl">🚫</p>
        <h1 className="text-lg font-black text-ink">Unknown workspace type.</h1>
        <p className="text-[12px] text-slate-400 font-medium">Open your organization from the business dashboard.</p>
      </div>
    );
  }

  const session = await getServerSession(authOptions);
  let userRole: 'OWNER' | 'MANAGER' | 'CASHIER' | 'INVENTORY_STAFF' = 'OWNER';
  const currentUserId = session?.user?.personId || '';

  if (session?.user?.personId) {
    const membership = await db.orm.public.Membership.where({
      organizationId: slug,
      personId: session.user.personId,
    }).all().first();

    if (membership) {
      const roles = await db.orm.public.MembershipRole.where({ membershipId: membership.id }).all();
      const rawRole = roles[0]?.role;
      if (rawRole === 'MANAGER' || rawRole === 'CASHIER' || rawRole === 'INVENTORY_STAFF') {
        userRole = rawRole;
      } else {
        userRole = 'OWNER';
      }
    }
  }

  if (os === 'shopos') {
    return (
      <ShopDashboard
        organizationId={slug}
        userRole={userRole}
        currentUserId={currentUserId}
      />
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 w-full h-full bg-[#F4F7FC]">
      <div className="max-w-7xl mx-auto">
        {os === 'serviceos' && <ServiceOSWorkspace slug={slug} />}
        {os === 'restaurantos' && <RestaurantOSWorkspace slug={slug} />}
        {os === 'schoolos' && <SchoolOSWorkspace slug={slug} />}
      </div>
    </div>
  );
}

