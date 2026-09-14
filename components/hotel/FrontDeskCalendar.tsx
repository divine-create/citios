"use client";

import React, { useMemo, useState } from 'react';
import {
  Calendar,
  Search,
  Filter,
  User,
  CheckCircle,
  LogOut,
  Clock,
  X,
  MoreVertical,
  BedDouble,
  Loader2,
  AlertCircle,
  Ban,
  Wallet,
  Receipt,
} from 'lucide-react';
import { Button } from '@/components/Shared';
import {
  addFolioCharge,
  createReservation,
  extendReservationStay,
  getFolio,
  getHotelAdminData,
  settleFolio,
  updateReservationStatus,
} from '@/lib/actions/hotel';

type Room = {
  id: string;
  roomNumber: string;
  type: string;
  status: string; // CLEAN | DIRTY | INSPECTING | OUT_OF_ORDER
};

type ReservationStatus = 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED';

type Reservation = {
  id: string;
  guestName: string;
  roomId: string | null;
  status: ReservationStatus;
  checkInDate: string;
  checkOutDate: string;
};

type FolioCategory = 'ROOM' | 'FOOD_AND_BEVERAGE' | 'SPA' | 'OTHER';

type FolioCharge = {
  id: string;
  description: string;
  amount: number;
  category: FolioCategory;
};

type Folio = {
  charges: FolioCharge[];
  roomCharge: number;
  extrasTotal: number;
  grandTotal: number;
  reservation: { paymentStatus: string };
};

interface FrontDeskCalendarProps {
  organizationId: string | null;
  initialRooms: Room[];
  initialReservations: Reservation[];
}

const STATUS_FILTERS: { value: ReservationStatus; label: string }[] = [
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'CHECKED_IN', label: 'Checked In' },
  { value: 'CHECKED_OUT', label: 'Checked Out' },
];

const generateDates = (startDate: Date, days: number) => {
  const dates = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    dates.push(date);
  }
  return dates;
};

const dateOnly = (d: Date) => {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

export default function FrontDeskCalendar({ organizationId, initialRooms, initialReservations }: FrontDeskCalendarProps) {
  const [rooms, setRooms] = useState<Room[]>(initialRooms);
  const [reservations, setReservations] = useState<Reservation[]>(initialReservations);

  const [currentDate, setCurrentDate] = useState(() => {
    const d = dateOnly(new Date());
    d.setDate(d.getDate() - 3);
    return d;
  });
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [visibleStatuses, setVisibleStatuses] = useState<Set<ReservationStatus>>(
    new Set(['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'])
  );

  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
  const [bookingForm, setBookingForm] = useState({ guestName: '', roomId: '', checkInDate: '', checkOutDate: '' });
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);

  const [isExtendOpen, setIsExtendOpen] = useState(false);
  const [extendDate, setExtendDate] = useState('');
  const [extendError, setExtendError] = useState<string | null>(null);
  const [isExtending, setIsExtending] = useState(false);

  const [isMoreOptionsOpen, setIsMoreOptionsOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const [folio, setFolio] = useState<Folio | null>(null);
  const [isAddChargeOpen, setIsAddChargeOpen] = useState(false);
  const [chargeForm, setChargeForm] = useState({ description: '', amount: '', category: 'OTHER' as FolioCategory });
  const [folioError, setFolioError] = useState<string | null>(null);
  const [isSavingCharge, setIsSavingCharge] = useState(false);
  const [isSettling, setIsSettling] = useState(false);

  const dates = generateDates(currentDate, 14);

  const visibleReservations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return reservations.filter((r) => {
      if (r.status === 'CANCELLED') return false;
      if (!visibleStatuses.has(r.status)) return false;
      if (query && !r.guestName.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [reservations, visibleStatuses, searchQuery]);

  const getReservationForRoomAndDate = (roomId: string, date: Date) => {
    const target = date.getTime();
    return visibleReservations.find((res) => {
      if (res.roomId !== roomId) return false;
      const checkInDate = new Date(res.checkInDate).getTime();
      const checkOutDate = new Date(res.checkOutDate).getTime();
      return target >= checkInDate && target < checkOutDate;
    });
  };

  const refreshData = async (reservationIdToReselect?: string) => {
    const data = await getHotelAdminData();
    if (!data) return;
    setRooms(data.rooms);
    setReservations(data.reservations);
    if (reservationIdToReselect) {
      const updated = data.reservations.find((r: Reservation) => r.id === reservationIdToReselect);
      if (updated) setSelectedReservation(updated);
    }
  };

  const handleReservationClick = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setIsSidebarOpen(true);
    setActionError(null);
    setIsMoreOptionsOpen(false);
    setIsExtendOpen(false);
    setFolioError(null);
    setFolio(null);
    getFolio(reservation.id).then((f) => setFolio(f));
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
    setIsMoreOptionsOpen(false);
    setIsExtendOpen(false);
    setIsAddChargeOpen(false);
    setTimeout(() => {
      setSelectedReservation(null);
      setFolio(null);
    }, 300);
  };

  const refreshFolio = async (reservationId: string) => {
    setFolio(await getFolio(reservationId));
  };

  const submitAddCharge = async () => {
    if (!selectedReservation) return;
    setFolioError(null);
    setIsSavingCharge(true);
    try {
      const result = await addFolioCharge({
        reservationId: selectedReservation.id,
        description: chargeForm.description,
        amount: parseFloat(chargeForm.amount) || 0,
        category: chargeForm.category,
      });
      if (result?.error) {
        setFolioError(result.error);
        return;
      }
      setIsAddChargeOpen(false);
      setChargeForm({ description: '', amount: '', category: 'OTHER' });
      await refreshFolio(selectedReservation.id);
    } finally {
      setIsSavingCharge(false);
    }
  };

  const handleSettleFolio = async () => {
    if (!selectedReservation) return;
    setFolioError(null);
    setIsSettling(true);
    try {
      const result = await settleFolio(selectedReservation.id);
      if (result?.error) {
        setFolioError(result.error);
        return;
      }
      await refreshFolio(selectedReservation.id);
      await refreshData(selectedReservation.id);
    } finally {
      setIsSettling(false);
    }
  };

  const getStatusColor = (status: ReservationStatus) => {
    switch (status) {
      case 'CONFIRMED': return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'CHECKED_IN': return 'bg-green-100 border-green-300 text-green-800';
      case 'CHECKED_OUT': return 'bg-gray-100 border-gray-300 text-gray-800';
      case 'CANCELLED': return 'bg-red-100 border-red-300 text-red-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const getRoomStatusColor = (status: string) => {
    switch (status) {
      case 'CLEAN': return 'bg-green-500';
      case 'DIRTY': return 'bg-orange-500';
      case 'INSPECTING': return 'bg-blue-500';
      case 'OUT_OF_ORDER': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const shiftDates = (days: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + days);
    setCurrentDate(newDate);
  };

  const toggleStatusFilter = (status: ReservationStatus) => {
    setVisibleStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  };

  const openNewBooking = () => {
    setBookingForm({ guestName: '', roomId: rooms[0]?.id ?? '', checkInDate: '', checkOutDate: '' });
    setBookingError(null);
    setIsNewBookingOpen(true);
  };

  const submitNewBooking = async () => {
    if (!organizationId) return;
    setBookingError(null);
    setIsSubmittingBooking(true);
    try {
      const result = await createReservation({
        organizationId,
        roomId: bookingForm.roomId,
        guestName: bookingForm.guestName,
        checkInDate: bookingForm.checkInDate,
        checkOutDate: bookingForm.checkOutDate,
      });
      if (result?.error) {
        setBookingError(result.error);
        return;
      }
      setIsNewBookingOpen(false);
      await refreshData();
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  const runReservationAction = async (
    action: 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED',
    label: string
  ) => {
    if (!selectedReservation) return;
    setActionError(null);
    setPendingAction(label);
    try {
      const result = await updateReservationStatus(selectedReservation.id, action);
      if (result?.error) {
        setActionError(result.error);
        return;
      }
      setIsMoreOptionsOpen(false);
      if (action === 'CANCELLED') {
        closeSidebar();
        await refreshData();
      } else {
        await refreshData(selectedReservation.id);
      }
    } finally {
      setPendingAction(null);
    }
  };

  const openExtendStay = () => {
    if (!selectedReservation) return;
    const currentCheckOut = new Date(selectedReservation.checkOutDate);
    currentCheckOut.setDate(currentCheckOut.getDate() + 1);
    setExtendDate(currentCheckOut.toISOString().split('T')[0]);
    setExtendError(null);
    setIsExtendOpen(true);
  };

  const submitExtendStay = async () => {
    if (!selectedReservation) return;
    setExtendError(null);
    setIsExtending(true);
    try {
      const result = await extendReservationStay(selectedReservation.id, extendDate);
      if (result?.error) {
        setExtendError(result.error);
        return;
      }
      setIsExtendOpen(false);
      await refreshData(selectedReservation.id);
    } finally {
      setIsExtending(false);
    }
  };

  const canManage = selectedReservation && selectedReservation.status !== 'CHECKED_OUT' && selectedReservation.status !== 'CANCELLED';

  return (
    <div className="flex flex-col h-full bg-gray-50 font-sans min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center space-x-4">
          <div className="bg-blue-600 p-2 rounded-lg text-white">
            <BedDouble size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Front Desk Portal</h1>
            <p className="text-sm text-gray-500">CityConnect Hotel Management</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reservations..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm w-64"
            />
          </div>

          <div className="relative">
            <button
              onClick={() => setIsFilterOpen((v) => !v)}
              className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm font-medium transition-colors"
            >
              <Filter size={16} className="mr-2" />
              Filter
              {visibleStatuses.size < STATUS_FILTERS.length && (
                <span className="ml-2 bg-blue-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {visibleStatuses.size}
                </span>
              )}
            </button>
            {isFilterOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setIsFilterOpen(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-30 p-3">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Show statuses</p>
                  {STATUS_FILTERS.map((f) => (
                    <label key={f.value} className="flex items-center gap-2 py-1.5 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={visibleStatuses.has(f.value)}
                        onChange={() => toggleStatusFilter(f.value)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      {f.label}
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>

          <button
            onClick={openNewBooking}
            disabled={!organizationId}
            className="flex items-center px-4 py-2 bg-blue-600 border border-transparent rounded-md text-white hover:bg-blue-700 text-sm font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Calendar size={16} className="mr-2" />
            New Booking
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">

        {/* Calendar View */}
        <div className="flex-1 flex flex-col overflow-hidden relative">

          {/* Calendar Controls */}
          <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <button onClick={() => shiftDates(-7)} className="p-1.5 rounded hover:bg-gray-100 text-gray-600 border border-gray-200 shadow-sm">&larr;</button>
              <button onClick={() => shiftDates(7)} className="p-1.5 rounded hover:bg-gray-100 text-gray-600 border border-gray-200 shadow-sm">&rarr;</button>
              <span className="text-sm font-semibold text-gray-700 ml-4">
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
            </div>
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-blue-400 mr-2"></span> Confirmed</div>
              <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-green-400 mr-2"></span> Checked In</div>
              <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-gray-400 mr-2"></span> Checked Out</div>
            </div>
          </div>

          {/* Timeline Grid */}
          <div className="flex-1 overflow-auto bg-white">
            {rooms.length === 0 ? (
              <div className="p-10 text-center text-gray-400">
                <BedDouble size={48} className="mx-auto mb-4 opacity-20" />
                <p>No rooms found for this hotel yet.</p>
              </div>
            ) : (
              <div className="min-w-max">
                {/* Dates Header */}
                <div className="flex sticky top-0 z-10 bg-white border-b border-gray-200">
                  <div className="w-48 flex-shrink-0 border-r border-gray-200 bg-gray-50 p-4 font-semibold text-gray-600 text-sm sticky left-0 z-20">
                    Rooms
                  </div>
                  {dates.map((date, i) => (
                    <div key={i} className="w-24 flex-shrink-0 border-r border-gray-200 p-2 text-center">
                      <div className="text-xs text-gray-500 font-medium">{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                      <div className="text-lg font-bold text-gray-800">{date.getDate()}</div>
                    </div>
                  ))}
                </div>

                {/* Room Rows */}
                <div className="relative">
                  {rooms.map((room) => (
                    <div key={room.id} className="flex border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      {/* Room Info */}
                      <div className="w-48 flex-shrink-0 border-r border-gray-200 bg-white p-3 sticky left-0 z-10 flex flex-col justify-center shadow-[1px_0_5px_rgba(0,0,0,0.05)]">
                        <div className="font-bold text-gray-800">Room {room.roomNumber}</div>
                        <div className="text-xs text-gray-500">{room.type}</div>
                        <div className="mt-1 flex items-center">
                          <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${getRoomStatusColor(room.status)}`}></span>
                          <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">{room.status}</span>
                        </div>
                      </div>

                      {/* Timeline Cells */}
                      <div className="flex relative">
                        {dates.map((date, i) => {
                          const reservation = getReservationForRoomAndDate(room.id, date);
                          const checkInDate = reservation ? dateOnly(new Date(reservation.checkInDate)) : null;
                          const isCheckInDay = reservation && checkInDate && checkInDate.getTime() === dateOnly(date).getTime();

                          let blockWidth = 0;
                          if (isCheckInDay && reservation) {
                            const checkOut = new Date(reservation.checkOutDate);
                            const diffTime = Math.abs(checkOut.getTime() - (checkInDate as Date).getTime());
                            const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
                            blockWidth = diffDays * 96; // 96px is w-24
                          }

                          return (
                            <div key={i} className="w-24 flex-shrink-0 border-r border-gray-100 h-20 relative p-1 group">
                              {isCheckInDay && reservation && (
                                <div
                                  onClick={() => handleReservationClick(reservation)}
                                  className={`absolute top-2 bottom-2 left-1 rounded-md border shadow-sm p-2 flex flex-col justify-between cursor-pointer transition-all hover:shadow-md hover:brightness-95 z-10 overflow-hidden ${getStatusColor(reservation.status)}`}
                                  style={{ width: `calc(${blockWidth}px - 0.5rem)` }}
                                >
                                  <div className="text-sm font-bold truncate">{reservation.guestName}</div>
                                  <div className="text-xs opacity-80 flex items-center justify-between">
                                    <span className="truncate">{reservation.status.replace('_', ' ')}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Sidebar (Slide-in) */}
        <div className={`w-96 bg-white border-l border-gray-200 shadow-xl flex flex-col transition-transform duration-300 ease-in-out z-20 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full absolute right-0 h-full'}`}>
          {selectedReservation ? (
            <>
              {/* Sidebar Header */}
              <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50">
                <h2 className="text-lg font-bold text-gray-800">Manage Reservation</h2>
                <button onClick={closeSidebar} className="p-1 rounded-full hover:bg-gray-200 text-gray-500 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">

                {/* Guest Info */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-xl">
                        {selectedReservation.guestName.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">{selectedReservation.guestName}</h3>
                        <p className="text-sm text-gray-500 flex items-center">
                          <User size={14} className="mr-1" /> ID: {selectedReservation.id.slice(0, 8).toUpperCase()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-semibold">Check-in</p>
                      <p className="font-medium text-gray-900 mt-1">{new Date(selectedReservation.checkInDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-semibold">Check-out</p>
                      <p className="font-medium text-gray-900 mt-1">{new Date(selectedReservation.checkOutDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-semibold">Room</p>
                      <p className="font-medium text-gray-900 mt-1">
                        {rooms.find((r) => r.id === selectedReservation.roomId)?.roomNumber} - {rooms.find((r) => r.id === selectedReservation.roomId)?.type}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-semibold">Status</p>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-bold ${getStatusColor(selectedReservation.status)}`}>
                        {selectedReservation.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Guest Folio */}
                <div>
                  <h4 className="font-bold text-gray-900 mb-3 flex items-center">
                    <Wallet className="mr-2 text-blue-600" size={18} />
                    Guest Folio
                  </h4>
                  {!folio ? (
                    <div className="flex justify-center py-6 text-gray-300">
                      <Loader2 size={20} className="animate-spin" />
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="p-4 bg-white space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">Room charge</span>
                          <span className="font-medium text-gray-900">${folio.roomCharge.toFixed(2)}</span>
                        </div>
                        {folio.charges.map((c) => (
                          <div key={c.id} className="flex justify-between items-center text-sm">
                            <span className="text-gray-600 flex items-center gap-1">
                              <Receipt size={12} className="text-gray-400" /> {c.description}
                            </span>
                            <span className="font-medium text-gray-900">${c.amount.toFixed(2)}</span>
                          </div>
                        ))}
                        <div className="h-px bg-gray-100 w-full my-2" />
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-gray-900">
                            {folio.reservation.paymentStatus === 'PAID' ? 'Total (Paid)' : 'Balance Due'}
                          </span>
                          <span
                            className={`font-bold text-lg ${
                              folio.reservation.paymentStatus === 'PAID' ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            ${folio.grandTotal.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {folioError && (
                        <div className="mx-4 mb-3 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-xs p-2 rounded-lg">
                          <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                          <span>{folioError}</span>
                        </div>
                      )}

                      <div className="bg-gray-50 p-4 border-t border-gray-100 flex gap-2">
                        <button
                          onClick={() => setIsAddChargeOpen(true)}
                          disabled={!canManage}
                          className="flex-1 bg-white border border-gray-300 text-gray-700 py-2 rounded-lg font-medium text-sm hover:bg-gray-100 transition-colors disabled:opacity-50"
                        >
                          + Add Charge
                        </button>
                        {folio.reservation.paymentStatus !== 'PAID' && folio.grandTotal > 0 && (
                          <button
                            onClick={handleSettleFolio}
                            disabled={isSettling}
                            className="flex-1 bg-black text-white py-2 rounded-lg font-medium text-sm hover:bg-gray-800 transition-colors flex items-center justify-center disabled:opacity-50"
                          >
                            {isSettling ? <Loader2 size={16} className="animate-spin" /> : <Wallet size={16} className="mr-2" />}
                            Settle Folio
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {actionError && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
                    <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                    <span>{actionError}</span>
                  </div>
                )}

                {/* Quick Actions */}
                <div>
                  <h4 className="font-bold text-gray-900 mb-3">Actions</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedReservation.status === 'CONFIRMED' && (
                      <button
                        onClick={() => runReservationAction('CHECKED_IN', 'checkin')}
                        disabled={pendingAction === 'checkin'}
                        className="flex flex-col items-center justify-center p-3 border border-green-200 bg-green-50 text-green-700 rounded-xl hover:bg-green-100 transition-colors disabled:opacity-60"
                      >
                        {pendingAction === 'checkin' ? <Loader2 size={20} className="mb-1 animate-spin" /> : <CheckCircle size={20} className="mb-1" />}
                        <span className="text-sm font-medium">Check In</span>
                      </button>
                    )}

                    {selectedReservation.status === 'CHECKED_IN' && (
                      <button
                        onClick={() => runReservationAction('CHECKED_OUT', 'checkout')}
                        disabled={pendingAction === 'checkout'}
                        className="flex flex-col items-center justify-center p-3 border border-orange-200 bg-orange-50 text-orange-700 rounded-xl hover:bg-orange-100 transition-colors disabled:opacity-60"
                      >
                        {pendingAction === 'checkout' ? <Loader2 size={20} className="mb-1 animate-spin" /> : <LogOut size={20} className="mb-1" />}
                        <span className="text-sm font-medium">Check Out</span>
                      </button>
                    )}

                    <button
                      onClick={openExtendStay}
                      disabled={!canManage}
                      className="flex flex-col items-center justify-center p-3 border border-gray-200 bg-white text-gray-700 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Clock size={20} className="mb-1" />
                      <span className="text-sm font-medium">Extend Stay</span>
                    </button>

                    <div className="relative">
                      <button
                        onClick={() => setIsMoreOptionsOpen((v) => !v)}
                        disabled={!canManage}
                        className="w-full flex flex-col items-center justify-center p-3 border border-gray-200 bg-white text-gray-700 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <MoreVertical size={20} className="mb-1" />
                        <span className="text-sm font-medium">More Options</span>
                      </button>
                      {isMoreOptionsOpen && (
                        <>
                          <div className="fixed inset-0 z-20" onClick={() => setIsMoreOptionsOpen(false)} />
                          <div className="absolute left-0 bottom-full mb-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-30 py-1">
                            <button
                              onClick={() => runReservationAction('CANCELLED', 'cancel')}
                              disabled={pendingAction === 'cancel'}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-60"
                            >
                              {pendingAction === 'cancel' ? <Loader2 size={16} className="animate-spin" /> : <Ban size={16} />}
                              Cancel Reservation
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 p-6 text-center">
              <div>
                <Calendar size={48} className="mx-auto mb-4 opacity-20" />
                <p>Select a reservation from the calendar to view details and manage check-in/out.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Booking Modal */}
      {isNewBookingOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsNewBookingOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">New Booking</h2>
              <button onClick={() => setIsNewBookingOpen(false)} className="p-1 rounded-full hover:bg-gray-100 text-gray-500">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {bookingError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <span>{bookingError}</span>
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Guest Name</label>
                <input
                  type="text"
                  value={bookingForm.guestName}
                  onChange={(e) => setBookingForm((f) => ({ ...f, guestName: e.target.value }))}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Jane Doe"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Room</label>
                <select
                  value={bookingForm.roomId}
                  onChange={(e) => setBookingForm((f) => ({ ...f, roomId: e.target.value }))}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>Room {r.roomNumber} — {r.type}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Check-in</label>
                  <input
                    type="date"
                    value={bookingForm.checkInDate}
                    onChange={(e) => setBookingForm((f) => ({ ...f, checkInDate: e.target.value }))}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Check-out</label>
                  <input
                    type="date"
                    value={bookingForm.checkOutDate}
                    onChange={(e) => setBookingForm((f) => ({ ...f, checkOutDate: e.target.value }))}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100 bg-gray-50">
              <Button variant="outline" className="flex-1 justify-center" onClick={() => setIsNewBookingOpen(false)}>
                Cancel
              </Button>
              <button
                onClick={submitNewBooking}
                disabled={isSubmittingBooking || !bookingForm.guestName || !bookingForm.roomId || !bookingForm.checkInDate || !bookingForm.checkOutDate}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white rounded-xl font-bold text-xs px-6 py-2.5 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmittingBooking && <Loader2 size={14} className="animate-spin" />}
                Create Booking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extend Stay Modal */}
      {isExtendOpen && selectedReservation && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsExtendOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Extend Stay</h2>
              <button onClick={() => setIsExtendOpen(false)} className="p-1 rounded-full hover:bg-gray-100 text-gray-500">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-500">
                Current check-out: <span className="font-semibold text-gray-800">{new Date(selectedReservation.checkOutDate).toLocaleDateString()}</span>
              </p>
              {extendError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <span>{extendError}</span>
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">New Check-out Date</label>
                <input
                  type="date"
                  value={extendDate}
                  onChange={(e) => setExtendDate(e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100 bg-gray-50">
              <Button variant="outline" className="flex-1 justify-center" onClick={() => setIsExtendOpen(false)}>
                Cancel
              </Button>
              <button
                onClick={submitExtendStay}
                disabled={isExtending || !extendDate}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white rounded-xl font-bold text-xs px-6 py-2.5 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExtending && <Loader2 size={14} className="animate-spin" />}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Folio Charge Modal */}
      {isAddChargeOpen && selectedReservation && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsAddChargeOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Add Charge</h2>
              <button onClick={() => setIsAddChargeOpen(false)} className="p-1 rounded-full hover:bg-gray-100 text-gray-500">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {folioError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <span>{folioError}</span>
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Description</label>
                <input
                  value={chargeForm.description}
                  onChange={(e) => setChargeForm((f) => ({ ...f, description: e.target.value }))}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Minibar, late checkout fee..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Amount</label>
                  <input
                    type="number"
                    value={chargeForm.amount}
                    onChange={(e) => setChargeForm((f) => ({ ...f, amount: e.target.value }))}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="25.00"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Category</label>
                  <select
                    value={chargeForm.category}
                    onChange={(e) => setChargeForm((f) => ({ ...f, category: e.target.value as FolioCategory }))}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="OTHER">Other</option>
                    <option value="FOOD_AND_BEVERAGE">Food & Beverage</option>
                    <option value="SPA">Spa</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100 bg-gray-50">
              <Button variant="outline" className="flex-1 justify-center" onClick={() => setIsAddChargeOpen(false)}>
                Cancel
              </Button>
              <button
                onClick={submitAddCharge}
                disabled={isSavingCharge || !chargeForm.description.trim() || !chargeForm.amount}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white rounded-xl font-bold text-xs px-6 py-2.5 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSavingCharge && <Loader2 size={14} className="animate-spin" />}
                Add Charge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
