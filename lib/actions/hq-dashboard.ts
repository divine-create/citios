import { db } from '@/src/prisma/db';
import { requireSystemAdmin } from '@/lib/rbac';
import { getHQMetrics } from '@/lib/actions/hq';

export async function getHQCommandCenterData() {
  await requireSystemAdmin();
  const metrics = await getHQMetrics();
  
  const [
    totalCouriers,
    systemWallet,
    recentOrgs,
    recentAudits,
    recentTransactions,
  ] = await Promise.all([
    db.orm.public.GigWorkerProfile.all().then(r => r.length),
    db.orm.public.Wallet.where({ organizationId: null, personId: null }).all().first(),
    db.orm.public.Organization.all().then(list => list.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5)),
    db.orm.public.HQAuditEvent.all().then(list => list.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5)),
    db.orm.public.Transaction.all().then(list => list.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5)),
  ]);

  return {
    metrics: {
      ...metrics,
      fleet: { total: totalCouriers },
      wallet: systemWallet
    },
    activity: {
      recentOrganizations: recentOrgs,
      recentAudits: recentAudits,
      recentTransactions: recentTransactions,
    }
  };
}
