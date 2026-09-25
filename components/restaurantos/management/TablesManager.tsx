'use client';

import React, { useState } from 'react';
import { Button, Input, Badge } from '@/components/ui';
import { Plus, Users, GripHorizontal, Search, CheckCircle, Clock, Ban } from 'lucide-react';
import { createTable, updateTableStatus } from '@/lib/actions/restaurantos';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export function TablesManager({
  organizationId,
  locationId,
  initialTables
}: {
  organizationId: string;
  locationId?: string;
  initialTables: any[];
}) {
  const router = useRouter();
  const [tables, setTables] = useState(initialTables);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [newName, setNewName] = useState('');
  const [newSeats, setNewSeats] = useState(4);
  const [search, setSearch] = useState('');

  const handleCreate = async () => {
    if (!newName.trim()) return toast.error('Table name is required');
    setLoading(true);
    const res = await createTable({
      organizationId,
      locationId,
      name: newName,
      seats: newSeats
    });
    setLoading(false);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('Table created successfully');
      setTables([...tables, res]);
      setIsCreating(false);
      setNewName('');
      setNewSeats(4);
      router.refresh();
    }
  };

  const handleStatusChange = async (id: string, status: 'available' | 'occupied' | 'reserved') => {
    const res = await updateTableStatus(id, status);
    if (res.error) {
      toast.error(res.error);
    } else {
      setTables(tables.map(t => t.id === id ? { ...t, status } : t));
      toast.success(`Table marked as ${status}`);
      router.refresh();
    }
  };

  const filtered = tables.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Search tables..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <Button onClick={() => setIsCreating(true)} leftIcon={<Plus size={16} />}>
          Add Table
        </Button>
      </div>

      {isCreating && (
        <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col md:flex-row items-end gap-4">
          <div className="flex-1 w-full">
            <Input 
              label="Table Name or Number" 
              placeholder="e.g. T1, Window 4, Booth 2" 
              value={newName} 
              onChange={(e) => setNewName(e.target.value)} 
            />
          </div>
          <div className="w-full md:w-32">
            <Input 
              label="Seats" 
              type="number" 
              min={1} 
              value={newSeats} 
              onChange={(e) => setNewSeats(parseInt(e.target.value) || 1)} 
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Button variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
            <Button onClick={handleCreate} isLoading={loading}>Save</Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.map(table => (
          <div key={table.id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-black text-slate-900">{table.name}</h3>
                <div className="flex items-center gap-1.5 text-sm text-slate-500 font-medium mt-1">
                  <Users size={14} /> {table.seats} Seats
                </div>
              </div>
              <GripHorizontal className="text-slate-300" size={20} />
            </div>

            <div className="space-y-3 mt-6">
              <div className="flex gap-2">
                <button 
                  onClick={() => handleStatusChange(table.id, 'available')}
                  className={`flex-1 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-colors flex flex-col items-center gap-1
                    ${table.status === 'available' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                >
                  <CheckCircle size={14} /> Available
                </button>
                <button 
                  onClick={() => handleStatusChange(table.id, 'occupied')}
                  className={`flex-1 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-colors flex flex-col items-center gap-1
                    ${table.status === 'occupied' ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                >
                  <Ban size={14} /> Occupied
                </button>
              </div>
              <button 
                onClick={() => handleStatusChange(table.id, 'reserved')}
                className={`w-full py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2
                  ${table.status === 'reserved' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
              >
                <Clock size={14} /> Reserved
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && !isCreating && (
          <div className="col-span-full py-12 text-center text-slate-500">
            No tables found. Add your first table to design your floor plan.
          </div>
        )}
      </div>
    </div>
  );
}
