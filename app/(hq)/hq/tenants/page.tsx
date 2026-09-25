import React from 'react';
import { db } from '@/src/prisma/db';
import { requireSystemAdmin } from '@/lib/rbac';
import { Building, Search, ShieldAlert, CheckCircle, XCircle, MoreVertical } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';

export default async function HQTenantsPage() {
  await requireSystemAdmin();

  // Fetch all organizations
  const orgs = await db.orm.public.Organization.all();

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Tenants & Organizations</h1>
          <p className="text-slate-400 mt-2">Manage all businesses and institutions on CityOS.</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search organizations..." 
              className="bg-slate-900 border border-slate-800 text-white text-sm rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:border-slate-600 w-64"
            />
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/50">
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Organization</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Type</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {orgs.map((org: any) => (
              <tr key={org.id} className="hover:bg-slate-800/20 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0">
                      <Building className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <p className="font-black text-white">{org.name}</p>
                      <p className="text-xs text-slate-500 font-medium">ID: {org.id.split('-')[0]}...</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <Badge variant="default" className="bg-slate-800 text-slate-300">{org.type}</Badge>
                </td>
                <td className="px-6 py-4">
                  <Badge variant="success" className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Active</Badge>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 transition-colors">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {orgs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                  No organizations found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
