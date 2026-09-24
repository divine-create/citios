import fs from 'fs';

let code = `import { requireOrgAccess, resolveTenantOrg } from '@/lib/rbac';
import { redirect } from 'next/navigation';

export default async function RestaurantOSPage({ searchParams }: { searchParams: Promise<{ org?: string }> }) {
  const resolvedParams = await searchParams;
  let orgId = resolvedParams.org || null;

  if (!orgId) {
    orgId = await resolveTenantOrg('RESTAURANT');
    if (!orgId) redirect('/business');
    await requireOrgAccess(orgId);
  }

  redirect(\`/workspaces/restaurantos/\${orgId}/management/overview\`);
}`;

fs.writeFileSync('app/(admin)/restaurantos/page.tsx', code);
