'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Wrench,
  Calendar,
  Clock,
  MapPin,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Phone,
  MessageCircle,
  ShieldCheck,
  Building2,
  FileText,
  HelpCircle,
} from 'lucide-react';
import { useMoney } from '@/components/cityos/CityProvider';
import { fetchResidentTaskDetail, cancelResidentTask } from '@/app/actions/service';

interface TaskDetailData {
  id: string;
  jobId: string | null;
  appointmentId: string | null;
  title: string;
  status: string;
  jobStatus: string;
  appointmentStatus: string;
  scheduledDate: string | null;
  startTime: string | null;
  endTime: string | null;
  address: string | null;
  notes: string | null;
  price: number;
  createdAt: string;
  organization: {
    id: string;
    name: string;
    slug?: string | null;
    phone?: string | null;
  } | null;
  service: {
    id: string;
    name: string;
    description?: string | null;
    price: number;
    durationMinutes?: number | null;
  } | null;
}

export default function CityTaskDetail({ id }: { id: string }) {
  const router = useRouter();
  const { fmt } = useMoney();
  const [task, setTask] = useState<TaskDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cancellation State
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const loadDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchResidentTaskDetail(id);
      if (res.requiresAuth) {
        router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      if (!res.success || !res.task) {
        setError(res.error || 'Appointment or task not found.');
      } else {
        setTask(res.task as TaskDetailData);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [id]);

  const handleCancel = async () => {
    setCancelling(true);
    setCancelError(null);
    try {
      const res = await cancelResidentTask(id, cancelReason);
      if (!res.success) {
        setCancelError(res.error || 'Failed to cancel appointment.');
      } else {
        setShowCancelModal(false);
        setCancelReason('');
        await loadDetail();
      }
    } catch (err: any) {
      setCancelError(err.message || 'Error processing cancellation.');
    } finally {
      setCancelling(false);
    }
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return 'Pending schedule';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-NG', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-20 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-teal-800 mb-3" />
        <p className="text-xs font-bold uppercase tracking-wider">Loading appointment details...</p>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="max-w-md mx-auto text-center py-20 animate-in fade-in duration-300">
        <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-4">
          <HelpCircle className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-black text-slate-900 mb-2">Appointment Not Found</h2>
        <p className="text-xs text-slate-500 mb-6">{error || 'This service booking does not exist or you do not have permission to view it.'}</p>
        <Link
          href="/tasks"
          className="px-5 py-2.5 rounded-xl bg-teal-800 text-white text-xs font-bold hover:bg-teal-900 transition-colors"
        >
          Back to My Tasks
        </Link>
      </div>
    );
  }

  const s = (task.status || '').toUpperCase();
  const isCompleted = s === 'COMPLETED';
  const isCancelled = s === 'CANCELLED';
  const isInProgress = s === 'IN_PROGRESS';
  const isConfirmed = s === 'CONFIRMED' || s === 'SCHEDULED';
  const isPending = !isCompleted && !isCancelled && !isInProgress && !isConfirmed;

  const isCancelable = !isCompleted && !isCancelled;

  // Timeline Steps
  const steps = [
    { label: 'Requested', desc: 'Booking sent to provider', done: true, current: isPending },
    { label: 'Confirmed', desc: 'Provider accepted time slot', done: isConfirmed || isInProgress || isCompleted, current: isConfirmed },
    { label: 'In Progress', desc: 'Technician on site / working', done: isInProgress || isCompleted, current: isInProgress },
    { label: 'Completed', desc: 'Service completed & inspected', done: isCompleted, current: isCompleted },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Back button */}
      <div>
        <Link
          href="/tasks"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-teal-800 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to My Tasks
        </Link>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-[24px] border border-slate-100 overflow-hidden shadow-xs">
        {/* Header */}
        <div className="p-6 sm:p-8 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              {task.organization?.name && (
                <Link
                  href={`/org/${task.organization.slug || task.organization.id}`}
                  className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase text-teal-800 bg-teal-50 px-2.5 py-1 rounded-md mb-2 hover:bg-teal-100 transition-colors"
                >
                  <Building2 className="w-3 h-3" /> {task.organization.name}
                </Link>
              )}
              <h1 className="text-2xl font-black text-slate-900 leading-tight">
                {task.title}
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Reference ID: <span className="font-mono text-slate-600">{task.id.slice(0, 8)}</span> • Booked {new Date(task.createdAt).toLocaleDateString()}
              </p>
            </div>

            <div>
              {isCompleted ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4" /> Completed
                </span>
              ) : isCancelled ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  <XCircle className="w-4 h-4" /> Cancelled
                </span>
              ) : isInProgress ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  <Wrench className="w-4 h-4" /> In Progress
                </span>
              ) : isConfirmed ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  <Calendar className="w-4 h-4" /> Confirmed
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  <Clock className="w-4 h-4" /> Awaiting Confirmation
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Status Stepper */}
        {!isCancelled && (
          <div className="p-6 bg-slate-50/50 border-b border-slate-100">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {steps.map((st, i) => (
                <div
                  key={st.label}
                  className={`p-3 rounded-xl border transition-all ${
                    st.current
                      ? 'bg-white border-teal-700 shadow-xs'
                      : st.done
                      ? 'bg-white/60 border-slate-200'
                      : 'bg-transparent border-transparent opacity-40'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        st.done
                          ? 'bg-teal-800 text-white'
                          : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-800">{st.label}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-tight">{st.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Appointment Details */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
              Appointment Schedule & Location
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                  <Calendar className="w-4 h-4 text-teal-700" /> Date & Time
                </div>
                <p className="text-sm font-bold text-slate-900">
                  {formatDateTime(task.startTime || task.scheduledDate)}
                </p>
                {task.service?.durationMinutes && (
                  <p className="text-[11px] text-slate-400">
                    Est. Duration: {task.service.durationMinutes} mins
                  </p>
                )}
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                  <MapPin className="w-4 h-4 text-teal-700" /> Service Location
                </div>
                <p className="text-sm font-bold text-slate-900 break-words">
                  {task.address || 'Address provided on file'}
                </p>
                <p className="text-[11px] text-slate-400">
                  Calabar Resident Service
                </p>
              </div>
            </div>

            {task.notes && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                  <FileText className="w-4 h-4 text-slate-500" /> Instructions & Problem Description
                </div>
                <p className="text-xs text-slate-700 leading-relaxed italic">
                  &ldquo;{task.notes}&rdquo;
                </p>
              </div>
            )}
          </div>

          {/* Provider Card */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
              Service Provider
            </h3>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-800 text-white flex items-center justify-center font-black text-sm">
                  {task.organization?.name?.charAt(0) || 'P'}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    {task.organization?.name || 'Local Verified Pro'}
                  </h4>
                  <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Background Verified Tradesman
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {task.organization?.phone && (
                  <a
                    href={`tel:${task.organization.phone}`}
                    className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5 text-xs font-bold shadow-2xs"
                  >
                    <Phone className="w-3.5 h-3.5" /> Call
                  </a>
                )}
                {task.organization?.phone && (
                  <a
                    href={`https://wa.me/${task.organization.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                      `Hello ${task.organization.name}, regarding my booking for ${task.title} (Ref: ${task.id.slice(0, 8)})`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors inline-flex items-center gap-1.5 text-xs font-bold shadow-2xs"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> WhatsApp Pro
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Price & Settlement breakdown */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 font-medium block">Agreed Service Fee</span>
                <span className="text-xl font-black text-slate-900">{fmt(task.price)}</span>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-md block">
                  Inspection-First Policy
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Settle with technician via Transfer or Cash on completion
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Link
            href="/services"
            className="text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
          >
            ← Browse other city services
          </Link>

          {isCancelable && (
            <button
              onClick={() => setShowCancelModal(true)}
              className="px-4 py-2.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel Appointment
            </button>
          )}
        </div>
      </div>

      {/* Cancellation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900">
                Cancel Appointment?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to cancel this booking? The provider will be notified immediately.
              </p>
            </div>

            {cancelError && (
              <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200">
                {cancelError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Reason for cancellation <span className="font-normal text-slate-400">(Optional)</span>
              </label>
              <textarea
                rows={2}
                placeholder="Reason..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-700 resize-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowCancelModal(false);
                  setCancelError(null);
                }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Keep Booking
              </button>
              <button
                type="button"
                disabled={cancelling}
                onClick={handleCancel}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {cancelling ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  <>Yes, Cancel</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
