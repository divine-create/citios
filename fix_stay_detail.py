import sys

with open('components/cityos/CityStayDetail.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

good = ''''use client';

import { useState } from 'react';
import Link from 'next/link';
import { BedDouble, ArrowLeft, CheckCircle } from 'lucide-react';
import { initiateCheckout } from '@/app/actions/payment';

export default function CityStayDetail({ org, rooms }: { org: any, rooms: any[] }) {
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guestName, setGuestName] = useState('John Doe'); // Default for now
  const [loadingRoomId, setLoadingRoomId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  async function handleBook(room: any) {
    if (!checkIn || !checkOut) {
      setMessage('Please select check-in and check-out dates.');
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
           qty: room.baseRate, // Simplification for payment payload
           name: guestName,
           // @ts-ignore
           organizationId: org.id,
           checkInDate: checkIn,
           checkOutDate: checkOut
        }],
      });
      if (res.error) setMessage(res.error);
      else if (res.redirectUrl) window.location.href = res.redirectUrl;
      else if (res.authorizationUrl) window.location.href = res.authorizationUrl;
    } catch (e: any) {
      setMessage(e.message || 'Payment failed');
    }
    setLoadingRoomId(null);
  }

  if (!org) return <div>Hotel not found</div>;

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
        <h2 className="font-bold text-ink">Your Stay</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Check-in</label>
            <input type="date" className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium" value={checkIn} onChange={e => setCheckIn(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Check-out</label>
            <input type="date" className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium" value={checkOut} onChange={e => setCheckOut(e.target.value)} />
          </div>
        </div>
        {message && <div className="text-red-500 text-sm font-bold">{message}</div>}
      </div>

      <div className="space-y-4">
        <h2 className="font-bold text-ink text-lg">Available Rooms</h2>
        {rooms.map(r => (
          <div key={r.id} className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="font-black text-ink">{r.type} Room</p>
              <p className="text-xs text-slate-500 mt-1 font-medium">Room {r.roomNumber}</p>
              <p className="text-sm font-black text-teal-800 mt-2">?{r.baseRate.toLocaleString()} / night</p>
            </div>
            <button
              disabled={loadingRoomId === r.id}
              onClick={() => handleBook(r)}
              className="w-full sm:w-auto px-6 py-2.5 bg-ink text-white rounded-xl text-xs font-black hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {loadingRoomId === r.id ? 'Booking...' : 'Book Room'}
            </button>
          </div>
        ))}
        {rooms.length === 0 && (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <p className="text-sm font-bold text-slate-500">No rooms available</p>
          </div>
        )}
      </div>
    </div>
  );
}'''
with open('components/cityos/CityStayDetail.tsx', 'w', encoding='utf-8') as f:
    f.write(good)
