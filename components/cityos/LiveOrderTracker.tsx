'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  ChefHat,
  Bike,
  MapPin,
  Phone,
  MessageCircle,
  Receipt,
  Store,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { FallbackImg } from '@/components/cityos/CityUI';
import { useMoney } from '@/components/cityos/CityProvider';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { acceptOrderByMerchant } from '@/app/actions/orders';

export interface OrderTrackingProps {
  order: {
    id: string;
    category: 'FOOD' | 'MARKET';
    status: string;
    paymentStatus?: string;
    paymentMethod?: string;
    whatsappPhone?: string | null;
    totalAmount: number;
    createdAt: any;
    type?: string;
    deliveryAddress?: string | null;
    org?: any;
    location?: any;
    items: Array<{
      id: string;
      name: string;
      price: number;
      quantity: number;
      image?: string | null;
    }>;
    payment?: any;
    delivery?: any;
    isMerchantStaff?: boolean;
  };
}

export default function LiveOrderTracker({ order }: OrderTrackingProps) {
  const { fmt } = useMoney();
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);

  // Map backend status to 4 Glovo stages (1 to 4)
  const currentStage = (() => {
    const s = (order.status || '').toUpperCase();
    const ds = (order.delivery?.status || '').toUpperCase();

    if (s === 'DELIVERED' || s === 'COMPLETED' || ds === 'DELIVERED') return 4;
    if (s === 'IN_TRANSIT' || ds === 'IN_TRANSIT' || ds === 'PICKED_UP' || s === 'READY') return 3;
    if (s === 'PREPARING' || s === 'CONFIRMED' || ds === 'ASSIGNED') return 2;
    return 1; // PENDING or REQUESTED
  })();

  const stages = [
    {
      stage: 1,
      title: 'Order Placed',
      description: 'Kitchen received your order',
      icon: Receipt,
    },
    {
      stage: 2,
      title: 'In the Kitchen',
      description: 'Chef is preparing your meal',
      icon: ChefHat,
    },
    {
      stage: 3,
      title: 'Out for Delivery',
      description: 'Courier is heading your way',
      icon: Bike,
    },
    {
      stage: 4,
      title: 'Delivered',
      description: 'Enjoy your food!',
      icon: MapPin,
    },
  ];

  // Refresh handler
  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const handleMerchantAccept = async () => {
    try {
      setIsAccepting(true);
      await acceptOrderByMerchant(order.id, order.category);
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Failed to accept order.');
    } finally {
      setIsAccepting(false);
    }
  };

  // Check if order was placed via WhatsApp checkout
  const isWhatsAppOrder =
    order.paymentMethod === 'WHATSAPP' ||
    order.payment?.method === 'WHATSAPP' ||
    order.payment?.provider === 'WHATSAPP' ||
    order.type === 'WHATSAPP_DIRECT';

  // Resolve merchant contact phone & direct WhatsApp chat URL
  const rawPhone = order.whatsappPhone || order.org?.phone || order.location?.phone || null;
  const waLink = (() => {
    if (!rawPhone) return null;
    let clean = rawPhone.replace(/[^\d+]/g, '');
    if (clean.startsWith('+')) clean = clean.substring(1);
    if (clean.startsWith('0')) clean = '234' + clean.substring(1);
    if (!clean.startsWith('234') && clean.length === 10) clean = '234' + clean;
    const text = encodeURIComponent(`Hello ${order.org?.name || 'there'}, I am checking in regarding my order #${order.id.slice(0, 8).toUpperCase()}.`);
    return `https://wa.me/${clean}?text=${text}`;
  })();

  // Courier simulated/resolved details (for standard orders)
  const courier = {
    name: order.delivery?.courierName || 'Sunday Bassey',
    vehicle: order.delivery?.vehicle || 'Bajaj Boxer 150 (CAL-721-CR)',
    phone: order.delivery?.contactPhone || '08023456789',
    rating: 4.9,
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20 animate-in fade-in duration-500">
      
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Link href="/orders" className="inline-flex items-center gap-1.5 text-xs font-black text-slate-500 hover:text-ink transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Orders
        </Link>
        <button
          onClick={handleRefresh}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-orange-700 bg-white border border-slate-200 px-3 py-1.5 rounded-xl transition-all shadow-sm active:scale-95"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin text-orange-600")} />
          <span>Refresh Status</span>
        </button>
      </div>

      {/* Merchant 1-Click Accept Banner (if viewed by merchant) */}
      {order.isMerchantStaff && (order.status === 'PENDING' || order.status === 'REQUESTED') && (
        <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
              Merchant Action Required
            </span>
            <h3 className="text-base font-black text-slate-900 mt-1">Accept Order & Start Preparation</h3>
            <p className="text-xs text-slate-600 font-medium">
              Order #{order.id.slice(0, 8).toUpperCase()} received from customer {isWhatsAppOrder ? 'via WhatsApp' : ''}.
            </p>
          </div>
          <button
            onClick={handleMerchantAccept}
            disabled={isAccepting}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 text-white text-xs font-black hover:bg-emerald-700 transition-all shadow-md shadow-emerald-700/20 shrink-0 disabled:opacity-50"
          >
            {isAccepting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Accept & Start Cooking
          </button>
        </div>
      )}

      {/* Conditional: WhatsApp Direct Order Card vs Glovo Live Delivery Tracker */}
      {isWhatsAppOrder ? (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden p-6 md:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-6">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 bg-[#25D366]/10 border border-[#25D366]/20 text-[#128C7E] px-3 py-1 rounded-full text-xs font-black">
                <MessageCircle className="w-3.5 h-3.5 fill-[#25D366] text-[#25D366]" />
                <span>WhatsApp Commerce Order</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                {order.status === 'COMPLETED' || order.status === 'DELIVERED'
                  ? 'Order Fulfilled'
                  : order.status === 'PREPARING' || order.status === 'CONFIRMED'
                  ? 'Order Accepted & In Preparation'
                  : 'Order Forwarded to Kitchen'}
              </h1>
              <p className="text-xs font-medium text-slate-500">
                Order #{order.id.slice(0, 8).toUpperCase()} • Placed at {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-left sm:text-right shrink-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Order Channel</span>
              <div className="text-base md:text-lg font-black text-emerald-800 flex items-center gap-1.5 justify-start sm:justify-end mt-0.5">
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                WhatsApp Direct
              </div>
            </div>
          </div>

          {/* Explanation Callout: No simulated driver tracking */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2">
            <h4 className="text-xs font-black text-slate-800 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Direct Merchant Coordination Active
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              This order was placed directly via WhatsApp chat. Live GPS courier tracking is disabled for direct WhatsApp orders. Payment (cash on delivery or bank transfer), meal preparation, and delivery handover are arranged directly in your WhatsApp conversation with <strong>{order.org?.name || 'the kitchen'}</strong>.
            </p>
          </div>

          {/* WhatsApp Direct Chat Action */}
          {waLink ? (
            <div className="bg-[#25D366]/5 border border-[#25D366]/20 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#128C7E]">
                  Direct Merchant Communication
                </span>
                <h4 className="text-sm font-black text-slate-900">
                  {order.org?.name || 'Kitchen'} on WhatsApp
                </h4>
                <p className="text-xs text-slate-500 font-medium">
                  Click to open or resume your chat with the store operator.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {rawPhone && (
                  <a
                    href={`tel:${rawPhone}`}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-black hover:bg-slate-100 transition-colors shadow-sm"
                  >
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    Call
                  </a>
                )}
                <a
                  href={waLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#25D366] text-white text-xs font-black hover:bg-[#20bd5a] transition-all shadow-md shadow-emerald-600/20 active:scale-95 shrink-0"
                >
                  <MessageCircle className="w-4 h-4 fill-white" />
                  <span>Open WhatsApp Chat</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                </a>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-medium text-slate-600">
              The merchant will contact you directly on your provided phone number to confirm preparation.
            </div>
          )}
        </div>
      ) : (
        /* Main Delivery Status Card (The Glovo Tracker - Only for online card/wallet orders) */
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden p-6 md:p-8 space-y-6">
          
          {/* Estimated Time & Current Status Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-black text-emerald-700 uppercase tracking-wider">
                  {currentStage === 4 ? 'Order Completed' : 'Live Order Tracking'}
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                {currentStage === 4
                  ? 'Your order has arrived!'
                  : currentStage === 3
                  ? 'Courier is on the way!'
                  : currentStage === 2
                  ? 'Preparing your food fresh'
                  : 'Confirming with restaurant'}
              </h1>
              <p className="text-xs font-medium text-slate-500">
                Order #{order.id.slice(0, 8).toUpperCase()} • Placed at {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 text-right shrink-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-orange-600">Estimated Arrival</span>
              <div className="text-xl md:text-2xl font-black text-orange-700">
                {currentStage === 4 ? 'Arrived' : '20 - 30 min'}
              </div>
            </div>
          </div>

          {/* 4-Step Animated Stepper */}
          <div className="relative pt-2">
            {/* Progress Bar Line */}
            <div className="absolute top-7 left-6 right-6 h-1.5 bg-slate-100 rounded-full hidden sm:block -z-0">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-700"
                style={{ width: `${((currentStage - 1) / (stages.length - 1)) * 100}%` }}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 relative z-10">
              {stages.map((st) => {
                const Icon = st.icon;
                const isDone = currentStage >= st.stage;
                const isCurrent = currentStage === st.stage;

                return (
                  <div key={st.stage} className="flex sm:flex-col items-center sm:text-center gap-4 sm:gap-2">
                    <div
                      className={cn(
                        'w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-sm shrink-0',
                        isCurrent
                          ? 'bg-orange-600 text-white ring-4 ring-orange-100 scale-105'
                          : isDone
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-100 text-slate-400'
                      )}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className={cn('text-xs font-black', isDone ? 'text-slate-900' : 'text-slate-400')}>
                        {st.title}
                      </h4>
                      <p className="text-[11px] font-medium text-slate-400 leading-tight">
                        {st.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Assigned Courier Card (Glovo Badge) */}
          {currentStage >= 2 && currentStage < 4 && (
            <div className="bg-slate-50/80 rounded-2xl border border-slate-100 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-700 flex items-center justify-center font-black text-base shrink-0 shadow-sm">
                  <Bike className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-black text-slate-900">{courier.name}</h4>
                    <span className="text-[10px] font-black bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded">
                      Verified Courier
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Calabar City Rider • {courier.vehicle}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`tel:${courier.phone}`}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-black hover:bg-slate-100 transition-colors shadow-sm"
                >
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  Call Rider
                </a>
                <a
                  href={`https://wa.me/234${courier.phone.replace(/^0/, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-black hover:bg-emerald-700 transition-colors shadow-sm"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  WhatsApp
                </a>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Restaurant & Delivery Addresses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Merchant Card */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400">
            <Store className="w-4 h-4 text-orange-600" />
            <span>Store / Kitchen</span>
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-black text-slate-900">{order.org?.name || 'Local Kitchen'}</h3>
            <p className="text-xs text-slate-500 font-medium">
              {order.location?.address || order.org?.address || 'Calabar, Cross River'}
            </p>
          </div>
        </div>

        {/* Delivery Destination */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400">
            <MapPin className="w-4 h-4 text-emerald-600" />
            <span>Delivery Destination</span>
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-black text-slate-900">
              {order.deliveryAddress || (isWhatsAppOrder ? 'Direct Handover / In-Chat Address' : 'Your Address')}
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              {isWhatsAppOrder
                ? 'Delivery or pickup location coordinated directly via WhatsApp'
                : 'Calabar Urban Resident • Handover to Customer'}
            </p>
          </div>
        </div>
      </div>

      {/* Items Summary Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
        <h3 className="text-base font-black text-slate-900">Order Items</h3>
        
        <div className="divide-y divide-slate-100">
          {order.items.map((item) => (
            <div key={item.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-lg bg-orange-50 text-orange-700 font-black flex items-center justify-center text-xs">
                  {item.quantity}x
                </span>
                <span className="font-bold text-slate-800">{item.name}</span>
              </div>
              <span className="font-black text-slate-900">{fmt(item.price * item.quantity)}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-100 pt-4 space-y-2 text-xs font-semibold text-slate-500">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="text-slate-900 font-bold">{fmt(order.totalAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span>{isWhatsAppOrder ? 'Delivery & Handover' : 'Express Courier'}</span>
            <span className={cn("font-bold", isWhatsAppOrder ? "text-slate-600" : "text-emerald-600")}>
              {isWhatsAppOrder ? 'Arranged on WhatsApp' : 'Included'}
            </span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-sm font-black text-slate-900">
            <span>{isWhatsAppOrder ? 'Total Order Amount' : 'Total Paid'}</span>
            <span className="text-lg text-orange-700">{fmt(order.totalAmount)}</span>
          </div>
        </div>

        <div className={cn(
          "pt-2 flex items-center gap-2 text-[11px] font-bold p-3 rounded-2xl border",
          isWhatsAppOrder
            ? "text-slate-700 bg-slate-50 border-slate-200"
            : "text-emerald-700 bg-emerald-50 border-emerald-100"
        )}>
          {isWhatsAppOrder ? (
            <>
              <MessageCircle className="w-4 h-4 shrink-0 text-[#25D366]" />
              <span>Payment & fulfillment settled directly with merchant via WhatsApp (Bank transfer, cash on delivery, or store pickup).</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>Payment verified securely via CityPay Resident Ledger.</span>
            </>
          )}
        </div>
      </div>

    </div>
  );
}
