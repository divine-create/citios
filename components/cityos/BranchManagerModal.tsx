'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Loader2, X, Building, CheckCircle2 } from 'lucide-react';
import { getOrgLocations, createOrgLocation } from '@/lib/actions/business';

interface BranchManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  organizationName: string;
}

export default function BranchManagerModal({
  isOpen,
  onClose,
  organizationId,
  organizationName,
}: BranchManagerModalProps) {
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    name: '',
    address: '',
  });

  async function loadLocations() {
    setLoading(true);
    try {
      const data = await getOrgLocations(organizationId);
      setLocations(data);
    } catch (err: any) {
      console.error('Failed to load locations:', err);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (isOpen && organizationId) {
      loadLocations();
      setShowAdd(false);
      setError('');
      setSuccess('');
    }
  }, [isOpen, organizationId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.name.trim()) {
      setError('Branch name is required.');
      return;
    }

    setSaving(true);
    const res = await createOrgLocation({
      organizationId,
      name: form.name.trim(),
      address: form.address.trim() || undefined,
    });
    setSaving(false);

    if (res.error) {
      setError(res.error);
    } else {
      setSuccess('Branch location added successfully!');
      setForm({ name: '', address: '' });
      setShowAdd(false);
      loadLocations();
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-ink">Branches & Locations</h2>
              <p className="text-xs text-slate-500 font-medium">{organizationName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-200/60 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-xl border border-red-100">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-xl border border-emerald-100 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" /> {success}
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-xs font-black text-slate-600 uppercase tracking-wider">
              Active Branches ({locations.length})
            </p>
            {!showAdd && (
              <button
                onClick={() => setShowAdd(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-800 text-white text-xs font-bold hover:bg-teal-900 transition-all shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Add Branch
              </button>
            )}
          </div>

          {/* Add Branch Form */}
          {showAdd && (
            <form onSubmit={handleCreate} className="p-4 rounded-xl border border-teal-200 bg-teal-50/30 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black text-teal-900">Add New Branch Location</p>
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Cancel
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Branch Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ikeja City Mall Branch, Lekki Phase 1"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Physical Address</label>
                <input
                  type="text"
                  placeholder="e.g. 14 Obafemi Awolowo Way, Ikeja, Lagos"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-teal-800 text-white text-xs font-bold hover:bg-teal-900 disabled:opacity-50"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save Branch
                </button>
              </div>
            </form>
          )}

          {/* Locations list */}
          {loading ? (
            <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-teal-700" />
              <p className="text-xs font-medium">Loading branches...</p>
            </div>
          ) : locations.length === 0 ? (
            <div className="py-10 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 p-6">
              <Building className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">No registered branches yet</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Add your store branches or physical outlets to enable multi-location management.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {locations.map((loc, idx) => (
                <div
                  key={loc.id}
                  className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-start justify-between gap-3 hover:border-slate-200 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 font-black text-xs shrink-0">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="text-xs font-black text-ink">{loc.name}</p>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        {loc.address || 'Address not configured'}
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 shrink-0">
                    Active Branch
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-black bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
