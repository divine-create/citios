'use client';

import React, { useState } from 'react';
import { Hotel, Plus, Edit2, Trash2, CheckCircle2, AlertCircle, DollarSign, Bed } from 'lucide-react';
import { upsertManagedHotelRoom, deleteManagedHotelRoom } from '@/lib/actions/hq-managed-business';

interface ManagedRoomsEditorProps {
  organizationId: string;
  initialRooms: Array<{
    id: string;
    roomNumber: string;
    type: string;
    baseRate: number;
    status: string;
  }>;
}

const ROOM_TYPES = ['Standard Room', 'Deluxe Room', 'Executive Suite', 'Presidential Suite', 'Chalet', 'Studio Apartment'];
const ROOM_STATUSES = ['CLEAN', 'DIRTY', 'INSPECTING', 'OUT_OF_ORDER'];

export default function ManagedRoomsEditor({ organizationId, initialRooms }: ManagedRoomsEditorProps) {
  const [rooms, setRooms] = useState(initialRooms);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<{ id?: string; roomNumber: string; type: string; baseRate: number; status: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenAdd = () => {
    setEditingRoom({
      roomNumber: '',
      type: 'Deluxe Room',
      baseRate: 25000,
      status: 'CLEAN',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rm: any) => {
    setEditingRoom({
      id: rm.id,
      roomNumber: rm.roomNumber,
      type: rm.type,
      baseRate: rm.baseRate,
      status: rm.status,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom || !editingRoom.roomNumber.trim()) return;

    setError(null);
    setIsSaving(true);
    try {
      const res = await upsertManagedHotelRoom({
        id: editingRoom.id,
        organizationId,
        roomNumber: editingRoom.roomNumber.trim(),
        type: editingRoom.type.trim(),
        baseRate: Number(editingRoom.baseRate) || 0,
        status: editingRoom.status,
      });

      if (res.success) {
        if (editingRoom.id) {
          setRooms(prev => prev.map(r => r.id === editingRoom.id ? { ...r, ...editingRoom } : r));
        } else {
          setRooms(prev => [...prev, { id: res.roomId!, ...editingRoom }]);
        }
        setIsModalOpen(false);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save room');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (roomId: string) => {
    if (!confirm('Are you sure you want to delete this room?')) return;
    try {
      await deleteManagedHotelRoom(roomId, organizationId);
      setRooms(prev => prev.filter(r => r.id !== roomId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete room');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-blue-50/50 border border-blue-100 rounded-3xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/20">
            <Hotel size={24} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">Hotel Rooms & Stays Management</h3>
            <p className="text-xs text-slate-500">Configure room types, room numbers, nightly base rates (₦), and cleaning states</p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/20 flex items-center gap-2"
        >
          <Plus size={16} /> Add Room
        </button>
      </div>

      {rooms.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 border border-dashed border-slate-200 rounded-3xl">
          <Bed size={36} className="mx-auto text-slate-300 mb-2" />
          <h4 className="text-sm font-bold text-slate-700">No Hotel Rooms Added Yet</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Add standard, deluxe, and suite rooms with their nightly pricing so residents can book stays.
          </p>
          <button
            onClick={handleOpenAdd}
            className="mt-4 px-5 py-2 rounded-full bg-blue-600 text-white text-xs font-bold hover:bg-blue-700"
          >
            + Add First Room
          </button>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-5">Room Number</th>
                  <th className="py-3.5 px-5">Room Type</th>
                  <th className="py-3.5 px-5">Nightly Rate</th>
                  <th className="py-3.5 px-5">Housekeeping Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {rooms.map((rm) => (
                  <tr key={rm.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-5">
                      <span className="font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg text-xs">
                        #{rm.roomNumber}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-slate-700 font-semibold">{rm.type}</td>
                    <td className="py-4 px-5 font-bold text-emerald-600">
                      ₦{rm.baseRate.toLocaleString()}<span className="text-[10px] text-slate-400 font-normal"> / night</span>
                    </td>
                    <td className="py-4 px-5">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        rm.status === 'CLEAN' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        rm.status === 'DIRTY' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {rm.status}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(rm)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(rm.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && editingRoom && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              {editingRoom.id ? 'Edit Hotel Room' : 'Add New Hotel Room'}
            </h3>
            <p className="text-xs text-slate-500 mb-5">Configure room inventory and nightly stay rates</p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Room Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 101, Penthouse 1"
                  value={editingRoom.roomNumber}
                  onChange={(e) => setEditingRoom({ ...editingRoom, roomNumber: e.target.value })}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Room Type</label>
                <select
                  value={editingRoom.type}
                  onChange={(e) => setEditingRoom({ ...editingRoom, type: e.target.value })}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                >
                  {ROOM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nightly Base Rate (₦) *</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 35000"
                  value={editingRoom.baseRate}
                  onChange={(e) => setEditingRoom({ ...editingRoom, baseRate: Number(e.target.value) })}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                <select
                  value={editingRoom.status}
                  onChange={(e) => setEditingRoom({ ...editingRoom, status: e.target.value })}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                >
                  {ROOM_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-full"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2 text-xs font-bold bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
