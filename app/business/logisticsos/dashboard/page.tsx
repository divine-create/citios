import { resolveLogisticsTenant } from '@/lib/actions/logistics-tenant';
import React from 'react';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/src/prisma/db';
import { getProviderDeliveryOverview, findStuckDeliveries } from '@/lib/actions/logistics-intelligence';
import { getProviderSettlementSummary } from '@/lib/actions/logistics-settlement';
import { Card, Badge, Button } from '@/components/Shared';
import { PackageOpen, MapPin, AlertTriangle, CheckCircle2, Truck, DollarSign, Clock, Send, Plus } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function LogisticsDashboardPage({ searchParams }: { searchParams?: Promise<{ org?: string }> }) {
  const params = searchParams ? await searchParams : {};
  const tenant = await resolveLogisticsTenant(params.org);

  if (!tenant.authorized) {
    return (
      <div className="p-12 text-center max-w-lg mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4 my-8">
        <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
          ⚠️
        </div>
        <h2 className="text-xl font-bold text-slate-800">
          {tenant.error === 'UNAUTHENTICATED' && 'Authentication Required'}
          {tenant.error === 'NO_LOGISTICS_MEMBERSHIP' && 'No Logistics Organization'}
          {tenant.error === 'FORBIDDEN_ORGANIZATION' && 'Access Denied'}
        </h2>
        <p className="text-sm text-slate-500">
          {tenant.error === 'UNAUTHENTICATED' && 'Please sign in to access the CityDrive Business workspace.'}
          {tenant.error === 'NO_LOGISTICS_MEMBERSHIP' && 'You do not have an active membership in any logistics company.'}
          {tenant.error === 'FORBIDDEN_ORGANIZATION' && 'You do not have permission to view records for this organization.'}
        </p>
        <div className="pt-2 flex justify-center gap-3">
          {tenant.error === 'UNAUTHENTICATED' && (
            <Link href="/auth/signin" className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800">
              Sign In
            </Link>
          )}
          {tenant.error === 'NO_LOGISTICS_MEMBERSHIP' && (
            <Link href="/business/register" className="px-4 py-2 bg-teal-700 text-white rounded-xl text-sm font-semibold hover:bg-teal-800">
              Register Logistics Company
            </Link>
          )}
          {tenant.error === 'FORBIDDEN_ORGANIZATION' && (
            <Link href="/business/logisticsos/dashboard" className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50">
              Back to My Workspace
            </Link>
          )}
        </div>
      </div>
    );
  }

  const provider = tenant.provider;

  // Fetch real analytics and settlement metrics
  const [overview, settlements, stuckDeliveries] = await Promise.all([
    getProviderDeliveryOverview(provider.id),
    getProviderSettlementSummary(provider.id),
    findStuckDeliveries({ maxTransitMinutes: 60 }),
  ]);
  
  const recentJobs: any[] = Array.isArray((overview as any).recentJobs) ? (overview as any).recentJobs : [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Live Operations</h1>
          <p className="text-slate-500 mt-1">Provider: <span className="font-semibold text-slate-700">{provider.name}</span></p>
        </div>
        <div className="flex gap-3">
          <Link href="/business/logisticsos/customers">
            <Button variant="outline"><Plus className="w-4 h-4 mr-2" /> Book Delivery</Button>
          </Link>
          <Link href="/business/logisticsos/dispatches">
            <Button variant="primary"><Send className="w-4 h-4 mr-2" /> Dispatch Board</Button>
          </Link>
        </div>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="flex flex-col gap-2">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
            <Badge variant="default">Live</Badge>
          </div>
          <div>
            <h3 className="text-slate-500 font-bold text-xs uppercase tracking-wider">Active Jobs</h3>
            <p className="text-3xl font-black text-slate-900 mt-1">{Math.max(0, overview.deliveries.total - overview.deliveries.completed - overview.deliveries.cancelled)}</p>
          </div>
        </Card>

        <Card className="flex flex-col gap-2">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <Badge className="bg-teal-50 text-teal-700">Completed</Badge>
          </div>
          <div>
            <h3 className="text-slate-500 font-bold text-xs uppercase tracking-wider">Total Completed</h3>
            <p className="text-3xl font-black text-slate-900 mt-1">{overview.deliveries.completed}</p>
          </div>
        </Card>

        <Card className="flex flex-col gap-2">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
            <Badge className="bg-orange-50 text-orange-700">Wallet</Badge>
          </div>
          <div>
            <h3 className="text-slate-500 font-bold text-xs uppercase tracking-wider">Settled Net Earnings</h3>
            <p className="text-3xl font-black text-slate-900 mt-1">
              ₦{settlements.totalNet.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
        </Card>

        <Card className="flex flex-col gap-2 border-red-200 bg-red-50/50">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            {stuckDeliveries.length > 0 && (
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            )}
          </div>
          <div>
            <h3 className="text-red-800 font-bold text-xs uppercase tracking-wider">SLA Breaches / Stuck</h3>
            <p className="text-3xl font-black text-red-700 mt-1">{stuckDeliveries.length}</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Feed (Active Jobs) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800">Dispatch Feed</h2>
            <Link href="/business/logisticsos/dispatches" className="text-xs font-semibold text-teal-700 hover:underline">
              View All Dispatches →
            </Link>
          </div>
          
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-4">Reference</th>
                  <th className="px-6 py-4">Source</th>
                  <th className="px-6 py-4">Destination</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentJobs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-400">No active deliveries recorded.</td>
                  </tr>
                ) : (
                  recentJobs.map((job: any) => (
                    <tr key={job?.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-mono text-slate-700 font-bold">
                        <Link href={`/drive/delivery?ref=${job.trackingReference || job.id}`} className="hover:text-teal-700">
                          {job?.trackingReference || job?.id.slice(0, 8)}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <PackageOpen className="w-4 h-4 text-slate-400" />
                          <span className="font-medium text-slate-800">{job.sourceType || 'DIRECT'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[180px]">{job.dropoffAddress}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={job.status === 'COMPLETED' ? 'default' : 'accent'}>
                          {job.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sidebar Alerts */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-800">Operational Exceptions</h2>
          
          <div className="space-y-4">
            {stuckDeliveries.length === 0 ? (
              <Card className="bg-slate-50 border-dashed text-center p-8">
                <CheckCircle2 className="w-8 h-8 text-teal-400 mx-auto mb-3" />
                <p className="text-slate-500 font-medium text-sm">All deliveries operating on schedule.</p>
              </Card>
            ) : (
              stuckDeliveries.map((stuck) => (
                <Card key={stuck.deliveryId} className="border-red-200 bg-red-50/30">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 bg-red-100 text-red-600 p-2 rounded-lg">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-red-900">Job #{stuck.deliveryId.slice(0, 8)}</h4>
                      <p className="text-sm text-red-700 mt-1">Stuck in <strong>{stuck.currentStatus}</strong></p>
                      <div className="flex items-center gap-1 mt-3 text-xs font-bold text-red-800 uppercase tracking-wider">
                        <Clock className="w-3 h-3" />
                        Breached SLA
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
