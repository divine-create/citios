'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { getKitchenTickets, updateOrderStatus, updateOrderItemStatus } from '@/lib/actions/restaurantos';
import { CheckCircle2, ChevronLeft, Loader2, Maximize, Minimize, Clock, UtensilsCrossed, Bell, BellOff, RefreshCw } from 'lucide-react';
import { Button, Badge } from '@/components/ui';

// Type definitions based on what we enriched
type Item = {
  id: string;
  qty: number;
  itemName: string;
  variantName?: string | null;
  modifiers?: any[];
  notes: string | null;
  kitchenStation: string;
  kitchenStatus: 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
};

type Ticket = {
  id: string;
  orderNumber: number;
  type: string;
  tableName: string | null;
  status: 'PENDING' | 'PREPARING' | 'READY' | 'DELIVERING' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  kitchenStartedAt: string | null;
  kitchenCompletedAt: string | null;
  items: Item[];
};

function formatElapsedTime(startedStr: string | null, createdStr: string) {
  const start = new Date(startedStr || createdStr).getTime();
  const now = new Date().getTime();
  const minutes = Math.floor((now - start) / 60000);
  const seconds = Math.floor(((now - start) % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function KDSWorkspace({ initialTickets, org, slug }: { initialTickets: any[], org: any, slug: string }) {
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [activeStation, setActiveStation] = useState('All Stations');
  const [loading, setLoading] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [now, setNow] = useState(new Date());
  
  // Real-time loop
  useEffect(() => {
    const fetchTickets = async () => {
      const fresh = await getKitchenTickets(slug);
      
      // Check for new tickets if sound enabled
      if (soundEnabled && fresh.length > tickets.length) {
        try {
          const audio = new Audio('/sounds/bell.mp3'); // We assume this exists or fails silently
          audio.play().catch(() => {});
        } catch (e) {}
      }
      setTickets(fresh);
    };

    const interval = setInterval(fetchTickets, 5000); // 5s aggressive polling for KDS
    return () => clearInterval(interval);
  }, [slug, soundEnabled, tickets.length]);

  // Timer loop
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setFullscreen(false);
    }
  };

  const advanceOrder = async (orderId: string, currentStatus: string) => {
    setLoading(true);
    let next: any = 'PREPARING';
    if (currentStatus === 'PREPARING') next = 'READY';
    if (currentStatus === 'READY') next = 'COMPLETED';

    const res: any = await updateOrderStatus(orderId, next);
    if (!res.error) {
      setTickets(await getKitchenTickets(slug));
    } else {
      console.error(res.error);
    }
    setLoading(false);
  };

  const advanceItem = async (orderId: string, itemId: string, currentStatus: string) => {
    let next: any = 'PREPARING';
    if (currentStatus === 'PREPARING') next = 'READY';
    
    // Optimistic UI
    setTickets(prev => prev.map(t => {
      if (t.id === orderId) {
        return {
          ...t,
          items: t.items.map(i => i.id === itemId ? { ...i, kitchenStatus: next } : i)
        };
      }
      return t;
    }));

    const res: any = await updateOrderItemStatus(orderId, itemId, next);
    if (res.error) {
      console.error(res.error);
      setTickets(await getKitchenTickets(slug)); // Revert on error
    } else {
      // Re-fetch to get accurate overall order status if it changed
      setTickets(await getKitchenTickets(slug));
    }
  };

  const stations = useMemo(() => {
    const s = new Set<string>(['All Stations', 'Expo']);
    tickets.forEach(t => t.items.forEach(i => s.add(i.kitchenStation)));
    return Array.from(s);
  }, [tickets]);

  // Filtering
  const displayTickets = useMemo(() => {
    return tickets.map(t => {
      // If Expo or All, show everything
      if (activeStation === 'All Stations' || activeStation === 'Expo') {
        return t;
      }
      // Station view: only show items for this station
      return {
        ...t,
        items: t.items.filter(i => i.kitchenStation === activeStation)
      };
    }).filter(t => t.items.length > 0 && t.status !== 'COMPLETED' && t.status !== 'CANCELLED');
  }, [tickets, activeStation]);

  const lateCount = displayTickets.filter(t => {
    const minutesOld = Math.floor((now.getTime() - new Date(t.createdAt).getTime()) / 60000);
    return minutesOld > 15;
  }).length;

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-300 font-sans select-none">
      {/* HEADER */}
      <header className="flex justify-between items-center bg-slate-900 px-4 py-3 border-b border-slate-800 shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-6">
          <Link href={`/workspaces/restaurantos/${slug}`} className="text-slate-400 hover:text-white transition-colors p-2 -ml-2 rounded-lg hover:bg-slate-800">
            <ChevronLeft size={24} />
          </Link>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight leading-none">{org.name} KDS</h1>
            <p className="text-xs text-slate-400 font-bold tracking-widest uppercase mt-1">{now.toLocaleTimeString()}</p>
          </div>
          <div className="h-8 w-px bg-slate-800 mx-2"></div>
          
          <div className="flex gap-2 overflow-x-auto hide-scrollbar max-w-2xl">
            {stations.map(s => (
              <button 
                key={s} 
                onClick={() => setActiveStation(s)} 
                className={`px-4 py-2 rounded-lg text-sm font-black whitespace-nowrap transition-colors ${activeStation === s ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex gap-4 mr-4 text-sm font-bold bg-slate-800 rounded-lg px-4 py-2">
             <div className="text-slate-300"><span className="text-white text-lg leading-none mr-2">{displayTickets.length}</span> Active</div>
             {lateCount > 0 && <div className="text-red-400"><span className="text-red-500 text-lg leading-none mr-2">{lateCount}</span> Late</div>}
          </div>
          
          <button onClick={() => setSoundEnabled(!soundEnabled)} className={`p-3 rounded-lg transition-colors ${soundEnabled ? 'bg-slate-800 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
            {soundEnabled ? <Bell size={20} /> : <BellOff size={20} />}
          </button>
          <button onClick={toggleFullscreen} className="p-3 bg-slate-800 text-slate-300 rounded-lg hover:text-white transition-colors">
            {fullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>
        </div>
      </header>

      {/* BOARD */}
      <main className="flex-1 overflow-x-auto overflow-y-hidden p-6 bg-slate-950">
        {displayTickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-600">
             <UtensilsCrossed size={64} className="mb-6 opacity-20" />
             <p className="text-3xl font-black text-slate-500">KITCHEN CLEAR</p>
             <p className="text-slate-500 mt-2 font-bold uppercase tracking-widest">No active orders</p>
          </div>
        ) : (
          <div className="flex gap-4 h-full items-start">
            {displayTickets.map((t) => {
              const minutesOld = Math.floor((now.getTime() - new Date(t.createdAt).getTime()) / 60000);
              const isOverdue = minutesOld > 15;
              const isWarning = minutesOld > 10 && minutesOld <= 15;
              
              const headerColor = isOverdue ? 'bg-red-600' : isWarning ? 'bg-amber-600' : 'bg-slate-800';
              const ticketBg = isOverdue ? 'bg-red-950/20 border-red-900/50' : isWarning ? 'bg-amber-950/20 border-amber-900/50' : 'bg-slate-900 border-slate-800';
              
              // Are we in Expo mode?
              const isExpo = activeStation === 'Expo';
              
              return (
                <div key={t.id} className={`shrink-0 w-[340px] max-h-full rounded-xl overflow-hidden shadow-2xl border flex flex-col ${ticketBg}`}>
                  {/* TICKET HEADER */}
                  <div className={`${headerColor} p-4 text-white flex justify-between items-start shadow-sm`}>
                    <div>
                      <h3 className="font-black text-3xl leading-none">#{t.orderNumber}</h3>
                      <p className="text-xs font-bold uppercase tracking-widest opacity-90 mt-2">
                        {t.type.replace('_', ' ')} {t.tableName && `? ${t.tableName}`}
                      </p>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <div className="text-xs font-black bg-black/30 px-2.5 py-1 rounded-md tracking-wider mb-2">
                        {formatElapsedTime(t.kitchenStartedAt, t.createdAt)}
                      </div>
                      <Badge variant={t.status === 'READY' ? 'success' : 'default'} className="bg-white/10 text-white border-0">{t.status}</Badge>
                    </div>
                  </div>
                  
                  {/* ITEM LIST */}
                  <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {t.items.map((i) => {
                      const isItemReady = i.kitchenStatus === 'READY' || i.kitchenStatus === 'COMPLETED';
                      const isItemPrep = i.kitchenStatus === 'PREPARING';
                      
                      return (
                        <div 
                          key={i.id} 
                          onClick={() => {
                            if (!isExpo) advanceItem(t.id, i.id, i.kitchenStatus);
                          }}
                          className={`
                            p-3 rounded-lg border-2 transition-all cursor-pointer flex justify-between items-start gap-3
                            ${isItemReady ? 'bg-emerald-950/30 border-emerald-900/50 opacity-60' : 
                              isItemPrep ? 'bg-slate-800 border-indigo-500/50' : 
                              'bg-slate-800 border-transparent hover:border-slate-600'}
                          `}
                        >
                          <span className={`font-black text-xl mt-0.5 ${isItemReady ? 'text-emerald-500' : 'text-slate-300'}`}>
                            {i.qty}
                          </span>
                          <div className="flex-1">
                            <p className={`font-bold text-lg leading-tight ${isItemReady ? 'text-emerald-400 line-through' : 'text-white'}`}>
                              {i.itemName}
                            </p>
                            {i.variantName && (
                              <p className={`text-sm font-semibold ${isItemReady ? 'text-emerald-500' : 'text-slate-300'}`}>
                                {i.variantName}
                              </p>
                            )}
                            {i.modifiers && i.modifiers.length > 0 && (
                              <div className="mt-1 space-y-0.5">
                                {i.modifiers.map((m: any) => (
                                  <p key={m.id} className={`text-sm font-bold uppercase ${isItemReady ? 'text-emerald-600' : 'text-amber-400'}`}>
                                    + {m.name}
                                  </p>
                                ))}
                              </div>
                            )}
                            {i.notes && (
                              <p className={`text-sm font-bold uppercase mt-1 ${isItemReady ? 'text-emerald-600' : 'text-red-400'}`}>
                                ! {i.notes}
                              </p>
                            )}
                            {isExpo && (
                              <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">
                                {i.kitchenStation} ? {i.kitchenStatus}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  
                  {/* TICKET ACTIONS (Order-level) */}
                  {isExpo && (
                    <div className="p-3 bg-slate-900 border-t border-slate-800">
                      <Button 
                        size="lg"
                        className={`w-full text-lg ${t.status === 'READY' ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : ''}`}
                        onClick={() => advanceOrder(t.id, t.status)} 
                        disabled={loading || t.status === 'COMPLETED' || t.status === 'CANCELLED'}
                        isLoading={loading}
                      >
                        {t.status === 'PENDING' ? 'Start Order' : t.status === 'PREPARING' ? 'Force Ready' : 'Bump / Complete'}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
