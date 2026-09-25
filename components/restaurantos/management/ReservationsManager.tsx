'use client';

import React, { useState } from 'react';
import { Button, Input, Badge } from '@/components/ui';
import { Plus, CalendarDays, Users, Phone, Clock, FileText, CheckCircle, Ban, Armchair } from 'lucide-react';
import { createReservation, updateReservationStatus } from '@/lib/actions/restaurantos';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { formatDateTime } from '@/lib/utils'; // Optional if available, else I'll use toLocaleString

export function ReservationsManager({
  organizationId,
  locationId,
  initialReservations,
  tables
}: {
  organizationId: string;
  locationId?: string;
  initialReservations: any[];
  tables: any[];
}) {
  const router = useRouter();
  const [reservations, setReservations] = useState(initialReservations);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [dateStr, setDateStr] = useState('');
  const [timeStr, setTimeStr] = useState('');
  const [tableId, setTableId] = useState('');
  const [notes, setNotes] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) return toast.error('Guest name is required');
    if (!dateStr || !timeStr) return toast.error('Date and time are required');
    
    // Construct local Date from inputs (assuming local timezone)
    const scheduledAt = new Date(`${dateStr}T${timeStr}:00`).toISOString();

    setLoading(true);
    const res = await createReservation({
      organizationId,
      locationId,
      customerName: name,
      customerPhone: phone,
      partySize,
      scheduledAt,
      tableId: tableId || undefined,
      notes
    });
    setLoading(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('Reservation booked successfully');
      setReservations([...reservations, res]);
      setIsCreating(false);
      setName('');
      setPhone('');
      setPartySize(2);
      setDateStr('');
      setTimeStr('');
      setTableId('');
      setNotes('');
      router.refresh();
    }
  };

  const handleStatusChange = async (id: string, status: 'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled') => {
    const res = await updateReservationStatus(id, status);
    if (res.error) {
      toast.error(res.error);
    } else {
      setReservations(reservations.map(r => r.id === id ? { ...r, status } : r));
      toast.success(`Reservation marked as ${status}`);
      router.refresh();
    }
  };

  // Sort by upcoming
  const sorted = [...reservations].sort((a, b) => new Date(String(a.scheduledAt)).getTime() - new Date(String(b.scheduledAt)).getTime());

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-black text-slate-800">Booking Schedule</h2>
        <Button onClick={() => setIsCreating(true)} leftIcon={<Plus size={16} />}>
          New Booking
        </Button>
      </div>

      {isCreating && (
        <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Input label="Guest Name" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Phone Number" placeholder="(555) 123-4567" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input label="Party Size" type="number" min={1} value={partySize} onChange={(e) => setPartySize(parseInt(e.target.value)||1)} />
          <Input label="Date" type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} />
          <Input label="Time" type="time" value={timeStr} onChange={(e) => setTimeStr(e.target.value)} />
          
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assign Table (Optional)</label>
            <select 
              value={tableId} onChange={(e) => setTableId(e.target.value)}
              className="w-full h-12 px-4 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">Any Available Table</option>
              {tables.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.seats} seats)</option>
              ))}
            </select>
          </div>
          
          <div className="lg:col-span-2">
            <Input label="Special Notes" placeholder="Allergies, anniversaries..." value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="col-span-full flex gap-2 justify-end mt-2">
            <Button variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
            <Button onClick={handleCreate} isLoading={loading}>Confirm Booking</Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {sorted.filter(r => ['pending', 'confirmed', 'seated'].includes(r.status)).map(r => (
            <div key={r.id} className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-sm">
              <div className="flex gap-4 items-start">
                <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <CalendarDays size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">{r.customerName || 'Walk-in Guest'}</h3>
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-[13px] text-slate-500 font-medium">
                    <span className="flex items-center gap-1 text-slate-700 font-bold">
                      <Clock size={14} className="text-slate-400" />
                      {new Date(String(r.scheduledAt)).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users size={14} /> {r.partySize} Guests
                    </span>
                    {r.customerPhone && (
                      <span className="flex items-center gap-1">
                        <Phone size={14} /> {r.customerPhone}
                      </span>
                    )}
                  </div>
                  {r.notes && (
                    <p className="mt-2 text-sm text-slate-600 flex items-start gap-1">
                      <FileText size={14} className="mt-0.5 opacity-50 shrink-0" /> {r.notes}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-3 shrink-0">
                <Badge variant={r.status === 'seated' ? 'teal' : r.status === 'confirmed' ? 'success' : 'warning'}>
                  {r.status}
                </Badge>
                {r.tableId && (
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Armchair size={12} />
                    {tables.find(t => t.id === r.tableId)?.name || 'Assigned'}
                  </div>
                )}
                <div className="flex items-center gap-1 mt-1">
                  {r.status === 'pending' && <Button size="sm" variant="outline" onClick={() => handleStatusChange(r.id, 'confirmed')}>Confirm</Button>}
                  {(r.status === 'pending' || r.status === 'confirmed') && <Button size="sm" onClick={() => handleStatusChange(r.id, 'seated')}>Seat Guest</Button>}
                  {r.status === 'seated' && <Button size="sm" variant="ghost" onClick={() => handleStatusChange(r.id, 'completed')}>Checkout</Button>}
                  {r.status !== 'seated' && <Button size="sm" variant="ghost" className="text-rose-500 hover:text-rose-600 hover:bg-rose-50" onClick={() => handleStatusChange(r.id, 'cancelled')}><Ban size={14} /></Button>}
                </div>
              </div>
            </div>
          ))}
          {sorted.filter(r => ['pending', 'confirmed', 'seated'].includes(r.status)).length === 0 && !isCreating && (
            <div className="text-center py-12 text-slate-500 border border-dashed border-slate-200 rounded-2xl">
              No upcoming reservations.
            </div>
          )}
        </div>

        <div>
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Past & Cancelled</h3>
          <div className="space-y-3">
            {sorted.filter(r => ['completed', 'cancelled'].includes(r.status)).slice(0, 5).map(r => (
              <div key={r.id} className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                <div className="flex justify-between items-start">
                  <span className="font-bold text-slate-700 text-sm">{r.customerName}</span>
                  <Badge variant={r.status === 'completed' ? 'default' : 'error'}>{r.status}</Badge>
                </div>
                <div className="text-xs text-slate-400 font-medium mt-1">
                  {new Date(String(r.scheduledAt)).toLocaleDateString()} &middot; {r.partySize} Guests
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
