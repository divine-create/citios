"use client";

import React, { useMemo, useState } from "react";
import {
  TrendingUp,
  DollarSign,
  Percent,
  BedDouble,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  X,
  PackageSearch,
  Sliders,
  LayoutGrid,
  Users,
  BookOpenCheck,
  PlayCircle,
  Settings as SettingsIcon,
  UtensilsCrossed,
  Power,
} from "lucide-react";
import { Button } from "@/components/Shared";
import {
  addReservationToBlock,
  createInventoryItem,
  createOutlet,
  createOutletItem,
  createRoom,
  createRoomBlock,
  deleteInventoryItem,
  deleteOutlet,
  deleteOutletItem,
  deleteRoom,
  getHotelAdminData,
  getNightAuditReports,
  getOutletsData,
  getRoomBlocks,
  runNightAudit,
  updateHotelSettings,
  updateInventoryItem,
  updateOutlet,
  updateOutletItem,
  updateRoom,
  upsertRateRule,
} from "@/lib/actions/hotel";

type Room = {
  id: string;
  roomNumber: string;
  type: string;
  status: string;
  baseRate: number;
};

type Reservation = {
  id: string;
  roomId: string | null;
  status: "CONFIRMED" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELLED";
  checkInDate: string;
  checkOutDate: string;
  totalPrice: number | null;
};

type RateRule = {
  id: string;
  type: "WEEKEND_SURGE" | "HOLIDAY_SURGE";
  multiplier: number;
  isActive: boolean;
};

type InventoryCategory = "HOUSEKEEPING" | "FOOD_AND_BEVERAGE" | "MAINTENANCE";

type InventoryItem = {
  id: string;
  name: string;
  category: InventoryCategory;
  unit: string;
  quantityOnHand: number;
  parLevel: number;
};

type RoomBlock = {
  id: string;
  groupName: string;
  checkInDate: string;
  checkOutDate: string;
  notes: string | null;
  reservationCount: number;
};

type NightAuditReport = {
  id: string;
  auditDate: string;
  roomRevenue: number;
  fnbRevenue: number;
  otherRevenue: number;
  totalRevenue: number;
  occupancyRate: number;
  roomsSold: number;
};

type Hotel = { id: string; name: string; description: string | null; address: string | null };

type Outlet = { id: string; name: string; type: "RESTAURANT" | "BAR" | "CLUB" | "SPA"; isActive: boolean };
type OutletItem = { id: string; outletId: string; name: string; price: number; category: string };

interface ManagerDashboardProps {
  organizationId: string | null;
  initialHotel: Hotel | null;
  initialRooms: Room[];
  initialReservations: Reservation[];
  initialRateRules: RateRule[];
  initialInventoryItems: InventoryItem[];
  initialRoomBlocks: RoomBlock[];
  initialNightAuditReports: NightAuditReport[];
  initialOutlets: Outlet[];
  initialOutletItems: OutletItem[];
}

const TABS = [
  { id: "overview", label: "Overview", icon: TrendingUp },
  { id: "rooms", label: "Room Management", icon: BedDouble },
  { id: "rates", label: "Rate Management", icon: Sliders },
  { id: "inventory", label: "Inventory", icon: PackageSearch },
  { id: "groups", label: "Group Blocks", icon: Users },
  { id: "ledger", label: "Ledger", icon: BookOpenCheck },
  { id: "settings", label: "Settings", icon: SettingsIcon },
] as const;

type TabId = (typeof TABS)[number]["id"];

const CATEGORY_LABELS: Record<InventoryCategory, string> = {
  HOUSEKEEPING: "Housekeeping",
  FOOD_AND_BEVERAGE: "Food & Beverage",
  MAINTENANCE: "Maintenance",
};

const money = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export function ManagerDashboard({
  organizationId,
  initialHotel,
  initialRooms,
  initialReservations,
  initialRateRules,
  initialInventoryItems,
  initialRoomBlocks,
  initialNightAuditReports,
  initialOutlets,
  initialOutletItems,
}: ManagerDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [hotel, setHotel] = useState<Hotel | null>(initialHotel);
  const [rooms, setRooms] = useState<Room[]>(initialRooms);
  const [reservations, setReservations] = useState<Reservation[]>(initialReservations);
  const [rateRules, setRateRules] = useState<RateRule[]>(initialRateRules);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>(initialInventoryItems);
  const [roomBlocks, setRoomBlocks] = useState<RoomBlock[]>(initialRoomBlocks);
  const [nightAuditReports, setNightAuditReports] = useState<NightAuditReport[]>(initialNightAuditReports);
  const [outlets, setOutlets] = useState<Outlet[]>(initialOutlets);
  const [outletItems, setOutletItems] = useState<OutletItem[]>(initialOutletItems);

  const refreshData = async () => {
    const data = await getHotelAdminData();
    if (data) {
      setHotel(data.hotel);
      setRooms(data.rooms);
      setReservations(data.reservations);
      setRateRules(data.rateRules);
      setInventoryItems(data.inventoryItems);
    }
    if (organizationId) {
      setRoomBlocks(await getRoomBlocks(organizationId));
      setNightAuditReports(await getNightAuditReports(organizationId));
      const outletsData = await getOutletsData(organizationId);
      if (outletsData) {
        setOutlets(outletsData.outlets);
        setOutletItems(outletsData.items);
      }
    }
  };

  // -------------------------------------------------------------------
  // Overview metrics — computed from real rooms/reservations, not mocked.
  // -------------------------------------------------------------------
  const metrics = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const daysElapsedInMonth = today.getDate();

    const active = reservations.filter((r) => r.status !== "CANCELLED");

    const occupiedTonight = new Set(
      active
        .filter((r) => {
          const checkIn = new Date(r.checkInDate).getTime();
          const checkOut = new Date(r.checkOutDate).getTime();
          return checkIn <= today.getTime() && today.getTime() < checkOut;
        })
        .map((r) => r.roomId)
    ).size;

    const totalRooms = rooms.length;
    const occupancyRate = totalRooms > 0 ? (occupiedTonight / totalRooms) * 100 : 0;

    let mtdRevenue = 0;
    let roomNightsSold = 0;
    for (const r of active) {
      const checkIn = new Date(r.checkInDate);
      const checkOut = new Date(r.checkOutDate);
      if (checkIn < monthStart) continue;
      if (checkIn > today) continue;
      mtdRevenue += r.totalPrice ?? 0;
      const nights = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / 86400000));
      roomNightsSold += nights;
    }

    const adr = roomNightsSold > 0 ? mtdRevenue / roomNightsSold : 0;
    const revPar = totalRooms > 0 && daysElapsedInMonth > 0 ? mtdRevenue / (totalRooms * daysElapsedInMonth) : 0;

    return {
      occupiedTonight,
      totalRooms,
      occupancyRate,
      mtdRevenue,
      adr,
      revPar,
      activeReservations: active.filter((r) => r.status === "CONFIRMED" || r.status === "CHECKED_IN").length,
    };
  }, [rooms, reservations]);

  return (
    <div className="min-h-full bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 md:px-10 py-5">
        <h1 className="text-xl font-bold text-gray-900">General Manager Portal</h1>
        <p className="text-sm text-gray-500">Revenue, room inventory, rates, and supply management.</p>
      </header>

      <nav className="bg-white border-b border-gray-200 px-6 md:px-10 flex gap-1 overflow-x-auto">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                isActive ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </nav>

      <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8">
        {!organizationId ? (
          <div className="text-center text-gray-400 py-16">
            <BedDouble size={48} className="mx-auto mb-4 opacity-20" />
            <p>No hotel organization found — run the seed script.</p>
          </div>
        ) : (
          <>
            {activeTab === "overview" && <OverviewTab metrics={metrics} rooms={rooms} />}
            {activeTab === "rooms" && (
              <RoomsTab organizationId={organizationId} rooms={rooms} onChanged={refreshData} />
            )}
            {activeTab === "rates" && (
              <RatesTab organizationId={organizationId} rateRules={rateRules} onChanged={refreshData} />
            )}
            {activeTab === "inventory" && (
              <InventoryTab organizationId={organizationId} items={inventoryItems} onChanged={refreshData} />
            )}
            {activeTab === "groups" && (
              <GroupBlocksTab
                organizationId={organizationId}
                rooms={rooms}
                roomBlocks={roomBlocks}
                onChanged={refreshData}
              />
            )}
            {activeTab === "ledger" && (
              <LedgerTab organizationId={organizationId} reports={nightAuditReports} onChanged={refreshData} />
            )}
            {activeTab === "settings" && (
              <SettingsTab
                organizationId={organizationId}
                hotel={hotel}
                outlets={outlets}
                outletItems={outletItems}
                onChanged={refreshData}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// =====================================================================
// Overview
// =====================================================================

function OverviewTab({
  metrics,
  rooms,
}: {
  metrics: {
    occupiedTonight: number;
    totalRooms: number;
    occupancyRate: number;
    mtdRevenue: number;
    adr: number;
    revPar: number;
    activeReservations: number;
  };
  rooms: Room[];
}) {
  const roomsNeedingAttention = rooms.filter((r) => r.status !== "CLEAN");

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Percent}
          label="Occupancy Tonight"
          value={`${metrics.occupancyRate.toFixed(0)}%`}
          sub={`${metrics.occupiedTonight} of ${metrics.totalRooms} rooms`}
        />
        <StatCard
          icon={DollarSign}
          label="Revenue (MTD)"
          value={money(metrics.mtdRevenue)}
          sub="Room revenue, this month"
        />
        <StatCard icon={TrendingUp} label="ADR" value={money(metrics.adr)} sub="Average daily rate" />
        <StatCard icon={LayoutGrid} label="RevPAR" value={money(metrics.revPar)} sub="Revenue per available room" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="font-bold text-gray-900 mb-1">Rooms Needing Attention</h3>
        <p className="text-sm text-gray-500 mb-4">Anything not currently marked Clean.</p>
        {roomsNeedingAttention.length === 0 ? (
          <p className="text-sm text-gray-400">All rooms are clean. Nothing to flag.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {roomsNeedingAttention.map((r) => (
              <div key={r.id} className="border border-gray-200 rounded-xl p-3">
                <p className="font-bold text-gray-900 text-sm">Room {r.roomNumber}</p>
                <p className="text-xs text-gray-500">{r.type}</p>
                <span
                  className={`inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    r.status === "DIRTY"
                      ? "bg-orange-100 text-orange-700"
                      : r.status === "OUT_OF_ORDER"
                      ? "bg-red-100 text-red-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {r.status.replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400">
        Active reservations right now: {metrics.activeReservations}. RevPAR and ADR are computed from real
        reservation data for the current calendar month.
      </p>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 text-gray-400 mb-3">
        <Icon size={16} />
        <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
  );
}

// =====================================================================
// Room Management
// =====================================================================

function RoomsTab({
  organizationId,
  rooms,
  onChanged,
}: {
  organizationId: string;
  rooms: Room[];
  onChanged: () => Promise<void>;
}) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState({ roomNumber: "", type: "", baseRate: "", status: "CLEAN" });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  const submitNewRoom = async () => {
    setError(null);
    setIsSaving(true);
    try {
      const result = await createRoom({
        organizationId,
        roomNumber: form.roomNumber,
        type: form.type,
        baseRate: parseFloat(form.baseRate) || 0,
        status: form.status,
      });
      if (result?.error) {
        setError(result.error);
        return;
      }
      setIsAddOpen(false);
      setForm({ roomNumber: "", type: "", baseRate: "", status: "CLEAN" });
      await onChanged();
    } finally {
      setIsSaving(false);
    }
  };

  const saveRoomField = async (roomId: string, patch: Partial<{ type: string; baseRate: number; status: string }>) => {
    setRowError(null);
    const result = await updateRoom(roomId, patch);
    if (result?.error) setRowError(result.error);
    await onChanged();
  };

  const removeRoom = async (roomId: string) => {
    setRowError(null);
    const result = await deleteRoom(roomId);
    if (result?.error) {
      setRowError(result.error);
      return;
    }
    await onChanged();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-900">Rooms</h3>
          <p className="text-sm text-gray-500">{rooms.length} rooms configured</p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus size={16} /> Add Room
        </button>
      </div>

      {rowError && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <span>{rowError}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-5 py-3">Room</th>
              <th className="text-left px-5 py-3">Type</th>
              <th className="text-left px-5 py-3">Base Rate / Night</th>
              <th className="text-left px-5 py-3">Status</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rooms.map((room) => (
              <tr key={room.id}>
                <td className="px-5 py-3 font-bold text-gray-900">{room.roomNumber}</td>
                <td className="px-5 py-3">
                  <input
                    defaultValue={room.type}
                    onBlur={(e) => e.target.value !== room.type && saveRoomField(room.id, { type: e.target.value })}
                    className="w-full border border-transparent hover:border-gray-200 focus:border-blue-400 rounded px-2 py-1 text-sm focus:outline-none"
                  />
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1">
                    <span className="text-gray-400">$</span>
                    <input
                      type="number"
                      defaultValue={room.baseRate}
                      onBlur={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val) && val !== room.baseRate) saveRoomField(room.id, { baseRate: val });
                      }}
                      className="w-24 border border-transparent hover:border-gray-200 focus:border-blue-400 rounded px-2 py-1 text-sm focus:outline-none"
                    />
                  </div>
                </td>
                <td className="px-5 py-3">
                  <select
                    value={room.status}
                    onChange={(e) => saveRoomField(room.id, { status: e.target.value })}
                    className="border border-gray-200 rounded-lg px-2 py-1 text-xs font-semibold"
                  >
                    <option value="CLEAN">Clean</option>
                    <option value="DIRTY">Dirty</option>
                    <option value="INSPECTING">Inspecting</option>
                    <option value="OUT_OF_ORDER">Out of Order</option>
                  </select>
                </td>
                <td className="px-5 py-3 text-right">
                  <button
                    onClick={() => removeRoom(room.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remove room"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {rooms.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-gray-400">
                  No rooms yet. Add your first room to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {isAddOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsAddOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Add Room</h2>
              <button onClick={() => setIsAddOpen(false)} className="p-1 rounded-full hover:bg-gray-100 text-gray-500">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Room Number</label>
                <input
                  value={form.roomNumber}
                  onChange={(e) => setForm((f) => ({ ...f, roomNumber: e.target.value }))}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="205"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Room Type</label>
                <input
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="King, Double, Suite..."
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Base Rate / Night</label>
                <input
                  type="number"
                  value={form.baseRate}
                  onChange={(e) => setForm((f) => ({ ...f, baseRate: e.target.value }))}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="149"
                />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100 bg-gray-50">
              <Button variant="outline" className="flex-1 justify-center" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <button
                onClick={submitNewRoom}
                disabled={isSaving || !form.roomNumber || !form.type}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white rounded-xl font-bold text-xs px-6 py-2.5 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving && <Loader2 size={14} className="animate-spin" />}
                Add Room
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================================
// Rate Management
// =====================================================================

function RatesTab({
  organizationId,
  rateRules,
  onChanged,
}: {
  organizationId: string;
  rateRules: RateRule[];
  onChanged: () => Promise<void>;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-bold text-gray-900">Dynamic Pricing</h3>
        <p className="text-sm text-gray-500">
          Surge multipliers applied on top of each room's base rate. Weekend surge auto-applies to Saturday/Sunday
          nights on new bookings.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <RateRuleCard
          organizationId={organizationId}
          type="WEEKEND_SURGE"
          title="Weekend Surge"
          description="Applies automatically to Saturday & Sunday nights."
          rule={rateRules.find((r) => r.type === "WEEKEND_SURGE") ?? null}
          onChanged={onChanged}
        />
        <RateRuleCard
          organizationId={organizationId}
          type="HOLIDAY_SURGE"
          title="Holiday Surge"
          description="Configurable now; auto-detection of holiday dates isn't wired up yet."
          rule={rateRules.find((r) => r.type === "HOLIDAY_SURGE") ?? null}
          onChanged={onChanged}
        />
      </div>
    </div>
  );
}

function RateRuleCard({
  organizationId,
  type,
  title,
  description,
  rule,
  onChanged,
}: {
  organizationId: string;
  type: "WEEKEND_SURGE" | "HOLIDAY_SURGE";
  title: string;
  description: string;
  rule: RateRule | null;
  onChanged: () => Promise<void>;
}) {
  const [percent, setPercent] = useState(rule ? Math.round((rule.multiplier - 1) * 100) : 20);
  const [isActive, setIsActive] = useState(rule?.isActive ?? false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setError(null);
    setIsSaving(true);
    setSaved(false);
    try {
      const result = await upsertRateRule({
        organizationId,
        type,
        multiplier: 1 + percent / 100,
        isActive,
      });
      if (result?.error) {
        setError(result.error);
        return;
      }
      setSaved(true);
      await onChanged();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-bold text-gray-900">{title}</h4>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-10 h-5 bg-gray-200 peer-checked:bg-blue-600 rounded-full transition-colors" />
          <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
        </label>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-xs p-2 rounded-lg">
          <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex items-center gap-3">
        <input
          type="number"
          min={0}
          value={percent}
          onChange={(e) => setPercent(parseInt(e.target.value) || 0)}
          className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <span className="text-sm text-gray-500">% surcharge</span>
      </div>

      <button
        onClick={save}
        disabled={isSaving}
        className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white rounded-xl font-bold text-xs px-6 py-2.5 hover:bg-gray-800 disabled:opacity-50"
      >
        {isSaving && <Loader2 size={14} className="animate-spin" />}
        {saved ? "Saved" : "Save Rule"}
      </button>
    </div>
  );
}

// =====================================================================
// Inventory
// =====================================================================

function InventoryTab({
  organizationId,
  items,
  onChanged,
}: {
  organizationId: string;
  items: InventoryItem[];
  onChanged: () => Promise<void>;
}) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "HOUSEKEEPING" as InventoryCategory,
    unit: "units",
    quantityOnHand: "",
    parLevel: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const grouped = useMemo(() => {
    const byCategory: Record<InventoryCategory, InventoryItem[]> = {
      HOUSEKEEPING: [],
      FOOD_AND_BEVERAGE: [],
      MAINTENANCE: [],
    };
    for (const item of items) byCategory[item.category].push(item);
    return byCategory;
  }, [items]);

  const submitNewItem = async () => {
    setError(null);
    setIsSaving(true);
    try {
      const result = await createInventoryItem({
        organizationId,
        name: form.name,
        category: form.category,
        unit: form.unit,
        quantityOnHand: parseInt(form.quantityOnHand) || 0,
        parLevel: parseInt(form.parLevel) || 0,
      });
      if (result?.error) {
        setError(result.error);
        return;
      }
      setIsAddOpen(false);
      setForm({ name: "", category: "HOUSEKEEPING", unit: "units", quantityOnHand: "", parLevel: "" });
      await onChanged();
    } finally {
      setIsSaving(false);
    }
  };

  const adjustQuantity = async (itemId: string, quantityOnHand: number) => {
    if (quantityOnHand < 0) return;
    await updateInventoryItem(itemId, { quantityOnHand });
    await onChanged();
  };

  const removeItem = async (itemId: string) => {
    await deleteInventoryItem(itemId);
    await onChanged();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-900">Inventory & Procurement</h3>
          <p className="text-sm text-gray-500">Housekeeping supplies, F&B stock, and maintenance parts.</p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus size={16} /> Add Item
        </button>
      </div>

      {(Object.keys(grouped) as InventoryCategory[]).map((category) => (
        <div key={category} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
            <h4 className="font-bold text-gray-800 text-sm">{CATEGORY_LABELS[category]}</h4>
          </div>
          {grouped[category].length === 0 ? (
            <p className="px-5 py-4 text-sm text-gray-400">No items in this category.</p>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-gray-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-5 py-2">Item</th>
                  <th className="text-left px-5 py-2">On Hand</th>
                  <th className="text-left px-5 py-2">Par Level</th>
                  <th className="text-left px-5 py-2">Status</th>
                  <th className="px-5 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {grouped[category].map((item) => {
                  const isLow = item.quantityOnHand < item.parLevel;
                  return (
                    <tr key={item.id}>
                      <td className="px-5 py-3 font-medium text-gray-900">{item.name}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            defaultValue={item.quantityOnHand}
                            onBlur={(e) => {
                              const val = parseInt(e.target.value);
                              if (!isNaN(val) && val !== item.quantityOnHand) adjustQuantity(item.id, val);
                            }}
                            className="w-20 border border-transparent hover:border-gray-200 focus:border-blue-400 rounded px-2 py-1 text-sm focus:outline-none"
                          />
                          <span className="text-xs text-gray-400">{item.unit}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-500">{item.parLevel}</td>
                      <td className="px-5 py-3">
                        {isLow ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-100 text-red-700">
                            Low Stock
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-green-100 text-green-700">
                            OK
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          )}
        </div>
      ))}

      {isAddOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsAddOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Add Inventory Item</h2>
              <button onClick={() => setIsAddOpen(false)} className="p-1 rounded-full hover:bg-gray-100 text-gray-500">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Item Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Bath Towels"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as InventoryCategory }))}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="HOUSEKEEPING">Housekeeping</option>
                  <option value="FOOD_AND_BEVERAGE">Food & Beverage</option>
                  <option value="MAINTENANCE">Maintenance</option>
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Unit</label>
                  <input
                    value={form.unit}
                    onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="units"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">On Hand</label>
                  <input
                    type="number"
                    value={form.quantityOnHand}
                    onChange={(e) => setForm((f) => ({ ...f, quantityOnHand: e.target.value }))}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Par Level</label>
                  <input
                    type="number"
                    value={form.parLevel}
                    onChange={(e) => setForm((f) => ({ ...f, parLevel: e.target.value }))}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100 bg-gray-50">
              <Button variant="outline" className="flex-1 justify-center" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <button
                onClick={submitNewItem}
                disabled={isSaving || !form.name}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white rounded-xl font-bold text-xs px-6 py-2.5 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving && <Loader2 size={14} className="animate-spin" />}
                Add Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================================
// Group Room Blocks
// =====================================================================

function GroupBlocksTab({
  organizationId,
  rooms,
  roomBlocks,
  onChanged,
}: {
  organizationId: string;
  rooms: Room[];
  roomBlocks: RoomBlock[];
  onChanged: () => Promise<void>;
}) {
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [form, setForm] = useState({ groupName: "", checkInDate: "", checkOutDate: "", notes: "" });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [assigningBlockId, setAssigningBlockId] = useState<string | null>(null);
  const [assignForm, setAssignForm] = useState({ roomId: "", guestName: "" });
  const [assignError, setAssignError] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  const submitNewBlock = async () => {
    setError(null);
    setIsSaving(true);
    try {
      const result = await createRoomBlock({
        organizationId,
        groupName: form.groupName,
        checkInDate: form.checkInDate,
        checkOutDate: form.checkOutDate,
        notes: form.notes,
      });
      if (result?.error) {
        setError(result.error);
        return;
      }
      setIsNewOpen(false);
      setForm({ groupName: "", checkInDate: "", checkOutDate: "", notes: "" });
      await onChanged();
    } finally {
      setIsSaving(false);
    }
  };

  const submitAssign = async (blockId: string) => {
    setAssignError(null);
    setIsAssigning(true);
    try {
      const result = await addReservationToBlock({
        roomBlockId: blockId,
        organizationId,
        roomId: assignForm.roomId,
        guestName: assignForm.guestName,
      });
      if (result?.error) {
        setAssignError(result.error);
        return;
      }
      setAssigningBlockId(null);
      setAssignForm({ roomId: "", guestName: "" });
      await onChanged();
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-900">Group Room Blocks</h3>
          <p className="text-sm text-gray-500">Reserve a block of rooms for a wedding, conference, or corporate group.</p>
        </div>
        <button
          onClick={() => setIsNewOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus size={16} /> New Block
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {roomBlocks.length === 0 && <p className="text-sm text-gray-400">No group blocks yet.</p>}
        {roomBlocks.map((block) => (
          <div key={block.id} className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-gray-900">{block.groupName}</h4>
              <span className="text-xs font-semibold text-gray-400">{block.reservationCount} room(s)</span>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              {new Date(block.checkInDate).toLocaleDateString()} – {new Date(block.checkOutDate).toLocaleDateString()}
            </p>
            {block.notes && <p className="text-xs text-gray-400 mb-3">{block.notes}</p>}

            {assigningBlockId === block.id ? (
              <div className="space-y-2 border-t border-gray-100 pt-3">
                {assignError && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-xs p-2 rounded-lg">
                    <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                    <span>{assignError}</span>
                  </div>
                )}
                <input
                  value={assignForm.guestName}
                  onChange={(e) => setAssignForm((f) => ({ ...f, guestName: e.target.value }))}
                  placeholder="Guest name"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={assignForm.roomId}
                  onChange={(e) => setAssignForm((f) => ({ ...f, roomId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a room...</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>Room {r.roomNumber} — {r.type}</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 justify-center" onClick={() => setAssigningBlockId(null)}>
                    Cancel
                  </Button>
                  <button
                    onClick={() => submitAssign(block.id)}
                    disabled={isAssigning || !assignForm.roomId || !assignForm.guestName.trim()}
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white rounded-xl font-bold text-xs px-4 py-2 hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isAssigning && <Loader2 size={14} className="animate-spin" />}
                    Add
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAssigningBlockId(block.id)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800"
              >
                + Add a reservation to this block
              </button>
            )}
          </div>
        ))}
      </div>

      {isNewOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsNewOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">New Group Block</h2>
              <button onClick={() => setIsNewOpen(false)} className="p-1 rounded-full hover:bg-gray-100 text-gray-500">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Group Name</label>
                <input
                  value={form.groupName}
                  onChange={(e) => setForm((f) => ({ ...f, groupName: e.target.value }))}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Smith Wedding"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Check-in</label>
                  <input
                    type="date"
                    value={form.checkInDate}
                    onChange={(e) => setForm((f) => ({ ...f, checkInDate: e.target.value }))}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Check-out</label>
                  <input
                    type="date"
                    value={form.checkOutDate}
                    onChange={(e) => setForm((f) => ({ ...f, checkOutDate: e.target.value }))}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100 bg-gray-50">
              <Button variant="outline" className="flex-1 justify-center" onClick={() => setIsNewOpen(false)}>
                Cancel
              </Button>
              <button
                onClick={submitNewBlock}
                disabled={isSaving || !form.groupName || !form.checkInDate || !form.checkOutDate}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white rounded-xl font-bold text-xs px-6 py-2.5 hover:bg-blue-700 disabled:opacity-50"
              >
                {isSaving && <Loader2 size={14} className="animate-spin" />}
                Create Block
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================================
// Night Audit / CityPay General Ledger
// =====================================================================

function LedgerTab({
  organizationId,
  reports,
  onChanged,
}: {
  organizationId: string;
  reports: NightAuditReport[];
  onChanged: () => Promise<void>;
}) {
  const [auditDate, setAuditDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const run = async () => {
    setError(null);
    setIsRunning(true);
    try {
      const result = await runNightAudit(organizationId, auditDate);
      if (result?.error) {
        setError(result.error);
        return;
      }
      await onChanged();
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-bold text-gray-900">Night Audit & Revenue Ledger</h3>
        <p className="text-sm text-gray-500">
          Reconciles room, food & beverage, and other revenue for a business date into an immutable daily report.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-end gap-3">
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase">Business Date</label>
          <input
            type="date"
            value={auditDate}
            onChange={(e) => setAuditDate(e.target.value)}
            className="mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={run}
          disabled={isRunning}
          className="flex items-center gap-2 bg-gray-900 text-white rounded-xl font-bold text-xs px-5 py-2.5 hover:bg-gray-800 disabled:opacity-50"
        >
          {isRunning ? <Loader2 size={14} className="animate-spin" /> : <PlayCircle size={14} />}
          Run Night Audit
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-5 py-3">Date</th>
              <th className="text-left px-5 py-3">Rooms Revenue</th>
              <th className="text-left px-5 py-3">F&B / Spa</th>
              <th className="text-left px-5 py-3">Other</th>
              <th className="text-left px-5 py-3">Total</th>
              <th className="text-left px-5 py-3">Occupancy</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {reports.map((r) => (
              <tr key={r.id}>
                <td className="px-5 py-3 font-medium text-gray-900">{new Date(r.auditDate).toLocaleDateString()}</td>
                <td className="px-5 py-3">{money(r.roomRevenue)}</td>
                <td className="px-5 py-3">{money(r.fnbRevenue)}</td>
                <td className="px-5 py-3">{money(r.otherRevenue)}</td>
                <td className="px-5 py-3 font-bold text-gray-900">{money(r.totalRevenue)}</td>
                <td className="px-5 py-3">{r.occupancyRate.toFixed(0)}% ({r.roomsSold} rooms)</td>
              </tr>
            ))}
            {reports.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-gray-400">
                  No audits run yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// Settings — general hotel info + Outlet (POS) management & availability
// =====================================================================

function SettingsTab({
  organizationId,
  hotel,
  outlets,
  outletItems,
  onChanged,
}: {
  organizationId: string;
  hotel: Hotel | null;
  outlets: Outlet[];
  outletItems: OutletItem[];
  onChanged: () => Promise<void>;
}) {
  return (
    <div className="space-y-10">
      <GeneralSettingsSection organizationId={organizationId} hotel={hotel} onChanged={onChanged} />
      <OutletSettingsSection organizationId={organizationId} outlets={outlets} outletItems={outletItems} onChanged={onChanged} />
    </div>
  );
}

function GeneralSettingsSection({
  organizationId,
  hotel,
  onChanged,
}: {
  organizationId: string;
  hotel: Hotel | null;
  onChanged: () => Promise<void>;
}) {
  const [form, setForm] = useState({
    name: hotel?.name ?? "",
    description: hotel?.description ?? "",
    address: hotel?.address ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const save = async () => {
    setError(null);
    setSaved(false);
    setIsSaving(true);
    try {
      const result = await updateHotelSettings(organizationId, form);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setSaved(true);
      await onChanged();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <h3 className="font-bold text-gray-900 mb-1">General</h3>
      <p className="text-sm text-gray-500 mb-4">Basic property information shown across the PMS and the resident storefront.</p>

      {error && <div className="mb-3"><ErrorBanner text={error} /></div>}
      {saved && (
        <div className="mb-3 bg-green-50 border border-green-200 text-green-700 text-sm p-3 rounded-lg">Settings saved.</div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4 max-w-xl">
        <Field2 label="Hotel Name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} />
        <Field2 label="Description" value={form.description} onChange={(v) => setForm((f) => ({ ...f, description: v }))} textarea />
        <Field2 label="Address" value={form.address} onChange={(v) => setForm((f) => ({ ...f, address: v }))} />
        <button
          onClick={save}
          disabled={isSaving || !form.name.trim()}
          className="flex items-center justify-center gap-2 bg-gray-900 text-white rounded-xl font-bold text-xs px-6 py-2.5 hover:bg-gray-800 disabled:opacity-50"
        >
          {isSaving && <Loader2 size={14} className="animate-spin" />}
          Save Changes
        </button>
      </div>
    </div>
  );
}

function OutletSettingsSection({
  organizationId,
  outlets,
  outletItems,
  onChanged,
}: {
  organizationId: string;
  outlets: Outlet[];
  outletItems: OutletItem[];
  onChanged: () => Promise<void>;
}) {
  const [isAddOutletOpen, setIsAddOutletOpen] = useState(false);
  const [outletForm, setOutletForm] = useState({ name: "", type: "RESTAURANT" as Outlet["type"] });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [managingOutletId, setManagingOutletId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState({ name: "", price: "", category: "" });
  const [itemError, setItemError] = useState<string | null>(null);

  const toggleActive = async (outlet: Outlet) => {
    await updateOutlet(outlet.id, { isActive: !outlet.isActive });
    await onChanged();
  };

  const renameOutlet = async (outletId: string, name: string) => {
    await updateOutlet(outletId, { name });
    await onChanged();
  };

  const removeOutlet = async (outletId: string) => {
    setError(null);
    const result = await deleteOutlet(outletId);
    if (result?.error) {
      setError(result.error);
      return;
    }
    await onChanged();
  };

  const submitOutlet = async () => {
    setError(null);
    setIsSaving(true);
    try {
      const result = await createOutlet({ organizationId, ...outletForm });
      if (result?.error) {
        setError(result.error);
        return;
      }
      setIsAddOutletOpen(false);
      setOutletForm({ name: "", type: "RESTAURANT" });
      await onChanged();
    } finally {
      setIsSaving(false);
    }
  };

  const submitItem = async (outletId: string) => {
    setItemError(null);
    const result = await createOutletItem({
      outletId,
      name: itemForm.name,
      price: parseFloat(itemForm.price) || 0,
      category: itemForm.category,
    });
    if (result?.error) {
      setItemError(result.error);
      return;
    }
    setItemForm({ name: "", price: "", category: "" });
    await onChanged();
  };

  const saveItemPrice = async (itemId: string, price: number) => {
    await updateOutletItem(itemId, { price });
    await onChanged();
  };

  const removeItem = async (itemId: string) => {
    await deleteOutletItem(itemId);
    await onChanged();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-bold text-gray-900">Outlets & POS Availability</h3>
        <button
          onClick={() => setIsAddOutletOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus size={16} /> Add Outlet
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Control which outlets have an active point-of-sale terminal. Deactivating an outlet immediately hides it from
        staff at <span className="font-mono text-xs">/hotel/outlets</span> — existing open tabs are unaffected.
      </p>

      {error && <div className="mb-3"><ErrorBanner text={error} /></div>}

      <div className="space-y-4">
        {outlets.map((outlet) => {
          const items = outletItems.filter((i) => i.outletId === outlet.id);
          return (
            <div key={outlet.id} className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <UtensilsCrossed size={18} className="text-gray-400" />
                  <div>
                    <input
                      defaultValue={outlet.name}
                      onBlur={(e) => e.target.value !== outlet.name && renameOutlet(outlet.id, e.target.value)}
                      className="font-bold text-gray-900 border border-transparent hover:border-gray-200 focus:border-blue-400 rounded px-1 -ml-1 focus:outline-none"
                    />
                    <p className="text-xs text-gray-400">{outlet.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleActive(outlet)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                      outlet.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    <Power size={12} />
                    {outlet.isActive ? "POS Available" : "POS Disabled"}
                  </button>
                  <button
                    onClick={() => removeOutlet(outlet.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {managingOutletId === outlet.id ? (
                <div className="border-t border-gray-100 mt-4 pt-4 space-y-2">
                  {itemError && <ErrorBanner text={itemError} />}
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{item.name} <span className="text-gray-400 text-xs">({item.category})</span></span>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">$</span>
                        <input
                          type="number"
                          defaultValue={item.price}
                          onBlur={(e) => {
                            const v = parseFloat(e.target.value);
                            if (!isNaN(v) && v !== item.price) saveItemPrice(item.id, v);
                          }}
                          className="w-16 border border-gray-200 rounded px-1 py-0.5 text-sm"
                        />
                        <button onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-red-600">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-2 pt-2">
                    <input
                      value={itemForm.name}
                      onChange={(e) => setItemForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Item name"
                      className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                    />
                    <input
                      value={itemForm.category}
                      onChange={(e) => setItemForm((f) => ({ ...f, category: e.target.value }))}
                      placeholder="Category"
                      className="w-24 border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                    />
                    <input
                      type="number"
                      value={itemForm.price}
                      onChange={(e) => setItemForm((f) => ({ ...f, price: e.target.value }))}
                      placeholder="Price"
                      className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                    />
                    <button
                      onClick={() => submitItem(outlet.id)}
                      disabled={!itemForm.name.trim()}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                  <button onClick={() => setManagingOutletId(null)} className="text-xs font-semibold text-gray-500 hover:text-gray-700 pt-1">
                    Done
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setManagingOutletId(outlet.id)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 mt-3"
                >
                  Manage menu ({items.length} item{items.length === 1 ? "" : "s"})
                </button>
              )}
            </div>
          );
        })}
        {outlets.length === 0 && <p className="text-sm text-gray-400">No outlets yet.</p>}
      </div>

      {isAddOutletOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsAddOutletOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Add Outlet</h2>
              <button onClick={() => setIsAddOutletOpen(false)} className="p-1 rounded-full hover:bg-gray-100 text-gray-500">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <Field2 label="Outlet Name" value={outletForm.name} onChange={(v) => setOutletForm((f) => ({ ...f, name: v }))} placeholder="Pool Bar" />
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Type</label>
                <select
                  value={outletForm.type}
                  onChange={(e) => setOutletForm((f) => ({ ...f, type: e.target.value as Outlet["type"] }))}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="RESTAURANT">Restaurant</option>
                  <option value="BAR">Bar</option>
                  <option value="CLUB">Club</option>
                  <option value="SPA">Spa</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100 bg-gray-50">
              <Button variant="outline" className="flex-1 justify-center" onClick={() => setIsAddOutletOpen(false)}>
                Cancel
              </Button>
              <button
                onClick={submitOutlet}
                disabled={isSaving || !outletForm.name.trim()}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white rounded-xl font-bold text-xs px-6 py-2.5 hover:bg-blue-700 disabled:opacity-50"
              >
                {isSaving && <Loader2 size={14} className="animate-spin" />}
                Add Outlet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ErrorBanner({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
      <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
      <span>{text}</span>
    </div>
  );
}

function Field2({
  label,
  value,
  onChange,
  placeholder,
  textarea,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  textarea?: boolean;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-500 uppercase">{label}</label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          placeholder={placeholder}
          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      )}
    </div>
  );
}
