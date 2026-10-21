import Link from 'next/link';
import { resolveLogisticsTenant } from '@/lib/actions/logistics-tenant';
import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/src/prisma/db';
import { getProviderSettlementSummary } from '@/lib/actions/logistics-settlement';
import { Card, Badge, Button } from '@/components/Shared';
import { DollarSign, ArrowUpRight, CheckCircle2, FileText, Wallet } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function SettlementsPage({ searchParams }: { searchParams?: Promise<{ org?: string }> }) {
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

  const summary = await getProviderSettlementSummary(provider.id);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Billing & Settlements</h1>
          <p className="text-slate-500 mt-1">Provider: <span className="font-semibold text-slate-700">{provider.name}</span></p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <FileText className="w-4 h-4 mr-2" /> Download Statement
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="flex flex-col gap-2 bg-gradient-to-br from-teal-900 to-slate-900 text-white">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-full bg-teal-800 flex items-center justify-center text-teal-300">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="text-xs uppercase font-bold text-teal-400">Current</span>
          </div>
          <div>
            <h3 className="text-teal-200 font-bold text-xs uppercase tracking-wider">Wallet Balance</h3>
            <p className="text-3xl font-black text-white mt-1">
              ₦{summary.walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
        </Card>

        <Card className="flex flex-col gap-2">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
            <Badge variant="outline">Gross</Badge>
          </div>
          <div>
            <h3 className="text-slate-500 font-bold text-xs uppercase tracking-wider">Total Billed Volume</h3>
            <p className="text-2xl font-black text-slate-900 mt-1">
              ₦{summary.totalGross.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
        </Card>

        <Card className="flex flex-col gap-2">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <Badge variant="outline">Fees</Badge>
          </div>
          <div>
            <h3 className="text-slate-500 font-bold text-xs uppercase tracking-wider">Platform Deductions</h3>
            <p className="text-2xl font-black text-slate-900 mt-1">
              ₦{summary.totalFees.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
        </Card>

        <Card className="flex flex-col gap-2 border-emerald-200 bg-emerald-50/40">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <Badge className="bg-emerald-100 text-emerald-800">Net</Badge>
          </div>
          <div>
            <h3 className="text-emerald-800 font-bold text-xs uppercase tracking-wider">Total Provider Earnings</h3>
            <p className="text-2xl font-black text-emerald-900 mt-1">
              ₦{summary.totalNet.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
        </Card>
      </div>

      {/* Settlements Table */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-800">Settled Transactions ({summary.recentSettlements.length})</h2>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4">Delivery Ref</th>
                <th className="px-6 py-4">Gross Total</th>
                <th className="px-6 py-4">Platform Fee</th>
                <th className="px-6 py-4">Net Credited</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Settled At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summary.recentSettlements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    No completed settlements recorded yet. Completed deliveries settle automatically upon proof-of-delivery closure.
                  </td>
                </tr>
              ) : (
                summary.recentSettlements.map((s: any) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-slate-800">
                      {s.deliveryJob?.trackingReference || s.deliveryJobId.slice(0, 8)}
                    </td>
                    <td className="px-6 py-4 text-slate-700 font-medium">
                      ₦{Number(s.grossAmount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-orange-600 font-medium">
                      -₦{Number(s.fees).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 font-bold text-emerald-700">
                      +₦{Number(s.providerAmount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="default" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                        {s.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {s.settledAt ? new Date(s.settledAt).toLocaleDateString() : new Date(s.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
