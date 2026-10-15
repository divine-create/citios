"use client";

import React, { useState } from "react";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  X,
  AlertCircle,
  Calendar as CalendarIcon,
  CheckCircle,
} from "lucide-react";
import { createServiceAppointment, updateServiceAppointmentStatus } from "@/lib/actions/service";
import { fmtNaira } from "@/lib/format";

export default function CalendarTab({
  organizationId,
  appointments,
  staff,
  services,
  customers,
  onRefresh,
}: {
  organizationId: string;
  appointments: any[];
  staff: any[];
  services: any[];
  customers: any[];
  onRefresh: () => void;
}) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isAddingAppointment, setIsAddingAppointment] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [form, setForm] = useState({
    customerDataId: customers[0]?.id || "",
    serviceId: services[0]?.id || "",
    membershipId: staff[0]?.id || "",
    date: new Date().toISOString().split("T")[0],
    startTime: "09:00",
    endTime: "10:00",
    price: services[0]?.price || 0,
    notes: "",
  });

  const addDays = (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  const handleServiceChange = (serviceId: string) => {
    const s = services.find((srv) => srv.id === serviceId);
    setForm((prev) => ({
      ...prev,
      serviceId,
      price: s ? s.price : prev.price,
    }));
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerDataId || !form.serviceId || !form.startTime || !form.endTime) {
      setErrorMsg("Please complete all required appointment fields.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const startDateTime = new Date(`${form.date}T${form.startTime}:00`);
    const endDateTime = new Date(`${form.date}T${form.endTime}:00`);

    if (startDateTime >= endDateTime) {
      setErrorMsg("End time must be after start time.");
      setSubmitting(false);
      return;
    }

    const res = await createServiceAppointment({
      organizationId,
      customerDataId: form.customerDataId,
      serviceId: form.serviceId,
      membershipId: form.membershipId || undefined,
      startTime: startDateTime,
      endTime: endDateTime,
      price: Number(form.price),
      notes: form.notes || undefined,
    });

    setSubmitting(false);
    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setIsAddingAppointment(false);
      onRefresh();
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!selectedAppointment) return;
    setSubmitting(true);
    const res = await updateServiceAppointmentStatus(selectedAppointment.id, status);
    setSubmitting(false);
    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setSelectedAppointment(null);
      onRefresh();
    }
  };

  // Filter appointments for the selected date
  const selectedDateStr = selectedDate.toISOString().split("T")[0];
  const dayAppointments = appointments.filter((apt) => {
    const aptDate = new Date(apt.startTime).toISOString().split("T")[0];
    return aptDate === selectedDateStr && apt.status !== "CANCELLED";
  });

  // Calculate top & height in grid
  // Grid starts at 8:00 AM (hour 8) and runs 13 hours to 21:00 (9:00 PM). Each hour is 96px high.
  const getAppointmentPosition = (apt: any) => {
    const start = new Date(apt.startTime);
    const end = new Date(apt.endTime);
    const startHour = start.getHours() + start.getMinutes() / 60;
    const endHour = end.getHours() + end.getMinutes() / 60;

    const offsetHours = Math.max(0, startHour - 8);
    const durationHours = Math.max(0.5, endHour - startHour);

    const top = offsetHours * 96;
    const height = durationHours * 96;

    return { top, height };
  };

  // Build columns: Assigned staff plus Unassigned column if any unassigned appointments exist
  const unassignedAppointments = dayAppointments.filter((a) => !a.membershipId);
  const columns = [...staff];
  if (unassignedAppointments.length > 0 || staff.length === 0) {
    columns.push({ id: "UNASSIGNED", name: "Unassigned / Queue", role: "QUEUE" });
  }

  const getCustomerName = (customerDataId: string) => {
    const c = customers.find((cust) => cust.id === customerDataId);
    return c ? `${c.firstName} ${c.lastName}` : "Customer";
  };

  const getServiceName = (serviceId: string) => {
    const s = services.find((srv) => srv.id === serviceId);
    return s ? s.name : "Service";
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Calendar</h2>
          <p className="text-slate-500 text-sm">Manage appointments and real-time staff scheduling.</p>
        </div>
        <button
          onClick={() => {
            setIsAddingAppointment(true);
            setErrorMsg(null);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus size={18} />
          New Appointment
        </button>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
          <AlertCircle size={16} />
          {errorMsg}
        </div>
      )}

      {/* New Appointment Modal */}
      {isAddingAppointment && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-900 text-lg">Book Service Appointment</h3>
            <button onClick={() => setIsAddingAppointment(false)} className="text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>
          <form onSubmit={handleCreateAppointment} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Customer *
              </label>
              <select
                required
                value={form.customerDataId}
                onChange={(e) => setForm({ ...form, customerDataId: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">Select customer...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName} ({c.phone || c.email || "No contact"})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Service Item *
              </label>
              <select
                required
                value={form.serviceId}
                onChange={(e) => handleServiceChange(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">Select service...</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({fmtNaira(s.price)} - {s.durationMinutes}m)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Staff Member
              </label>
              <select
                value={form.membershipId}
                onChange={(e) => setForm({ ...form, membershipId: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">Unassigned</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Price (NGN)
              </label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Date *
              </label>
              <input
                required
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Start Time *
                </label>
                <input
                  required
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  End Time *
                </label>
                <input
                  required
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Notes
              </label>
              <textarea
                rows={2}
                placeholder="Special requests or client preferences..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingAppointment(false)}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm text-sm disabled:opacity-50"
              >
                {submitting ? "Booking..." : "Confirm Booking"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Calendar View Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[650px]">
        {/* Calendar Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
              <button
                onClick={() => setSelectedDate(addDays(selectedDate, -1))}
                className="p-1 hover:bg-slate-100 rounded text-slate-600"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={() => setSelectedDate(new Date())}
                className="px-3 py-1 font-medium text-sm text-slate-700 hover:bg-slate-100 rounded"
              >
                Today
              </button>
              <button
                onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                className="p-1 hover:bg-slate-100 rounded text-slate-600"
              >
                <ChevronRight size={20} />
              </button>
            </div>
            <h3 className="text-lg font-bold text-slate-800">
              {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </h3>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md">
            {dayAppointments.length} appointment(s) on this date
          </span>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 overflow-y-auto relative bg-slate-50/50">
          <div className="flex min-w-full h-[1248px]">
            {/* Time labels */}
            <div className="w-20 flex-shrink-0 border-r border-slate-200 bg-white sticky left-0 z-20">
              {Array.from({ length: 13 }).map((_, i) => (
                <div key={i} className="h-24 border-b border-slate-100 flex items-start justify-center pt-2">
                  <span className="text-xs font-semibold text-slate-400">
                    {i + 8}:00 {i + 8 < 12 ? "AM" : "PM"}
                  </span>
                </div>
              ))}
            </div>

            {/* Staff Columns */}
            {columns.length > 0 ? (
              columns.map((member) => {
                const memberAppointments = dayAppointments.filter((apt) =>
                  member.id === "UNASSIGNED" ? !apt.membershipId : apt.membershipId === member.id
                );

                return (
                  <div key={member.id} className="flex-1 border-r border-slate-200 min-w-[220px] relative">
                    <div className="h-12 border-b border-slate-200 bg-white sticky top-0 flex items-center justify-between px-3 font-bold text-slate-700 shadow-sm z-10">
                      <span className="truncate">{member.name}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">
                        {memberAppointments.length}
                      </span>
                    </div>

                    {/* Grid Lines */}
                    {Array.from({ length: 13 }).map((_, i) => (
                      <div key={i} className="h-24 border-b border-slate-100"></div>
                    ))}

                    {/* Rendered Appointments */}
                    {memberAppointments.map((apt) => {
                      const { top, height } = getAppointmentPosition(apt);
                      return (
                        <div
                          key={apt.id}
                          onClick={() => setSelectedAppointment(apt)}
                          style={{ top: `${top}px`, height: `${height}px` }}
                          className="absolute inset-x-1.5 rounded-xl p-2.5 bg-blue-50 border border-blue-200 shadow-xs cursor-pointer hover:border-blue-400 hover:shadow-md transition-all overflow-hidden flex flex-col justify-between z-5"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-bold text-blue-900 truncate">
                                {getServiceName(apt.serviceId)}
                              </span>
                              <span className="text-[10px] font-bold px-1 rounded bg-blue-200/80 text-blue-800 shrink-0">
                                {apt.status}
                              </span>
                            </div>
                            <div className="text-[11px] text-blue-700 font-medium truncate mt-0.5">
                              {getCustomerName(apt.customerDataId)}
                            </div>
                          </div>
                          <div className="text-[10px] text-blue-600 font-semibold flex items-center justify-between mt-1">
                            <span>
                              {new Date(apt.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            <span>{fmtNaira(apt.price)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })
            ) : (
              <div className="flex-1 flex items-center justify-center flex-col text-slate-400">
                <User size={48} className="mb-4 opacity-20" />
                <p>No staff or appointments found.</p>
                <p className="text-sm">Click "New Appointment" above to book your first service.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Appointment Detail Modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Appointment</span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  {getServiceName(selectedAppointment.serviceId)}
                </h3>
              </div>
              <button onClick={() => setSelectedAppointment(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl space-y-2 text-xs text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-400">Customer:</span>
                <span className="font-semibold text-slate-800">
                  {getCustomerName(selectedAppointment.customerDataId)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Time:</span>
                <span className="font-semibold text-slate-800">
                  {new Date(selectedAppointment.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}{" "}
                  - {new Date(selectedAppointment.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Price:</span>
                <span className="font-semibold text-slate-800">{fmtNaira(selectedAppointment.price)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <span className="font-semibold text-blue-700">{selectedAppointment.status}</span>
              </div>
              {selectedAppointment.notes && (
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-slate-400 block mb-1">Notes:</span>
                  <p className="text-slate-700 italic">{selectedAppointment.notes}</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                Update Status
              </label>
              <div className="grid grid-cols-2 gap-2">
                {["CONFIRMED", "CHECKED_IN", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => handleUpdateStatus(status)}
                    disabled={submitting || selectedAppointment.status === status}
                    className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-all ${
                      selectedAppointment.status === status
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    } disabled:opacity-50`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
