"use client";

import React, { useState } from 'react';
import { 
  Calendar, 
  Search, 
  Filter, 
  User, 
  CreditCard, 
  CheckCircle, 
  LogOut, 
  Clock, 
  X,
  Wallet,
  MoreVertical,
  BedDouble
} from 'lucide-react';

type Room = {
  id: string;
  number: string;
  type: string;
  status: 'CLEAN' | 'DIRTY' | 'MAINTENANCE';
};

type Reservation = {
  id: string;
  guestName: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  status: 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT';
  paymentStatus: 'PAID' | 'PENDING' | 'DEPOSIT_PAID';
  totalAmount: number;
  balanceDue: number;
};

const MOCK_ROOMS: Room[] = [
  { id: 'r1', number: '101', type: 'Standard Queen', status: 'CLEAN' },
  { id: 'r2', number: '102', type: 'Standard Queen', status: 'DIRTY' },
  { id: 'r3', number: '103', type: 'Deluxe King', status: 'CLEAN' },
  { id: 'r4', number: '104', type: 'Deluxe King', status: 'MAINTENANCE' },
  { id: 'r5', number: '201', type: 'Executive Suite', status: 'CLEAN' },
  { id: 'r6', number: '202', type: 'Executive Suite', status: 'CLEAN' },
  { id: 'r7', number: '203', type: 'Penthouse', status: 'CLEAN' },
];

const MOCK_RESERVATIONS: Reservation[] = [
  { id: 'res1', guestName: 'Alice Johnson', roomId: 'r1', checkIn: '2026-08-28', checkOut: '2026-08-31', status: 'CHECKED_IN', paymentStatus: 'PAID', totalAmount: 450, balanceDue: 0 },
  { id: 'res2', guestName: 'Bob Smith', roomId: 'r3', checkIn: '2026-08-29', checkOut: '2026-09-02', status: 'CONFIRMED', paymentStatus: 'DEPOSIT_PAID', totalAmount: 800, balanceDue: 400 },
  { id: 'res3', guestName: 'Carol White', roomId: 'r5', checkIn: '2026-08-27', checkOut: '2026-08-29', status: 'CHECKED_OUT', paymentStatus: 'PAID', totalAmount: 600, balanceDue: 0 },
  { id: 'res4', guestName: 'David Brown', roomId: 'r6', checkIn: '2026-08-30', checkOut: '2026-09-04', status: 'CONFIRMED', paymentStatus: 'PENDING', totalAmount: 1200, balanceDue: 1200 },
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

export default function FrontDeskCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date('2026-08-27T00:00:00'));
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const dates = generateDates(currentDate, 14);

  const getReservationForRoomAndDate = (roomId: string, date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return MOCK_RESERVATIONS.find(res => {
      const checkInDate = new Date(res.checkIn).getTime();
      const checkOutDate = new Date(res.checkOut).getTime();
      const currentDate = date.getTime();
      return res.roomId === roomId && currentDate >= checkInDate && currentDate < checkOutDate;
    });
  };

  const handleReservationClick = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setIsSidebarOpen(true);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
    setTimeout(() => setSelectedReservation(null), 300);
  };

  const getStatusColor = (status: Reservation['status']) => {
    switch (status) {
      case 'CONFIRMED': return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'CHECKED_IN': return 'bg-green-100 border-green-300 text-green-800';
      case 'CHECKED_OUT': return 'bg-gray-100 border-gray-300 text-gray-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const shiftDates = (days: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + days);
    setCurrentDate(newDate);
  };

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
              placeholder="Search reservations..." 
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm w-64"
            />
          </div>
          <button className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm font-medium transition-colors">
            <Filter size={16} className="mr-2" />
            Filter
          </button>
          <button className="flex items-center px-4 py-2 bg-blue-600 border border-transparent rounded-md text-white hover:bg-blue-700 text-sm font-medium transition-colors shadow-sm">
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
                {MOCK_ROOMS.map((room) => (
                  <div key={room.id} className="flex border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    {/* Room Info */}
                    <div className="w-48 flex-shrink-0 border-r border-gray-200 bg-white p-3 sticky left-0 z-10 flex flex-col justify-center shadow-[1px_0_5px_rgba(0,0,0,0.05)]">
                      <div className="font-bold text-gray-800">Room {room.number}</div>
                      <div className="text-xs text-gray-500">{room.type}</div>
                      <div className="mt-1 flex items-center">
                        <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${
                          room.status === 'CLEAN' ? 'bg-green-500' : 
                          room.status === 'DIRTY' ? 'bg-orange-500' : 'bg-red-500'
                        }`}></span>
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">{room.status}</span>
                      </div>
                    </div>

                    {/* Timeline Cells */}
                    <div className="flex relative">
                      {dates.map((date, i) => {
                        const dateStr = date.toISOString().split('T')[0];
                        const reservation = getReservationForRoomAndDate(room.id, date);
                        
                        // Only render the block on the check-in day to span across
                        const isCheckInDay = reservation && reservation.checkIn === dateStr;
                        
                        // Calculate width based on stay duration if it's the check-in day
                        let blockWidth = 0;
                        if (isCheckInDay) {
                          const checkInDate = new Date(reservation.checkIn);
                          const checkOutDate = new Date(reservation.checkOut);
                          const diffTime = Math.abs(checkOutDate.getTime() - checkInDate.getTime());
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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
                                  {reservation.paymentStatus !== 'PAID' && (
                                    <span className="bg-white text-red-600 bg-opacity-80 px-1 rounded text-[10px] font-bold">DUE</span>
                                  )}
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
                          <User size={14} className="mr-1" /> ID: {selectedReservation.id.toUpperCase()}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-semibold">Check-in</p>
                      <p className="font-medium text-gray-900 mt-1">{new Date(selectedReservation.checkIn).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-semibold">Check-out</p>
                      <p className="font-medium text-gray-900 mt-1">{new Date(selectedReservation.checkOut).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-semibold">Room</p>
                      <p className="font-medium text-gray-900 mt-1">{MOCK_ROOMS.find(r => r.id === selectedReservation.roomId)?.number} - {MOCK_ROOMS.find(r => r.id === selectedReservation.roomId)?.type}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-semibold">Status</p>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-bold ${getStatusColor(selectedReservation.status)}`}>
                        {selectedReservation.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* CityWallet Payment Section */}
                <div>
                  <h4 className="font-bold text-gray-900 mb-3 flex items-center">
                    <Wallet className="mr-2 text-blue-600" size={18} />
                    CityWallet Billing
                  </h4>
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="p-4 bg-white">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-600">Total Amount</span>
                        <span className="font-medium text-gray-900">${selectedReservation.totalAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-gray-600">Amount Paid</span>
                        <span className="font-medium text-green-600">${(selectedReservation.totalAmount - selectedReservation.balanceDue).toFixed(2)}</span>
                      </div>
                      <div className="h-px bg-gray-100 w-full mb-4"></div>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-gray-900">Balance Due</span>
                        <span className="font-bold text-red-600 text-lg">${selectedReservation.balanceDue.toFixed(2)}</span>
                      </div>
                    </div>
                    
                    {selectedReservation.balanceDue > 0 && (
                      <div className="bg-gray-50 p-4 border-t border-gray-100 flex gap-2">
                        <button className="flex-1 bg-black text-white py-2 rounded-lg font-medium text-sm hover:bg-gray-800 transition-colors flex items-center justify-center">
                          <Wallet size={16} className="mr-2" /> Pay with CityWallet
                        </button>
                        <button className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100">
                          <CreditCard size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                <div>
                  <h4 className="font-bold text-gray-900 mb-3">Actions</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedReservation.status === 'CONFIRMED' && (
                      <button className="flex flex-col items-center justify-center p-3 border border-green-200 bg-green-50 text-green-700 rounded-xl hover:bg-green-100 transition-colors">
                        <CheckCircle size={20} className="mb-1" />
                        <span className="text-sm font-medium">Check In</span>
                      </button>
                    )}
                    
                    {selectedReservation.status === 'CHECKED_IN' && (
                      <button className="flex flex-col items-center justify-center p-3 border border-orange-200 bg-orange-50 text-orange-700 rounded-xl hover:bg-orange-100 transition-colors">
                        <LogOut size={20} className="mb-1" />
                        <span className="text-sm font-medium">Check Out</span>
                      </button>
                    )}

                    <button className="flex flex-col items-center justify-center p-3 border border-gray-200 bg-white text-gray-700 rounded-xl hover:bg-gray-50 transition-colors">
                      <Clock size={20} className="mb-1" />
                      <span className="text-sm font-medium">Extend Stay</span>
                    </button>
                    
                    <button className="flex flex-col items-center justify-center p-3 border border-gray-200 bg-white text-gray-700 rounded-xl hover:bg-gray-50 transition-colors">
                      <MoreVertical size={20} className="mb-1" />
                      <span className="text-sm font-medium">More Options</span>
                    </button>
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
    </div>
  );
}
