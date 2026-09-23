"use client";

import React, { useMemo, useState } from "react";
import { Plus, X, Loader2, AlertCircle, Receipt, BedDouble, CreditCard, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/Shared";
import {
  addItemToOrder,
  chargeOrderToRoom,
  createOutletOrder,
  getOutletsData,
  payOrderDirectly,
} from "@/lib/actions/hotel";

type Outlet = { id: string; name: string; type: string; isActive: boolean };
type OutletItem = { id: string; outletId: string; name: string; price: number; category: string };
type OutletOrder = {
  id: string;
  outletId: string;
  tabName: string;
  status: "OPEN" | "PAID" | "CHARGED_TO_ROOM";
  totalAmount: number;
  reservationId: string | null;
};
type OutletOrderItem = { id: string; outletOrderId: string; outletItemId: string; quantity: number };
type Reservation = { id: string; guestName: string; roomId: string | null };
type Room = { id: string; roomNumber: string };

interface OutletPOSProps {
  organizationId: string | null;
  initialOutlets: Outlet[];
  initialItems: OutletItem[];
  initialOrders: OutletOrder[];
  initialOrderItems: OutletOrderItem[];
  checkedInReservations: Reservation[];
  rooms: Room[];
}

export default function OutletPOS({
  organizationId,
  initialOutlets,
  initialItems,
  initialOrders,
  initialOrderItems,
  checkedInReservations,
  rooms,
}: OutletPOSProps) {
  const [outlets] = useState<Outlet[]>(initialOutlets);
  const activeOutlets = outlets.filter((o) => o.isActive);
  const [items, setItems] = useState<OutletItem[]>(initialItems);
  const [orders, setOrders] = useState<OutletOrder[]>(initialOrders);
  const [orderItems, setOrderItems] = useState<OutletOrderItem[]>(initialOrderItems);
  const [selectedOutletId, setSelectedOutletId] = useState<string | null>(activeOutlets[0]?.id ?? null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isNewTabOpen, setIsNewTabOpen] = useState(false);
  const [newTabName, setNewTabName] = useState("");
  const [isChargeModalOpen, setIsChargeModalOpen] = useState(false);
  const [chargeSearch, setChargeSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const refresh = async () => {
    if (!organizationId) return;
    const data = await getOutletsData(organizationId);
    if (!data) return;
    setItems(data.items);
    setOrders(data.orders);
    setOrderItems(data.orderItems);
  };

  const outletItems = items.filter((i) => i.outletId === selectedOutletId);
  const openOrders = orders.filter((o) => o.outletId === selectedOutletId && o.status === "OPEN");
  const selectedOrder = orders.find((o) => o.id === selectedOrderId) ?? null;
  const selectedOrderLines = orderItems
    .filter((oi) => oi.outletOrderId === selectedOrderId)
    .map((oi) => ({ ...oi, item: items.find((i) => i.id === oi.outletItemId) }));

  const filteredGuests = useMemo(() => {
    const q = chargeSearch.trim().toLowerCase();
    return checkedInReservations
      .map((r) => ({ ...r, room: rooms.find((rm) => rm.id === r.roomId) }))
      .filter((r) => !q || r.guestName.toLowerCase().includes(q) || r.room?.roomNumber.includes(q));
  }, [checkedInReservations, rooms, chargeSearch]);

  const openNewTab = async () => {
    if (!organizationId || !selectedOutletId || !newTabName.trim()) return;
    setIsBusy(true);
    setError(null);
    try {
      const result = await createOutletOrder({ organizationId, outletId: selectedOutletId, tabName: newTabName });
      if (result?.error) {
        setError(result.error);
        return;
      }
      setIsNewTabOpen(false);
      setNewTabName("");
      await refresh();
      if (result.orderId) setSelectedOrderId(result.orderId);
    } finally {
      setIsBusy(false);
    }
  };

  const addItem = async (outletItemId: string) => {
    if (!selectedOrderId) return;
    await addItemToOrder({ outletOrderId: selectedOrderId, outletItemId, quantity: 1 });
    await refresh();
  };

  const closeAndPay = async () => {
    if (!selectedOrderId) return;
    setIsBusy(true);
    try {
      await payOrderDirectly(selectedOrderId);
      setSelectedOrderId(null);
      await refresh();
    } finally {
      setIsBusy(false);
    }
  };

  const chargeToRoom = async (reservationId: string) => {
    if (!selectedOrderId) return;
    setIsBusy(true);
    setError(null);
    try {
      const result = await chargeOrderToRoom(selectedOrderId, reservationId);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setIsChargeModalOpen(false);
      setSelectedOrderId(null);
      await refresh();
    } finally {
      setIsBusy(false);
    }
  };

  if (!organizationId) {
    return (
      <div className="p-10 text-center text-gray-400">
        <UtensilsCrossed size={48} className="mx-auto mb-4 opacity-20" />
        <p>No hotel organization found — complete your organization onboarding profile.</p>
      </div>
    );
  }

  if (activeOutlets.length === 0) {
    return (
      <div className="p-10 text-center text-gray-400">
        <UtensilsCrossed size={48} className="mx-auto mb-4 opacity-20" />
        <p>No outlets are currently available for POS. A manager can enable one in Manager &rarr; Settings.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900">Outlets & Point of Sale</h1>
        <p className="text-sm text-gray-500">Restaurants, bars, and clubs — with charge-to-room billing.</p>
        <div className="flex gap-2 mt-4">
          {activeOutlets.map((o) => (
            <button
              key={o.id}
              onClick={() => {
                setSelectedOutletId(o.id);
                setSelectedOrderId(null);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                selectedOutletId === o.id ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {o.name}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Open tabs list */}
        <div className="w-64 flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4 flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Open Tabs</h3>
            <button
              onClick={() => setIsNewTabOpen(true)}
              className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              title="New tab"
            >
              <Plus size={14} />
            </button>
          </div>
          <div className="px-2 space-y-1 pb-4">
            {openOrders.length === 0 && <p className="px-3 text-sm text-gray-400">No open tabs.</p>}
            {openOrders.map((order) => (
              <button
                key={order.id}
                onClick={() => setSelectedOrderId(order.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  selectedOrderId === order.id ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50 text-gray-700"
                }`}
              >
                <p className="font-semibold">{order.tabName}</p>
                <p className="text-xs text-gray-400">${order.totalAmount.toFixed(2)}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Order detail + menu */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selectedOrder ? (
            <div className="text-center text-gray-400 py-16">
              <Receipt size={48} className="mx-auto mb-4 opacity-20" />
              <p>Select a tab, or open a new one, to start ringing up items.</p>
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <h3 className="font-bold text-gray-900 mb-3">Menu</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {outletItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => addItem(item.id)}
                      className="bg-white border border-gray-200 rounded-xl p-4 text-left hover:border-blue-400 hover:shadow-sm transition-all"
                    >
                      <p className="font-semibold text-gray-900 text-sm">{item.name}</p>
                      <p className="text-xs text-gray-400 mb-1">{item.category}</p>
                      <p className="font-bold text-blue-700">${item.price.toFixed(2)}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-5 h-fit">
                <h3 className="font-bold text-gray-900 mb-1">{selectedOrder.tabName}</h3>
                <p className="text-xs text-gray-400 mb-4">Tap a menu item to add it to this tab.</p>

                {error && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-xs p-2 rounded-lg mb-3">
                    <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                  {selectedOrderLines.length === 0 && <p className="text-sm text-gray-400">No items yet.</p>}
                  {selectedOrderLines.map((line) => (
                    <div key={line.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">
                        {line.quantity}× {line.item?.name}
                      </span>
                      <span className="text-gray-500">${((line.item?.price ?? 0) * line.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-100 pt-3 flex items-center justify-between mb-4">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="font-bold text-lg text-gray-900">${selectedOrder.totalAmount.toFixed(2)}</span>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => setIsChargeModalOpen(true)}
                    disabled={isBusy || selectedOrderLines.length === 0}
                    className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white rounded-xl font-bold text-xs px-4 py-2.5 hover:bg-gray-800 disabled:opacity-50"
                  >
                    <BedDouble size={14} /> Charge to Room
                  </button>
                  <button
                    onClick={closeAndPay}
                    disabled={isBusy || selectedOrderLines.length === 0}
                    className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 rounded-xl font-bold text-xs px-4 py-2.5 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <CreditCard size={14} /> Close & Pay Directly
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {isNewTabOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsNewTabOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">New Tab</h2>
              <button onClick={() => setIsNewTabOpen(false)} className="p-1 rounded-full hover:bg-gray-100 text-gray-500">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <label className="text-xs font-semibold text-gray-500 uppercase">Table / Tab Name</label>
              <input
                value={newTabName}
                onChange={(e) => setNewTabName(e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Table 4, Bar Seat 2..."
              />
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100 bg-gray-50">
              <Button variant="outline" className="flex-1 justify-center" onClick={() => setIsNewTabOpen(false)}>
                Cancel
              </Button>
              <button
                onClick={openNewTab}
                disabled={isBusy || !newTabName.trim()}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white rounded-xl font-bold text-xs px-6 py-2.5 hover:bg-blue-700 disabled:opacity-50"
              >
                {isBusy && <Loader2 size={14} className="animate-spin" />}
                Open Tab
              </button>
            </div>
          </div>
        </div>
      )}

      {isChargeModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsChargeModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Charge to Room</h2>
              <button onClick={() => setIsChargeModalOpen(false)} className="p-1 rounded-full hover:bg-gray-100 text-gray-500">
                <X size={20} />
              </button>
            </div>
            <div className="p-4">
              <input
                value={chargeSearch}
                onChange={(e) => setChargeSearch(e.target.value)}
                placeholder="Search guest or room number..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
              />
              <div className="max-h-64 overflow-y-auto space-y-1">
                {filteredGuests.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-6">No checked-in guests match.</p>
                )}
                {filteredGuests.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => chargeToRoom(g.id)}
                    disabled={isBusy}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
                  >
                    <p className="font-semibold text-sm text-gray-900">{g.guestName}</p>
                    <p className="text-xs text-gray-400">Room {g.room?.roomNumber ?? "—"}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
