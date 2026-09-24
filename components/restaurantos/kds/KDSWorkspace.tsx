'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getKitchenTickets, updateOrderStatus } from '@/lib/actions/restaurantos';
import { useMoney } from '@/components/cityos/CityProvider';
import { CheckCircle2, ChevronLeft, Loader2 } from 'lucide-react';
import { Card, PageHeader, StatusPill, EmptyState, btnPrimary } from '@/components/restaurant/RestaurantUI';
import { Button } from '@/components/ui';

export default function KDSWorkspace({ initialTickets, org, slug }: any) {
  const [tickets, setTickets] = useState(initialTickets);
  const [activeStation, setActiveStation] = useState('All Stations');
  const [loading, setLoading] = useState(false);

  const STATUS_COLORS: any = { PENDING: 'orange', PREPARING: 'orange', READY: 'blue', COMPLETED: 'emerald' };
  const STATIONS = ['All Stations', 'Main Kitchen', 'Bar', 'Grill', 'Salad Station', 'Dessert'];

  const fetchTickets = async () => {
    const fresh = await getKitchenTickets(slug);
    setTickets(fresh);
  };

  useEffect(() => {
    const interval = setInterval(fetchTickets, 10000);
    return () => clearInterval(interval);
  }, [slug]);

  const advanceTicket = async (orderId: string, currentStatus: string) => {
    setLoading(true);
    let next = 'PREPARING';
    if (currentStatus === 'PREPARING') next = 'READY';
    if (currentStatus === 'READY') next = 'COMPLETED';

    const res: any = await updateOrderStatus(orderId, next as any);
    if (!res.error) {
      await fetchTickets();
    } else {
      alert(res.error);
    }
    setLoading(false);
  };

  const filteredTickets = tickets.map((t: any) => ({
    ...t,
    items: activeStation === 'All Stations' ? t.items : t.items.filter((i: any) => i.kitchenStation === activeStation)
  })).filter((t: any) => t.items.length > 0 && t.status !== 'COMPLETED' && t.status !== 'CANCELLED');

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-300">
      <div className="flex justify-between items-center bg-slate-900 p-4 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-4">
          <Link href={`/workspaces/restaurantos/${slug}`} className="text-slate-400 hover:text-white transition-colors">
            <ChevronLeft />
          </Link>
          <h1 className="text-xl font-black text-white">Kitchen Display</h1>
        </div>
        <div className="flex gap-2 overflow-x-auto hide-scrollbar">
          {STATIONS.map(s => (
            <button key={s} onClick={() => setActiveStation(s)} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${activeStation === s ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {filteredTickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-600">
             <CheckCircle2 size={48} className="mb-4 opacity-50" />
             <p className="text-xl font-bold">All Caught Up</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
            {filteredTickets.map((t: any) => {
              const minutesOld = Math.floor((new Date().getTime() - new Date(t.createdAt).getTime()) / 60000);
              const isOverdue = minutesOld > 15;
              const isWarning = minutesOld > 5 && minutesOld <= 15;
              const headerColor = isOverdue ? 'bg-red-600' : isWarning ? 'bg-amber-500' : 'bg-slate-800';
              
              return (
                <div key={t.id} className="bg-white rounded-xl overflow-hidden shadow-lg border border-slate-200 flex flex-col">
                  <div className={`${headerColor} p-3 text-white flex justify-between items-center`}>
                    <div>
                      <h3 className="font-black text-xl leading-none">#{t.orderNumber}</h3>
                      <p className="text-[10px] font-bold uppercase tracking-wider opacity-80 mt-1">{t.type} {t.tableName && `• ${t.tableName}`}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold bg-black/20 px-2 py-0.5 rounded-full inline-block mb-1">{t.status}</div>
                      <p className="text-xs font-bold block">{minutesOld}m</p>
                    </div>
                  </div>
                  <div className="flex-1 p-3 divide-y divide-slate-100">
                    {t.items.map((i: any) => (
                      <div key={i.id} className="py-2 text-slate-800 flex justify-between items-start gap-2">
                        <span className="font-bold">{i.qty}x</span>
                        <div className="flex-1">
                          <p className="font-semibold leading-tight">{i.name}</p>
                          {i.notes && <p className="text-xs font-bold text-red-600 uppercase mt-0.5">{i.notes}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 bg-slate-50 border-t border-slate-100">
                    <Button 
                      className="w-full" 
                      onClick={() => advanceTicket(t.id, t.status)} 
                      disabled={loading || t.status === 'COMPLETED' || t.status === 'CANCELLED'}
                      isLoading={loading}
                    >
                      {t.status === 'PENDING' ? 'Start Preparing' : t.status === 'PREPARING' ? 'Mark Ready' : 'Complete'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
