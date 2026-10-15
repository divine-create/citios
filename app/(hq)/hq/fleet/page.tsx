import React from 'react';
import { requireSystemAdmin } from '@/lib/rbac';
import { getHQFleetData } from '@/lib/actions/hq-fleet';
import {
  Truck,
  Car,
  Bike,
  Search,
  Radio,
  MapPin,
  CheckCircle2,
  Clock,
  Shield,
  Eye,
  ExternalLink,
  Building,
  Users,
  Navigation,
  ArrowRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';
import FleetDriverActions from '@/components/hq/FleetDriverActions';

export default async function HQFleetPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; type?: string; page?: string }>;
}) {
  await requireSystemAdmin();

  const { q, status, type, page } = await searchParams;
  const pageNum = page ? parseInt(page, 10) : 1;

  const data = await getHQFleetData({
    q,
    status,
    type,
    page: pageNum,
  });

  const { metrics, couriers, totalFilteredCouriers, currentPage, totalPages, recentJobs } = data;

  const getVehicleIcon = (vehicleType: string) => {
    const t = vehicleType?.toUpperCase();
    if (t === 'BIKE' || t === 'MOTORCYCLE' || t === 'SCOOTER') {
      return <Bike className="w-4 h-4 text-amber-400" />;
    }
    if (t === 'VAN' || t === 'TRUCK') {
      return <Truck className="w-4 h-4 text-cyan-400" />;
    }
    return <Car className="w-4 h-4 text-blue-400" />;
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'ONLINE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Online
          </span>
        );
      case 'BUSY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            In Transit
          </span>
        );
      case 'SUSPENDED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20">
            Suspended
          </span>
        );
      case 'OFFLINE':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">
            Offline
          </span>
        );
    }
  };

  const getJobStatusBadge = (s: string) => {
    switch (s) {
      case 'DELIVERED':
      case 'COMPLETED':
        return <Badge variant="success" className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Delivered</Badge>;
      case 'IN_TRANSIT':
        return <Badge variant="default" className="bg-blue-500/10 text-blue-400 border border-blue-500/20">In Transit</Badge>;
      case 'AT_PICKUP':
      case 'AT_DROPOFF':
        return <Badge variant="default" className="bg-purple-500/10 text-purple-400 border border-purple-500/20">{s.replace('_', ' ')}</Badge>;
      case 'DISPATCHED':
      case 'ASSIGNED':
        return <Badge variant="default" className="bg-amber-500/10 text-amber-400 border border-amber-500/20">{s}</Badge>;
      case 'CANCELLED':
      case 'FAILED':
        return <Badge variant="error" className="bg-red-500/10 text-red-400 border border-red-500/20">{s}</Badge>;
      default:
        return <Badge variant="default" className="bg-slate-800 text-slate-300 border border-slate-700/50">{s}</Badge>;
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">Logistics Fleet Operations</h1>
              <p className="text-slate-400 text-sm mt-0.5">
                Citywide dispatch telemetry, active couriers, and multi-provider fleet operations.
              </p>
            </div>
          </div>
        </div>

        {/* Filter Form */}
        <form className="flex flex-wrap gap-2 w-full sm:w-auto" method="GET">
          <div className="relative flex-1 sm:w-60">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search driver, plate, provider..."
              className="w-full bg-slate-900 border border-slate-800 text-white text-sm rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          <select
            name="status"
            defaultValue={status || 'ALL'}
            className="bg-slate-900 border border-slate-800 text-white text-sm rounded-xl px-3 py-2 focus:outline-none"
          >
            <option value="ALL">All Status</option>
            <option value="ONLINE">Online ({metrics.onlineCouriers})</option>
            <option value="BUSY">In Transit ({metrics.busyCouriers})</option>
            <option value="OFFLINE">Offline ({metrics.offlineCouriers})</option>
            <option value="SUSPENDED">Suspended ({metrics.suspendedCouriers})</option>
          </select>

          <select
            name="type"
            defaultValue={type || 'ALL'}
            className="bg-slate-900 border border-slate-800 text-white text-sm rounded-xl px-3 py-2 focus:outline-none"
          >
            <option value="ALL">All Fleets</option>
            <option value="GIG">CityDrive Gig</option>
            <option value="PROVIDER">Commercial Providers</option>
          </select>

          <button
            type="submit"
            className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl px-5 py-2 text-sm transition-colors"
          >
            Filter
          </button>
        </form>
      </div>

      {/* Telemetry KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Drivers */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Couriers</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white">{metrics.totalCouriers.toLocaleString()}</div>
          <div className="mt-3 flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 font-semibold text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              {metrics.onlineCouriers} Online
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">{metrics.offlineCouriers} Offline</span>
          </div>
        </div>

        {/* Card 2: Vehicles */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Registered Vehicles</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
              <Car className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white">{metrics.totalVehicles.toLocaleString()}</div>
          <p className="text-xs text-slate-400 mt-3">Cars, Vans & Delivery Bikes in Fleet</p>
        </div>

        {/* Card 3: Active Dispatches */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Dispatches</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
          </div>
          <div className="text-3xl font-black text-white">{metrics.activeJobsCount.toLocaleString()}</div>
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
            <span className="font-semibold text-emerald-400">{metrics.completedJobsCount} Delivered</span>
            <span>of {metrics.totalJobsCount} total</span>
          </div>
        </div>

        {/* Card 4: Network SLA */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Dispatch Network</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Navigation className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white">99.4%</div>
          <p className="text-xs text-slate-400 mt-3">Hyperlocal Zone Coverage (Calabar)</p>
        </div>
      </div>

      {/* Main Section: Courier & Driver Directory */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-slate-800 bg-slate-900/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-white">Couriers & Drivers Directory</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Showing {couriers.length} of {totalFilteredCouriers} registered delivery operators.
            </p>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Page {currentPage} of {totalPages}</span>
              {currentPage > 1 && (
                <Link
                  href={`/hq/fleet?page=${currentPage - 1}${q ? `&q=${q}` : ''}${status ? `&status=${status}` : ''}${type ? `&type=${type}` : ''}`}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold"
                >
                  Prev
                </Link>
              )}
              {currentPage < totalPages && (
                <Link
                  href={`/hq/fleet?page=${currentPage + 1}${q ? `&q=${q}` : ''}${status ? `&status=${status}` : ''}${type ? `&type=${type}` : ''}`}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold"
                >
                  Next
                </Link>
              )}
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="px-6 py-3.5">Courier / Driver</th>
                <th className="px-6 py-3.5">Fleet Organization</th>
                <th className="px-6 py-3.5">Vehicle & Plate</th>
                <th className="px-6 py-3.5">Telemetry Status</th>
                <th className="px-6 py-3.5">Rating / Quality</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {couriers.map((c) => (
                <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                  {/* Courier Name */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700/50">
                        {getVehicleIcon(c.vehicleType)}
                      </div>
                      <div>
                        <Link
                          href={`/hq/users/${c.personId}`}
                          className="font-bold text-white text-sm hover:text-cyan-400 transition-colors flex items-center gap-1.5"
                        >
                          {c.name}
                          <ExternalLink className="w-3 h-3 text-slate-500" />
                        </Link>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">{c.personId.split('-')[0]}</p>
                      </div>
                    </div>
                  </td>

                  {/* Provider */}
                  <td className="px-6 py-4">
                    {c.driverType === 'GIG' ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        CityDrive Independent
                      </span>
                    ) : c.providerId ? (
                      <Link
                        href={`/hq/tenants/${c.providerId}`}
                        className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white font-medium hover:underline"
                      >
                        <Building className="w-3.5 h-3.5 text-slate-500" />
                        {c.providerName}
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-400">{c.providerName || 'Provider'}</span>
                    )}
                  </td>

                  {/* Vehicle */}
                  <td className="px-6 py-4">
                    <div className="text-xs">
                      <span className="font-bold text-slate-200">{c.vehicleType}</span>
                      <span className="text-slate-500 mx-1.5">•</span>
                      <span className="font-mono text-slate-400 bg-slate-800/60 px-1.5 py-0.5 rounded border border-slate-700/40">
                        {c.licensePlate}
                      </span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4">{getStatusBadge(c.status)}</td>

                  {/* Rating / Quality */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 text-xs">
                      <span className="font-bold text-amber-400">★ {c.rating.toFixed(1)}</span>
                      {c.onboardingComplete !== undefined && (
                        <span className="text-[10px] text-slate-500 ml-1.5 font-medium">
                          ({c.onboardingComplete ? 'Verified' : 'Pending Docs'})
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/hq/users/${c.personId}`}
                        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                        title="View Citizen Profile"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <FleetDriverActions
                        driverId={c.id}
                        driverType={c.driverType}
                        status={c.status}
                      />
                    </div>
                  </td>
                </tr>
              ))}

              {couriers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-slate-500">
                    <Truck className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                    <p className="font-bold text-white">No fleet operators match your criteria</p>
                    <p className="text-sm mt-1">Try clearing your filters or search term.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live City Delivery & Dispatch Stream */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <h2 className="text-lg font-black text-white">Live City Delivery & Dispatch Stream</h2>
          </div>
          <span className="text-xs text-slate-400">Recent 15 Operations</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="px-6 py-3.5">Tracking Code</th>
                <th className="px-6 py-3.5">Logistics Provider</th>
                <th className="px-6 py-3.5">Transit Route</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Fare</th>
                <th className="px-6 py-3.5 text-right">Dispatched</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {recentJobs.map((job) => (
                <tr key={job.id} className="hover:bg-slate-800/30 transition-colors text-xs">
                  <td className="px-6 py-4 font-mono font-bold text-cyan-400">
                    {job.trackingCode}
                  </td>
                  <td className="px-6 py-4 text-slate-300 font-medium">
                    {job.providerName}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-slate-400">
                      <span className="truncate max-w-[140px] text-slate-300" title={job.pickupAddress}>
                        {job.pickupAddress}
                      </span>
                      <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
                      <span className="truncate max-w-[140px] text-slate-300" title={job.dropoffAddress}>
                        {job.dropoffAddress}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getJobStatusBadge(job.status)}
                  </td>
                  <td className="px-6 py-4 font-mono font-semibold text-slate-200">
                    ₦{job.fare.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right text-slate-500">
                    {job.createdAt ? new Date(job.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                  </td>
                </tr>
              ))}

              {recentJobs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No active delivery jobs in the dispatch queue.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
