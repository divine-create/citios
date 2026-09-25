import React from 'react';
import { requireMembership } from '@/lib/actions/tenant';
import { getOrders } from '@/lib/actions/restaurantos';
import { Badge, EmptyState } from '@/components/ui';
import { ShoppingBag, Search, Filter } from 'lucide-react';
import { formatNaira, formatDateTime } from '@/lib/utils';
import Link from 'next/link';

export const metadata = {
  title: 'Order History - RestaurantOS',
};

export default async function OrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ location?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const locationId = sp.location;

  await requireMembership(slug, ['OWNER', 'ADMIN', 'MANAGER'], locationId);

  // Fetch orders (limit 100 for now)
  const orders = await getOrders(slug, { limit: 100 });
  const filteredOrders = locationId ? orders.filter((o: any) => o.locationId === locationId) : orders;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Order History</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            View recent transactions and past orders.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search orders..." 
              className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-full sm:w-64"
            />
          </div>
          <button className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors">
            <Filter size={18} />
          </button>
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border shadow-sm p-8">
          <EmptyState 
            icon={<ShoppingBag size={24} />}
            title="No orders found"
            description="You don't have any recorded orders for this location yet."
          />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-5 py-3 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Order ID</th>
                  <th className="px-5 py-3 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Date & Time</th>
                  <th className="px-5 py-3 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Type</th>
                  <th className="px-5 py-3 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Status</th>
                  <th className="px-5 py-3 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Payment</th>
                  <th className="px-5 py-3 font-bold text-slate-500 uppercase tracking-wider text-[11px] text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map((order: any) => (
                  <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-900">
                        {order.orderNumber || order.id.slice(0, 8)}
                      </div>
                      <div className="text-[11px] font-medium text-slate-400 truncate w-24">
                        {order.id}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-600 font-medium">
                      {new Date(String(order.createdAt)).toLocaleString('en-US', { 
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                      })}
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={order.type === 'DINE_IN' ? 'teal' : 'default'}>
                        {order.type.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={
                        order.status === 'COMPLETED' ? 'success' :
                        order.status === 'CANCELLED' ? 'error' : 'warning'
                      }>
                        {order.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={
                        order.paymentStatus === 'PAID' ? 'success' :
                        order.paymentStatus === 'REFUNDED' ? 'error' : 'default'
                      }>
                        {order.paymentStatus}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 font-black text-slate-900 text-right">
                      {formatNaira(order.totalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
