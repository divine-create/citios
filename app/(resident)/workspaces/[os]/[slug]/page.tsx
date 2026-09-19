import ShopOSWorkspace from '@/components/cityos/workspaces/ShopOSWorkspace';
import ServiceOSWorkspace from '@/components/cityos/workspaces/ServiceOSWorkspace';
import SchoolOSWorkspace from '@/components/cityos/workspaces/SchoolOSWorkspace';
import RestaurantOSWorkspace from '@/components/cityos/workspaces/RestaurantOSWorkspace';

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

  if (os === 'shopos') return <ShopOSWorkspace slug={slug} />;
  if (os === 'serviceos') return <ServiceOSWorkspace slug={slug} />;
  if (os === 'restaurantos') return <RestaurantOSWorkspace slug={slug} />;
  return <SchoolOSWorkspace slug={slug} />;
}
