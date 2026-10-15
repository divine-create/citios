import React from 'react';
import { inspectOrganization } from '@/lib/actions/hq';
import { requireSystemAdmin } from '@/lib/rbac';
import {
  Building,
  MapPin,
  Users,
  Wallet,
  Activity,
  ShieldAlert,
  ArrowLeft,
  Phone,
  Mail,
  Globe,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Map,
  Eye,
} from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import TenantActions from '@/components/hq/TenantActions';

function formatDate(temporalOrDate: any): string {
  try {
    if (!temporalOrDate) return '-';
    const str = temporalOrDate.toString ? temporalOrDate.toString() : String(temporalOrDate);
    return new Date(str).toLocaleString();
  } catch {
    return '-';
  }
}

export default async function Tenant360Page({ params }: { params: Promise<{ id: string }> }) {
  await requireSystemAdmin();
  const { id } = await params;

  const data = await inspectOrganization(id);
  const org = data.organization;
  const isClaimed = data.memberships.some((m: any) =>
    m.roles?.some((r: any) => r.role === 'OWNER')
  );
  const listing = (data as any).listing;
  const contactPoints = (data as any).contactPoints || [];
  const claims = (data as any).claims || [];
  const pendingClaim = claims.find((c: any) => c.status === 'PENDING');

  let listingStatus = 'UNLISTED';
  if (listing) {
    if (listing.isActive) {
      listingStatus = 'PUBLISHED';
    } else {
      try {
        const meta = listing.metadata ? JSON.parse(listing.metadata) : {};
        listingStatus = meta.approvalStatus || 'PENDING_REVIEW';
      } catch {
        listingStatus = 'PENDING_REVIEW';
      }
    }
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/hq/tenants"
            className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-3xl font-black text-white tracking-tight">{org.name}</h1>
              {org.status === 'SUSPENDED' && (
                <Badge variant="error" className="bg-red-500/10 text-red-400 border border-red-500/20 text-xs py-1">
                  Suspended
                </Badge>
              )}
              {isClaimed ? (
                <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs py-1 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Claimed Owner
                </Badge>
              ) : (
                <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs py-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Unclaimed Profile
                </Badge>
              )}
              {listingStatus === 'PUBLISHED' && (
                <Badge className="bg-teal-500/10 text-teal-400 border border-teal-500/20 text-xs py-1">
                  Live on Explore
                </Badge>
              )}
              {listingStatus === 'PENDING_REVIEW' && (
                <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs py-1">
                  Staging Review
                </Badge>
              )}
            </div>
            <p className="text-slate-400 mt-1 font-mono text-xs">{org.id}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {listing && (
            <a
              href={`/org/${org.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-teal-400 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
            >
              Public Page <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          <TenantActions orgId={org.id} status={org.status} />
        </div>
      </div>

      {pendingClaim && (
        <div className="bg-amber-950/40 border border-amber-800/60 rounded-2xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="text-sm font-bold text-white">Pending Ownership Claim</p>
              <p className="text-xs text-amber-200/80">
                A resident has requested ownership verification for this business profile.
              </p>
            </div>
          </div>
          <Link
            href="/hq/claims"
            className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black"
          >
            Review Claim
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Core Info & Contacts */}
        <div className="col-span-1 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <Building className="w-4 h-4" /> Identity & Type
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-500 font-bold mb-1">Vertical Type</p>
                <Badge className="bg-slate-800 text-slate-300 border border-slate-700">{org.type}</Badge>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold mb-1">Registered Address</p>
                <p className="text-xs text-slate-300 leading-relaxed">{org.address || 'No primary address recorded'}</p>
              </div>
              {org.description && (
                <div>
                  <p className="text-xs text-slate-500 font-bold mb-1">Description</p>
                  <p className="text-xs text-slate-400 leading-relaxed">{org.description}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-slate-500 font-bold mb-1">Created At</p>
                <p className="text-xs text-slate-300 font-mono">{formatDate(org.createdAt)}</p>
              </div>
            </div>
          </div>

          {/* Contact Points */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
              <Phone className="w-4 h-4" /> Contact Channels ({contactPoints.length})
            </h3>
            <div className="space-y-3">
              {contactPoints.map((cp: any) => (
                <div key={cp.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                      {cp.type}
                    </span>
                    {cp.isPrimary && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-400 font-bold">
                        Primary
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-mono text-white break-all">{cp.value}</p>
                </div>
              ))}
              {contactPoints.length === 0 && (
                <p className="text-xs text-slate-500">No contact points recorded.</p>
              )}
            </div>
          </div>

          {/* Memberships */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
              <Users className="w-4 h-4" /> Memberships ({data.memberships.length})
            </h3>
            <div className="space-y-3">
              {data.memberships.map((m: any) => (
                <div key={m.id} className="flex justify-between items-center bg-slate-800/50 p-3 rounded-xl border border-slate-800">
                  <div className="truncate pr-2">
                    <p className="text-sm font-bold text-white truncate">
                      {m.person.firstName} {m.person.lastName}
                    </p>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {m.roles.map((r: any) => (
                        <Badge key={r.id} className="text-[9px] px-1.5 py-0 bg-slate-700 text-slate-300 border-none">
                          {r.role}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Link
                    href={`/hq/users/${m.personId}`}
                    className="shrink-0 p-1.5 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors tooltip"
                    title="View Person"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
              {data.memberships.length === 0 && (
                <p className="text-xs text-slate-500">Unclaimed: No staff or owners attached.</p>
              )}
            </div>
          </div>
        </div>

        {/* Locations, Wallets & Activity */}
        <div className="col-span-1 md:col-span-2 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Physical Locations */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Physical Locations ({data.locations.length})
                </h3>
              </div>
              <div className="space-y-2.5">
                {data.locations.map((loc: any) => (
                  <div key={loc.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <p className="text-xs font-bold text-white">{loc.name || 'Branch'}</p>
                    <p className="text-xs text-slate-400 mt-1">{loc.address || 'Address unrecorded'}</p>
                    {loc.latitude && loc.longitude && (
                      <p className="text-[10px] text-teal-400 font-mono mt-1">
                        GPS: {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Wallet Balances */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-2">
                <Wallet className="w-4 h-4" /> Wallet Balances
              </h3>
              {data.wallets.length > 0 ? (
                data.wallets.map((w: any) => (
                  <div key={w.id} className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800 mt-2">
                    <div>
                      <p className="text-lg font-black text-white">
                        &#8358;{w.balance.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono mt-1">{w.id}</p>
                    </div>
                    <Link href={`/hq/ledger/wallets/${w.id}`}>
                      <button className="text-xs font-bold text-blue-400 hover:underline">Inspect</button>
                    </Link>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 mt-2">No wallets provisioned.</p>
              )}
              <Link href={`/hq/ledger?org=${org.id}`} className="inline-block mt-4 text-xs font-bold text-blue-400 hover:underline">
                View full ledger history &rarr;
              </Link>
            </div>
          </div>

          {/* Governance Activity */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" /> Governance Audit Events
              </h3>
            </div>
            <div className="divide-y divide-slate-800/50">
              {data.recentAuditEvents.map((audit: any) => (
                <div key={audit.id} className="p-4 hover:bg-slate-800/20 transition-colors flex justify-between items-center">
                  <div>
                    <p className="text-sm font-black text-white">{audit.action}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Actor:{' '}
                      <Link href={`/hq/users/${audit.actorPersonId}`} className="text-emerald-400 hover:underline">
                        {audit.actorPersonId.split('-')[0]}
                      </Link>
                    </p>
                  </div>
                  <span className="text-xs text-slate-500 whitespace-nowrap ml-4">{formatDate(audit.createdAt)}</span>
                </div>
              ))}
              {data.recentAuditEvents.length === 0 && (
                <div className="p-6 text-center text-slate-500 text-xs">No governance actions recorded for this tenant.</div>
              )}
            </div>
          </div>

          {/* Operational Activity */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 bg-slate-900/50">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <Activity className="w-4 h-4" /> Operational Activity
              </h3>
            </div>
            <div className="divide-y divide-slate-800/50">
              {data.recentTransactions.map((tx: any) => (
                <div key={tx.id} className="p-4 hover:bg-slate-800/20 transition-colors flex justify-between items-center">
                  <div>
                    <p className="text-sm font-bold text-white">Transaction</p>
                    <p className="text-xs text-slate-500 mt-0.5">{tx.status}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-mono text-slate-300 font-bold">
                      &#8358;{tx.amount.toFixed(2)}
                    </span>
                    <p className="text-xs text-slate-500 mt-0.5">{formatDate(tx.createdAt)}</p>
                  </div>
                </div>
              ))}
              {data.recentTransactions.length === 0 && (
                <div className="p-6 text-center text-slate-500 text-xs">No recent financial transactions.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
