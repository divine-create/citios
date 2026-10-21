import Link from 'next/link';
import { resolveLogisticsTenant } from '@/lib/actions/logistics-tenant';
import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/src/prisma/db';
import { getFleetAndDrivers } from '@/lib/actions/logistics-fleet';
import FleetView from './FleetView';

export const dynamic = 'force-dynamic';

export default async function FleetDriversPage({ searchParams }: { searchParams?: Promise<{ org?: string }> }) {
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

  const { vehicles, drivers } = await getFleetAndDrivers(provider.id);

  return (
    <FleetView
      providerId={provider.id}
      providerName={provider.name}
      initialVehicles={vehicles}
      initialDrivers={drivers}
    />
  );
}
