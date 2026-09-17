import ShopOSWorkspace from '@/components/cityos/workspaces/ShopOSWorkspace';
import ServiceOSWorkspace from '@/components/cityos/workspaces/ServiceOSWorkspace';
import SchoolOSWorkspace from '@/components/cityos/workspaces/SchoolOSWorkspace';

export default async function WorkspacePage({ params }: { params: Promise<{ os: string; slug: string }> }) {
  const { os, slug } = await params;

  const osToSlugs: Record<string, Set<string>> = {
    shopos: new Set(['freshmart-calabar', 'mamas-kitchen', 'urban-threads-calabar']),
    serviceos: new Set(['mikes-ac-services', 'calabar-cleancare', 'calabar-moments-photography']),
    schoolos: new Set(['hope-academy', 'cypress-garden-school']),
  };

  const valid = (osToSlugs[os] ?? new Set()).has(slug);

  if (!valid) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-4">
        <p className="text-5xl">🚫</p>
        <h1 className="text-lg font-black text-ink">That demo workspace does not exist.</h1>
        <p className="text-[12px] text-slate-400 font-medium">Open the Demo Access page to pick a real one.</p>
      </div>
    );
  }

  if (os === 'shopos') return <ShopOSWorkspace slug={slug} />;
  if (os === 'serviceos') return <ServiceOSWorkspace slug={slug} />;
  return <SchoolOSWorkspace slug={slug} />;
}