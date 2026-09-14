import React, { useState } from "react";
import { updateServiceSettings } from "@/lib/actions/service";

export default function SettingsTab({
  organizationId,
  settings,
  onRefresh,
}: {
  organizationId: string;
  settings: any;
  onRefresh: () => void;
}) {
  const [form, setForm] = useState(
    settings || {
      appointmentsEnabled: true,
      jobsEnabled: false,
      quotesEnabled: false,
      onlineBookingEnabled: false,
      taxRate: 0,
      currencySymbol: "$",
    }
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await updateServiceSettings(organizationId, form);
    setSaving(false);
    onRefresh();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Settings</h2>
        <p className="text-slate-500 text-sm">Configure your service business modules.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 space-y-6">
          
          <div>
            <h3 className="font-bold text-slate-800 mb-4 text-lg">Active Modules</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={form.appointmentsEnabled}
                  onChange={(e) => setForm({ ...form, appointmentsEnabled: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="font-medium text-slate-900">Appointments (Calendar View)</div>
                  <div className="text-xs text-slate-500">Enable time-based scheduling for immediate services.</div>
                </div>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={form.jobsEnabled}
                  onChange={(e) => setForm({ ...form, jobsEnabled: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="font-medium text-slate-900">Jobs (Kanban View)</div>
                  <div className="text-xs text-slate-500">Enable multi-step service requests and tracking.</div>
                </div>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={form.quotesEnabled}
                  onChange={(e) => setForm({ ...form, quotesEnabled: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="font-medium text-slate-900">Quotes & Estimations</div>
                  <div className="text-xs text-slate-500">Generate proposals for customers to approve before jobs.</div>
                </div>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={form.onlineBookingEnabled}
                  onChange={(e) => setForm({ ...form, onlineBookingEnabled: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="font-medium text-slate-900">Online Booking</div>
                  <div className="text-xs text-slate-500">Allow customers to book themselves via CityOS.</div>
                </div>
              </label>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6">
            <h3 className="font-bold text-slate-800 mb-4 text-lg">Financial Rules</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Currency Symbol</label>
                <input
                  type="text"
                  value={form.currencySymbol}
                  onChange={(e) => setForm({ ...form, currencySymbol: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Tax Rate (%)</label>
                <input
                  type="number"
                  value={form.taxRate}
                  onChange={(e) => setForm({ ...form, taxRate: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
          
        </div>
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
