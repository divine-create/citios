'use client';

import React, { useState } from 'react';
import { Button, Input, Badge, EmptyState } from '@/components/ui';
import { Users, UserPlus, Shield, X, MoreHorizontal, Mail, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { inviteTeamMember, removeTeamMember } from '@/lib/actions/tenant';
import { useRouter } from 'next/navigation';

export default function TeamManager({ slug, members, locations }: { slug: string; members: any[]; locations: any[] }) {
  const router = useRouter();
  const [isInviting, setIsInviting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('STAFF');

  const handleInvite = async () => {
    if (!email) return toast.error('Email is required');
    setLoading(true);
    const res: any = await inviteTeamMember({
      organizationId: slug,
      email,
      roles: [role]
    });
    setLoading(false);
    
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success('Team member invited successfully!');
      setIsInviting(false);
      setEmail('');
      setRole('STAFF');
      router.refresh();
    }
  };

  const handleRemove = async (membershipId: string) => {
    if (!window.confirm('Are you sure you want to remove this team member?')) return;
    
    const res: any = await removeTeamMember({
      organizationId: slug,
      membershipId
    });
    
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success('Team member removed');
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="relative">
          <Input placeholder="Search team..." className="w-64" />
        </div>
        <Button leftIcon={<UserPlus size={16} />} onClick={() => setIsInviting(true)}>Invite Member</Button>
      </div>

      {isInviting && (
        <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl animate-in fade-in">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Invite Team Member</h3>
            <button onClick={() => setIsInviting(false)} className="text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Input 
              label="User Email Address" 
              type="email" 
              placeholder="e.g. chef@example.com" 
              value={email}
              onChange={(e: any) => setEmail(e.target.value)}
              leftIcon={<Mail size={16} />}
            />
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Role</label>
              <select 
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="STAFF">Staff</option>
                <option value="CASHIER">Cashier</option>
                <option value="CHEF">Chef</option>
                <option value="MANAGER">Manager</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsInviting(false)}>Cancel</Button>
            <Button onClick={handleInvite} isLoading={loading}>Send Invite</Button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {members.length === 0 ? (
          <EmptyState 
            icon={<Users size={32} />}
            title="No team members yet"
            description="Invite your staff to give them access to the POS, Kitchen, and Management dashboards."
            action={{ label: 'Invite Member', onClick: () => setIsInviting(true) }}
          />
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Team Member</th>
                <th className="px-6 py-4">Roles</th>
                <th className="px-6 py-4">Locations</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.map((m: any) => (
                <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-400">
                        {m.person.firstName?.charAt(0) || <Users size={16} />}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{m.person.firstName} {m.person.lastName}</p>
                        <p className="text-xs text-slate-500">{m.person.email || 'No email'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1 flex-wrap">
                      {m.roles.map((r: string) => (
                        <Badge key={r} variant={r === 'OWNER' ? 'success' : r === 'MANAGER' ? 'teal' : 'default'}>
                          {r}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {m.locations.length > 0 ? (
                      <span className="text-xs font-bold">{m.locations.length} Locations</span>
                    ) : (
                      <span className="text-xs text-slate-400">All Locations</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {!m.roles.includes('OWNER') && (
                      <button onClick={() => handleRemove(m.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-xl transition-colors">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
