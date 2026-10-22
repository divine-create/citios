'use client';

import React, { useState, useEffect } from 'react';
import { Card, Button, Badge } from '@/components/Shared';
import {
  MapPin,
  Navigation,
  Clock,
  Package,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  Truck,
  Phone,
  Power,
  RotateCcw,
} from 'lucide-react';
import {
  fetchRiderActiveJobsAction,
  respondToDispatchAction,
  executeOperationalStepAction,
  submitRiderProofOfDeliveryAction,
  reportRiderIssueAction,
  checkInRiderAction,
  checkOutRiderAction,
} from '@/lib/actions/courier-actions';

export default function CourierDashboard() {
  const [loading, setLoading] = useState(true);
  const [driverProfile, setDriverProfile] = useState<any>(null);
  const [status, setStatus] = useState<'ONLINE' | 'OFFLINE' | 'BUSY'>('OFFLINE');
  const [offers, setOffers] = useState<any[]>([]);
  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const [otpInput, setOtpInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState(false);

  async function refreshData() {
    try {
      setErrorMsg(null);
      const data = await fetchRiderActiveJobsAction();
      if (data?.driverProfile) {
        setDriverProfile(data.driverProfile);
        setStatus(data.driverProfile.status as any);
      }
      setOffers(data?.offers || []);
      setActiveJobs(data?.activeJobs || []);
    } catch (err: any) {
      console.warn('Could not load rider active jobs:', err?.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 10000);
    return () => clearInterval(interval);
  }, []);

  async function handleToggleOnline() {
    if (!driverProfile?.id) {
      setErrorMsg('No active rider profile associated with this account.');
      return;
    }
    setActionInProgress(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      if (status === 'ONLINE') {
        await checkOutRiderAction({ driverProfileId: driverProfile.id });
        setStatus('OFFLINE');
        setSuccessMsg('You are now Offline.');
      } else {
        // Calabar Municipal default center
        await checkInRiderAction({
          driverProfileId: driverProfile.id,
          latitude: 4.9757,
          longitude: 8.3417,
        });
        setStatus('ONLINE');
        setSuccessMsg('You are now Online and accepting Calabar deliveries.');
      }
      await refreshData();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Check-in/out failed.');
    } finally {
      setActionInProgress(false);
    }
  }

  async function handleRespondOffer(dispatchId: string, action: 'ACCEPT' | 'REJECT') {
    setActionInProgress(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await respondToDispatchAction({ dispatchId, action });
      setSuccessMsg(action === 'ACCEPT' ? 'Delivery accepted! Proceed to pickup.' : 'Offer declined.');
      await refreshData();
    } catch (err: any) {
      setErrorMsg(err?.message || `Failed to ${action.toLowerCase()} offer.`);
    } finally {
      setActionInProgress(false);
    }
  }

  async function handleOperationalStep(
    deliveryJobId: string,
    step: 'AT_PICKUP' | 'PICKED_UP' | 'IN_TRANSIT' | 'AT_DROPOFF'
  ) {
    setActionInProgress(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await executeOperationalStepAction({ deliveryJobId, step });
      setSuccessMsg(`Status updated to ${step.replace('_', ' ')}.`);
      await refreshData();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update step.');
    } finally {
      setActionInProgress(false);
    }
  }

  async function handleCompleteWithOtp(deliveryJobId: string) {
    if (!otpInput.trim()) {
      setErrorMsg('Please enter the 6-digit recipient delivery PIN.');
      return;
    }
    setActionInProgress(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await submitRiderProofOfDeliveryAction({
        deliveryJobId,
        type: 'OTP',
        otp: otpInput.trim(),
      });
      setSuccessMsg('Delivery completed successfully with verified Proof of Delivery!');
      setOtpInput('');
      await refreshData();
    } catch (err: any) {
      setErrorMsg(err?.message || 'OTP verification failed.');
    } finally {
      setActionInProgress(false);
    }
  }

  const currentJob = activeJobs[0];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Alert Notifications */}
      {errorMsg && (
        <div className="p-4 bg-red-950/80 border border-red-800 text-red-200 rounded-xl text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-white text-xs">
            Dismiss
          </button>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-teal-950/80 border border-teal-800 text-teal-200 rounded-xl text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-teal-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-teal-400 hover:text-white text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* Online Status & Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-slate-950 border-slate-800 flex flex-col justify-between">
          <div>
            <h2 className="text-teal-400 text-xs font-bold uppercase tracking-wider mb-2">Rider State</h2>
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  status === 'ONLINE'
                    ? 'bg-teal-400 animate-pulse shadow-[0_0_10px_rgba(45,212,191,0.5)]'
                    : status === 'BUSY'
                    ? 'bg-amber-400 animate-pulse shadow-[0_0_10px_rgba(251,191,36,0.5)]'
                    : 'bg-slate-600'
                }`}
              ></div>
              <span className="text-2xl font-black text-white tracking-tighter">
                {status === 'ONLINE'
                  ? 'Accepting Orders'
                  : status === 'BUSY'
                  ? 'On Active Delivery'
                  : 'Offline'}
              </span>
            </div>
          </div>
          <div className="mt-4">
            <Button
              onClick={handleToggleOnline}
              disabled={actionInProgress || status === 'BUSY'}
              className={`w-full font-bold flex items-center justify-center gap-2 ${
                status === 'ONLINE'
                  ? 'bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-700/50'
                  : 'bg-teal-500 hover:bg-teal-400 text-slate-950'
              }`}
            >
              <Power className="w-4 h-4" />
              {status === 'ONLINE' ? 'Go Offline' : 'Go Online'}
            </Button>
          </div>
        </Card>

        <Card className="p-6 bg-slate-950 border-slate-800">
          <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Calabar Zone</h3>
          <p className="text-2xl font-black text-white tracking-tighter">Calabar Municipal</p>
          <p className="text-[10px] text-teal-400 font-bold uppercase tracking-wider mt-1">
            Marian Road • State Housing Corridor
          </p>
        </Card>

        <Card className="p-6 bg-slate-950 border-slate-800">
          <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Active Vehicle</h3>
          <p className="text-2xl font-black text-white tracking-tighter">
            {driverProfile?.currentVehicle?.type || 'Motorcycle'}
          </p>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
            Plate: {driverProfile?.currentVehicle?.licensePlate || 'CR-748-CAL'}
          </p>
        </Card>
      </div>

      {/* Incoming Offers */}
      {offers.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Incoming Delivery Offer
          </h3>
          {offers.map((offer) => (
            <Card
              key={offer.dispatchId}
              className="p-6 overflow-hidden border-teal-800/50 bg-slate-950 ring-1 ring-teal-500/20 mb-4"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex-1 w-full space-y-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="neutral" className="bg-orange-500/20 text-orange-400 border-orange-500/20">
                      Single Delivery
                    </Badge>
                    <span className="text-xl font-black text-white">
                      Est. Payout ₦{(offer.job?.packageWeightKg ? offer.job.packageWeightKg * 200 + 1200 : 1500).toLocaleString()}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm text-slate-300">
                    <div className="flex items-start gap-2">
                      <Package className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-slate-500 text-xs font-bold uppercase block">Pickup Area</span>
                        <span>{offer.job?.pickupAddress || 'Calabar Hub'}</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-slate-500 text-xs font-bold uppercase block">Dropoff Area</span>
                        <span>{offer.job?.dropoffAddress || 'Calabar Destination'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                  <Button
                    onClick={() => handleRespondOffer(offer.dispatchId, 'REJECT')}
                    disabled={actionInProgress}
                    variant="outline"
                    className="border-slate-700 text-slate-300 hover:bg-slate-800"
                  >
                    Decline
                  </Button>
                  <Button
                    onClick={() => handleRespondOffer(offer.dispatchId, 'ACCEPT')}
                    disabled={actionInProgress}
                    className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-black shadow-[0_0_15px_rgba(45,212,191,0.3)]"
                  >
                    <Navigation className="w-4 h-4 mr-2" />
                    Accept Request
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Active In-Progress Delivery */}
      {currentJob ? (
        <div className="mt-8 space-y-4">
          <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-2">
            <Truck className="w-4 h-4" /> Current Active Job: {currentJob.trackingReference || currentJob.id.slice(0, 8)}
          </h3>

          <Card className="p-6 bg-slate-950 border-teal-800/40 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase">Current Stage</p>
                <p className="text-xl font-black text-white">{currentJob.status}</p>
              </div>
              <Badge variant="default" className="bg-teal-500/20 text-teal-300 border-teal-500/30">
                In Progress
              </Badge>
            </div>

            {/* Destination & Authorized Contact Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="p-4 bg-slate-900/60 rounded-xl space-y-2 border border-slate-800">
                <span className="text-xs font-bold text-slate-400 uppercase block">Pickup Location</span>
                <p className="text-white font-medium">{currentJob.pickupAddress}</p>
                {currentJob.pickupContactPhone && (
                  <p className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-teal-400" /> {currentJob.pickupContactPhone}
                  </p>
                )}
              </div>

              <div className="p-4 bg-slate-900/60 rounded-xl space-y-2 border border-slate-800">
                <span className="text-xs font-bold text-slate-400 uppercase block">Dropoff Destination</span>
                <p className="text-white font-medium">{currentJob.dropoffAddress}</p>
                {currentJob.dropoffContactPhone && (
                  <p className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-teal-400" /> {currentJob.dropoffContactPhone} ({currentJob.dropoffContactName || 'Customer'})
                  </p>
                )}
              </div>
            </div>

            {/* Step Advancement Controls */}
            <div className="pt-2 border-t border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase block mb-3">Operational Progression</span>
              <div className="flex flex-wrap gap-3">
                {currentJob.status === 'ASSIGNED' && (
                  <Button
                    onClick={() => handleOperationalStep(currentJob.id, 'AT_PICKUP')}
                    disabled={actionInProgress}
                    className="bg-teal-600 hover:bg-teal-500 text-white font-bold"
                  >
                    1. Arrived at Merchant Pickup
                  </Button>
                )}

                {currentJob.status === 'AT_PICKUP' && (
                  <Button
                    onClick={() => handleOperationalStep(currentJob.id, 'PICKED_UP')}
                    disabled={actionInProgress}
                    className="bg-teal-600 hover:bg-teal-500 text-white font-bold"
                  >
                    2. Confirm Package Picked Up
                  </Button>
                )}

                {currentJob.status === 'PICKED_UP' && (
                  <Button
                    onClick={() => handleOperationalStep(currentJob.id, 'IN_TRANSIT')}
                    disabled={actionInProgress}
                    className="bg-teal-600 hover:bg-teal-500 text-white font-bold"
                  >
                    3. Depart / In Transit
                  </Button>
                )}

                {currentJob.status === 'IN_TRANSIT' && (
                  <Button
                    onClick={() => handleOperationalStep(currentJob.id, 'AT_DROPOFF')}
                    disabled={actionInProgress}
                    className="bg-teal-600 hover:bg-teal-500 text-white font-bold"
                  >
                    4. Arrived at Dropoff Destination
                  </Button>
                )}

                {currentJob.status === 'AT_DROPOFF' && (
                  <div className="w-full space-y-3 bg-slate-900/80 p-4 rounded-xl border border-teal-800/40">
                    <span className="text-xs font-bold text-teal-400 uppercase block">Recipient PIN Verification</span>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        placeholder="Enter 6-digit delivery PIN"
                        value={otpInput}
                        onChange={(e) => setOtpInput(e.target.value)}
                        maxLength={6}
                        className="bg-slate-950 border border-slate-700 text-white px-4 py-2 rounded-xl text-sm focus:outline-none focus:border-teal-400 w-64 tracking-widest text-center font-mono text-lg"
                      />
                      <Button
                        onClick={() => handleCompleteWithOtp(currentJob.id)}
                        disabled={actionInProgress || otpInput.trim().length < 4}
                        className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold"
                      >
                        <ShieldCheck className="w-4 h-4 mr-2" />
                        Verify & Complete Delivery
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      ) : (
        !offers.length &&
        status === 'ONLINE' && (
          <div className="mt-8 text-center py-12 border border-dashed border-slate-800 rounded-2xl">
            <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2 animate-spin" />
            <p className="text-slate-400 text-sm font-medium">Looking for delivery requests in Calabar...</p>
            <p className="text-slate-600 text-xs mt-1">Keep your app open. You will be alerted when a request is dispatched.</p>
          </div>
        )
      )}
    </div>
  );
}
