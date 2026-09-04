"use client";

import React, { useState } from 'react';
import { QrCode, Search, CheckCircle, AlertTriangle, Users, Scan, Check } from 'lucide-react';

const mockAttendees = [
  { id: '1', name: 'Alice Smith', type: 'VIP', status: 'checked-in' },
  { id: '2', name: 'Bob Jones', type: 'GA', status: 'pending' },
  { id: '3', name: 'Charlie Brown', type: 'GA', status: 'pending' },
  { id: '4', name: 'Diana Prince', type: 'VIP', status: 'pending' },
  { id: '5', name: 'Evan Wright', type: 'Early Bird', status: 'checked-in' },
  { id: '6', name: 'Frank Ocean', type: 'VIP', status: 'pending' },
  { id: '7', name: 'Grace Hopper', type: 'GA', status: 'checked-in' },
  { id: '8', name: 'Henry Ford', type: 'Early Bird', status: 'pending' },
  { id: '9', name: 'Ivy Lee', type: 'GA', status: 'pending' },
  { id: '10', name: 'Jack Ma', type: 'VIP', status: 'pending' },
];

export default function ScannerApp() {
  const [activeTab, setActiveTab] = useState<'scan' | 'list'>('scan');
  const [searchQuery, setSearchQuery] = useState('');
  const [attendees, setAttendees] = useState(mockAttendees);
  
  const capacity = 500;
  const checkedInCount = attendees.filter(a => a.status === 'checked-in').length;

  const handleCheckIn = (id: string) => {
    setAttendees(prev => 
      prev.map(a => a.id === id ? { ...a, status: 'checked-in' } : a)
    );
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white font-sans overflow-hidden">
      {/* Header / Venue Capacity */}
      <div className="flex items-center justify-between p-4 bg-zinc-900 border-b border-zinc-800">
        <div className="flex flex-col">
          <span className="text-sm text-zinc-400">CityConnect Neon Nights</span>
          <span className="text-xl font-bold">Door Scanner</span>
        </div>
        <div className="flex items-center space-x-2 bg-zinc-800 px-3 py-1.5 rounded-full border border-zinc-700">
          <Users className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-semibold">
            {checkedInCount} / {capacity} Checked In
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden">
        {activeTab === 'scan' ? (
          <div className="h-full flex flex-col items-center justify-center p-6 bg-black relative">
            <div className="absolute inset-0 bg-zinc-900 opacity-20"></div>
            
            <div className="relative z-10 flex flex-col items-center w-full max-w-sm">
              <div className="w-64 h-64 border-2 border-emerald-500 rounded-2xl flex items-center justify-center mb-8 relative overflow-hidden bg-black/50 backdrop-blur-sm shadow-[0_0_30px_rgba(16,185,129,0.15)]">
                {/* Scanner placeholder graphic */}
                <div className="absolute inset-0 border-t-2 border-emerald-400/50 animate-[ping_3s_ease-in-out_infinite]"></div>
                <div className="w-full h-0.5 bg-emerald-500 absolute top-1/2 -translate-y-1/2 shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div>
                
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-500 rounded-tl-lg"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-500 rounded-tr-lg"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-500 rounded-bl-lg"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-500 rounded-br-lg"></div>
                
                <QrCode className="w-16 h-16 text-emerald-500/40" />
              </div>
              
              <h2 className="text-2xl font-bold mb-2 text-center text-white">Ready to Scan</h2>
              <p className="text-zinc-400 text-center text-sm px-4">
                Position QR code within the frame to automatically check in attendee.
              </p>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col bg-black">
            <div className="p-4 border-b border-zinc-800 bg-zinc-900/50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search by name or ticket ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-lg py-3 pl-10 pr-4 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder-zinc-500"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {attendees
                .filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(attendee => (
                <div 
                  key={attendee.id} 
                  className="flex items-center justify-between p-4 bg-zinc-900 rounded-xl border border-zinc-800"
                >
                  <div className="flex flex-col">
                    <span className="text-lg font-semibold text-white">{attendee.name}</span>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                        attendee.type === 'VIP' ? 'bg-purple-900/50 text-purple-300 border border-purple-800' : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                      }`}>
                        {attendee.type}
                      </span>
                      {attendee.status === 'checked-in' && (
                        <span className="text-xs text-emerald-400 flex items-center font-medium">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Checked In
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {attendee.status === 'pending' ? (
                    <button
                      onClick={() => handleCheckIn(attendee.id)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center shadow-lg shadow-emerald-900/20"
                    >
                      <Check className="w-4 h-4 mr-1" /> Check In
                    </button>
                  ) : (
                    <button
                      disabled
                      className="bg-zinc-800 text-zinc-500 px-4 py-2 rounded-lg font-semibold cursor-not-allowed border border-zinc-700"
                    >
                      Done
                    </button>
                  )}
                </div>
              ))}
              
              {attendees.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
                  <AlertTriangle className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-lg font-medium">No attendees found</p>
                  <p className="text-sm mt-1">Try a different search term</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="flex items-center p-2 bg-zinc-950 border-t border-zinc-900">
        <button
          onClick={() => setActiveTab('scan')}
          className={`flex-1 flex flex-col items-center justify-center py-3 rounded-xl transition-colors ${
            activeTab === 'scan' ? 'text-emerald-400 bg-emerald-950/20' : 'text-zinc-500 hover:bg-zinc-900'
          }`}
        >
          <Scan className="w-6 h-6 mb-1" />
          <span className="text-xs font-semibold">Scanner</span>
        </button>
        <button
          onClick={() => setActiveTab('list')}
          className={`flex-1 flex flex-col items-center justify-center py-3 rounded-xl transition-colors ${
            activeTab === 'list' ? 'text-emerald-400 bg-emerald-950/20' : 'text-zinc-500 hover:bg-zinc-900'
          }`}
        >
          <Search className="w-6 h-6 mb-1" />
          <span className="text-xs font-semibold">Guest List</span>
        </button>
      </div>
    </div>
  );
}
