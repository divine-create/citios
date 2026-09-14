import React from "react";
import { Users, CalendarDays, Wrench, DollarSign } from "lucide-react";

export default function DashboardTab({
  organizationId,
  customers,
  appointments,
  jobs,
}: {
  organizationId: string;
  customers: any[];
  appointments: any[];
  jobs: any[];
}) {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h2>
        <p className="text-slate-500 text-sm">Overview of your service business.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-500 text-sm">Total Customers</h3>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Users size={20}/></div>
          </div>
          <div className="text-3xl font-black text-slate-900">{customers.length}</div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-500 text-sm">Appointments</h3>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><CalendarDays size={20}/></div>
          </div>
          <div className="text-3xl font-black text-slate-900">{appointments.length}</div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-500 text-sm">Active Jobs</h3>
            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg"><Wrench size={20}/></div>
          </div>
          <div className="text-3xl font-black text-slate-900">{jobs.filter(j => j.status !== 'COMPLETED').length}</div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-500 text-sm">Revenue Today</h3>
            <div className="p-2 bg-green-50 text-green-600 rounded-lg"><DollarSign size={20}/></div>
          </div>
          <div className="text-3xl font-black text-slate-900">\</div>
        </div>
      </div>
    </div>
  );
}
