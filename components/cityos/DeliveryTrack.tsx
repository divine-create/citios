'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Truck, MapPin, PackageCheck, Navigation, Search, CheckCircle2, Clock, AlertTriangle, ArrowRight } from 'lucide-react';
import { Pill } from '@/components/cityos/CityUI';
import { cn } from '@/lib/utils';
import type { PublicTrackingResponse } from '@/lib/actions/logistics-tracking';

interface DeliveryTrackProps {
  initialTracking?: PublicTrackingResponse | null;
  initialRef?: string;
}

export default function DeliveryTrack({ initialTracking, initialRef }: DeliveryTrackProps) {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState(initialRef || '');

  const tracking = initialTracking;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      router.push(`/drive/delivery?ref=${encodeURIComponent(searchInput.trim())}`);
    }
  };

  const getStageNumber = (status?: string) => {
    switch (status) {
      case 'REQUESTED':
      case 'PRICED':
      case 'CREATED':
        return 1;
      case 'DISPATCHED':
      case 'ASSIGNED':
        return 2;
      case 'AT_PICKUP':
      case 'PICKED_UP':
        return 3;
      case 'IN_TRANSIT':
      case 'AT_DROPOFF':
        return 4;
      case 'DELIVERED':
      case 'COMPLETED':
        return 5;
      default:
        return 1;
    }
  };

  const currentStage = getStageNumber(tracking?.status);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500 py-4">
      
      {/* Tracking Reference Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
          <Truck className="w-5 h-5 text-teal-600" />
          <span>CityDrive Live Tracking</span>
        </div>
        <form onSubmit={handleSearch} className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="e.g. CD-48F19A"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono uppercase"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-1.5 bg-teal-700 text-white text-sm font-semibold rounded-xl hover:bg-teal-800 transition-colors shrink-0"
          >
            Track
          </button>
        </form>
      </div>

      {tracking ? (
        <>
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                <PackageCheck className="w-6 h-6 text-teal-700" />
                Delivery Ref: <span className="font-mono text-teal-800">{tracking.trackingReference}</span>
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Service Level: <span className="font-semibold text-slate-700">{tracking.serviceLevel}</span> · Ordered on {new Date(tracking.createdAt).toLocaleDateString()}
              </p>
            </div>
            
            <Pill tone={tracking.isDelivered ? 'teal' : tracking.isFailed ? 'red' : 'orange'}>
              <span className={cn('w-2 h-2 rounded-full mr-1.5', tracking.isDelivered ? 'bg-teal-500' : tracking.isFailed ? 'bg-red-500' : 'bg-orange-500 animate-pulse')} />
              {tracking.statusLabel}
            </Pill>
          </div>

          {/* Stepper Progress */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="grid grid-cols-5 gap-2 text-center text-xs">
              {[
                { stage: 1, label: 'Placed' },
                { stage: 2, label: 'Assigned' },
                { stage: 3, label: 'Picked Up' },
                { stage: 4, label: 'In Transit' },
                { stage: 5, label: 'Delivered' },
              ].map((step) => {
                const isPassed = currentStage >= step.stage && !tracking.isFailed && !tracking.isCancelled;
                const isCurrent = currentStage === step.stage && !tracking.isFailed && !tracking.isCancelled;

                return (
                  <div key={step.stage} className="flex flex-col items-center">
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center font-bold mb-2 text-xs transition-colors',
                        isPassed ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-400',
                        isCurrent && 'ring-4 ring-teal-100 animate-pulse'
                      )}
                    >
                      {isPassed ? <CheckCircle2 className="w-4 h-4" /> : step.stage}
                    </div>
                    <span className={cn('font-semibold text-[11px]', isPassed ? 'text-slate-900' : 'text-slate-400')}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Milestones Timeline */}
            <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-600" /> Operational Milestones
              </h2>

              <div className="space-y-4 pt-2">
                {tracking.milestones.length === 0 ? (
                  <p className="text-slate-400 text-xs italic">Awaiting first dispatch event...</p>
                ) : (
                  tracking.milestones.map((m, idx) => (
                    <div key={idx} className="flex items-start gap-3 border-l-2 border-teal-200 pl-4 py-1 relative">
                      <div className="w-3 h-3 rounded-full bg-teal-600 absolute -left-[7px] top-2 ring-2 ring-white" />
                      <div>
                        <p className="font-bold text-sm text-slate-900">{m.label}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{new Date(m.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Address & Destination */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-teal-600" /> Destination
                </h2>
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase">Dropoff Address</p>
                  <p className="text-sm font-bold text-slate-800 mt-1">{tracking.dropoffAddress}</p>
                </div>

                {tracking.pickupAddressArea && (
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase">Origin Area</p>
                    <p className="text-sm font-semibold text-slate-700 mt-1">{tracking.pickupAddressArea}</p>
                  </div>
                )}
              </div>

              <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 text-xs text-teal-800">
                <p className="font-bold flex items-center gap-1.5">
                  <Navigation className="w-4 h-4 text-teal-600" /> Secure Handover
                </p>
                <p className="mt-1 text-teal-700 leading-relaxed">
                  Have your 6-digit verification code ready when the rider arrives to confirm recipient identity.
                </p>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm space-y-4">
          <PackageCheck className="w-12 h-12 text-slate-300 mx-auto" />
          <div>
            <h2 className="text-lg font-black text-slate-800">Track Any CityDrive Delivery</h2>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              Enter your tracking reference above (e.g. from your booking confirmation or order receipt) to view real-time delivery status and milestone progress.
            </p>
          </div>
        </div>
      )}

      <div className="text-center pt-4">
        <Link href="/" className="text-xs font-semibold text-slate-400 hover:text-teal-700 transition-colors">
          ← Back to CityOS Portal
        </Link>
      </div>

    </div>
  );
}
