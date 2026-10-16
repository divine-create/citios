'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Wrench,
  Calendar,
  Clock,
  MapPin,
  ChevronRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ArrowRight,
  Plus,
  Phone,
  MessageCircle,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { useMoney } from '@/components/cityos/CityProvider';
import { fetchMyResidentTasks, cancelResidentTask } from '@/app/actions/service';

interface ResidentTaskItem {
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

export default function CityTasksList() {
  const router = useRouter();
  const { fmt } = useMoney();
  const [tasks, setTasks] = useState<ResidentTaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ALL');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelModalTask, setCancelModalTask] = useState<ResidentTaskItem | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const res = await fetchMyResidentTasks();
      if (res.requiresAuth) {
        // Resident not logged in, empty state will prompt sign in
        setTasks([]);
      } else if (res.success && res.tasks) {
        setTasks(res.tasks);
      }
    } catch (err) {
      console.error('Error loading resident tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleConfirmCancel = async () => {
    if (!cancelModalTask) return;
    setCancellingId(cancelModalTask.id);
    setActionError(null);

    try {
      const res = await cancelResidentTask(cancelModalTask.id, cancelReason);
      if (!res.success) {
        setActionError(res.error || 'Failed to cancel appointment.');
      } else {
        setCancelModalTask(null);
        setCancelReason('');
        await loadTasks();
      }
    } catch (err: any) {
      setActionError(err.message || 'An error occurred.');
    } finally {
      setCancellingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'COMPLETED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5" /> Completed
        </span>
      );
    }
    if (s === 'CANCELLED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <XCircle className="w-3.5 h-3.5" /> Cancelled
        </span>
      );
    }
    if (s === 'IN_PROGRESS') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
          <Wrench className="w-3.5 h-3.5" /> In Progress
        </span>
      );
    }
    if (s === 'CONFIRMED' || s === 'SCHEDULED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
          <Calendar className="w-3.5 h-3.5" /> Confirmed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
        <Clock className="w-3.5 h-3.5" /> Awaiting Confirmation
      </span>
    );
  };

  const formatSchedule = (dateStr: string | null) => {
    if (!dateStr) return 'Schedule pending';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-NG', {
        weekday: 'short',
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

  const activeTasks = tasks.filter((t) => {
    const s = (t.status || '').toUpperCase();
    return s !== 'COMPLETED' && s !== 'CANCELLED';
  });

  const completedTasks = tasks.filter((t) => {
    const s = (t.status || '').toUpperCase();
    return s === 'COMPLETED' || s === 'CANCELLED';
  });

  const displayedTasks =
    filter === 'ACTIVE'
      ? activeTasks
      : filter === 'COMPLETED'
      ? completedTasks
      : tasks;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-20 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-teal-800 mb-3" />
        <p className="text-xs font-bold uppercase tracking-wider">Loading your appointments & tasks...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            My Services & Tasks
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Track and manage your verified city technician appointments and repairs.
          </p>
        </div>
        <Link
          href="/services"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold transition-colors shadow-xs shrink-0"
        >
          <Plus className="w-4 h-4" /> Book New Service
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <button
          onClick={() => setFilter('ALL')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            filter === 'ALL'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All ({tasks.length})
        </button>
        <button
          onClick={() => setFilter('ACTIVE')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            filter === 'ACTIVE'
              ? 'bg-teal-800 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Active ({activeTasks.length})
        </button>
        <button
          onClick={() => setFilter('COMPLETED')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            filter === 'COMPLETED'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Past & Completed ({completedTasks.length})
        </button>
      </div>

      {/* Tasks List */}
      {displayedTasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center bg-white space-y-4">
          <div className="w-14 h-14 rounded-full bg-teal-50 text-teal-800 flex items-center justify-center mx-auto">
            <Wrench className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-base font-black text-slate-900">
              {filter === 'ALL'
                ? 'No service appointments booked yet'
                : filter === 'ACTIVE'
                ? 'No active service appointments'
                : 'No past appointments found'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Need an air conditioner serviced, plumbing leak repaired, electrical wiring fixed, or solar inverter installed?
            </p>
          </div>
          <Link
            href="/services"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-teal-800 text-white text-xs font-bold hover:bg-teal-900 transition-colors shadow-xs"
          >
            Explore City Services <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedTasks.map((t) => {
            const isCancelable =
              t.status !== 'COMPLETED' && t.status !== 'CANCELLED';

            return (
              <div
                key={t.id}
                className="bg-white rounded-2xl border border-slate-100 p-5 sm:p-6 shadow-xs hover:border-slate-200 transition-all space-y-4"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {t.organization?.name && (
                        <Link
                          href={`/org/${t.organization.slug || t.organization.id}`}
                          className="text-[11px] font-black uppercase text-teal-800 bg-teal-50 hover:bg-teal-100 px-2.5 py-0.5 rounded-md transition-colors"
                        >
                          {t.organization.name}
                        </Link>
                      )}
                      <span className="text-[11px] text-slate-400">
                        Booked {new Date(t.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-slate-900">
                      {t.title}
                    </h3>
                  </div>
                  <div>{getStatusBadge(t.status)}</div>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50/70 rounded-xl border border-slate-100 text-xs">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="font-semibold">
                      {formatSchedule(t.startTime || t.scheduledDate)}
                    </span>
                  </div>

                  {t.address ? (
                    <div className="flex items-center gap-2 text-slate-700">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="truncate">{t.address}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-slate-400">
                      <MapPin className="w-4 h-4 shrink-0" />
                      <span>Address on file</span>
                    </div>
                  )}

                  {t.notes && (
                    <div className="sm:col-span-2 text-slate-600 text-[11px] italic bg-white/70 p-2 rounded-lg border border-slate-100">
                      &ldquo;{t.notes}&rdquo;
                    </div>
                  )}
                </div>

                {/* Price and Action Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Fee (Pay on Completion)
                    </span>
                    <span className="text-base font-black text-slate-900">
                      {fmt(t.price)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isCancelable && (
                      <button
                        onClick={() => setCancelModalTask(t)}
                        className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-200 text-xs font-bold transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}

                    <Link
                      href={`/tasks/${t.id}`}
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-xs"
                    >
                      View Details <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Verified City Guarantee Banner */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-teal-900 text-white p-5 flex items-center gap-4 shadow-sm">
        <span className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5 text-teal-300" />
        </span>
        <div>
          <p className="text-sm font-black">CityOS Verified Pro Guarantee</p>
          <p className="text-[12px] text-teal-100/70 font-medium">
            All tradesmen are background-verified and rate-capped. Pay directly upon satisfactory job completion.
          </p>
        </div>
      </div>

      {/* Cancellation Confirmation Modal */}
      {cancelModalTask && (
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
                Are you sure you want to cancel your booking for{' '}
                <span className="font-bold text-slate-800">
                  {cancelModalTask.title}
                </span>{' '}
                with {cancelModalTask.organization?.name}?
              </p>
            </div>

            {actionError && (
              <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200">
                {actionError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Reason for cancellation <span className="font-normal text-slate-400">(Optional)</span>
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Schedule conflict, problem resolved..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-700 resize-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setCancelModalTask(null);
                  setActionError(null);
                }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Keep Appointment
              </button>
              <button
                type="button"
                disabled={Boolean(cancellingId)}
                onClick={handleConfirmCancel}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {cancellingId ? (
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