import React from 'react';
import { db } from '@/src/prisma/db';
import { getProviderDeliveryOverview, findStuckDeliveries } from '@/lib/actions/logistics-intelligence';
import { Card, Badge, Button } from '@/components/Shared';
import { PackageOpen, MapPin, AlertTriangle, CheckCircle2, Truck, DollarSign, Clock } from 'lucide-react';

export default async function LogisticsDashboardPage() {
  // Try to find the first valid logistics provider in the system
  const provider = await db.orm.public.Organization.where({ type: 'LOGISTICS' }).first() || 
                   await db.orm.public.Organization.all().first();

  if (!provider) {
    return <div className="p-10 text-center text-slate-500">No organizations found in database.</div>;
  }

  // Fetch true backend analytics using our hardened Intelligence API!
  const overview = await getProviderDeliveryOverview(provider.id);
  
  // Find stuck/breached deliveries to alert the dispatcher
  const stuckDeliveries = await findStuckDeliveries({ maxTransitMinutes: 60 });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Live Operations</h1>
          <p className="text-slate-500 mt-1">Provider: <span className="font-semibold text-slate-700">{provider.name}</span></p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">Download Report</Button>
          <Button variant="primary">New Dispatch</Button>
        </div>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="flex flex-col gap-2">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
            <Badge variant="default">Live</Badge>
          </div>
          <div>
            <h3 className="text-slate-500 font-bold text-xs uppercase tracking-wider">Active Jobs</h3>
            <p className="text-3xl font-black text-slate-900 mt-1">{overview.deliveries.total - overview.deliveries.completed - overview.deliveries.cancelled}</p>
          </div>
        </Card>

        <Card className="flex flex-col gap-2">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <Badge className="bg-teal-50 text-teal-700">Today</Badge>
          </div>
          <div>
            <h3 className="text-slate-500 font-bold text-xs uppercase tracking-wider">Completed</h3>
            <p className="text-3xl font-black text-slate-900 mt-1">{overview.deliveries.completed}</p>
          </div>
        </Card>

        <Card className="flex flex-col gap-2">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
            <Badge className="bg-orange-50 text-orange-700">Earnings</Badge>
          </div>
          <div>
            <h3 className="text-slate-500 font-bold text-xs uppercase tracking-wider">Settled Amount</h3>
            <p className="text-3xl font-black text-slate-900 mt-1">
              ${(0 || 0).toFixed(2)}
            </p>
          </div>
        </Card>

        <Card className="flex flex-col gap-2 border-red-200 bg-red-50/50">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            {stuckDeliveries.length > 0 && (
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            )}
          </div>
          <div>
            <h3 className="text-red-800 font-bold text-xs uppercase tracking-wider">SLA Breaches / Stuck</h3>
            <p className="text-3xl font-black text-red-700 mt-1">{stuckDeliveries.length}</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Feed (Active Jobs) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800">Dispatch Feed</h2>
            <Button variant="ghost" size="sm">View All</Button>
          </div>
          
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-4">Job ID</th>
                  <th className="px-6 py-4">Source</th>
                  <th className="px-6 py-4">Destination</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(overview as any).recentJobs || [].length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-400">No active deliveries.</td>
                  </tr>
                ) : (
                  (((overview as any).recentJobs as any[]) || []).map((job: any) => (
                    <tr key={job?.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-mono text-slate-600">{job?.id.slice(0, 8)}...</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <PackageOpen className="w-4 h-4 text-slate-400" />
                          <span className="font-medium text-slate-800">{job.sourceType}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-slate-400" />
                          <span className="truncate max-w-[150px]">{job.dropoffAddress}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={job.status === 'COMPLETED' ? 'default' : 'accent'}>
                          {job.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sidebar Alerts */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-800">Intervention Required</h2>
          
          <div className="space-y-4">
            {stuckDeliveries.length === 0 ? (
              <Card className="bg-slate-50 border-dashed text-center p-8">
                <CheckCircle2 className="w-8 h-8 text-teal-400 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">All fleets operating smoothly.</p>
              </Card>
            ) : (
              stuckDeliveries.map((stuck) => (
                <Card key={stuck.deliveryId} className="border-red-200 bg-red-50/30">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 bg-red-100 text-red-600 p-2 rounded-lg">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-red-900">Job #{stuck.deliveryId.slice(0, 8)}</h4>
                      <p className="text-sm text-red-700 mt-1">Stuck in <strong>{stuck.currentStatus}</strong></p>
                      <div className="flex items-center gap-1 mt-3 text-xs font-bold text-red-800 uppercase tracking-wider">
                        <Clock className="w-3 h-3" />
                        Breached SLA
                      </div>
                    </div>
                  </div>
                  <Button variant="accent" className="w-full mt-4 bg-red-600 hover:bg-red-700 shadow-red-200">
                    Contact Driver
                  </Button>
                </Card>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
