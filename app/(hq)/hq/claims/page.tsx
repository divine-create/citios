import { requireSystemAdmin } from '@/lib/rbac';
import { getPendingOrganizationClaims } from '@/lib/actions/claim';
import ClaimsManager from './ClaimsManager';
import { ShieldCheck, Building2 } from 'lucide-react';

export default async function HQClaimsPage() {
  await requireSystemAdmin();

  const pendingClaims = await getPendingOrganizationClaims();

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-amber-400" />
            Business Claims Verification
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Verify ownership requests based on applicant contact and address details before granting OWNER access.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300">
            Pending Claims: <strong className="text-amber-400 font-mono">{pendingClaims.length}</strong>
          </span>
        </div>
      </div>

      {/* Main Review Manager */}
      <ClaimsManager initialClaims={pendingClaims} />
    </div>
  );
}
