import React from 'react';
import { db } from '@/src/prisma/db';
import { requireSystemAdmin } from '@/lib/rbac';
import { Building, Search, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import TenantActions from '@/components/hq/TenantActions';
import Link from 'next/link';

export default async function HQTenantsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; type?: string }> }) {
  await requireSystemAdmin();

  const { q, status, type } = await searchParams;

  let query = db.orm.public.Organization.where({});
  
  if (status && status !== 'ALL') {
    query = query.where({ status: status as any });
  }

  if (type && type !== 'ALL') {
    query = query.where({ type: type as any });
  }

  let orgs = await query.all();
  
  if (q) {
    const qLower = q.toLowerCase();
    orgs = orgs.filter(o => o.name.toLowerCase().includes(qLower) || o.id.includes(qLower));
  }
  
  // Sort by newest by default
  orgs.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Tenants & Organizations</h1>
          <p className="text-slate-400 mt-2">Manage all businesses and institutions on CityOS.</p>
        </div>
        <form className="flex gap-3 w-full sm:w-auto" method="GET">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search organizations..." 
              className="w-full bg-slate-900 border border-slate-800 text-white text-sm rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
          <select name="status" defaultValue={status || 'ALL'} className="bg-slate-900 border border-slate-800 text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none">
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
          <select name="type" defaultValue={type || 'ALL'} className="bg-slate-900 border border-slate-800 text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none">
            <option value="ALL">All Types</option>
            <option value="RESTAURANT">Restaurant</option>
            <option value="RETAIL">Retail</option>
            <option value="SCHOOL">School</option>
            <option value="HOTEL">Hotel</option>
            <option value="SERVICES">Services</option>
            <option value="HEALTHCARE">Healthcare</option>
          </select>
          <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl px-6 py-2.5 transition-colors">
            Filter
          </button>
        </form>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/80">
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Organization</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Type</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Created</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {orgs.map((org: any) => (
              <tr key={org.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800/50 flex items-center justify-center shrink-0 border border-slate-700/50">
                      <Building className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <p className="font-black text-white text-sm">{org.name}</p>
                      <p className="text-[11px] text-slate-500 font-medium font-mono mt-0.5">{org.id.split('-')[0]}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <Badge variant="default" className="bg-slate-800 text-slate-300 border border-slate-700/50">{org.type}</Badge>
                </td>
                <td className="px-6 py-4">
                  {org.status === 'SUSPENDED' ? (
                    <Badge variant="error" className="bg-red-500/10 text-red-400 border border-red-500/20">Suspended</Badge>
                  ) : (
                    <Badge variant="success" className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Active</Badge>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className="text-slate-400 text-sm">{new Date(org.createdAt).toLocaleDateString()}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/hq/tenants/${org.id}`} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 transition-colors tooltip" title="Inspect Tenant">
                      <Eye className="w-4 h-4" />
                    </Link>
                    <TenantActions orgId={org.id} status={org.status} />
                  </div>
                </td>
              </tr>
            ))}
            {orgs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center text-slate-500">
                  <Building className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                  <p className="font-bold text-white">No organizations found</p>
                  <p className="text-sm mt-1">Try adjusting your search or filters.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
