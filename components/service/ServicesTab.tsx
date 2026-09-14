import React, { useState } from "react";
import { Plus, Check, Search, DollarSign, Clock, Users } from "lucide-react";
import { createServiceCatalogItem, createServiceStaff } from "@/lib/actions/service";

export default function ServicesTab({
  organizationId,
  services,
  staff,
  onRefresh,
}: {
  organizationId: string;
  services: any[];
  staff: any[];
  onRefresh: () => void;
}) {
  const [activeTab, setActiveTab] = useState("services"); // services | staff

  const [serviceForm, setServiceForm] = useState({ name: "", price: 0, durationMinutes: 60, description: "" });
  const [staffForm, setStaffForm] = useState({ name: "", role: "TECHNICIAN", phone: "", email: "" });
  const [isAdding, setIsAdding] = useState(false);

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    await createServiceCatalogItem({
      organizationId,
      ...serviceForm,
    });
    setServiceForm({ name: "", price: 0, durationMinutes: 60, description: "" });
    setIsAdding(false);
    onRefresh();
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    await createServiceStaff({
      organizationId,
      ...staffForm,
    });
    setStaffForm({ name: "", role: "TECHNICIAN", phone: "", email: "" });
    setIsAdding(false);
    onRefresh();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Services & Staff</h2>
          <p className="text-slate-500 text-sm">Manage your catalog and service team.</p>
        </div>
        <div className="flex bg-slate-200/60 p-1 rounded-lg">
          <button
            onClick={() => { setActiveTab("services"); setIsAdding(false); }}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === "services" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Services
          </button>
          <button
            onClick={() => { setActiveTab("staff"); setIsAdding(false); }}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === "staff" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Staff
          </button>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => setIsAdding(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus size={18} />
          {activeTab === "services" ? "New Service" : "New Staff Member"}
        </button>
      </div>

      {isAdding && activeTab === "services" && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-4">Add New Service</h3>
          <form onSubmit={handleSaveService} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Service Name</label>
              <input
                required
                type="text"
                value={serviceForm.name}
                onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Price</label>
              <input
                required
                type="number"
                value={serviceForm.price}
                onChange={(e) => setServiceForm({ ...serviceForm, price: parseFloat(e.target.value) || 0 })}
                className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Duration (minutes)</label>
              <input
                required
                type="number"
                value={serviceForm.durationMinutes}
                onChange={(e) => setServiceForm({ ...serviceForm, durationMinutes: parseInt(e.target.value) || 0 })}
                className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="col-span-1 sm:col-span-2 flex justify-end gap-3 mt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button type="submit" className="px-6 py-2 bg-slate-900 text-white font-medium rounded-lg shadow-sm">Save Service</button>
            </div>
          </form>
        </div>
      )}

      {isAdding && activeTab === "staff" && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-4">Add Staff Member</h3>
          <form onSubmit={handleSaveStaff} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Name</label>
              <input
                required
                type="text"
                value={staffForm.name}
                onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Role</label>
              <select
                value={staffForm.role}
                onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="TECHNICIAN">Technician</option>
                <option value="RECEPTIONIST">Receptionist</option>
                <option value="MANAGER">Manager</option>
              </select>
            </div>
            <div className="col-span-1 sm:col-span-2 flex justify-end gap-3 mt-2">
              <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
              <button type="submit" className="px-6 py-2 bg-slate-900 text-white font-medium rounded-lg shadow-sm">Save Staff</button>
            </div>
          </form>
        </div>
      )}

      {activeTab === "services" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map(s => (
            <div key={s.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-900 text-lg">{s.name}</h3>
              <div className="flex gap-4 mt-3 text-slate-600 text-sm font-medium">
                <span className="flex items-center gap-1"><DollarSign size={16}/>{s.price}</span>
                <span className="flex items-center gap-1"><Clock size={16}/>{s.durationMinutes} min</span>
              </div>
            </div>
          ))}
          {services.length === 0 && (
            <p className="text-slate-400 p-8 col-span-full text-center bg-white rounded-2xl border border-slate-200 border-dashed">No services created yet.</p>
          )}
        </div>
      )}

      {activeTab === "staff" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff.map(st => (
            <div key={st.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 font-bold flex justify-center items-center text-lg">
                {st.name[0]}
              </div>
              <div>
                <h3 className="font-bold text-slate-900">{st.name}</h3>
                <span className="text-xs font-bold text-slate-500 tracking-wider bg-slate-100 px-2 py-1 rounded">{st.role}</span>
              </div>
            </div>
          ))}
          {staff.length === 0 && (
            <p className="text-slate-400 p-8 col-span-full text-center bg-white rounded-2xl border border-slate-200 border-dashed">No staff members created yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
