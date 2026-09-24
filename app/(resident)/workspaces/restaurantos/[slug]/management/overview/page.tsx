import React from 'react';
import { requireMembership } from '@/lib/actions/tenant';
import { getFinancialSummary, getOrders } from '@/lib/actions/restaurantos';
import { db } from '@/src/prisma/db';
import { Badge } from '@/components/ui';
import { formatNaira } from '@/lib/utils';
import { TrendingUp, ShoppingBag, AlertCircle, Percent } from 'lucide-react';

export default async function OverviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requireMembership(slug, ['OWNER', 'MANAGER', 'ADMIN']);

  const [finance, orders] = await Promise.all([
    getFinancialSummary(slug),
    getOrders(slug, { limit: 50 })
  ]);

  const settings = await db.orm.public.RestaurantSettings.where({ organizationId: slug }).all().first();

  const todayOrders = orders.filter((o: any) => o.status !== 'CANCELLED');
  const avgOrderValue = todayOrders.length > 0 ? todayOrders.reduce((s: number, o: any) => s + (o.totalAmount || 0), 0) / todayOrders.length : 0;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-black text-slate-900 tracking-tight">Overview</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-6 bg-white rounded-2xl border border-slate-200">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Today's Sales</p>
          <div className="flex items-center gap-2">
            <TrendingUp className="text-emerald-500" size={24} />
            <h2 className="text-2xl font-black text-slate-900">{formatNaira(finance?.income || 0)}</h2>
          </div>
        </div>
        
        <div className="p-6 bg-white rounded-2xl border border-slate-200">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Orders Completed</p>
          <div className="flex items-center gap-2">
            <ShoppingBag className="text-blue-500" size={24} />
            <h2 className="text-2xl font-black text-slate-900">{todayOrders.filter((o: any) => o.status === 'COMPLETED').length}</h2>
          </div>
        </div>

        <div className="p-6 bg-white rounded-2xl border border-slate-200">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Avg Order Value</p>
          <h2 className="text-2xl font-black text-slate-900">{formatNaira(avgOrderValue)}</h2>
        </div>

        {settings?.enableFoodCosting ? (
          <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 text-white">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Food Cost % (Theoretical)</p>
            <div className="flex items-center gap-2">
              <Percent className="text-emerald-400" size={24} />
              <h2 className="text-2xl font-black text-white">--%</h2>
            </div>
          </div>
        ) : (
          <div className="p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
            <p className="text-xs font-bold text-slate-400 uppercase mb-2">Food Costing Disabled</p>
            <Badge variant="default">Enable in Capabilities</Badge>
          </div>
        )}
      </div>

      {settings?.enableInventory && (
        <div>
          <h2 className="text-lg font-black text-slate-900 mb-4">Inventory Alerts</h2>
          <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-4">
            <AlertCircle className="text-amber-500 shrink-0" />
            <div>
              <h3 className="font-bold text-amber-900">Low Stock Warnings</h3>
              <p className="text-sm text-amber-700 mt-1">Some tracked inventory items are running below minimum thresholds.</p>
              <a href={`/workspaces/restaurantos/${slug}/management/inventory`} className="text-xs font-bold text-amber-800 underline mt-2 inline-block">View Inventory</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
