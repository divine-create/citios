'use client';

import React, { useState, useEffect } from 'react';
import { getTeamMembers, inviteTeamMember, removeTeamMember } from '@/lib/actions/tenant';
import { PageHeader } from "@/components/restaurant/RestaurantUI";
import { EmptyState, Button, Input, Badge } from '@/components/ui';
import { Users, Mail, Trash2, Shield } from 'lucide-react';

export function TabTeam({ slug }: { slug: string }) {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRoles, setInviteRoles] = useState<string[]>(['CASHIER']);
  const [inviteMsg, setInviteMsg] = useState('');
  const [inviteBusy, setInviteBusy] = useState(false);

  const availableRoles = [
    { id: 'OWNER', label: 'Owner (Full Access)' },
    { id: 'ADMIN', label: 'Admin (Settings & Team)' },
    { id: 'MANAGER', label: 'Manager (Operations)' },
    { id: 'CASHIER', label: 'Cashier (POS)' },
    { id: 'CHEF', label: 'Chef (KDS & Inventory)' },
    { id: 'WAITER', label: 'Waiter (Orders)' },
    { id: 'HOST', label: 'Host (Reservations)' },
    { id: 'STOREKEEPER', label: 'Storekeeper (Inventory)' },
    { id: 'FRONT_DESK', label: 'Front Desk (Hotel)' },
  ];

  async function load() {
    setLoading(true);
    try {
      const data = await getTeamMembers(slug);
      setMembers(data);
    } catch (e: any) {
      console.error(e);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [slug]);

  async function handleInvite() {
    if (!inviteEmail) return;
    setInviteBusy(true);
    setInviteMsg('');
    const res = await inviteTeamMember({
      organizationId: slug,
      email: inviteEmail,
      roles: inviteRoles
    });
    setInviteBusy(false);
    if (res.error) {
      setInviteMsg(res.error);
    } else {
      setShowInvite(false);
      setInviteEmail('');
      setInviteRoles(['CASHIER']);
      load();
    }
  }

  async function handleRemove(id: string) {
    if (!confirm('Are you sure you want to remove this user?')) return;
    await removeTeamMember({ organizationId: slug, membershipId: id });
    load();
  }

  const toggleRole = (role: string) => {
    setInviteRoles(prev => 
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Team & Access" />
      
      {showInvite ? (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 space-y-6">
          <div>
            <button onClick={() => setShowInvite(false)} className="text-sm font-bold text-slate-500 mb-4">&larr; Back to Team</button>
            <h3 className="text-xl font-black text-slate-800">Invite Team Member</h3>
            <p className="text-sm text-slate-500">The user must have already registered a CityOS account using this email.</p>
          </div>
          
          <div className="max-w-md space-y-4">
            <Input 
              label="User Email"
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="e.g. chef@cityos.com"
              leftIcon={<Mail className="w-5 h-5" />}
            />
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Assign Roles</label>
              <div className="grid grid-cols-2 gap-2">
                {availableRoles.map(r => (
                  <label key={r.id} className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-colors ${inviteRoles.includes(r.id) ? 'border-teal-500 bg-teal-50' : 'border-slate-100 hover:bg-slate-50'}`}>
                    <input 
                      type="checkbox" 
                      className="hidden"
                      checked={inviteRoles.includes(r.id)}
                      onChange={() => toggleRole(r.id)}
                    />
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${inviteRoles.includes(r.id) ? 'border-teal-500' : 'border-slate-300'}`}>
                      {inviteRoles.includes(r.id) && <div className="w-2 h-2 bg-teal-500 rounded-full" />}
                    </div>
                    <span className="text-sm font-bold text-slate-700">{r.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {inviteMsg && <p className="text-sm font-bold text-red-500">{inviteMsg}</p>}
            
            <Button onClick={handleInvite} isLoading={inviteBusy} className="w-full">Send Invitation</Button>
          </div>
        </div>
      ) : (
        <>
          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-16 bg-slate-100 rounded-2xl w-full"></div>
              <div className="h-16 bg-slate-100 rounded-2xl w-full"></div>
            </div>
          ) : members.length === 0 ? (
             <EmptyState 
              icon={<Users />}
              title="No Team Members"
              description="Invite your staff to manage the POS, inventory, and operations."
              action={{ label: 'Invite Member', onClick: () => setShowInvite(true) }}
            />
          ) : (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={() => setShowInvite(true)} leftIcon={<Shield className="w-4 h-4" />}>Invite Member</Button>
              </div>
              <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-bold border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4">Team Member</th>
                      <th className="px-6 py-4">Roles</th>
                      <th className="px-6 py-4">Joined</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {members.map(m => (
                      <tr key={m.membershipId} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-800">{m.firstName} {m.lastName}</p>
                          <p className="text-slate-500">{m.email}</p>
                        </td>
                        <td className="px-6 py-4 space-x-1">
                          {m.roles.map((r: string) => (
                            <Badge key={r} variant={r === 'OWNER' ? 'success' : 'default'}>{r}</Badge>
                          ))}
                        </td>
                        <td className="px-6 py-4 text-slate-500">
                          {new Date(m.joinedAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => handleRemove(m.membershipId)} className="text-slate-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
