import React from 'react';
import { db } from '@/src/prisma/db';
import { requireSystemAdmin } from '@/lib/rbac';
import { Users, Search, ShieldAlert, CheckCircle, MoreVertical, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export default async function HQUsersPage() {
  await requireSystemAdmin();

  const users = await db.orm.public.Person.all();

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Citizens & Users</h1>
          <p className="text-slate-400 mt-2">Manage all registered individuals across the city.</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search citizens..." 
              className="bg-slate-900 border border-slate-800 text-white text-sm rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:border-slate-600 w-64"
            />
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/50">
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Citizen</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">ID Reference</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Privilege</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {users.map((u: any) => (
              <tr key={u.id} className="hover:bg-slate-800/20 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <p className="font-black text-white">{u.firstName} {u.lastName}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-400 text-sm font-medium">
                  {u.id.split('-')[0]}...
                </td>
                <td className="px-6 py-4">
                  {u.isSystemAdmin ? (
                    <Badge variant="error" className="bg-red-500/10 text-red-400 border border-red-500/20">
                      <Shield className="w-3 h-3 mr-1 inline" /> System Admin
                    </Badge>
                  ) : (
                    <Badge variant="default" className="bg-slate-800 text-slate-300">Citizen</Badge>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 transition-colors">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
