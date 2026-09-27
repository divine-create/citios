import React from 'react';
import { db } from '@/src/prisma/db';
import { requireSystemAdmin } from '@/lib/rbac';
import { Users, Search, Shield, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';

export default async function HQUsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireSystemAdmin();

  const { q } = await searchParams;

  let query = db.orm.public.Person.where({});
  
  let allUsers = await query.all();

  if (q) {
    const qLower = q.toLowerCase();
    allUsers = allUsers.filter(u => 
      u.firstName.toLowerCase().includes(qLower) || 
      u.lastName.toLowerCase().includes(qLower) || 
      u.id.includes(qLower)
    );
  }

  // Bound results to 100 for display
  const users = allUsers.slice(0, 100);

  // We should fetch basic membership counts for the displayed users.
  // To avoid N+1, ideally we'd join, but Prisma 8 makes this tricky without raw sql if we don't have the relations easily available.
  // Given we are bounded to 100, we can do parallel counts.
  const membershipsCounts = await Promise.all(
    users.map(u => db.orm.public.Membership.where({ personId: u.id }).count())
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Citizens & Users</h1>
          <p className="text-slate-400 mt-2">Manage all registered individuals across the city.</p>
        </div>
        <form className="flex gap-3 w-full sm:w-auto" method="GET">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text" 
              name="q"
              defaultValue={q}
              placeholder="Search by name or ID..." 
              className="w-full bg-slate-900 border border-slate-800 text-white text-sm rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-blue-500/50"
            />
          </div>
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-6 py-2.5 transition-colors">
            Search
          </button>
        </form>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/80">
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Citizen</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Memberships</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Privilege</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {users.map((u: any, idx: number) => (
              <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-800/50 flex items-center justify-center shrink-0 border border-slate-700/50">
                      <Users className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <p className="font-black text-white text-sm">{u.firstName} {u.lastName}</p>
                      <p className="text-[11px] text-slate-500 font-medium font-mono mt-0.5">{u.id.split('-')[0]}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-slate-300 font-bold">{membershipsCounts[idx]}</span>
                  <span className="text-slate-500 text-xs ml-1">Orgs</span>
                </td>
                <td className="px-6 py-4">
                  {u.isSystemAdmin ? (
                    <Badge variant="error" className="bg-red-500/10 text-red-400 border border-red-500/20">
                      <Shield className="w-3 h-3 mr-1 inline" /> System Admin
                    </Badge>
                  ) : (
                    <Badge variant="default" className="bg-slate-800 text-slate-300 border border-slate-700/50">Citizen</Badge>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end">
                    <Link href={`/hq/users/${u.id}`} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 transition-colors tooltip" title="Inspect Person">
                      <Eye className="w-4 h-4" />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-16 text-center text-slate-500">
                  <Users className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                  <p className="font-bold text-white">No citizens found</p>
                  <p className="text-sm mt-1">Try adjusting your search.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {allUsers.length > 100 && (
          <div className="p-4 bg-slate-800/20 text-center border-t border-slate-800">
            <p className="text-xs text-slate-500 font-bold">Showing first 100 results. Use search to narrow down.</p>
          </div>
        )}
      </div>
    </div>
  );
}
