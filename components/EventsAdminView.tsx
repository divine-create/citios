'use client';

'use client';

import React, { useState } from 'react';
import { Card } from '@/components/Shared';
import { Badge } from '@/components/Shared';
import { Button } from '@/components/Shared';

export function EventsAdminView({ initialData }: { initialData: any }) {
    const { organization, events, rentals } = initialData;
    const [activeTab, setActiveTab] = useState<'events' | 'rentals'>('events');

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
                    <button onClick={() => setActiveTab('events')} className={"py-4 text-sm font-bold border-b-2 transition-colors "}>Event Management</button>
                    <button onClick={() => setActiveTab('rentals')} className={"py-4 text-sm font-bold border-b-2 transition-colors "}>Venue & Rentals</button>
                </div>
            </div>

            {/* Content Area */}
            <div className="p-6 max-w-7xl mx-auto w-full space-y-8">
                {activeTab === 'events' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold text-slate-900">Upcoming Events</h3>
                            <Button className="bg-indigo-700 hover:bg-indigo-800 text-white font-bold">+ Create Event</Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {events.map((event: any) => (
                                <Card key={event.id} hoverable className="p-6 flex flex-col justify-between">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="font-bold text-lg text-slate-900">{event.title}</h3>
                                            <p className="text-sm text-slate-600 mt-1">{event.description}</p>
                                        </div>
                                        <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200">
                                            {event.tickets.length} / {event.capacity} RSVPs
                                        </Badge>
                                    </div>
                                    <div className="pt-4 border-t border-slate-100 flex justify-between items-center mt-4 text-sm">
                                        <div>
                                            <span className="block font-bold text-slate-700">{new Date(event.date).toLocaleDateString()}</span>
                                            <span className="block text-slate-500">{event.location}</span>
                                        </div>
                                        <Button variant="outline" size="sm" className="bg-white border-slate-200">Manage Tickets</Button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'rentals' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold text-slate-900">Rental Resources & Venues</h3>
                            <Button className="bg-indigo-700 hover:bg-indigo-800 text-white font-bold">+ Add Resource</Button>
                        </div>
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
                                            <p className="font-black text-indigo-700 text-lg">/day</p>
                                            <p className="text-xs font-bold text-slate-500 uppercase mt-1">
                                                {rental.bookings.length} Active Bookings
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}
