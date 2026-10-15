"use client";

import React, { useState } from "react";
import { Plus, MoreVertical, Wrench, X, Check, UserCheck, AlertCircle } from "lucide-react";
import { createServiceJob, updateServiceJobStatus, assignStaffToServiceJob } from "@/lib/actions/service";

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
  const [isAddingJob, setIsAddingJob] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // New Job Form State
  const [newJobForm, setNewJobForm] = useState({
    customerDataId: customers[0]?.id || "",
    serviceId: services[0]?.id || "",
    description: "",
    priority: "NORMAL",
    address: "",
  });

  // Selected Job Edit State
  const [statusToUpdate, setStatusToUpdate] = useState<string>("");
  const [staffToAssign, setStaffToAssign] = useState<string>("");

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJobForm.customerDataId || !newJobForm.description) {
      setErrorMsg("Please select a customer and provide a job description.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const res = await createServiceJob({
      organizationId,
      customerDataId: newJobForm.customerDataId,
      serviceId: newJobForm.serviceId || undefined,
      description: newJobForm.description,
      status: "NEW",
    });

    setSubmitting(false);
    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setIsAddingJob(false);
      setNewJobForm({
        customerDataId: customers[0]?.id || "",
        serviceId: services[0]?.id || "",
        description: "",
        priority: "NORMAL",
        address: "",
      });
      onRefresh();
    }
  };

  const handleOpenJobModal = (job: any) => {
    setSelectedJob(job);
    setStatusToUpdate(job.status);
    setStaffToAssign(job.membershipId || "");
    setErrorMsg(null);
  };

  const handleUpdateJob = async () => {
    if (!selectedJob) return;
    setSubmitting(true);
    setErrorMsg(null);

    let hadError = false;

    // Update status if changed
    if (statusToUpdate !== selectedJob.status) {
      const res = await updateServiceJobStatus({
        organizationId,
        jobId: selectedJob.id,
        status: statusToUpdate as any,
      });
      if (res.error) {
        setErrorMsg(res.error);
        hadError = true;
      }
    }

    // Assign staff if changed
    if (!hadError && staffToAssign && staffToAssign !== selectedJob.membershipId) {
      const res = await assignStaffToServiceJob({
        organizationId,
        jobId: selectedJob.id,
        membershipId: staffToAssign,
      });
      if (res.error) {
        setErrorMsg(res.error);
        hadError = true;
      }
    }

    setSubmitting(false);
    if (!hadError) {
      setSelectedJob(null);
      onRefresh();
    }
  };

  const getCustomerName = (customerDataId: string) => {
    const c = customers.find((cust) => cust.id === customerDataId);
    return c ? `${c.firstName} ${c.lastName}` : "Unknown Customer";
  };

  const getStaffName = (membershipId?: string | null) => {
    if (!membershipId) return "Unassigned";
    const s = staff.find((m) => m.id === membershipId);
    return s ? s.name : "Unassigned";
  };

  const columns = [
    { id: "NEW", label: "New", color: "bg-blue-500", border: "hover:border-blue-400" },
    { id: "ASSIGNED", label: "Assigned", color: "bg-amber-500", border: "hover:border-amber-400" },
    { id: "IN_PROGRESS", label: "In Progress", color: "bg-purple-500", border: "hover:border-purple-400" },
    { id: "COMPLETED", label: "Completed", color: "bg-emerald-500", border: "hover:border-emerald-400" },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Jobs</h2>
          <p className="text-slate-500 text-sm">Manage multi-step service requests and assignments.</p>
        </div>
        <button
          onClick={() => {
            setIsAddingJob(true);
            setErrorMsg(null);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus size={18} />
          New Job Request
        </button>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
          <AlertCircle size={16} />
          {errorMsg}
        </div>
      )}

      {/* New Job Modal */}
      {isAddingJob && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-in fade-in">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-900 text-lg">Create New Service Job</h3>
            <button onClick={() => setIsAddingJob(false)} className="text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>
          <form onSubmit={handleCreateJob} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Customer *
              </label>
              <select
                required
                value={newJobForm.customerDataId}
                onChange={(e) => setNewJobForm({ ...newJobForm, customerDataId: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">Select a customer...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName} ({c.phone || c.email || "No contact"})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Associated Service (Optional)
              </label>
              <select
                value={newJobForm.serviceId}
                onChange={(e) => setNewJobForm({ ...newJobForm, serviceId: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">Custom Service</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Job Description *
              </label>
              <textarea
                required
                rows={3}
                placeholder="Describe the service required, site instructions, scope of work..."
                value={newJobForm.description}
                onChange={(e) => setNewJobForm({ ...newJobForm, description: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingJob(false)}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm text-sm disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Create Job"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Kanban Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {columns.map((col) => {
          const colJobs = jobs.filter((j) => j.status === col.id);
          return (
            <div key={col.id} className="bg-slate-100/80 rounded-2xl p-4 flex flex-col h-[650px] border border-slate-200/60">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm">
                  <div className={`w-2.5 h-2.5 rounded-full ${col.color}`}></div> {col.label}
                </h3>
                <span className="text-xs font-bold bg-white px-2 py-0.5 rounded-full text-slate-500 border border-slate-200">
                  {colJobs.length}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {colJobs.map((job) => (
                  <div
                    key={job.id}
                    onClick={() => handleOpenJobModal(job)}
                    className={`bg-white p-4 rounded-xl shadow-xs border border-slate-200 cursor-pointer ${col.border} transition-all hover:shadow-sm`}
                  >
                    <div className="font-semibold text-slate-900 text-sm line-clamp-2">{job.description}</div>
                    <div className="text-xs text-slate-500 mt-2 flex flex-col gap-1">
                      <div>
                        <span className="font-medium text-slate-400">Customer:</span>{" "}
                        <span className="text-slate-700">{getCustomerName(job.customerDataId)}</span>
                      </div>
                      <div>
                        <span className="font-medium text-slate-400">Staff:</span>{" "}
                        <span className="text-slate-700">{getStaffName(job.membershipId)}</span>
                      </div>
                    </div>
                  </div>
                ))}

                {colJobs.length === 0 && (
                  <div className="h-28 border border-dashed border-slate-200 rounded-xl flex items-center justify-center text-xs text-slate-400">
                    No {col.label.toLowerCase()} jobs
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Job Details & Assignment Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-5 animate-in zoom-in-95">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Job Details</span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">{selectedJob.description}</h3>
              </div>
              <button onClick={() => setSelectedJob(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl space-y-2 text-xs text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-400">Customer:</span>
                <span className="font-semibold text-slate-800">{getCustomerName(selectedJob.customerDataId)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Current Status:</span>
                <span className="font-semibold text-slate-800">{selectedJob.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Current Staff:</span>
                <span className="font-semibold text-slate-800">{getStaffName(selectedJob.membershipId)}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Change Status
                </label>
                <select
                  value={statusToUpdate}
                  onChange={(e) => setStatusToUpdate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="NEW">NEW</option>
                  <option value="SCHEDULED">SCHEDULED</option>
                  <option value="ASSIGNED">ASSIGNED</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="ON_HOLD">ON_HOLD</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Assign Staff Technician
                </label>
                <select
                  value={staffToAssign}
                  onChange={(e) => setStaffToAssign(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select staff member...</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedJob(null)}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateJob}
                disabled={submitting}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition-colors shadow-sm disabled:opacity-50"
              >
                {submitting ? "Updating..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
