'use client';

import React, { useState } from 'react';
import { ShoppingBag, Phone, MapPin, Clock, CheckCircle2, Truck, AlertCircle, Utensils, Loader2, ArrowRight } from 'lucide-react';
import { updateHQManagedOrderStatus } from '@/lib/actions/hq-managed-business';
import { toast } from 'sonner';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  imageUrl?: string | null;
}

interface OrderData {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationAddress: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  type: string;
  createdAt: string;
  customer: {
    name: string;
    phone: string;
  };
  items: OrderItem[];
}

interface HQManagedOrdersConsoleProps {
  initialOrders: OrderData[];
}

export default function HQManagedOrdersConsole({ initialOrders }: HQManagedOrdersConsoleProps) {
  const [orders, setOrders] = useState<OrderData[]>(initialOrders);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState<string>('');

  const filteredOrders =
    statusFilter === 'ALL' ? orders : orders.filter((o) => o.status === statusFilter);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      const res = await updateHQManagedOrderStatus({
        orderId,
        newStatus,
        adminNote: adminNote.trim() || undefined,
      });

      if (res.success) {
        toast.success(`Order marked as ${newStatus}`);
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
        );
        setAdminNote('');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update order status');
    } finally {
      setUpdatingId(null);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 font-bold text-xs">Pending HQ Action</span>;
      case 'PREPARING':
        return <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 font-bold text-xs">Kitchen Preparing</span>;
      case 'READY':
        return <span className="px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-400 font-bold text-xs">Ready for Courier</span>;
      case 'DELIVERING':
        return <span className="px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 font-bold text-xs">Out for Delivery</span>;
      case 'COMPLETED':
        return <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 font-bold text-xs">Completed</span>;
      case 'CANCELLED':
        return <span className="px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 font-bold text-xs">Cancelled</span>;
      default:
        return <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 font-bold text-xs">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Status Filter Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div>
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-teal-400" />
            <h1 className="text-xl font-bold text-white">HQ Managed Orders & Concierge Dispatch</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Total admin order management for unconfirmed spots. Fulfill resident orders, coordinate with establishments, and trigger courier dispatches.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-slate-400">
          Total Managed Orders: <strong className="text-white text-sm">{orders.length}</strong>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {['ALL', 'PENDING', 'PREPARING', 'READY', 'DELIVERING', 'COMPLETED'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
              statusFilter === st
                ? 'bg-teal-500 text-slate-950 font-black'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {st.replace(/_/g, ' ')} ({st === 'ALL' ? orders.length : orders.filter((o) => o.status === st).length})
          </button>
        ))}
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.map((order) => {
          const isBusy = updatingId === order.id;

          return (
            <div
              key={order.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-lg hover:border-slate-700 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-teal-400 shrink-0">
                    <Utensils className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{order.organizationName}</h3>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" /> {order.organizationAddress}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {statusBadge(order.status)}
                  <span className="text-sm font-mono font-black text-white">
                    ₦{order.totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Order Meta & Customer Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-850 text-xs">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Customer Details</p>
                  <p className="text-white font-bold">{order.customer.name}</p>
                  <p className="text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-teal-400" /> {order.customer.phone}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Payment & Type</p>
                  <p className="text-emerald-400 font-bold">{order.paymentStatus} (Wallet / CityPay)</p>
                  <p className="text-slate-400 mt-0.5">Type: {order.type || 'DELIVERY'}</p>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Order Timestamp</p>
                  <p className="text-slate-300 font-mono">{new Date(order.createdAt).toLocaleString()}</p>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">ID: {order.id.slice(0, 8)}...</p>
                </div>
              </div>

              {/* Ordered Items Breakdown */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Ordered Items ({order.items.length})
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {order.items.map((it) => (
                    <div
                      key={it.id}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 text-xs"
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <span className="w-5 h-5 rounded-full bg-slate-800 text-teal-400 font-bold text-[10px] flex items-center justify-center shrink-0">
                          {it.quantity}x
                        </span>
                        <span className="text-white font-medium truncate">{it.name}</span>
                      </div>
                      <span className="font-mono text-slate-400 shrink-0">
                        ₦{(it.quantity * it.unitPrice).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* HQ Action Controls */}
              <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>HQ Concierge Workflow:</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {order.status === 'PENDING' && (
                    <button
                      onClick={() => handleStatusChange(order.id, 'PREPARING')}
                      disabled={isBusy}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Confirm with Restaurant & Prepare
                    </button>
                  )}

                  {order.status === 'PREPARING' && (
                    <button
                      onClick={() => handleStatusChange(order.id, 'READY')}
                      disabled={isBusy}
                      className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Mark Packaged & Ready
                    </button>
                  )}

                  {(order.status === 'PREPARING' || order.status === 'READY') && (
                    <button
                      onClick={() => handleStatusChange(order.id, 'DELIVERING')}
                      disabled={isBusy}
                      className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <Truck className="w-3.5 h-3.5" /> Dispatch Courier
                    </button>
                  )}

                  {order.status === 'DELIVERING' && (
                    <button
                      onClick={() => handleStatusChange(order.id, 'COMPLETED')}
                      disabled={isBusy}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <CheckCircle2 className="w-3.5 h-3.5" /> Mark Delivered & Complete
                    </button>
                  )}

                  {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
                    <button
                      onClick={() => handleStatusChange(order.id, 'CANCELLED')}
                      disabled={isBusy}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 font-bold text-xs rounded-xl transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filteredOrders.length === 0 && (
          <div className="py-16 text-center bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl">
            <ShoppingBag className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-white">No Orders Found</h3>
            <p className="text-xs text-slate-500 mt-1">
              {statusFilter === 'ALL'
                ? 'No resident orders have been placed for managed businesses yet.'
                : `No orders currently in "${statusFilter}" status.`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
