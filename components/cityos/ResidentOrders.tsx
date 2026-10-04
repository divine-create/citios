'use client';

import { useState, useEffect } from 'react';
import { Package, UtensilsCrossed, Clock, CheckCircle2, ChevronRight, Truck, Printer, ShoppingBag, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { fetchMyOrders } from '@/app/actions/orders';
import { useMoney } from '@/components/cityos/CityProvider';
import ThermalReceiptModal from '@/components/common/ThermalReceiptModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { cancelOrder, refundOrder } from '@/lib/actions/retail';

export default function ResidentOrders() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({ retail: [], restaurant: [] });
  const [tab, setTab] = useState<'ALL' | 'FOOD' | 'MARKET'>('ALL');
  const [receiptOrder, setReceiptOrder] = useState<any>(null);
  const { fmt } = useMoney();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleAction = async (action: 'cancel' | 'refund', id: string) => {
    setActionLoading(id);
    try {
      if (action === 'cancel') {
        await cancelOrder(id, { reason: 'User requested' });
      } else {
        await refundOrder(id, { reason: 'User requested' });
      }
      const res = await fetchMyOrders();
      setData(res);
    } catch (e) {
      console.error('Action failed:', e);
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await fetchMyOrders();
        if (active) {
          setData(res);
          setLoading(false);
        }
      } catch (e) {
        console.error(e);
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  const allOrders = [
    ...data.retail.map((o: any) => ({ ...o, category: 'MARKET' })),
    ...data.restaurant.map((o: any) => ({ ...o, category: 'FOOD' }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const filtered = tab === 'ALL' ? allOrders : allOrders.filter(o => o.category === tab);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-ink mb-4" />
        <p className="text-sm font-semibold animate-pulse">Loading your orders...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Order History</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">Track and manage your marketplace and food orders</p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 hide-scrollbar snap-x">
        {['ALL', 'MARKET', 'FOOD'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t as any)}
            className={cn(
              "shrink-0 snap-start px-5 py-2.5 rounded-full text-xs font-bold transition-all",
              tab === t 
                ? "bg-ink text-white shadow-md" 
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            {t === 'ALL' ? 'All Orders' : t === 'MARKET' ? 'Marketplace' : 'Food Delivery'}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="py-10">
          <EmptyState
            icon={<ShoppingBag className="w-8 h-8" />}
            title="No orders found"
            description="You haven't placed any orders in this category yet."
            action={{ label: "Go to Marketplace", href: "/market" }}
            className="bg-white rounded-3xl border border-slate-100 shadow-sm"
          />
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((order: any) => {
            const isFood = order.category === 'FOOD';
            const icon = isFood ? <UtensilsCrossed className="w-5 h-5" /> : <Package className="w-5 h-5" />;
            const isCancelable = order.status === 'PENDING' || order.status === 'ACCEPTED';
            const isRefundable = order.payment?.status === 'SUCCESS' && (order.status === 'CANCELLED' || order.status === 'REJECTED');
            
            // Payment state logic
            const payStatus = order.payment?.status || 'UNPAID';
            const payColor = payStatus === 'SUCCESS' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' 
                           : payStatus === 'FAILED' ? 'text-rose-700 bg-rose-50 border-rose-200' 
                           : 'text-amber-700 bg-amber-50 border-amber-200';

            // Order state logic
            const statusColor = order.status === 'COMPLETED' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' 
                              : order.status === 'CANCELLED' || order.status === 'REJECTED' ? 'text-slate-500 bg-slate-100 border-slate-200' 
                              : 'text-sky-700 bg-sky-50 border-sky-200';

            // Fulfillment/Delivery state logic
            const fulfillmentState = order.fulfillmentStatus || 'UNFULFILLED';
            const isDelivering = fulfillmentState === 'IN_TRANSIT' || fulfillmentState === 'OUT_FOR_DELIVERY';

            return (
              <div key={order.id} className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-all">
                
                {/* Header Area */}
                <div className="p-5 md:p-6 border-b border-slate-50 bg-slate-50/50 flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-slate-100/50",
                      isFood ? "bg-orange-50 text-orange-600" : "bg-teal-50 text-teal-600"
                    )}>
                      {icon}
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900 leading-tight mb-1">
                        {order.org?.name || 'Unknown Business'}
                      </h3>
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                        <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span className="font-mono text-[10px] text-slate-400">#{order.id.slice(0, 8)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 self-start">
                    <button
                      onClick={() => setReceiptOrder(order)}
                      className="p-2 text-slate-400 hover:text-ink hover:bg-slate-100 rounded-xl transition-colors"
                      title="View Receipt"
                    >
                      <Printer className="w-5 h-5" />
                    </button>
                    <div className="text-xl font-black text-slate-900">
                      {fmt(order.totalAmount || order.total || 0)}
                    </div>
                  </div>
                </div>

                {/* Status Pillars Area */}
                <div className="px-5 md:px-6 py-4 border-b border-slate-100 bg-white grid grid-cols-2 md:grid-cols-4 gap-4">
                  
                  <div>
                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Payment</div>
                    <div className={cn("inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border", payColor)}>
                      {payStatus}
                    </div>
                  </div>

                  <div>
                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Order</div>
                    <div className={cn("inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border", statusColor)}>
                      {order.status}
                    </div>
                  </div>

                  <div>
                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Fulfillment</div>
                    <div className="inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border border-slate-200 bg-slate-50 text-slate-600">
                      {fulfillmentState}
                    </div>
                  </div>

                  <div>
                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Delivery</div>
                    <div className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600">
                      {isDelivering ? (
                        <><Truck className="w-3.5 h-3.5 text-blue-500" /> On the way</>
                      ) : fulfillmentState === 'DELIVERED' ? (
                        <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Arrived</>
                      ) : (
                        <><Clock className="w-3.5 h-3.5 text-slate-400" /> Preparing</>
                      )}
                    </div>
                  </div>

                </div>
                
                {/* Items List Area */}
                <div className="p-5 md:p-6 space-y-3">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Items</div>
                  {order.items.map((item: any) => (
                    <div key={item.id} className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-lg text-xs">{item.quantity}x</span>
                        <span className="font-medium text-slate-700 truncate max-w-[200px] md:max-w-md">{item.product?.name || item.name || 'Item'}</span>
                      </div>
                      <span className="font-bold text-slate-800">{fmt((item.unitPrice || item.price) * (item.quantity || 1))}</span>
                    </div>
                  ))}
                  
                  {/* Actions */}
                  {(isCancelable || isRefundable) && (
                    <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
                      {isCancelable && (
                        <button
                          disabled={actionLoading === order.id}
                          onClick={() => handleAction('cancel', order.id)}
                          className="px-4 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          {actionLoading === order.id && <Loader2 className="w-3 h-3 animate-spin" />}
                          Cancel Order
                        </button>
                      )}
                      {isRefundable && (
                        <button
                          disabled={actionLoading === order.id}
                          onClick={() => handleAction('refund', order.id)}
                          className="px-4 py-2 text-xs font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          {actionLoading === order.id && <Loader2 className="w-3 h-3 animate-spin" />}
                          Request Refund
                        </button>
                      )}
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {receiptOrder && (
        <ThermalReceiptModal
          orderId={receiptOrder.id}
          onClose={() => setReceiptOrder(null)}
        />
      )}
    </div>
  );
}
