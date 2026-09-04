"use client";
import React, { useState } from 'react';
import { Calendar, MapPin, Users, Ticket, CheckCircle2, ChevronRight, X } from 'lucide-react';

const MOCK_EVENTS = [
    {
        id: '1',
        title: 'Neon Nights Festival',
        date: 'OCT 15',
        fullDate: 'Sat, Oct 15 • 8:00 PM',
        location: 'Downtown Warehouse',
        price: 45,
        image: 'https://images.unsplash.com/photo-1540039155733-d7c223c7270e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80',
        attendees: '45 of your friends are going',
        sellingFast: true,
    },
    {
        id: '2',
        title: 'Food Truck Fiesta',
        date: 'OCT 16',
        fullDate: 'Sun, Oct 16 • 12:00 PM',
        location: 'City Park',
        price: 0,
        image: 'https://images.unsplash.com/photo-1565123409695-7b5ef63a2efb?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80',
        attendees: '12 of your friends are going',
        sellingFast: false,
    },
    {
        id: '3',
        title: 'Indie Rock Showcase',
        date: 'OCT 20',
        fullDate: 'Thu, Oct 20 • 9:00 PM',
        location: 'The Basement Venue',
        price: 25,
        image: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80',
        attendees: '8 of your friends are going',
        sellingFast: true,
    }
];

const FILTERS = ['All', 'This Weekend', 'Tonight', 'Free', 'Music', 'Food & Drink'];

export default function EventsDiscoveryView() {
    const [activeFilter, setActiveFilter] = useState('All');
    const [selectedEvent, setSelectedEvent] = useState<any>(null);
    const [ticketCount, setTicketCount] = useState(1);
    const [isCheckedOut, setIsCheckedOut] = useState(false);

    const handleCheckout = () => {
        setIsCheckedOut(true);
        setTimeout(() => {
            setIsCheckedOut(false);
            setSelectedEvent(null);
            setTicketCount(1);
        }, 2000);
    };

    return (
        <div className="min-h-screen bg-neutral-50 pb-20">
            {/* Header / Title */}
            <div className="px-4 py-6 bg-white border-b border-neutral-100">
                <h1 className="text-3xl font-black text-neutral-900 tracking-tight">Events</h1>
                <p className="text-neutral-500 mt-1">Discover local events, festivals, and activities.</p>
            </div>

            {/* Filters */}
            <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-neutral-200 px-4 py-4 overflow-x-auto no-scrollbar">
                <div className="flex gap-2 min-w-max">
                    {FILTERS.map(filter => (
                        <button
                            key={filter}
                            onClick={() => setActiveFilter(filter)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeFilter === filter ? 'bg-black text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'}`}
                        >
                            {filter}
                        </button>
                    ))}
                </div>
            </div>

            {/* Events List */}
            <div className="p-4 space-y-6">
                {MOCK_EVENTS.map(event => (
                    <div key={event.id} className="group relative bg-white rounded-2xl overflow-hidden shadow-sm border border-neutral-100 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedEvent(event)}>
                        <div className="relative h-64 w-full">
                            <img src={event.image} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                            <div className="absolute top-4 left-4 bg-white/90 backdrop-blur rounded-lg p-2 text-center min-w-[3.5rem] shadow-sm">
                                <span className="block text-xs font-bold text-neutral-500 uppercase">{event.date.split(' ')[0]}</span>
                                <span className="block text-xl font-black text-black leading-none">{event.date.split(' ')[1]}</span>
                            </div>
                            {event.sellingFast && (
                                <div className="absolute top-4 right-4 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                                    Selling Fast!
                                </div>
                            )}
                        </div>
                        <div className="p-5">
                            <h3 className="text-xl font-bold text-neutral-900 mb-2">{event.title}</h3>
                            <div className="flex items-center text-neutral-500 text-sm mb-1">
                                <Calendar className="w-4 h-4 mr-2" />
                                {event.fullDate}
                            </div>
                            <div className="flex items-center text-neutral-500 text-sm mb-4">
                                <MapPin className="w-4 h-4 mr-2" />
                                {event.location}
                            </div>
                            <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
                                <div className="flex items-center text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                                    <Users className="w-4 h-4 mr-2" />
                                    {event.attendees}
                                </div>
                                <span className="font-bold text-neutral-900">{event.price === 0 ? 'Free' : `$${event.price}`}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Slide-up Ticketing Flow */}
            {selectedEvent && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm transition-opacity">
                    <div className="bg-white w-full max-w-lg rounded-t-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom">
                        <div className="p-4 border-b border-neutral-100 flex items-center justify-between sticky top-0 bg-white">
                            <h3 className="font-bold text-lg">{selectedEvent.title}</h3>
                            <button onClick={() => setSelectedEvent(null)} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        {!isCheckedOut ? (
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <p className="font-medium text-neutral-900">General Admission</p>
                                        <p className="text-sm text-neutral-500">{selectedEvent.price === 0 ? 'Free Entry' : `$${selectedEvent.price} per ticket`}</p>
                                    </div>
                                    <div className="flex items-center gap-4 bg-neutral-100 rounded-full px-2 py-1">
                                        <button onClick={() => setTicketCount(Math.max(1, ticketCount - 1))} className="w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-sm font-medium hover:bg-neutral-50 text-neutral-900">-</button>
                                        <span className="font-bold min-w-[1rem] text-center">{ticketCount}</span>
                                        <button onClick={() => setTicketCount(ticketCount + 1)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-sm font-medium hover:bg-neutral-50 text-neutral-900">+</button>
                                    </div>
                                </div>
                                
                                <div className="border-t border-neutral-100 pt-6 mb-6">
                                    <div className="flex justify-between font-bold text-lg mb-2">
                                        <span>Total</span>
                                        <span>{selectedEvent.price === 0 ? 'Free' : `$${selectedEvent.price * ticketCount}`}</span>
                                    </div>
                                    <p className="text-sm text-neutral-500 flex items-center gap-1">
                                        <Ticket className="w-4 h-4" /> Paying with CityWallet
                                    </p>
                                </div>

                                <button onClick={handleCheckout} className="w-full bg-black text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-neutral-800 transition-colors">
                                    {selectedEvent.price === 0 ? 'Register Now' : 'Pay with CityWallet'} <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        ) : (
                            <div className="p-12 text-center flex flex-col items-center justify-center">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                                </div>
                                <h3 className="font-bold text-2xl mb-2">You're going!</h3>
                                <p className="text-neutral-500">Your tickets are saved to your CityWallet.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
