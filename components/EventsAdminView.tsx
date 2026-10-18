'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, Badge, Button } from '@/components/Shared';
import { createOrgEvent, createRentalResource, createTicketTier } from '@/lib/actions/events';
import { X, Loader2, ExternalLink, Calendar, MapPin, Plus } from 'lucide-react';

export function EventsAdminView({ initialData }: { initialData: any }) {
  const { organization } = initialData;
  const [events, setEvents] = useState<any[]>(initialData.events || []);
  const [rentals, setRentals] = useState<any[]>(initialData.rentals || []);
  const [activeTab, setActiveTab] = useState<'events' | 'rentals'>('events');

  // Create Event modal state
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [evTitle, setEvTitle] = useState('');
  const [evLocation, setEvLocation] = useState(organization?.address || 'Calabar');
  const [evDate, setEvDate] = useState('');
  const [evCapacity, setEvCapacity] = useState('200');
  const [evPrice, setEvPrice] = useState('0');
  const [evDesc, setEvDesc] = useState('');
  const [evImageUrl, setEvImageUrl] = useState('');
  const [evUrl, setEvUrl] = useState('');
  const [evLoading, setEvLoading] = useState(false);
  const [evError, setEvError] = useState<string | null>(null);

  // Add Rental Resource modal state
  const [showAddRental, setShowAddRental] = useState(false);
  const [resName, setResName] = useState('');
  const [resType, setResType] = useState('VENUE');
  const [resPrice, setResPrice] = useState('50000');
  const [resDesc, setResDesc] = useState('');
  const [resLoading, setResLoading] = useState(false);
  const [resError, setResError] = useState<string | null>(null);

  // Manage Tickets modal state
  const [activeEventForTickets, setActiveEventForTickets] = useState<any | null>(null);
  const [tierName, setTierName] = useState('');
  const [tierPrice, setTierPrice] = useState('5000');
  const [tierCapacity, setTierCapacity] = useState('100');
  const [tierLoading, setTierLoading] = useState(false);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setEvLoading(true);
    setEvError(null);
    const res = await createOrgEvent({
      organizationId: organization.id,
      title: evTitle,
      location: evLocation,
      date: evDate,
      capacity: Number(evCapacity) || 100,
      price: Number(evPrice) || 0,
      description: evDesc,
      imageUrl: evImageUrl,
      eventUrl: evUrl,
    });
    setEvLoading(false);
    if (res.error) {
      setEvError(res.error);
      return;
    }
    if (res.event) {
      setEvents((prev) => [res.event, ...prev]);
      setShowCreateEvent(false);
      setEvTitle('');
      setEvDate('');
      setEvDesc('');
      setEvImageUrl('');
      setEvUrl('');
    }
  };

  const handleAddRental = async (e: React.FormEvent) => {
    e.preventDefault();
    setResLoading(true);
    setResError(null);
    const res = await createRentalResource({
      organizationId: organization.id,
      name: resName,
      type: resType,
      pricePerDay: Number(resPrice) || 0,
      description: resDesc,
    });
    setResLoading(false);
    if (res.error) {
      setResError(res.error);
      return;
    }
    if (res.rental) {
      setRentals((prev) => [res.rental, ...prev]);
      setShowAddRental(false);
      setResName('');
      setResDesc('');
    }
  };

  const handleAddTier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEventForTickets || !tierName.trim()) return;
    setTierLoading(true);
    const res = await createTicketTier({
      eventId: activeEventForTickets.id,
      name: tierName.trim(),
      price: Number(tierPrice) || 0,
      capacity: Number(tierCapacity) || 50,
    });
    setTierLoading(false);
    if (res.tier) {
      const updatedEvent = {
        ...activeEventForTickets,
        ticketTiers: [...(activeEventForTickets.ticketTiers || []), res.tier],
      };
      setActiveEventForTickets(updatedEvent);
      setEvents((prev) => prev.map((ev) => (ev.id === updatedEvent.id ? updatedEvent : ev)));
      setTierName('');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-indigo-900 text-white p-6 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-bl-full -z-0" />
        <div className="relative z-10 flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl sm:text-3xl font-bold tracking-tight text-white">{organization.name}</h2>
            <p className="text-indigo-200 text-sm font-bold uppercase tracking-widest mt-2">Events & Rentals Portal</p>
          </div>
          <Link
            href="/business"
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors"
          >
            ← Back to Business Hub
          </Link>
        </div>

        <div className="relative z-10 grid grid-cols-2 gap-8 border-t border-indigo-800/50 pt-8">
          <div>
            <p className="text-4xl font-black tracking-tighter text-white">{events.length}</p>
            <p className="text-xs text-indigo-300 font-bold uppercase tracking-wider mt-2">Active Events</p>
          </div>
          <div>
            <p className="text-4xl font-black tracking-tighter text-white">{rentals.length}</p>
            <p className="text-xs text-indigo-300 font-bold uppercase tracking-wider mt-2">Rental Resources</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-slate-200 px-6 overflow-x-auto">
        <div className="flex space-x-8 min-w-max">
          <button
            onClick={() => setActiveTab('events')}
            className={`py-4 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'events' ? 'border-indigo-700 text-indigo-900' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Event Management ({events.length})
          </button>
          <button
            onClick={() => setActiveTab('rentals')}
            className={`py-4 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'rentals' ? 'border-indigo-700 text-indigo-900' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Venue & Rentals ({rentals.length})
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-6 max-w-7xl mx-auto w-full space-y-8">
        {activeTab === 'events' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900">Upcoming Events</h3>
              <Button
                onClick={() => setShowCreateEvent(true)}
                className="bg-indigo-700 hover:bg-indigo-800 text-white font-bold"
              >
                + Create Event
              </Button>
            </div>
            {events.length === 0 ? (
              <Card className="p-10 text-center space-y-3">
                <p className="text-sm font-bold text-slate-700">No events hosted yet</p>
                <p className="text-xs text-slate-500">Create your first concert, conference, or city experience.</p>
                <div>
                  <Button
                    onClick={() => setShowCreateEvent(true)}
                    className="bg-indigo-700 hover:bg-indigo-800 text-white font-bold"
                  >
                    + Create First Event
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {events.map((event: any) => (
                  <Card key={event.id} hoverable className="p-6 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4 gap-3">
                      <div className="min-w-0">
                        <h3 className="font-bold text-lg text-slate-900">{event.title}</h3>
                        <p className="text-sm text-slate-600 mt-1 line-clamp-2">{event.description}</p>
                      </div>
                      <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 shrink-0">
                        {(event.tickets || []).length} / {event.capacity} RSVPs
                      </Badge>
                    </div>
                    <div className="pt-4 border-t border-slate-100 flex justify-between items-center mt-4 text-sm">
                      <div>
                        <span className="block font-bold text-slate-700">
                          {new Date(event.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                        </span>
                        <span className="block text-slate-500">{event.location}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/events/${event.id}`}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-1"
                        >
                          View <ExternalLink className="w-3 h-3" />
                        </Link>
                        <Button
                          onClick={() => setActiveEventForTickets(event)}
                          variant="outline"
                          size="sm"
                          className="bg-white border-slate-200"
                        >
                          Manage Tickets
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'rentals' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900">Rental Resources & Venues</h3>
              <Button
                onClick={() => setShowAddRental(true)}
                className="bg-indigo-700 hover:bg-indigo-800 text-white font-bold"
              >
                + Add Resource
              </Button>
            </div>
            {rentals.length === 0 ? (
              <Card className="p-10 text-center space-y-3">
                <p className="text-sm font-bold text-slate-700">No venues or rental equipment listed yet</p>
                <p className="text-xs text-slate-500">Add halls, sound systems, or event venues available for booking.</p>
                <div>
                  <Button
                    onClick={() => setShowAddRental(true)}
                    className="bg-indigo-700 hover:bg-indigo-800 text-white font-bold"
                  >
                    + Add First Resource
                  </Button>
                </div>
              </Card>
            ) : (
              <Card className="p-0 overflow-hidden">
                <div className="divide-y divide-slate-100">
                  {rentals.map((rental: any) => (
                    <div key={rental.id} className="p-4 md:p-6 flex justify-between items-center hover:bg-slate-50 transition-colors">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs font-bold">{rental.type}</Badge>
                          <p className="font-bold text-slate-900">{rental.name}</p>
                        </div>
                        <p className="text-sm text-slate-500">{rental.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-indigo-700 text-lg">
                          ₦{Number(rental.pricePerDay || 0).toLocaleString()}/day
                        </p>
                        <p className="text-xs font-bold text-slate-500 uppercase mt-1">
                          {(rental.bookings || []).length} Active Bookings
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Create Event Modal */}
      {showCreateEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 bg-indigo-900 text-white flex items-center justify-between">
              <h3 className="font-black text-base">Create New Event</h3>
              <button onClick={() => setShowCreateEvent(false)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateEvent} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {evError && (
                <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-bold border border-red-200">
                  {evError}
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Event Title *</label>
                <input
                  type="text"
                  required
                  value={evTitle}
                  onChange={(e) => setEvTitle(e.target.value)}
                  placeholder="e.g. Calabar Tech & Culture Mixer"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={evDate}
                    onChange={(e) => setEvDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Venue / Location *</label>
                  <input
                    type="text"
                    required
                    value={evLocation}
                    onChange={(e) => setEvLocation(e.target.value)}
                    placeholder="e.g. Cultural Centre, Calabar"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ticket Price (₦)</label>
                  <input
                    type="number"
                    min="0"
                    value={evPrice}
                    onChange={(e) => setEvPrice(e.target.value)}
                    placeholder="0 for Free"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Capacity</label>
                  <input
                    type="number"
                    min="1"
                    value={evCapacity}
                    onChange={(e) => setEvCapacity(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={evDesc}
                  onChange={(e) => setEvDesc(e.target.value)}
                  placeholder="What should attendees expect?"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-medium resize-none"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Banner Image URL (optional)</label>
                  <input
                    type="url"
                    value={evImageUrl}
                    onChange={(e) => setEvImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">External Event Link (optional)</label>
                  <input
                    type="url"
                    value={evUrl}
                    onChange={(e) => setEvUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateEvent(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={evLoading}
                  className="px-5 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                >
                  {evLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Publish Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Rental Resource Modal */}
      {showAddRental && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 bg-indigo-900 text-white flex items-center justify-between">
              <h3 className="font-black text-base">Add Venue or Rental Resource</h3>
              <button onClick={() => setShowAddRental(false)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddRental} className="p-6 space-y-4">
              {resError && (
                <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-bold border border-red-200">
                  {resError}
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Resource / Venue Name *</label>
                <input
                  type="text"
                  required
                  value={resName}
                  onChange={(e) => setResName(e.target.value)}
                  placeholder="e.g. Grand Banquet Hall (500 seats)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Type</label>
                  <select
                    value={resType}
                    onChange={(e) => setResType(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium"
                  >
                    <option value="VENUE">Venue / Hall</option>
                    <option value="EQUIPMENT">Sound / Equipment</option>
                    <option value="CATERING">Event Gear</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Rate per Day (₦)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={resPrice}
                    onChange={(e) => setResPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={resDesc}
                  onChange={(e) => setResDesc(e.target.value)}
                  placeholder="Capacity, amenities, and booking rules..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-medium resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddRental(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resLoading}
                  className="px-5 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                >
                  {resLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Resource
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Tickets Modal */}
      {activeEventForTickets && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 bg-indigo-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-black text-base">Manage Ticket Tiers</h3>
                <p className="text-xs text-indigo-200 truncate">{activeEventForTickets.title}</p>
              </div>
              <button onClick={() => setActiveEventForTickets(null)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Existing Ticket Tiers</p>
                {(activeEventForTickets.ticketTiers || []).length === 0 ? (
                  <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    General admission (₦{Number(activeEventForTickets.price || 0).toLocaleString()}). Add custom VIP or Early Bird tiers below.
                  </p>
                ) : (
                  (activeEventForTickets.ticketTiers || []).map((t: any) => (
                    <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <div>
                        <p className="font-bold text-slate-900">{t.name}</p>
                        <p className="text-slate-500">{t.capacity} seats allocated</p>
                      </div>
                      <span className="font-black text-indigo-700">₦{Number(t.price || 0).toLocaleString()}</span>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleAddTier} className="space-y-3 pt-4 border-t border-slate-100">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Add Ticket Tier</p>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    required
                    value={tierName}
                    onChange={(e) => setTierName(e.target.value)}
                    placeholder="Tier (e.g. VIP)"
                    className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                  />
                  <input
                    type="number"
                    min="0"
                    required
                    value={tierPrice}
                    onChange={(e) => setTierPrice(e.target.value)}
                    placeholder="Price (₦)"
                    className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                  />
                  <input
                    type="number"
                    min="1"
                    required
                    value={tierCapacity}
                    onChange={(e) => setTierCapacity(e.target.value)}
                    placeholder="Seats"
                    className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                  />
                </div>
                <button
                  type="submit"
                  disabled={tierLoading}
                  className="w-full py-2.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  {tierLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Add Ticket Tier
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
