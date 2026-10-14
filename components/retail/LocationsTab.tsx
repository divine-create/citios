"use client";

import { useState, useEffect } from "react";
import { Plus, X, Trash2, Pencil } from "lucide-react";
import { inputCls, selectCls, TableSkeleton } from "./ShopUI";
import { getLocations, createLocation, updateLocation, deleteLocation } from '@/lib/actions/retail';
import { getCityRegistry } from "@/app/actions/city";


// =====================================================================
// Locations
// =====================================================================

export function LocationsTab({ organizationId }: { organizationId: string }) {
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", address: "", state: "", lga: "" });
  const [cityRegistry, setCityRegistry] = useState<Array<{ state: string; lgas: Array<{ slug: string; name: string }> }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const selectedStateOptions = cityRegistry.map((entry) => entry.state);
  const selectedLgaOptions = cityRegistry.find((entry) => entry.state === form.state)?.lgas ?? [];

  const parseLocationAddress = (value?: string | null) => {
    const text = value ?? "";
    const stateMatch = text.match(/State:\s*([^|]+)/i);
    const lgaMatch = text.match(/LGA:\s*([^|]+)/i);
    const streetMatch = text.match(/Address:\s*([^|]+)/i);
    const state = stateMatch ? stateMatch[1].trim() : "";
    const lga = lgaMatch ? lgaMatch[1].trim() : "";
    const address = streetMatch ? streetMatch[1].trim() : text.replace(/\s*\|\s*LGA:\s*[^|]+/gi, '').replace(/\s*\|\s*State:\s*[^|]+/gi, '').trim();
    return { state, lga, address };
  };

  const serializeLocationAddress = (address: string, state: string, lga: string) => {
    const segments = [
      address?.trim() ? `Address: ${address.trim()}` : null,
      state ? `State: ${state}` : null,
      lga ? `LGA: ${lga}` : null,
    ].filter(Boolean);
    return segments.join(' | ');
  };

  const load = async () => {
    const rows = await getLocations(organizationId);
    setLocations(rows);
    setLoading(false);
  };

  useEffect(() => {
    load();
    getCityRegistry().then((rows) => setCityRegistry(rows)).catch(() => setCityRegistry([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  const openAdd = () => {
    setEditId(null);
    setForm({ name: "", address: "", state: "", lga: "" });
    setError(null);
    setIsAddOpen(true);
  };

  const openEdit = (l: any) => {
    const parsed = parseLocationAddress(l.address ?? "");
    setEditId(l.id);
    setForm({
      name: l.name,
      address: parsed.address,
      state: parsed.state,
      lga: parsed.lga,
    });
    setError(null);
    setIsAddOpen(true);
  };

  const submit = async () => {
    setError(null);
    if (!form.name.trim()) { setError("Location name is required."); return; }
    if (!form.state || !form.lga) { setError("Please select a state and local government."); return; }
    setIsSaving(true);
    try {
      const resolvedAddress = serializeLocationAddress(form.address, form.state, form.lga);
      if (editId) {
        const res = await updateLocation(editId, { name: form.name, address: resolvedAddress || null });
        if (res && typeof res === 'object' && 'error' in res && res.error) { setError(res.error); return; }
      } else {
        const res = await createLocation({ organizationId, name: form.name, address: resolvedAddress || undefined });
        if (res && typeof res === 'object' && 'error' in res && res.error) { setError(res.error); return; }
      }
      setForm({ name: "", address: "", state: "", lga: "" });
      setIsAddOpen(false);
      load();
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this location?")) return;
    const res = await deleteLocation(id);
    if (res && typeof res === 'object' && 'error' in res && res.error) { alert(res.error); return; }
    load();
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-ink">Locations</h2>
        <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm">
          <Plus size={16} /> Add Location
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
            <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Address</th><th className="px-4 py-3 text-right">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <TableSkeleton cols={3} />
            ) : locations.length === 0 ? (
              <tr><td colSpan={3} className="px-4 py-6 text-center text-slate-400">No locations yet — add your first branch.</td></tr>
            ) : (
              locations.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-800">{l.name}</td>
                  <td className="px-4 py-3 text-slate-500">{l.address ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(l)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => remove(l.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table></div>
      </div>

      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-800">{editId ? "Edit Location" : "Add Location"}</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={22} /></button>
            </div>
            <div className="p-6 space-y-3">
              {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">{error}</div>}
              <input placeholder="Location name (e.g. Main Street)" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} autoFocus />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">State</label>
                  <select
                    value={form.state}
                    onChange={(e) => setForm((f) => ({ ...f, state: e.target.value, lga: "" }))}
                    className={selectCls}
                  >
                    <option value="">Select State</option>
                    {selectedStateOptions.map((state) => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Local Government</label>
                  <select
                    value={form.lga}
                    onChange={(e) => setForm((f) => ({ ...f, lga: e.target.value }))}
                    disabled={!form.state}
                    className={selectCls}
                  >
                    <option value="">{form.state ? `Choose LGA in ${form.state}` : 'Select State first'}</option>
                    {selectedLgaOptions.map((city) => (
                      <option key={city.slug} value={city.name}>{city.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <textarea placeholder="Street address or landmark (optional)" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} rows={2} className={inputCls} />
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setIsAddOpen(false)} className="px-4 py-2 font-semibold text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
              <button onClick={submit} disabled={isSaving} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-lg">
                {isSaving ? "Saving..." : "Save Location"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
