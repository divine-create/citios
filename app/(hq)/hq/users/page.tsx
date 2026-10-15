import React from 'react';
import { db } from '@/src/prisma/db';
import { requireSystemAdmin } from '@/lib/rbac';
import { Users, Search, Shield, Eye, Mail, Phone } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';

function compareTemporal(a: any, b: any) {
  try {
    if (a?.createdAt && b?.createdAt) {
      return (globalThis as any).Temporal.Instant.compare(b.createdAt, a.createdAt);
    }
  } catch {}
  return 0;
}

export default async function HQUsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireSystemAdmin();

  const { q } = await searchParams;

  const [allUsers, allMemberships, allIdentifiers] = await Promise.all([
    db.orm.public.Person.all(),
    db.orm.public.Membership.all(),
    db.orm.public.PersonIdentifier.all(),
  ]);

  // Index memberships by personId
  const membershipsByPerson = new Map<string, number>();
  for (const m of allMemberships) {
    membershipsByPerson.set(m.personId, (membershipsByPerson.get(m.personId) || 0) + 1);
  }

  // Index primary email and phone by personId
  const identifiersByPerson = new Map<string, { email?: string; phone?: string }>();
  for (const id of allIdentifiers) {
    const existing = identifiersByPerson.get(id.personId) || {};
    if (id.type === 'EMAIL' && !existing.email) {
      existing.email = id.normalizedValue;
    } else if (id.type === 'PHONE' && !existing.phone) {
      existing.phone = id.normalizedValue;
    }
    identifiersByPerson.set(id.personId, existing);
  }

  // Filter users
  let filtered = allUsers;
  if (q) {
    const qLower = q.toLowerCase();
    filtered = filtered.filter((u) => {
      const ids = identifiersByPerson.get(u.id);
      return (
        u.firstName.toLowerCase().includes(qLower) ||
        u.lastName.toLowerCase().includes(qLower) ||
        u.id.includes(qLower) ||
        (ids?.email && ids.email.toLowerCase().includes(qLower)) ||
        (ids?.phone && ids.phone.toLowerCase().includes(qLower))
      );
    });
  }

  // Sort newest first
  filtered.sort(compareTemporal);

  // Bound results to 100 for display
  const users = filtered.slice(0, 100);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Citizens & Users</h1>
          <p className="text-slate-400 mt-2">Manage all registered individuals and system administrators across the city.</p>
        </div>
        <form className="flex gap-3 w-full sm:w-auto" method="GET">
          <div className="relative flex-1 sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search by name, email, phone, or ID..."
              className="w-full bg-slate-900 border border-slate-800 text-white text-sm rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-blue-500/50"
            />
          </div>
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-6 py-2.5 transition-colors">
            Search
          </button>
        </form>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Citizen</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contact Identifiers</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Memberships</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Privilege</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Registered</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {users.map((u: any) => {
                const ids = identifiersByPerson.get(u.id);
                const memCount = membershipsByPerson.get(u.id) || 0;

                return (
                  <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-800/50 flex items-center justify-center shrink-0 border border-slate-700/50">
                          <Users className="w-5 h-5 text-slate-400" />
                        </div>
                        <div>
                          <p className="font-black text-white text-sm">
                            {u.firstName} {u.lastName}
                          </p>
                          <p className="text-[11px] text-slate-500 font-medium font-mono mt-0.5">{u.id.split('-')[0]}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-0.5 text-xs">
                        {ids?.email ? (
                          <div className="flex items-center gap-1.5 text-slate-300 font-mono">
                            <Mail className="w-3.5 h-3.5 text-slate-500" />
                            <span>{ids.email}</span>
                          </div>
                        ) : null}
                        {ids?.phone ? (
                          <div className="flex items-center gap-1.5 text-slate-400 font-mono">
                            <Phone className="w-3.5 h-3.5 text-slate-500" />
                            <span>{ids.phone}</span>
                          </div>
                        ) : null}
                        {!ids?.email && !ids?.phone && (
                          <span className="text-slate-600 italic">No contact attached</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-300 font-bold">{memCount}</span>
                      <span className="text-slate-500 text-xs ml-1">Orgs</span>
                    </td>
                    <td className="px-6 py-4">
                      {u.isSystemAdmin ? (
                        <Badge variant="error" className="bg-red-500/10 text-red-400 border border-red-500/20">
                          <Shield className="w-3 h-3 mr-1 inline" /> System Admin
                        </Badge>
                      ) : (
                        <Badge variant="default" className="bg-slate-800 text-slate-300 border border-slate-700/50">
                          Citizen
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-400 text-sm">
                        {new Date(u.createdAt?.toString?.() || u.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end">
                        <Link
                          href={`/hq/users/${u.id}`}
                          className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors tooltip"
                          title="Inspect Person"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-slate-500">
                    <Users className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                    <p className="font-bold text-white">No citizens found</p>
                    <p className="text-sm mt-1">Try adjusting your search.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 100 && (
          <div className="p-4 bg-slate-800/20 text-center border-t border-slate-800">
            <p className="text-xs text-slate-500 font-bold">
              Showing first 100 of {filtered.length} citizens. Use search to narrow down.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
