"use client";

import React, { useState, useEffect } from "react";
import {
  Package,
  Truck,
  Loader2,
  CheckCircle2,
  Clock,
  MapPin,
  ChevronRight,
  Receipt,
  Search,
  Filter,
  AlertTriangle,
  FileText,
  AlertCircle, Check, X
} from "lucide-react";
import {
  getOnlineOrdersAndLogistics,
  updateFulfillmentStatus,
  requestRetailFulfillment,
  cancelOrder,
  acceptOrder
} from "@/lib/actions/retail";
import {
  Modal,
  StatusPill,
  btnPrimary,
  btnOutline,
  inputCls,
  PillTabs,
  OrderStatusBadge,
  PriceDisplay,
  SearchInput,
  FilterBar,
  EmptyState,
  Skeleton,
  ErrorState,
  SectionCard,
} from "./ShopUI";

type OrderTab = "ALL" | "NEW" | "PROCESSING" | "READY" | "DELIVERY" | "COMPLETED";

export default function OnlineOrdersTab({
  organizationId,
  locationId,
}: {
  organizationId: string;
  locationId?: string | null;
}) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<OrderTab>("ALL");
  const [viewingOrder, setViewingOrder] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionConfirm, setActionConfirm] = useState<{ action: string; order: any } | null>(null);

  const load = async () => {
    try {
      const data = await getOnlineOrdersAndLogistics(organizationId, locationId);
      setOrders(data);
      setError(null);
    } catch (e: any) {
      setError(e.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000); // Polling every 30s for logistics updates
    return () => clearInterval(interval);
  }, [organizationId, locationId]);

  const filtered = orders.filter((o) => {
    if (activeTab === "NEW") {
      if (o.status !== "PENDING") return false;
    } else if (activeTab === "PROCESSING") {
      if (o.status !== "CONFIRMED" || o.fulfillmentStatus !== "PROCESSING") return false;
      if (o.logistics?.status && o.logistics.status !== 'CANCELLED') return false; // Logistics took over
    } else if (activeTab === "READY") {
      if (o.status !== "CONFIRMED" || o.fulfillmentStatus !== "READY") return false;
    } else if (activeTab === "DELIVERY") {
      if (!o.logistics || o.logistics.status === 'DELIVERED' || o.logistics.status === 'CANCELLED') return false;
    } else if (activeTab === "COMPLETED") {
      if (o.status !== "COMPLETED" && o.fulfillmentStatus !== "FULFILLED") return false;
    }

    if (search) {
      const q = search.toLowerCase();
      return (
        o.id.toLowerCase().includes(q) ||
        o.customerName?.toLowerCase().includes(q) ||
        o.deliveryAddress?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const parseDeliveryDetails = (order: any) => {
    const raw = String(order?.deliveryAddress || '');
    const parts = raw
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean);
    let address = '';
    let phone = order?.customerPhone || '';
    let notes = '';
    let substitution = '';

    for (const part of parts) {
      if (part.toLowerCase().startsWith('phone:')) {
        if (!phone) phone = part.slice(6).trim();
      } else if (part.toLowerCase().startsWith('notes:')) {
        notes = part.slice(6).trim();
      } else if (part.toLowerCase().startsWith('substitution:')) {
        substitution = part.slice(13).trim();
      } else if (!address) {
        address = part;
      } else {
        address += `, ${part}`;
      }
    }

    let cleanWaPhone = phone.replace(/[^\d+]/g, '');
    if (cleanWaPhone.startsWith('+')) cleanWaPhone = cleanWaPhone.slice(1);
    if (cleanWaPhone.startsWith('0')) cleanWaPhone = '234' + cleanWaPhone.slice(1);
    if (cleanWaPhone && !cleanWaPhone.startsWith('234') && cleanWaPhone.length === 10) {
      cleanWaPhone = '234' + cleanWaPhone;
    }

    const waText = `Hello ${order?.customerName || 'Customer'}, regarding your CityMart Order #${String(order?.id || '').slice(0, 8).toUpperCase()}: `;
    const whatsappCustomerUrl = cleanWaPhone
      ? `https://wa.me/${cleanWaPhone}?text=${encodeURIComponent(waText)}`
      : null;

    return { address, phone, notes, substitution, whatsappCustomerUrl };
  };

  const handleAction = async (
    action: "ACCEPT" | "REJECT" | "READY" | "FULFILL" | "COMPLETE" | "CANCEL",
    order: any
  ) => {
    setActionLoading(true);
    try {
      if (action === "REJECT" || action === "CANCEL") {
        await cancelOrder(order.id, { reason: "Merchant rejected" });
      } else if (action === "ACCEPT") {
        await acceptOrder(order.id, locationId || undefined);
      } else if (action === "READY") {
        await updateFulfillmentStatus(order.id, "READY", locationId || undefined);
      } else if (action === "FULFILL") {
        await requestRetailFulfillment(order.id, locationId || undefined);
      } else if (action === "COMPLETE") {
        await updateFulfillmentStatus(order.id, "FULFILLED", locationId || undefined);
      }
      await load();
      setViewingOrder(null);
      setActionConfirm(null);
    } catch (e: any) {
      alert(e.message || "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const executeConfirmedAction = () => {
    if (actionConfirm) {
      handleAction(actionConfirm.action as any, actionConfirm.order);
    }
  };

  if (loading && orders.length === 0) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-10">
        <ErrorState title="Unable to load orders" message={error} action={<button onClick={load} className={btnPrimary}>Try Again</button>} />
      </div>
    );
  }

  const tabs = [
    { value: "ALL", label: "All Orders" },
    { value: "NEW", label: `New (${orders.filter(o => o.status === "PENDING").length})` },
    { value: "PROCESSING", label: "Processing" },
    { value: "READY", label: "Ready" },
    { value: "COMPLETED", label: "Completed" },
  ];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-ink tracking-tight">Online Orders</h2>
          <p className="text-sm text-slate-500 mt-1">Manage orders placed by residents on CityMarket.</p>
        </div>
      </div>

      <FilterBar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search order ID, customer..." />
        <PillTabs tabs={tabs as any} active={activeTab} onChange={(val) => setActiveTab(val as any)} />
      </FilterBar>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title={search ? "No matches found" : "You're all caught up"}
          message={search ? "Try a different search term" : "No orders are currently in this state."}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* MOBILE CARDS */}
          <div className="block md:hidden divide-y divide-slate-100">
            {filtered.map((order) => {
              let primaryAction = null;
              if (order.status === "PENDING") {
                primaryAction = (
                  <button onClick={(e) => { e.stopPropagation(); setActionConfirm({ action: "ACCEPT", order }); }} className="bg-brand-600 text-white px-4 py-2 rounded-xl font-bold w-full mt-3">Accept Order</button>
                );
              } else if (order.status === "CONFIRMED" && order.fulfillmentStatus === "PROCESSING") {
                primaryAction = (
                  <button onClick={(e) => { e.stopPropagation(); setActionConfirm({ action: "READY", order }); }} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold w-full mt-3">Mark Ready</button>
                );
              } else if (order.status === "CONFIRMED" && order.fulfillmentStatus === "READY") {
                primaryAction = (
                  <button onClick={(e) => { e.stopPropagation(); setActionConfirm({ action: "COMPLETE", order }); }} className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold w-full mt-3">Mark Completed</button>
                );
              }

              return (
                <div key={order.id} onClick={() => setViewingOrder(order)} className="p-4 hover:bg-slate-50 transition-colors cursor-pointer">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-bold text-ink">#{order.id.slice(0, 8)}</div>
                      <div className="text-xs text-slate-500">{order.customerName || "Guest"} · {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                    <OrderStatusBadge status={order.status === 'CONFIRMED' ? order.fulfillmentStatus : order.status} toneOverride={order.fulfillmentStatus === 'UNFULFILLED' ? 'slate' : undefined} />
                  </div>
                  <div className="flex justify-between items-center text-sm font-semibold text-slate-700">
                    <span>{order.items?.length || 0} items</span>
                    <PriceDisplay amount={order.totalAmount || 0} />
                  </div>
                  {primaryAction}
                </div>
              );
            })}
          </div>

          {/* DESKTOP TABLE */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                  <th className="px-5 py-4">Order</th>
                  <th className="px-5 py-4">Customer</th>
                  <th className="px-5 py-4">Total</th>
                  <th className="px-5 py-4">Payment</th>
                  <th className="px-5 py-4">Order State</th>
                  <th className="px-5 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((order) => {
                  let primaryAction = null;
                  if (order.status === "PENDING") {
                    primaryAction = (
                      <button onClick={(e) => { e.stopPropagation(); setActionConfirm({ action: "ACCEPT", order }); }} className="bg-brand-600 text-white px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-brand-700">Accept Order</button>
                    );
                  } else if (order.status === "CONFIRMED" && order.fulfillmentStatus === "PROCESSING") {
                    primaryAction = (
                      <button onClick={(e) => { e.stopPropagation(); setActionConfirm({ action: "READY", order }); }} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-blue-700">Mark Ready</button>
                    );
                  } else if (order.status === "CONFIRMED" && order.fulfillmentStatus === "READY") {
                    primaryAction = (
                      <button onClick={(e) => { e.stopPropagation(); setActionConfirm({ action: "COMPLETE", order }); }} className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-emerald-700">Mark Completed</button>
                    );
                  }

                  return (
                    <tr key={order.id} onClick={() => setViewingOrder(order)} className="hover:bg-slate-50 transition-colors cursor-pointer group">
                      <td className="px-5 py-4">
                        <div className="font-bold text-ink">#{order.id.slice(0, 8)}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-800">{order.customerName || "Guest"}</div>
                        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                          <span>{order.items?.length || 0} items</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <PriceDisplay amount={order.totalAmount || 0} />
                      </td>
                      <td className="px-5 py-4">
                        <OrderStatusBadge status={order.status} />
                      </td>
                      <td className="px-5 py-4">
                        <OrderStatusBadge status={order.fulfillmentStatus} toneOverride={order.fulfillmentStatus === 'UNFULFILLED' ? 'slate' : undefined} />
                      </td>
                      <td className="px-5 py-4 text-right">
                        {primaryAction ? primaryAction : (
                          <span className="text-brand-600 font-bold text-xs group-hover:text-brand-800">View Details</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {actionConfirm && (
        <Modal title="Confirm Action" onClose={() => setActionConfirm(null)}>
          <div className="p-6">
            <p className="text-slate-600 font-medium text-[15px]">
              {actionConfirm.action === "ACCEPT" && "Accept this order and begin processing?"}
              {actionConfirm.action === "READY" && "Mark this order as ready for pickup?"}
              {actionConfirm.action === "COMPLETE" && "Mark this order as completed / picked up?"}
              {(actionConfirm.action === "REJECT" || actionConfirm.action === "CANCEL") && "Cancel this order? This action cannot be undone."}
            </p>
            <div className="mt-8 flex justify-end gap-3">
              <button onClick={() => setActionConfirm(null)} className={btnOutline} disabled={actionLoading}>Cancel</button>
              <button onClick={executeConfirmedAction} disabled={actionLoading} className={actionConfirm.action === 'REJECT' || actionConfirm.action === 'CANCEL' ? "bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2" : btnPrimary + " flex items-center gap-2"}>
                {actionLoading && <Loader2 size={16} className="animate-spin" />}
                {actionConfirm.action === 'REJECT' || actionConfirm.action === 'CANCEL' ? "Cancel Order" : "Confirm"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {viewingOrder && (() => {
        const details = parseDeliveryDetails(viewingOrder);
        return (
          <Modal title={`Order #${viewingOrder.id.slice(0, 8)}`} onClose={() => setViewingOrder(null)} size="lg">
            <div className="flex flex-col md:flex-row h-[70vh] max-h-[800px]">
              {/* LEFT PANE: DETAILS */}
              <div className="flex-1 overflow-auto border-r border-slate-100 p-6 space-y-6 bg-slate-50/50">
                
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-black text-ink">{viewingOrder.customerName || "Guest"}</h3>
                    <p className="text-sm text-slate-500 mt-1">{new Date(viewingOrder.createdAt).toLocaleString()}</p>
                    {details.phone && (
                      <p className="text-xs font-bold text-slate-700 mt-1">Phone: {details.phone}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <PriceDisplay amount={viewingOrder.totalAmount} className="text-2xl" />
                    <div className="mt-2 flex gap-1 justify-end">
                      <OrderStatusBadge status={viewingOrder.status} />
                    </div>
                  </div>
                </div>

                {(details.notes || details.substitution || details.whatsappCustomerUrl) && (
                  <SectionCard title="Customer Contact & Preferences">
                    <div className="p-4 space-y-3">
                      {details.substitution && (
                        <div className="flex items-center justify-between bg-amber-50 border border-amber-200/80 rounded-xl px-3.5 py-2.5">
                          <span className="text-xs font-bold text-amber-900">If item unavailable:</span>
                          <span className="text-xs font-black text-amber-950">{details.substitution}</span>
                        </div>
                      )}
                      {details.notes && (
                        <div className="bg-slate-100 rounded-xl px-3.5 py-2.5">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Order Notes</p>
                          <p className="text-xs font-medium text-slate-800 mt-0.5">{details.notes}</p>
                        </div>
                      )}
                      {details.whatsappCustomerUrl && (
                        <div className="pt-1">
                          <a
                            href={details.whatsappCustomerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-[#25D366] hover:bg-[#1ebe5d] text-white font-black text-xs shadow-xs transition-colors"
                          >
                            <span>💬 Message Customer on WhatsApp ({details.phone})</span>
                          </a>
                        </div>
                      )}
                    </div>
                  </SectionCard>
                )}

                <SectionCard title="Order Items">
                  <ul className="divide-y divide-slate-100">
                    {viewingOrder.items?.map((item: any) => (
                      <li key={item.id} className="p-4 flex justify-between items-center text-sm">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs">{item.quantity}</span>
                          <div>
                            <p className="font-bold text-ink">{item.productName || "Item"}</p>
                          </div>
                        </div>
                        <PriceDisplay amount={item.subtotal} />
                      </li>
                    ))}
                  </ul>
                  <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center font-black">
                    <span>Total</span>
                    <PriceDisplay amount={viewingOrder.totalAmount} />
                  </div>
                </SectionCard>
              </div>

              {/* RIGHT PANE: TIMELINE & ACTIONS */}
              <div className="w-full md:w-80 flex flex-col bg-white">
                <div className="p-6 border-b border-slate-100">
                  <h4 className="font-bold text-ink mb-4">Actions</h4>
                  <div className="space-y-3">
                    {viewingOrder.status === "PENDING" && (
                      <>
                        <button disabled={actionLoading} onClick={() => setActionConfirm({ action: "ACCEPT", order: viewingOrder })} className="w-full py-2.5 rounded-xl font-bold bg-brand-600 text-white hover:bg-brand-700 transition-colors shadow-sm">Accept Order</button>
                        <button disabled={actionLoading} onClick={() => setActionConfirm({ action: "REJECT", order: viewingOrder })} className="w-full py-2.5 rounded-xl font-bold bg-white border-2 border-rose-200 text-rose-700 hover:bg-rose-50 transition-colors">Reject Order</button>
                      </>
                    )}
                    {viewingOrder.status === "CONFIRMED" && viewingOrder.fulfillmentStatus === "PROCESSING" && (
                      <button disabled={actionLoading} onClick={() => setActionConfirm({ action: "READY", order: viewingOrder })} className="w-full py-2.5 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm flex justify-center items-center gap-2"><CheckCircle2 size={18}/> Mark Ready</button>
                    )}
                    {viewingOrder.status === "CONFIRMED" && viewingOrder.fulfillmentStatus === "READY" && (
                      <button disabled={actionLoading} onClick={() => setActionConfirm({ action: "COMPLETE", order: viewingOrder })} className="w-full py-2.5 rounded-xl font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm flex justify-center items-center gap-2"><Check size={18}/> Mark Fulfilled (Customer Pickup)</button>
                    )}
                    {viewingOrder.status === "CONFIRMED" && viewingOrder.fulfillmentStatus !== "FULFILLED" && (
                       <button disabled={actionLoading} onClick={() => setActionConfirm({ action: "CANCEL", order: viewingOrder })} className="w-full py-2.5 rounded-xl font-bold text-rose-600 hover:bg-rose-50 transition-colors mt-4">Cancel Order</button>
                    )}
                  </div>
                </div>

                <div className="p-6 flex-1 overflow-auto">
                  <h4 className="font-bold text-ink mb-4">Lifecycle</h4>
                  <div className="space-y-6 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                    
                    {/* Order Received */}
                    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-emerald-500 bg-white text-emerald-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10"><Check size={12} strokeWidth={3} /></div>
                      <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.25rem)] p-3 rounded-lg border border-emerald-100 bg-emerald-50 shadow-sm">
                        <p className="font-bold text-emerald-900 text-xs">Order Received</p>
                      </div>
                    </div>

                    {/* Accepted */}
                    {viewingOrder.status === 'CONFIRMED' || viewingOrder.status === 'COMPLETED' ? (
                       <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-emerald-500 bg-white text-emerald-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10"><Check size={12} strokeWidth={3} /></div>
                        <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.25rem)] p-3 rounded-lg border border-emerald-100 bg-emerald-50 shadow-sm">
                          <p className="font-bold text-emerald-900 text-xs">Accepted</p>
                        </div>
                      </div>
                    ) : null}

                    {/* Cancelled */}
                    {viewingOrder.status === 'CANCELLED' ? (
                       <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-rose-500 bg-white text-rose-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10"><X size={12} strokeWidth={3} /></div>
                        <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.25rem)] p-3 rounded-lg border border-rose-100 bg-rose-50 shadow-sm">
                          <p className="font-bold text-rose-900 text-xs">Cancelled</p>
                        </div>
                      </div>
                    ) : null}

                    {/* Ready */}
                    {(viewingOrder.fulfillmentStatus === 'READY' || viewingOrder.fulfillmentStatus === 'FULFILLED' || viewingOrder.logistics) && (
                       <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-emerald-500 bg-white text-emerald-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10"><Check size={12} strokeWidth={3} /></div>
                        <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.25rem)] p-3 rounded-lg border border-emerald-100 bg-emerald-50 shadow-sm">
                          <p className="font-bold text-emerald-900 text-xs">Marked Ready</p>
                        </div>
                      </div>
                    )}

                    {/* Fulfilled */}
                    {viewingOrder.fulfillmentStatus === 'FULFILLED' && !viewingOrder.logistics && (
                       <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-emerald-500 bg-emerald-500 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10"><Check size={12} strokeWidth={3} /></div>
                        <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.25rem)] p-3 rounded-lg border border-emerald-200 bg-emerald-50 shadow-sm">
                          <p className="font-bold text-emerald-950 text-xs">Fulfilled & Delivered</p>
                        </div>
                      </div>
                    )}

                    {/* Logistics Status */}
                    {viewingOrder.logistics && (
                      <>
                        <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                          <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-blue-500 bg-white text-blue-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10"><Truck size={12} strokeWidth={3} /></div>
                          <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.25rem)] p-3 rounded-lg border border-blue-100 bg-blue-50 shadow-sm">
                            <p className="font-bold text-blue-900 text-xs">Courier Requested</p>
                            <p className="text-[10px] text-blue-700 font-mono mt-1 break-all">ID: {viewingOrder.logistics.deliveryJobId}</p>
                          </div>
                        </div>

                        <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                          <div className={`flex items-center justify-center w-5 h-5 rounded-full border-2 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 ${viewingOrder.logistics.status === 'DELIVERED' ? 'border-emerald-500 text-emerald-500 bg-white' : 'border-blue-500 bg-blue-500 text-white'}`}>
                            {viewingOrder.logistics.status === 'DELIVERED' ? <Check size={12} strokeWidth={3} /> : <Loader2 size={12} className="animate-spin" />}
                          </div>
                          <div className={`w-[calc(100%-2.5rem)] md:w-[calc(50%-1.25rem)] p-3 rounded-lg border shadow-sm ${viewingOrder.logistics.status === 'DELIVERED' ? 'border-emerald-100 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                            <p className={`font-bold text-xs ${viewingOrder.logistics.status === 'DELIVERED' ? 'text-emerald-900' : 'text-slate-700'}`}>LogisticsOS Status</p>
                            <p className="text-[10px] font-bold text-slate-500 mt-1">{viewingOrder.logistics.status}</p>
                          </div>
                        </div>
                      </>
                    )}
                    
                  </div>
                </div>
              </div>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
}
