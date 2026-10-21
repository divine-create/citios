'use client';

import React, { useState } from 'react';
import { Card, Badge, Button } from '@/components/Shared';
import { Send, Truck, Package, Clock, CheckCircle2, User, RefreshCw, X, ArrowRight } from 'lucide-react';
import { autoDispatchDelivery, dispatchDelivery } from '@/lib/actions/logistics-dispatch';

interface DispatchBoardProps {
  providerId: string;
  providerName: string;
  initialJobs: any[];
  availableDrivers: any[];
}

export default function DispatchBoardView({
  providerId,
  providerName,
  initialJobs,
  availableDrivers,
}: DispatchBoardProps) {
  const [jobs, setJobs] = useState(initialJobs);
  const [drivers, setDrivers] = useState(availableDrivers);
  const [loadingJobId, setLoadingJobId] = useState<string | null>(null);
  const [manualModalJob, setManualModalJob] = useState<any | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleAutoDispatch = async (jobId: string) => {
    setLoadingJobId(jobId);
    setStatusMsg(null);
    try {
      const res = await autoDispatchDelivery({
        deliveryJobId: jobId,
        providerId,
      });

      if (res.success) {
        setStatusMsg({ type: 'success', text: `Auto-dispatched to ${res.driver?.person?.firstName || 'driver'}!` });
        setJobs(jobs.map(j => j.id === jobId ? { ...j, status: 'DISPATCHED' } : j));
      } else {
        setStatusMsg({ type: 'error', text: `Failed: ${res.reason || 'No available drivers matching criteria'}` });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error executing auto dispatch' });
    } finally {
      setLoadingJobId(null);
    }
  };

  const handleManualDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualModalJob || !selectedDriverId) return;

    setLoadingJobId(manualModalJob.id);
    setStatusMsg(null);
    try {
      await dispatchDelivery({
        deliveryJobId: manualModalJob.id,
        providerId,
        driverProfileId: selectedDriverId,
        idempotencyKey: `dispatch-manual-${manualModalJob.id}-${Date.now()}`,
      });

      setStatusMsg({ type: 'success', text: 'Dispatch offer created successfully!' });
      setJobs(jobs.map(j => j.id === manualModalJob.id ? { ...j, status: 'DISPATCHED' } : j));
      setManualModalJob(null);
      setSelectedDriverId('');
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to dispatch' });
    } finally {
      setLoadingJobId(null);
    }
  };

  const pendingJobs = jobs.filter(j => ['REQUESTED', 'PRICED', 'CREATED'].includes(j.status));
  const activeJobs = jobs.filter(j => ['DISPATCHED', 'ASSIGNED', 'AT_PICKUP', 'PICKED_UP', 'IN_TRANSIT', 'AT_DROPOFF'].includes(j.status));

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Dispatch Board</h1>
          <p className="text-slate-500 mt-1">Provider: <span className="font-semibold text-slate-700">{providerName}</span></p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 bg-white border border-slate-200 px-3 py-2 rounded-xl">
          <User className="w-4 h-4 text-emerald-600" />
          <span>{drivers.length} Drivers Online & Available</span>
        </div>
      </div>

      {statusMsg && (
        <div className={`p-4 rounded-xl text-sm flex justify-between items-center ${statusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          <span>{statusMsg.text}</span>
          <button onClick={() => setStatusMsg(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Columns: Queue vs Active */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Unassigned / Ready to Dispatch */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              Dispatch Queue ({pendingJobs.length})
            </h2>
            <span className="text-xs text-slate-400 font-semibold">Needs Rider</span>
          </div>

          <div className="space-y-3">
            {pendingJobs.length === 0 ? (
              <Card className="bg-slate-50 border-dashed text-center p-8">
                <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-sm font-medium">Dispatch queue is empty.</p>
              </Card>
            ) : (
              pendingJobs.map((job) => (
                <Card key={job.id} className="hover:border-amber-200 transition-colors space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono text-xs font-bold text-slate-800">
                        {job.trackingReference || job.id.slice(0, 8)}
                      </span>
                      <p className="text-xs text-slate-500 mt-0.5">Source: {job.sourceType || 'DIRECT'}</p>
                    </div>
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                      {job.status}
                    </Badge>
                  </div>

                  <div className="text-xs text-slate-600 space-y-1">
                    <p><span className="font-semibold text-slate-700">Pickup:</span> {job.pickupAddress || 'Warehouse / Store'}</p>
                    <p><span className="font-semibold text-slate-700">Dropoff:</span> {job.dropoffAddress}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setManualModalJob(job)}
                    >
                      Assign
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={loadingJobId === job.id}
                      onClick={() => handleAutoDispatch(job.id)}
                    >
                      {loadingJobId === job.id ? <RefreshCw className="w-3 h-3 animate-spin mr-1" /> : <Send className="w-3 h-3 mr-1" />}
                      Auto Dispatch
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* In-Flight & Active */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Truck className="w-5 h-5 text-teal-600" />
              Active in Field ({activeJobs.length})
            </h2>
            <span className="text-xs text-slate-400 font-semibold">In Progress</span>
          </div>

          <div className="space-y-3">
            {activeJobs.length === 0 ? (
              <Card className="bg-slate-50 border-dashed text-center p-8">
                <Truck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-sm font-medium">No active deliveries currently in progress.</p>
              </Card>
            ) : (
              activeJobs.map((job) => (
                <Card key={job.id} className="hover:border-teal-200 transition-colors space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono text-xs font-bold text-teal-800">
                        {job.trackingReference || job.id.slice(0, 8)}
                      </span>
                      <p className="text-xs text-slate-500 mt-0.5">Dest: {job.dropoffAddress.split(',')[0]}</p>
                    </div>
                    <Badge variant="default" className="bg-teal-50 text-teal-700 border-teal-200">
                      {job.status}
                    </Badge>
                  </div>

                  <div className="text-xs text-slate-600">
                    <p className="truncate"><span className="font-semibold text-slate-700">Dropoff:</span> {job.dropoffAddress}</p>
                  </div>

                  <div className="text-[11px] text-slate-400 flex items-center justify-between pt-2 border-t border-slate-100">
                    <span>Handover OTP: <strong className="font-mono text-slate-700">{job.recipientOtp || 'None'}</strong></span>
                    <a href={`/drive/delivery?ref=${job.trackingReference || job.id}`} target="_blank" className="text-teal-700 font-bold hover:underline inline-flex items-center gap-0.5">
                      Live Track <ArrowRight className="w-3 h-3" />
                    </a>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Manual Assignment Modal */}
      {manualModalJob && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">Manual Driver Assignment</h3>
              <button onClick={() => setManualModalJob(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <p className="text-xs text-slate-500">Assigning Job:</p>
              <p className="text-sm font-mono font-bold text-slate-800">{manualModalJob.trackingReference || manualModalJob.id}</p>
              <p className="text-xs text-slate-600 mt-1">To: {manualModalJob.dropoffAddress}</p>
            </div>
            <form onSubmit={handleManualDispatch} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Select Available Rider</label>
                <select
                  required
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white"
                >
                  <option value="">-- Choose Driver --</option>
                  {drivers.map((d: any) => (
                    <option key={d.id} value={d.id}>
                      {d.person?.firstName} {d.person?.lastName} {d.currentVehicle ? `(${d.currentVehicle.licensePlate})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" type="button" onClick={() => setManualModalJob(null)}>Cancel</Button>
                <Button variant="primary" type="submit" disabled={!selectedDriverId || loadingJobId === manualModalJob.id}>
                  {loadingJobId === manualModalJob.id ? 'Assigning...' : 'Confirm Assignment'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
