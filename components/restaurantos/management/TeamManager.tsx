'use client';

import React, { useState, useMemo } from 'react';
import { Button, Input, Badge, EmptyState } from '@/components/ui';
import { Users, UserPlus, Shield, X, Mail, Trash2, Search, Check } from 'lucide-react';
import { toast } from 'sonner';
import { inviteTeamMember, removeTeamMember } from '@/lib/actions/tenant';
import { useRouter } from 'next/navigation';

const RESTAURANT_ROLES = [
  { id: 'OWNER', label: 'Owner', desc: 'Full business control and finances' },
  { id: 'ADMIN', label: 'Administrator', desc: 'Full settings, team, and operations access' },
  { id: 'MANAGER', label: 'Manager', desc: 'Kitchen, menu, inventory, and shift supervisor' },
  { id: 'CHEF', label: 'Head / Line Chef', desc: 'Kitchen tickets, recipes, batch production' },
  { id: 'CASHIER', label: 'Cashier', desc: 'POS register, payments, and order taking' },
  { id: 'WAITER', label: 'Waiter / Server', desc: 'Dine-in tables, order creation, service' },
  { id: 'HOST', label: 'Host', desc: 'Floor map, reservations, and seating' },
  { id: 'INVENTORY_STAFF', label: 'Inventory / Storekeeper', desc: 'Stock movements, units, and receiving' },
  { id: 'STAFF', label: 'General Staff', desc: 'Basic operational access' },
];

export default function TeamManager({
  slug,
  members = [],
  locations = [],
}: {
  slug: string;
  members: any[];
  locations: any[];
}) {
  const router = useRouter();
  const [isInviting, setIsInviting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['STAFF']);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleRole = (roleId: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleId) ? prev.filter((r) => r !== roleId) : [...prev, roleId]
    );
  };

  const handleInvite = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return toast.error('Email address is required');
    if (selectedRoles.length === 0) return toast.error('Select at least one role');

    setLoading(true);
    try {
      const res: any = await inviteTeamMember({
        organizationId: slug,
        email: trimmedEmail,
        roles: selectedRoles,
      });

      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success(`Team invitation sent to ${trimmedEmail}`);
        setIsInviting(false);
        setEmail('');
        setSelectedRoles(['STAFF']);
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (membershipId: string, name: string) => {
    if (!membershipId) return toast.error('Invalid member ID');
    if (!window.confirm(`Are you sure you want to remove ${name || 'this team member'} from the organization?`)) {
      return;
    }

    try {
      const res: any = await removeTeamMember({
        organizationId: slug,
        membershipId,
      });

      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success('Team member removed');
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to remove team member');
    }
  };

  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;
    const q = searchQuery.toLowerCase().trim();
    return members.filter((m: any) => {
      const first = (m.firstName || m.person?.firstName || '').toLowerCase();
      const last = (m.lastName || m.person?.lastName || '').toLowerCase();
      const em = (m.email || m.person?.email || '').toLowerCase();
      const roles = (Array.isArray(m.roles) ? m.roles : []).map((r: any) => String(r).toLowerCase());
      return first.includes(q) || last.includes(q) || em.includes(q) || roles.some((r: string) => r.includes(q));
    });
  }, [members, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="relative w-full sm:w-72">
          <Input
            placeholder="Search team by name, email, or role..."
            value={searchQuery}
            onChange={(e: any) => setSearchQuery(e.target.value)}
            leftIcon={<Search size={16} className="text-slate-400" />}
          />
        </div>
        <Button
          leftIcon={<UserPlus size={16} />}
          onClick={() => setIsInviting(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
        >
          Invite Member
        </Button>
      </div>

      {/* Invite Member Drawer / Form */}
      {isInviting && (
        <div className="p-6 bg-white border border-emerald-200 rounded-3xl shadow-lg shadow-emerald-900/5 space-y-5 animate-in fade-in slide-in-from-top-2">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">Invite New Team Member</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                The user must have a registered 9jaLive CityOS account with this email address.
              </p>
            </div>
            <button
              onClick={() => setIsInviting(false)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>

          <div className="max-w-xl space-y-4">
            <Input
              label="User Email Address"
              type="email"
              placeholder="e.g. chef@crunchies.calabar"
              value={email}
              onChange={(e: any) => setEmail(e.target.value)}
              leftIcon={<Mail size={16} className="text-slate-400" />}
            />

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Assign Roles (Select one or more)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {RESTAURANT_ROLES.map((r) => {
                  const active = selectedRoles.includes(r.id);
                  return (
                    <button
                      type="button"
                      key={r.id}
                      onClick={() => toggleRole(r.id)}
                      className={`text-left p-3 rounded-xl border text-xs transition-all ${
                        active
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-500/30'
                          : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span>{r.label}</span>
                        {active && <Check size={14} className="text-emerald-600 shrink-0" />}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{r.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setIsInviting(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleInvite}
                isLoading={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                Send Invite
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Team table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {filteredMembers.length === 0 ? (
          <EmptyState
            icon={<Users size={32} />}
            title={searchQuery ? 'No matching team members' : 'No team members yet'}
            description={
              searchQuery
                ? 'Try a different search term.'
                : 'Invite your staff to give them access to the POS, Kitchen, and Management dashboards.'
            }
            action={!searchQuery ? { label: 'Invite Member', onClick: () => setIsInviting(true) } : undefined}
          />
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Team Member</th>
                <th className="px-6 py-4">Assigned Roles</th>
                <th className="px-6 py-4">Locations</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMembers.map((m: any, idx: number) => {
                const memberId = m.membershipId || m.id || `member-${idx}`;
                const firstName = m.firstName || m.person?.firstName || 'Staff';
                const lastName = m.lastName || m.person?.lastName || '';
                const fullName = `${firstName} ${lastName}`.trim() || 'Staff Member';
                const emailAddr = m.email || m.person?.email || 'No email attached';
                const rolesList: string[] = Array.isArray(m.roles) ? m.roles : [];
                const locList: string[] = Array.isArray(m.locations) ? m.locations : [];
                const isOwner = rolesList.includes('OWNER');

                return (
                  <tr key={memberId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-sm shrink-0">
                          {firstName.charAt(0).toUpperCase() || <Users size={16} />}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 leading-snug">{fullName}</p>
                          <p className="text-xs text-slate-500">{emailAddr}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1.5 flex-wrap">
                        {rolesList.length === 0 ? (
                          <span className="text-xs text-slate-400 italic">No roles</span>
                        ) : (
                          rolesList.map((r: string) => {
                            let variant: 'success' | 'teal' | 'default' = 'default';
                            if (r === 'OWNER') variant = 'success';
                            else if (r === 'MANAGER' || r === 'ADMIN') variant = 'teal';
                            return (
                              <Badge key={r} variant={variant} className="font-semibold text-xs">
                                {r}
                              </Badge>
                            );
                          })
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {locList.length > 0 ? (
                        <span className="text-xs font-bold text-slate-700">{locList.length} Location(s)</span>
                      ) : (
                        <span className="text-xs text-slate-400">All Locations</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {!isOwner && (
                        <button
                          type="button"
                          onClick={() => handleRemove(memberId, fullName)}
                          title="Remove team member"
                          className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-2 rounded-xl transition-colors cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
