"use client";

import React, { useState, useEffect } from "react";
import { Users, CalendarDays, Wrench, DollarSign, ArrowUpRight, Clock, AlertCircle } from "lucide-react";
import { fmtNaira } from "@/lib/format";
import { getServiceRevenueStats } from "@/lib/actions/service";

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
  const [revenueStats, setRevenueStats] = useState({
    totalRevenue: 0,
    pendingRevenue: 0,
    totalInvoices: 0,
    paidCount: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    let mounted = true;
    getServiceRevenueStats(organizationId).then((stats) => {
      if (mounted) {
        setRevenueStats(stats);
        setLoadingStats(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, [organizationId]);

  const activeJobs = jobs.filter((j) => j.status !== "COMPLETED" && j.status !== "CANCELLED");
  const upcomingAppointments = appointments.filter(
    (a) => a.status === "REQUESTED" || a.status === "CONFIRMED" || a.status === "IN_PROGRESS"
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h2>
        <p className="text-slate-500 text-sm">Real-time overview of your service operations and financials.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-500 text-sm">Total Customers</h3>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Users size={20} />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">{customers.length}</div>
          <p className="text-xs text-slate-400 mt-2">Active client profiles</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-500 text-sm">Appointments</h3>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <CalendarDays size={20} />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">{appointments.length}</div>
          <p className="text-xs text-slate-400 mt-2">{upcomingAppointments.length} pending / confirmed</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-500 text-sm">Active Jobs</h3>
            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
              <Wrench size={20} />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">{activeJobs.length}</div>
          <p className="text-xs text-slate-400 mt-2">{jobs.length} total jobs logged</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-500 text-sm">Revenue Collected</h3>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">
            {loadingStats ? "..." : fmtNaira(revenueStats.totalRevenue)}
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Pending: {fmtNaira(revenueStats.pendingRevenue)} ({revenueStats.paidCount}/{revenueStats.totalInvoices} invoices paid)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Active Jobs */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 text-base">Active Jobs Queue</h3>
            <span className="text-xs font-semibold px-2 py-1 bg-slate-100 text-slate-600 rounded-md">
              {activeJobs.length} In Progress
            </span>
          </div>
          {activeJobs.length > 0 ? (
            <div className="space-y-3">
              {activeJobs.slice(0, 5).map((job) => (
                <div
                  key={job.id}
                  className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors border border-slate-100 flex items-center justify-between"
                >
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{job.description || "Service Job"}</p>
                    <p className="text-xs text-slate-500">
                      Priority: {job.priority || "NORMAL"} &bull; Status: {job.status}
                    </p>
                  </div>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
                    {job.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 text-sm">
              <Wrench size={32} className="mx-auto mb-2 opacity-30" />
              No active jobs in queue.
            </div>
          )}
        </div>

        {/* Upcoming Appointments */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 text-base">Upcoming Appointments</h3>
            <span className="text-xs font-semibold px-2 py-1 bg-purple-50 text-purple-700 rounded-md">
              {upcomingAppointments.length} Booked
            </span>
          </div>
          {upcomingAppointments.length > 0 ? (
            <div className="space-y-3">
              {upcomingAppointments.slice(0, 5).map((apt) => (
                <div
                  key={apt.id}
                  className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors border border-slate-100 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                      <Clock size={16} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">
                        {fmtNaira(apt.price || 0)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(apt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &bull; Status: {apt.status}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-purple-100 text-purple-700">
                    {apt.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 text-sm">
              <CalendarDays size={32} className="mx-auto mb-2 opacity-30" />
              No upcoming appointments.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
