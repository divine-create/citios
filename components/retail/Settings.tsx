"use client";

import React, { useState, useEffect } from 'react';
import {
  Store,
  MapPin,
  Building,
  Settings as SettingsIcon,
  CreditCard,
  Users,
  Loader2,
  Save,
  Image as ImageIcon,
  Plus,
  Trash2,
  X
} from 'lucide-react';
import {
  getRetailSettings,
  updateRetailSettings,
  getLocations,
  createLocation,
  updateLocation,
  deleteLocation,
  getStaff,
  addStaffMember,
  updateStaffRole,
  removeStaffMember
} from '@/lib/actions/retail';
import { getCityRegistry } from "@/app/actions/city";
import { normalizeRetailUnits, DEFAULT_RETAIL_UNITS } from '@/lib/defaultUnits';
import { uploadAsset } from "@/lib/actions/microsite";
import {
  SectionCard,
  ActionCard,
  inputCls,
  Skeleton,
  ErrorState,
  EmptyState
} from './ShopUI';
import Image from 'next/image';

const STAFF_ROLE_OPTIONS = ["MANAGER", "CASHIER", "INVENTORY_STAFF"];

function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const [, base64] = result.split(",");
      resolve({ base64, mimeType: file.type });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Settings({ organizationId, userRole }: { organizationId: string, userRole: string }) {
  const [activeTab, setActiveTab] = useState('PROFILE');
  const [loading, setLoading] = useState(true);

  // Profile / Settings
  const [settings, setSettings] = useState<any>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Locations
  const [locations, setLocations] = useState<any[]>([]);
  const [cityRegistry, setCityRegistry] = useState<any[]>([]);
  const [isAddLocationOpen, setIsAddLocationOpen] = useState(false);
  const [editLocationId, setEditLocationId] = useState<string | null>(null);
  const [locForm, setLocForm] = useState({ name: "", address: "", state: "", lga: "" });
  const [savingLocation, setSavingLocation] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);

  // Staff
  const [staff, setStaff] = useState<any[]>([]);
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [staffForm, setStaffForm] = useState({ email: "", name: "", role: "CASHIER" });
  const [savingStaff, setSavingStaff] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);

  const [newUnit, setNewUnit] = useState('');

  const loadAll = async () => {
    setLoading(true);
    try {
      const [s, locs, st, cities] = await Promise.all([
        getRetailSettings(organizationId),
        getLocations(organizationId),
        getStaff(organizationId),
        getCityRegistry().catch(() => [])
      ]);
      
      if (s) {
        setSettings({
          ...s,
          customUnits: normalizeRetailUnits(s.customUnits),
          bankDetails: JSON.parse(s.bankDetails || '{"bankName":"","accountNumber":"","accountName":""}'),
          shippingRates: JSON.parse(s.shippingRates || '[]'),
        });
      }
      setLocations(locs);
      setStaff(st);
      setCityRegistry(cities);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [organizationId]);

  const handleSaveSettings = async () => {
    if (!settings) return;
    setSavingSettings(true);
    try {
      await updateRetailSettings(organizationId, {
        storeName: settings.storeName,
        storeAddress: settings.storeAddress,
        receiptMessage: settings.receiptMessage,
        taxRate: settings.taxRate,
        currencySymbol: settings.currencySymbol,
        customUnits: settings.customUnits,
        paymentGateway: settings.paymentGateway,
        bankDetails: JSON.stringify(settings.bankDetails),
        shippingRates: JSON.stringify(settings.shippingRates),
      });
      alert("Settings saved successfully.");
    } catch (e) {
      alert("Failed to save settings.");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setUploadingLogo(true);
    try {
      const file = e.target.files[0];
      const { base64, mimeType } = await fileToBase64(file);
      const res = await uploadAsset(organizationId, { fileName: file.name, mimeType, base64Data: base64 });
      if (res && !res.error && res.assetId) {
        setSettings((s: any) => ({ ...s, logoAssetId: res.assetId }));
        await updateRetailSettings(organizationId, { logoAssetId: res.assetId });
      } else {
        alert("Upload failed.");
      }
    } catch (error) {
      alert("Error uploading image");
    } finally {
      setUploadingLogo(false);
    }
  };

  // --- Location Management Helpers ---
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

  const submitLocation = async () => {
    setLocError(null);
    if (!locForm.name.trim()) { setLocError("Location name is required."); return; }
    if (!locForm.state || !locForm.lga) { setLocError("Please select a state and local government."); return; }
    setSavingLocation(true);
    try {
      const resolvedAddress = serializeLocationAddress(locForm.address, locForm.state, locForm.lga);
      if (editLocationId) {
        const res = await updateLocation(editLocationId, { name: locForm.name, address: resolvedAddress || null });
        if (res && typeof res === 'object' && 'error' in res && res.error) { setLocError(res.error); return; }
      } else {
        const res = await createLocation({ organizationId, name: locForm.name, address: resolvedAddress || undefined });
        if (res && typeof res === 'object' && 'error' in res && res.error) { setLocError(res.error); return; }
      }
      setIsAddLocationOpen(false);
      loadAll();
    } finally {
      setSavingLocation(false);
    }
  };

  const handleDeleteLocation = async (id: string) => {
    if (!confirm("Delete this location? This action cannot be undone.")) return;
    await deleteLocation(id);
    loadAll();
  };

  // --- Staff Management Helpers ---
  const canManageAccess = ["OWNER", "ADMIN"].includes(userRole);
  
  const submitStaff = async () => {
    setStaffError(null);
    if (!staffForm.email.trim()) { setStaffError("Email is required."); return; }
    setSavingStaff(true);
    try {
      const res = await addStaffMember({ organizationId, email: staffForm.email, name: staffForm.name || undefined, role: staffForm.role });
      if (res && typeof res === 'object' && 'error' in res && res.error) { setStaffError(res.error); return; }
      setIsAddStaffOpen(false);
      loadAll();
    } finally {
      setSavingStaff(false);
    }
  };

  const handleChangeRole = async (membershipId: string, role: string) => {
    await updateStaffRole({ organizationId, membershipId, role });
    loadAll();
  };

  const handleRemoveStaff = async (membershipId: string, name: string) => {
    if (!confirm(`Remove ${name} from this store?`)) return;
    await removeStaffMember({ organizationId, membershipId });
    loadAll();
  };


  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const TABS = [
    { id: 'PROFILE', label: 'Shop Profile', icon: Store },
    { id: 'LOCATIONS', label: 'Locations', icon: MapPin },
    { id: 'OPERATIONS', label: 'Operations', icon: SettingsIcon },
    { id: 'PAYMENTS', label: 'Payments', icon: CreditCard },
    { id: 'ACCESS', label: 'Access & Team', icon: Users },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-24">
      <div>
        <h2 className="text-2xl font-black text-ink tracking-tight">Merchant Control Plane</h2>
        <p className="text-sm text-slate-500 mt-1">Configure your business identity, operations, and locations.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Sidebar Nav */}
        <div className="w-full md:w-64 flex-shrink-0 space-y-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${
                activeTab === t.id ? "bg-white border border-slate-200 shadow-sm text-brand-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent"
              }`}
            >
              <t.icon size={18} className={activeTab === t.id ? "text-brand-600" : "text-slate-400"} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Workspace Area */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* 1. SHOP PROFILE */}
          {activeTab === 'PROFILE' && settings && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
               <SectionCard title="Public Identity" action={<button onClick={handleSaveSettings} disabled={savingSettings} className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"><Save size={16} /> Save Profile</button>}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1 flex flex-col items-center justify-center p-6 bg-slate-50 border border-slate-100 rounded-xl space-y-4">
                      {settings.logoAssetId ? (
                        <div className="relative group w-32 h-32 rounded-2xl overflow-hidden border border-slate-200 bg-white">
                          <Image src={`/api/assets/${settings.logoAssetId}`} alt="Logo" fill className="object-cover" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <label className="cursor-pointer text-white text-xs font-bold p-2 bg-black/50 rounded-lg backdrop-blur-sm">
                              Change
                              <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
                            </label>
                          </div>
                        </div>
                      ) : (
                        <label className="w-32 h-32 rounded-2xl overflow-hidden border border-slate-200 border-dashed bg-white flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:bg-brand-50 hover:border-brand-200 transition-colors">
                          {uploadingLogo ? <Loader2 size={24} className="animate-spin text-brand-600" /> : <ImageIcon size={24} />}
                          <span className="text-xs font-bold mt-2">Upload Logo</span>
                          <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
                        </label>
                      )}
                      <p className="text-xs text-center text-slate-500 font-medium">Public facing logo for marketplaces and receipts.</p>
                    </div>
                    <div className="md:col-span-2 space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Store Display Name</label>
                        <input value={settings.storeName || ''} onChange={e => setSettings({...settings, storeName: e.target.value})} className={inputCls} placeholder="e.g. My Awesome Store" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Public Store Address</label>
                        <textarea value={settings.storeAddress || ''} onChange={e => setSettings({...settings, storeAddress: e.target.value})} className={inputCls + " min-h-[80px]"} placeholder="Public address visible to customers" />
                      </div>
                    </div>
                  </div>
               </SectionCard>
            </div>
          )}

          {/* 2. LOCATIONS */}
          {activeTab === 'LOCATIONS' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <SectionCard title="Physical Branches" action={<button onClick={() => { setEditLocationId(null); setLocForm({ name: "", address: "", state: "", lga: "" }); setIsAddLocationOpen(true); }} className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-lg flex items-center gap-2"><Plus size={16} /> Add Location</button>}>
                {locations.length === 0 ? (
                  <EmptyState title="No locations configured" message="Add your first physical branch to track inventory and manage staff." icon={MapPin} />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {locations.map(loc => (
                      <div key={loc.id} className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-slate-300 transition-colors flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between">
                            <h4 className="font-bold text-ink text-lg">{loc.name}</h4>
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md text-xs font-bold">Active</span>
                          </div>
                          <p className="text-sm text-slate-500 mt-2 line-clamp-2 min-h-[40px]">{loc.address || "No address provided"}</p>
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                          <button onClick={() => {
                            const parsed = parseLocationAddress(loc.address);
                            setEditLocationId(loc.id);
                            setLocForm({ name: loc.name, address: parsed.address, state: parsed.state, lga: parsed.lga });
                            setIsAddLocationOpen(true);
                          }} className="text-sm font-semibold text-brand-600 hover:text-brand-700">Edit Details</button>
                          <button onClick={() => handleDeleteLocation(loc.id)} className="text-sm font-semibold text-rose-500 hover:text-rose-600">Remove</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </div>
          )}

          {/* 3. OPERATIONS */}
          {activeTab === 'OPERATIONS' && settings && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
               <SectionCard title="Checkout & Taxes" action={<button onClick={handleSaveSettings} disabled={savingSettings} className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"><Save size={16} /> Save Settings</button>}>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Currency Symbol</label>
                      <input value={settings.currencySymbol || ''} onChange={e => setSettings({...settings, currencySymbol: e.target.value})} className={inputCls} placeholder="e.g. ₦, $, £" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tax Rate (%)</label>
                      <input type="number" step="0.01" value={settings.taxRate || 0} onChange={e => setSettings({...settings, taxRate: parseFloat(e.target.value) || 0})} className={inputCls} placeholder="e.g. 7.5" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Receipt Footer Message</label>
                      <textarea value={settings.receiptMessage || ''} onChange={e => setSettings({...settings, receiptMessage: e.target.value})} className={inputCls} placeholder="Thank you for shopping with us!" />
                    </div>
                 </div>
               </SectionCard>
               
               <SectionCard title="Custom Units of Measurement">
                  <div className="flex flex-wrap gap-2 mb-4">
                    {settings.customUnits?.map((unit: string) => (
                      <div key={unit} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 font-semibold text-sm rounded-lg border border-slate-200">
                        {unit}
                        <button onClick={() => setSettings({...settings, customUnits: settings.customUnits.filter((u: string) => u !== unit)})} className="text-slate-400 hover:text-rose-500 transition-colors ml-1"><X size={14} /></button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 max-w-sm">
                    <input value={newUnit} onChange={e => setNewUnit(e.target.value)} onKeyDown={e => {
                      if (e.key === 'Enter' && newUnit.trim()) {
                        e.preventDefault();
                        if (!settings.customUnits.includes(newUnit.trim())) {
                          setSettings({...settings, customUnits: [...settings.customUnits, newUnit.trim()]});
                        }
                        setNewUnit('');
                      }
                    }} placeholder="Add unit (e.g. box, pallet)" className={inputCls} />
                    <button type="button" onClick={() => {
                      if (newUnit.trim() && !settings.customUnits.includes(newUnit.trim())) {
                        setSettings({...settings, customUnits: [...settings.customUnits, newUnit.trim()]});
                        setNewUnit('');
                      }
                    }} className="px-4 bg-brand-100 text-brand-700 font-bold rounded-lg hover:bg-brand-200 transition-colors">Add</button>
                  </div>
               </SectionCard>
            </div>
          )}

          {/* 4. PAYMENTS */}
          {activeTab === 'PAYMENTS' && settings && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <SectionCard title="Settlement Bank Account" action={<button onClick={handleSaveSettings} disabled={savingSettings} className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"><Save size={16} /> Save Bank Details</button>}>
                <div className="grid grid-cols-1 gap-4 max-w-md">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Bank Name</label>
                    <input value={settings.bankDetails?.bankName || ''} onChange={e => setSettings({...settings, bankDetails: {...settings.bankDetails, bankName: e.target.value}})} className={inputCls} placeholder="e.g. Guarantee Trust Bank" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Account Number</label>
                    <input value={settings.bankDetails?.accountNumber || ''} onChange={e => setSettings({...settings, bankDetails: {...settings.bankDetails, accountNumber: e.target.value}})} className={inputCls} placeholder="10-digit account number" maxLength={15} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Account Name</label>
                    <input value={settings.bankDetails?.accountName || ''} onChange={e => setSettings({...settings, bankDetails: {...settings.bankDetails, accountName: e.target.value}})} className={inputCls} placeholder="Registered business name" />
                  </div>
                </div>
              </SectionCard>
            </div>
          )}

          {/* 5. ACCESS & TEAM */}
          {activeTab === 'ACCESS' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <SectionCard title="Staff Directory" action={canManageAccess && <button onClick={() => { setStaffForm({ email: "", name: "", role: "CASHIER" }); setIsAddStaffOpen(true); }} className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-lg flex items-center gap-2"><Plus size={16} /> Invite Staff</button>}>
                <div className="overflow-x-auto -mx-6 md:mx-0 px-6 md:px-0">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <th className="px-4 py-3">Member</th>
                        <th className="px-4 py-3">Email Address</th>
                        <th className="px-4 py-3">Roles</th>
                        {canManageAccess && <th className="px-4 py-3 text-right">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {staff.length === 0 ? (
                        <tr><td colSpan={4} className="py-12 text-center text-slate-400 font-medium">No staff members found.</td></tr>
                      ) : (
                        staff.map((s) => {
                          const shopRole = STAFF_ROLE_OPTIONS.find((r) => s.roles.includes(r));
                          const isOwner = s.roles.includes("OWNER");
                          return (
                            <tr key={s.membershipId} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                    {s.name ? s.name.slice(0, 2).toUpperCase() : "U"}
                                  </div>
                                  <span className="font-semibold text-ink">{s.name || 'Unknown'}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-slate-500 font-medium">{s.email ?? "—"}</td>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-1.5">
                                  {s.roles.map((r: string) => (
                                    <span key={r} className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest ${r === "OWNER" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                                      {r === "INVENTORY_STAFF" ? "INVENTORY" : r}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              {canManageAccess && (
                                <td className="px-4 py-3 text-right">
                                  <div className="flex items-center justify-end gap-3">
                                    {!isOwner && shopRole && (
                                      <select
                                        value={shopRole}
                                        onChange={(e) => handleChangeRole(s.membershipId, e.target.value)}
                                        className="bg-transparent border border-slate-200 text-xs font-bold rounded py-1 px-2 hover:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
                                      >
                                        {STAFF_ROLE_OPTIONS.map((r) => (
                                          <option key={r} value={r}>{r === "INVENTORY_STAFF" ? "Inventory Staff" : r.charAt(0) + r.slice(1).toLowerCase()}</option>
                                        ))}
                                      </select>
                                    )}
                                    {isOwner && <span className="text-xs text-amber-600 font-bold mr-2">Owner</span>}
                                    {!isOwner && (
                                      <button onClick={() => handleRemoveStaff(s.membershipId, s.name)} className="text-slate-400 hover:text-rose-500 transition-colors p-1" title="Remove Staff">
                                        <Trash2 size={16} />
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
                  </table>
                </div>
              </SectionCard>
            </div>
          )}

        </div>
      </div>

      {/* MODALS */}
      
      {/* Location Modal */}
      {isAddLocationOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-lg text-ink tracking-tight">{editLocationId ? "Edit Location" : "Add Physical Branch"}</h3>
              <button onClick={() => setIsAddLocationOpen(false)} className="text-slate-400 hover:text-slate-700 bg-white p-1 rounded-md shadow-sm border border-slate-200 transition-colors"><X size={18} /></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              {locError && <div className="p-3 bg-rose-50 text-rose-700 text-sm font-semibold rounded-lg border border-rose-100">{locError}</div>}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Branch Name</label>
                <input placeholder="e.g. Main Street Store" value={locForm.name} onChange={(e) => setLocForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} autoFocus />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">State</label>
                  <select
                    value={locForm.state}
                    onChange={(e) => setLocForm((f) => ({ ...f, state: e.target.value, lga: "" }))}
                    className={inputCls}
                  >
                    <option value="">Select State</option>
                    {cityRegistry.map((entry) => (
                      <option key={entry.state} value={entry.state}>{entry.state}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Local Govt Area</label>
                  <select
                    value={locForm.lga}
                    onChange={(e) => setLocForm((f) => ({ ...f, lga: e.target.value }))}
                    className={inputCls}
                    disabled={!locForm.state}
                  >
                    <option value="">Select LGA</option>
                    {(cityRegistry.find((entry) => entry.state === locForm.state)?.lgas || []).map((lga: any) => (
                      <option key={lga.slug} value={lga.name}>{lga.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Street Address</label>
                <textarea placeholder="e.g. 123 Commercial Avenue" value={locForm.address} onChange={(e) => setLocForm((f) => ({ ...f, address: e.target.value }))} className={inputCls + " min-h-[80px]"} />
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
              <button onClick={() => setIsAddLocationOpen(false)} className="px-4 py-2 font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
              <button onClick={submitLocation} disabled={savingLocation} className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold rounded-lg transition-colors flex items-center gap-2">
                {savingLocation ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : (editLocationId ? "Save Changes" : "Create Branch")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Staff Modal */}
      {isAddStaffOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-lg text-ink tracking-tight">Invite Staff</h3>
              <button onClick={() => setIsAddStaffOpen(false)} className="text-slate-400 hover:text-slate-700 bg-white p-1 rounded-md shadow-sm border border-slate-200 transition-colors"><X size={18} /></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              {staffError && <div className="p-3 bg-rose-50 text-rose-700 text-sm font-semibold rounded-lg border border-rose-100">{staffError}</div>}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email Address</label>
                <input type="email" placeholder="staff@example.com" value={staffForm.email} onChange={(e) => setStaffForm((f) => ({ ...f, email: e.target.value }))} className={inputCls} autoFocus />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Full Name (Optional)</label>
                <input placeholder="Jane Doe" value={staffForm.name} onChange={(e) => setStaffForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Role</label>
                <select value={staffForm.role} onChange={(e) => setStaffForm((f) => ({ ...f, role: e.target.value }))} className={inputCls}>
                  {STAFF_ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r === "INVENTORY_STAFF" ? "Inventory Staff" : r.charAt(0) + r.slice(1).toLowerCase()}</option>)}
                </select>
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
              <button onClick={() => setIsAddStaffOpen(false)} className="px-4 py-2 font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
              <button onClick={submitStaff} disabled={savingStaff} className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold rounded-lg transition-colors flex items-center gap-2">
                {savingStaff ? <><Loader2 size={16} className="animate-spin" /> Inviting...</> : "Send Invite"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
