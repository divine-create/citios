'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BedDouble, ArrowLeft, User } from 'lucide-react';
import { initiateCheckout } from '@/app/actions/payment';

export default function CityStayDetail({ org, rooms }: { org: any, rooms: any[] }) {
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guestName, setGuestName] = useState('');
  const [loadingRoomId, setLoadingRoomId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  async function handleBook(room: any) {
    if (!guestName.trim()) {
      setMessage('Please enter the guest name.');
      return;
    }
    if (!checkIn || !checkOut) {
      setMessage('Please select your check-in and check-out dates.');
      return;
    }
    if (new Date(checkOut) <= new Date(checkIn)) {
      setMessage('Check-out must be after check-in.');
      return;
    }
    setLoadingRoomId(room.id);
    setMessage('');
    try {
      const res = await initiateCheckout({
        kind: 'hotel',
        method: 'wallet',
        items: [{
           productId: room.id,
           qty: room.baseRate,
           name: guestName,
           // @ts-ignore
           organizationId: org.id,
           checkInDate: checkIn,
           checkOutDate: checkOut,
        }],
      });
      if (res.error) setMessage(res.error);
      else if (res.redirectUrl) window.location.href = res.redirectUrl;
    } catch (e: any) {
      setMessage(e.message || 'Booking failed. Please try again.');
    }
    setLoadingRoomId(null);
  }

  if (!org) return (
    <div className="max-w-2xl mx-auto py-10 px-4 text-center">
      <p className="text-sm text-slate-500 font-bold">Hotel not found.</p>
      <Link href="/stay" className="mt-4 inline-block text-sm font-bold text-teal-700 hover:underline">
        ← Back to Hotels
      </Link>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto py-10 space-y-8 px-4 animate-in fade-in duration-500">
      <Link href="/stay" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-ink transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Hotels
      </Link>
      
      <div>
        <h1 className="text-3xl font-black text-ink">{org.name}</h1>
        <p className="text-sm text-slate-500 mt-2">{org.description}</p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
        <h2 className="font-bold text-ink">Your Stay Details</h2>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase">Guest Name</label>
          <div className="relative mt-1">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Full name of the guest"
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium placeholder:text-slate-400"
              value={guestName}
              onChange={e => setGuestName(e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Check-in</label>
            <input
              type="date"
              className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
              value={checkIn}
              onChange={e => setCheckIn(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Check-out</label>
            <input
              type="date"
              className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
              value={checkOut}
              onChange={e => setCheckOut(e.target.value)}
            />
          </div>
        </div>
        {message && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm font-bold">
            <span>⚠</span>
            <span>{message}</span>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="font-bold text-ink text-lg">Available Rooms</h2>
        {rooms.map(r => (
          <div key={r.id} className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="font-black text-ink">{r.type} Room</p>
              <p className="text-xs text-slate-500 mt-1 font-medium">Room {r.roomNumber}</p>
              <p className="text-sm font-black text-teal-800 mt-2">₦{r.baseRate.toLocaleString()} / night</p>
            </div>
            <button
              disabled={loadingRoomId === r.id}
              onClick={() => handleBook(r)}
              className="w-full sm:w-auto px-6 py-2.5 bg-ink text-white rounded-xl text-xs font-black hover:bg-slate-800 transition-colors disabled:opacity-50 active:scale-95"
            >
              {loadingRoomId === r.id ? 'Booking…' : 'Book Room'}
            </button>
          </div>
        ))}
        {rooms.length === 0 && (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <BedDouble className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-500">No rooms available at this time</p>
            <p className="text-xs text-slate-400 mt-1">Check back later or explore other hotels.</p>
          </div>
        )}
      </div>
    </div>
  );
}