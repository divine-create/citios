"use client";

import React, { useState } from "react";
import { Settings, Save, Globe, Calendar, CheckCircle2, AlertCircle } from "lucide-react";
import { updateSchoolSettings, setActiveAcademicYear } from "@/lib/actions/school";

export type TabId = "general" | "academic" | "system";

export const SETTINGS_TABS: { id: TabId; label: string; icon: any }[] = [
  { id: "general", label: "General Settings", icon: Globe },
  { id: "academic", label: "Academic Settings", icon: Calendar },
  { id: "system", label: "System Preferences", icon: Settings },
];

interface SettingsManagerProps {
  organizationId: string;
  activeTab: TabId;
  settings: any;
  school: any;
  academicYears: any[];
  refresh: () => void;
}

export default function SettingsManager({ organizationId, activeTab, settings, school, academicYears, refresh }: SettingsManagerProps) {
  const [form, setForm] = useState({
    name: settings?.name || school?.name || "",
    shortName: settings?.shortName || "",
    address: settings?.address || "",
    phone: settings?.phone || "",
    email: settings?.email || "",
    currentTerm: settings?.currentTerm || 1,
    timezone: settings?.timezone || "UTC",
    currencyCode: settings?.currencyCode || "USD",
    logo: settings?.logo || "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isActivatingYear, setIsActivatingYear] = useState(false);

  const set = (key: keyof typeof form, value: string | number) => setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    setIsSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await updateSchoolSettings(organizationId, form);
      if (res.error) throw new Error(res.error);
      setSaved(true);
      refresh();
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const activateYear = async (academicYearId: string) => {
    setIsActivatingYear(true);
    try {
      await setActiveAcademicYear(academicYearId, organizationId);
      refresh();
    } finally {
      setIsActivatingYear(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800">{SETTINGS_TABS.find((t) => t.id === activeTab)?.label ?? "Settings"}</h1>
        <div className="flex items-center gap-3">
          {saved && <span className="text-sm text-emerald-600 font-medium">Saved</span>}
          <button
            onClick={save}
            disabled={isSaving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <Save size={16} />
            <span>{isSaving ? "Saving..." : "Save Changes"}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        {activeTab === "general" && (
          <div className="max-w-2xl space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">School Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Short Name</label>
                <input
                  type="text"
                  value={form.shortName}
                  onChange={(e) => set("shortName", e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-sm font-semibold text-slate-700">Address</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => set("address", e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Phone</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-sm font-semibold text-slate-700">School Logo URL</label>
                <input
                  type="url"
                  placeholder="https://example.com/logo.png"
                  value={form.logo}
                  onChange={(e) => set("logo", e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                {form.logo && (
                  <div className="mt-2 w-16 h-16 rounded border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center">
                    <img src={form.logo} alt="School Logo" className="max-w-full max-h-full object-contain" />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "academic" && (
          <div className="max-w-2xl space-y-6">
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-slate-800">Current Academic Year</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-5 border border-slate-200 rounded-xl bg-slate-50">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Academic Year</label>
                  <select
                    value={academicYears.find((y) => y.active)?.id || ""}
                    onChange={(e) => e.target.value && activateYear(e.target.value)}
                    disabled={isActivatingYear}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm bg-white disabled:opacity-50"
                  >
                    {academicYears.map((y) => (
                      <option key={y.id} value={y.id}>{y.year} - {y.year + 1}</option>
                    ))}
                    {academicYears.length === 0 && <option value="">No years found</option>}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Current Term</label>
                  <select
                    value={form.currentTerm}
                    onChange={(e) => set("currentTerm", parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                  >
                    <option value={1}>Term 1</option>
                    <option value={2}>Term 2</option>
                    <option value={3}>Term 3</option>
                    <option value={4}>Term 4</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-4 py-3 rounded-lg border border-amber-200">
                <CheckCircle2 size={16} />
                <span>Changing the academic year applies immediately and affects all users' views. Current Term is saved with the button above.</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === "system" && (
          <div className="max-w-2xl space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Timezone</label>
                <select
                  value={form.timezone}
                  onChange={(e) => set("timezone", e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                >
                  <option value="UTC">UTC (Universal Coordinated Time)</option>
                  <option value="America/New_York">Eastern Time (US & Canada)</option>
                  <option value="America/Chicago">Central Time (US & Canada)</option>
                  <option value="America/Denver">Mountain Time (US & Canada)</option>
                  <option value="America/Los_Angeles">Pacific Time (US & Canada)</option>
                  <option value="Europe/London">London</option>
                  <option value="Europe/Paris">Paris</option>
                  <option value="Asia/Tokyo">Tokyo</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Currency</label>
                <select
                  value={form.currencyCode}
                  onChange={(e) => set("currencyCode", e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="AUD">AUD ($)</option>
                  <option value="CAD">CAD ($)</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
