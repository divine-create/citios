import React, { useState } from "react";
import { Plus, MoreVertical, Wrench } from "lucide-react";

export default function JobsTab({
  organizationId,
  jobs,
  services,
  staff,
  customers,
  onRefresh,
}: {
  organizationId: string;
  jobs: any[];
  services: any[];
  staff: any[];
  customers: any[];
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Jobs</h2>
          <p className="text-slate-500 text-sm">Manage multi-step service requests and assignments.</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm">
          <Plus size={18} />
          New Job Request
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {/* Kanban Board Placeholder */}
        <div className="bg-slate-100 rounded-xl p-4 flex flex-col h-[600px]">
          <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div> New</h3>
          <div className="flex-1 overflow-y-auto space-y-3">
            {jobs.filter(j => j.status === 'NEW').map(job => (
              <div key={job.id} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 cursor-pointer hover:border-blue-400 transition-colors">
                <div className="font-bold text-slate-800 text-sm">{job.description}</div>
                <div className="text-xs text-slate-500 mt-2">Customer: {customers.find(c => c.id === job.customerId)?.firstName || "Unknown"}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-100 rounded-xl p-4 flex flex-col h-[600px]">
          <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-500"></div> Assigned</h3>
          <div className="flex-1 overflow-y-auto space-y-3">
             {jobs.filter(j => j.status === 'ASSIGNED').map(job => (
              <div key={job.id} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 cursor-pointer hover:border-blue-400 transition-colors">
                <div className="font-bold text-slate-800 text-sm">{job.description}</div>
                <div className="text-xs text-slate-500 mt-2">Staff: {staff.find(s => s.id === job.staffId)?.name || "Unassigned"}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-100 rounded-xl p-4 flex flex-col h-[600px]">
          <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-purple-500"></div> In Progress</h3>
          <div className="flex-1 overflow-y-auto space-y-3">
             {jobs.filter(j => j.status === 'IN_PROGRESS').map(job => (
              <div key={job.id} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 cursor-pointer hover:border-blue-400 transition-colors">
                <div className="font-bold text-slate-800 text-sm">{job.description}</div>
                <div className="text-xs text-slate-500 mt-2">Staff: {staff.find(s => s.id === job.staffId)?.name || "Unassigned"}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-100 rounded-xl p-4 flex flex-col h-[600px]">
          <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"></div> Completed</h3>
          <div className="flex-1 overflow-y-auto space-y-3">
             {jobs.filter(j => j.status === 'COMPLETED').map(job => (
              <div key={job.id} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 cursor-pointer hover:border-blue-400 transition-colors">
                <div className="font-bold text-slate-800 text-sm">{job.description}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
