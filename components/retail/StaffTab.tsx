"use client";

import { useState, useEffect } from "react";
import { Plus, X, Trash2 } from "lucide-react";
import { inputCls, selectCls, TableSkeleton } from "./ShopUI";
import { getStaff, addStaffMember, updateStaffRole, removeStaffMember } from '@/lib/actions/retail';


// =====================================================================
// Staff
// =====================================================================

const STAFF_ROLE_OPTIONS = ["MANAGER", "CASHIER", "INVENTORY_STAFF"];

export function StaffTab({ organizationId, userRole }: { organizationId: string; userRole: string }) {
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState({ email: "", name: "", role: "CASHIER" });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    const rows = await getStaff(organizationId);
    setStaff(rows);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  const canManage = ["OWNER", "ADMIN", "MANAGER"].includes(userRole);

  const submit = async () => {
    setError(null);
    if (!form.email.trim()) { setError("Email is required."); return; }
    setIsSaving(true);
    try {
      const res = await addStaffMember({ organizationId, email: form.email, name: form.name || undefined, role: form.role });
      if (res && typeof res === 'object' && 'error' in res && res.error) { setError(res.error); return; }
      setForm({ email: "", name: "", role: "CASHIER" });
      setIsAddOpen(false);
      load();
    } finally {
      setIsSaving(false);
    }
  };

  const changeRole = async (membershipId: string, role: string) => {
    setSavingId(membershipId);
    setError(null);
    try {
      const res = await updateStaffRole({ organizationId, membershipId, role });
      if (res && typeof res === 'object' && 'error' in res && res.error) { alert(res.error); return; }
      load();
    } finally {
      setSavingId(null);
    }
  };

  const remove = async (membershipId: string, name: string) => {
    if (!confirm(`Remove ${name} from this store?`)) return;
    const res = await removeStaffMember({ organizationId, membershipId });
    if (res && typeof res === 'object' && 'error' in res && res.error) { alert(res.error); return; }
    load();
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-ink">Staff</h2>
        <button onClick={() => setIsAddOpen(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm">
          <Plus size={16} /> Add Staff
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
            <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Roles</th>{canManage && <th className="px-4 py-3 text-right">Actions</th>}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <TableSkeleton cols={canManage ? 4 : 3} />
            ) : staff.length === 0 ? (
              <tr><td colSpan={canManage ? 4 : 3} className="px-4 py-6 text-center text-slate-400">No staff yet.</td></tr>
            ) : (
              staff.map((s) => {
                const shopRole = STAFF_ROLE_OPTIONS.find((r) => s.roles.includes(r));
                const isOwner = s.roles.includes("OWNER");
                return (
                  <tr key={s.membershipId} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold flex-shrink-0">{s.name.slice(0, 2).toUpperCase()}</div>
                        <span className="font-semibold text-slate-800">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{s.email ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {s.roles.map((r: string) => (
                          <span key={r} className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${r === "OWNER" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700"}`}>{r === "INVENTORY_STAFF" ? "Inventory Staff" : r}</span>
                        ))}
                      </div>
                    </td>
                    {canManage && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {!isOwner && shopRole && (
                            <select
                              value={shopRole}
                              disabled={savingId === s.membershipId}
                              onChange={(e) => changeRole(s.membershipId, e.target.value)}
                              className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white disabled:opacity-50"
                            >
                              {STAFF_ROLE_OPTIONS.map((r) => (
                                <option key={r} value={r}>{r === "INVENTORY_STAFF" ? "Inventory Staff" : r.charAt(0) + r.slice(1).toLowerCase()}</option>
                              ))}
                            </select>
                          )}
                          {isOwner && <span className="text-xs text-amber-600 font-semibold">Owner</span>}
                          {!isOwner && (
                            <button onClick={() => remove(s.membershipId, s.name)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Remove from store">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table></div>
      </div>

      <p className="text-xs text-slate-400 max-w-lg">
        New staff sign in with the email you add here — they can use Google sign-in or the demo password login in development.
        They&apos;ll land on the ShopOS dashboard automatically.
      </p>

      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-800">Add Staff Member</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={22} /></button>
            </div>
            <div className="p-6 space-y-3">
              {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">{error}</div>}
              <input placeholder="Email *" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={inputCls} autoFocus />
              <input placeholder="Full name (optional)" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} />
              <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} className={selectCls}>
                {STAFF_ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r === "INVENTORY_STAFF" ? "Inventory Staff" : r.charAt(0) + r.slice(1).toLowerCase()}</option>)}
              </select>
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setIsAddOpen(false)} className="px-4 py-2 font-semibold text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
              <button onClick={submit} disabled={isSaving} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-lg">
                {isSaving ? "Saving..." : "Add Staff"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
