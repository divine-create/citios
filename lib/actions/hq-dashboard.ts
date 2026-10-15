import { db } from '@/src/prisma/db';
import { requireSystemAdmin } from '@/lib/rbac';
import { getHQMetrics } from '@/lib/actions/hq';

function compareTemporal(a: any, b: any) {
  try {
    if (a?.createdAt && b?.createdAt) {
      return (globalThis as any).Temporal.Instant.compare(b.createdAt, a.createdAt);
    }
  } catch {}
  return 0;
}

export async function getHQCommandCenterData() {
  await requireSystemAdmin();
  const metrics = await getHQMetrics();

  const [
    totalCouriers,
    systemWallet,
    allListings,
    pendingClaims,
    recentOrgs,
    recentAudits,
    recentTransactions,
    cities,
  ] = await Promise.all([
    Promise.all([
      db.orm.public.GigWorkerProfile.all().then((r) => r.length),
      db.orm.public.LogisticsDriverProfile.all().then((r) => r.length),
    ]).then(([gig, driver]) => gig + driver),
    db.orm.public.Wallet.where({ organizationId: null, personId: null }).all().first(),
    db.orm.public.DiscoveryListing.all(),
    db.orm.public.OrganizationClaim.where({ status: 'PENDING' }).all(),
    db.orm.public.Organization.all().then((list) => [...list].sort(compareTemporal).slice(0, 5)),
    db.orm.public.HQAuditEvent.all().then((list) => [...list].sort(compareTemporal).slice(0, 5)),
    db.orm.public.Transaction.all().then((list) => [...list].sort(compareTemporal).slice(0, 5)),
    db.orm.public.City.where({ isActive: true }).all(),
  ]);

  let pendingDiscoveryCount = 0;
  let publishedDiscoveryCount = 0;

  for (const l of allListings) {
    if (l.isActive) {
      publishedDiscoveryCount++;
    } else {
      try {
        const meta = l.metadata ? JSON.parse(l.metadata) : {};
        if (meta.approvalStatus === 'PENDING_REVIEW' || meta.approvalStatus === undefined) {
          pendingDiscoveryCount++;
        }
      } catch {
        pendingDiscoveryCount++;
      }
    }
  }

  return {
    metrics: {
      ...metrics,
      fleet: { total: totalCouriers },
      wallet: systemWallet,
      discovery: {
        pending: pendingDiscoveryCount,
        published: publishedDiscoveryCount,
        total: allListings.length,
      },
      claims: {
        pending: pendingClaims.length,
      },
      cities: {
        total: cities.length,
      },
    },
    activity: {
      recentOrganizations: recentOrgs,
      recentAudits: recentAudits,
      recentTransactions: recentTransactions,
    },
  };
}
