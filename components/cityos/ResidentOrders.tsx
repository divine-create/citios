'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Package, UtensilsCrossed, Clock, CheckCircle2, ChevronRight, Truck, Printer } from 'lucide-react';
import { fetchMyOrders } from '@/app/actions/orders';
import { ChipButton, FallbackImg, OpenBadge } from '@/components/cityos/CityUI';
import { useMoney } from '@/components/cityos/CityProvider';
import ThermalReceiptModal from '@/components/common/ThermalReceiptModal';

export default function ResidentOrders() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({ retail: [], restaurant: [] });
  const [tab, setTab] = useState<'ALL' | 'FOOD' | 'MARKET'>('ALL');
  const [receiptOrder, setReceiptOrder] = useState<any>(null);
  const { fmt } = useMoney();

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
      <div className="flex flex-col items-center justify-center p-12 text-slate-400">
        <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin mb-4" />
        <p className="text-sm font-bold">Loading your orders...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-2xl mx-auto">
      <div className="flex items-center justify-between gap-4 py-2 px-1">
        <div>
           <h1 className="text-xl font-black text-ink">My Orders</h1>
           <p className="text-xs text-slate-500 font-medium mt-0.5">Track your purchases and deliveries</p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 px-1 [&::-webkit-scrollbar]:hidden">
        <ChipButton className="rounded-full px-5 py-2 font-bold text-[13px]" active={tab === 'ALL'} onClick={() => setTab('ALL')}>All</ChipButton>
        <ChipButton className="rounded-full px-5 py-2 font-bold text-[13px]" active={tab === 'FOOD'} onClick={() => setTab('FOOD')}>Food Delivery</ChipButton>
        <ChipButton className="rounded-full px-5 py-2 font-bold text-[13px]" active={tab === 'MARKET'} onClick={() => setTab('MARKET')}>Marketplace</ChipButton>
      </div>

      <div className="flex flex-col gap-4">
        {filtered.map((order: any) => {
          const isFood = order.category === 'FOOD';
          const icon = isFood ? <UtensilsCrossed className="w-5 h-5 text-orange-500" /> : <Package className="w-5 h-5 text-teal-600" />;
          const statusColor = order.status === 'COMPLETED' ? 'text-green-600 bg-green-50 border-green-100' : 'text-amber-600 bg-amber-50 border-amber-100';
          
          return (
            <div key={order.id} className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                    {icon}
                  </div>
                  <div>
                    <h3 className="text-[15px] font-black text-ink">{order.org?.name || 'Unknown Business'}</h3>
                    <p className="text-xs font-bold text-slate-400">{new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                  </div>
                </div>
                <div className={`px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider ${statusColor}`}>
                  {order.status}
                </div>
              </div>
              
              <div className="space-y-2 mb-4">
                {order.items.map((item: any) => (
                  <div key={item.id} className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-400">{item.quantity}x</span>
                      <span className="font-medium text-slate-700 truncate max-w-[200px]">{item.product?.name || 'Item'}</span>
                    </div>
                    <span className="font-bold text-slate-800">{fmt(item.unitPrice * (item.quantity || 1))}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-bold text-slate-500">
                    {order.payment?.method === 'WALLET' ? 'Paid via Wallet' : order.payment ? 'Paid' : 'Payment Pending'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setReceiptOrder(order)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 hover:text-teal-800 bg-slate-100 hover:bg-teal-50 px-2.5 py-1 rounded-lg transition-colors border border-slate-200"
                  >
                    <Printer className="w-3 h-3" />
                    <span>Receipt</span>
                  </button>
                </div>
                <div className="text-base font-black text-ink">
                  Total: {fmt(order.totalAmount)}
                </div>
              </div>

              {order.delivery && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-3 text-xs font-bold text-blue-600 bg-blue-50/50 p-3 rounded-xl border border-blue-100/50">
                    <Truck className="w-4 h-4" />
                    <div className="flex-1">
                      <span>Delivery Status: {order.delivery.status}</span>
                      <p className="text-[10px] text-blue-500/80 font-medium mt-0.5 truncate">{order.delivery.dropoffAddress}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center p-12 bg-slate-50 rounded-3xl border border-slate-100">
            <p className="text-sm font-bold text-slate-500">No orders found.</p>
            <Link href="/food" className="inline-block mt-4 text-xs font-black text-teal-600 hover:text-teal-700">Browse CityFood &rarr;</Link>
          </div>
        )}
      </div>

      {receiptOrder && (
        <ThermalReceiptModal
          initialData={{
            orderId: receiptOrder.id,
            orderNumber: receiptOrder.orderNumber ? String(receiptOrder.orderNumber) : receiptOrder.id.slice(-8).toUpperCase(),
            storeName: receiptOrder.org?.name || 'CityConnect Order',
            date: receiptOrder.createdAt,
            orderType: receiptOrder.category === 'FOOD' ? 'TAKEOUT' : 'STORE_SALE',
            items: receiptOrder.items.map((i: any) => ({
              name: i.product?.name || i.name || 'Item',
              quantity: i.quantity || 1,
              unitPrice: i.unitPrice || 0,
              subtotal: (i.unitPrice || 0) * (i.quantity || 1),
            })),
            subtotal: receiptOrder.totalAmount,
            totalAmount: receiptOrder.totalAmount,
            paymentMethod: receiptOrder.payment?.method || 'COMPLETED',
            currencySymbol: '₦',
            footerMessage: 'Thank you for your order on CityConnect!',
          }}
          onClose={() => setReceiptOrder(null)}
        />
      )}
    </div>
  );
}
