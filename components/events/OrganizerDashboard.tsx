"use client";

import React, { useState } from 'react';
import { 
  BarChart3, 
  Users, 
  Ticket, 
  TrendingUp, 
  Settings, 
  Plus, 
  MoreHorizontal, 
  Search, 
  Calendar, 
  MapPin, 
  DollarSign, 
  Mail, 
  CreditCard 
} from 'lucide-react';

const MOCK_TICKET_TIERS = [
  { id: '1', name: 'Early Bird', price: 15, sold: 150, capacity: 150, status: 'Sold Out' },
  { id: '2', name: 'General Admission', price: 25, sold: 342, capacity: 500, status: 'On Sale' },
  { id: '3', name: 'VIP Access', price: 75, sold: 45, capacity: 50, status: 'On Sale' },
];

const MOCK_ATTENDEES = [
  { id: 'a1', name: 'Alice Johnson', email: 'alice.j@example.com', tier: 'VIP Access', purchaseDate: 'Oct 12, 2024', status: 'Checked In' },
  { id: 'a2', name: 'Bob Smith', email: 'bob.s@example.com', tier: 'General Admission', purchaseDate: 'Oct 14, 2024', status: 'Pending' },
  { id: 'a3', name: 'Charlie Davis', email: 'charlie.d@example.com', tier: 'Early Bird', purchaseDate: 'Sep 01, 2024', status: 'Checked In' },
  { id: 'a4', name: 'Diana Prince', email: 'diana.p@example.com', tier: 'General Admission', purchaseDate: 'Oct 15, 2024', status: 'Pending' },
  { id: 'a5', name: 'Evan Wright', email: 'evan.w@example.com', tier: 'VIP Access', purchaseDate: 'Oct 18, 2024', status: 'Pending' },
];

export default function OrganizerDashboard() {
  const [activeTab, setActiveTab] = useState<'analytics' | 'tickets' | 'attendees'>('analytics');
  const [searchQuery, setSearchQuery] = useState('');

  const totalRevenue = MOCK_TICKET_TIERS.reduce((acc, tier) => acc + (tier.price * tier.sold), 0);
  const totalSold = MOCK_TICKET_TIERS.reduce((acc, tier) => acc + tier.sold, 0);
  const totalCapacity = MOCK_TICKET_TIERS.reduce((acc, tier) => acc + tier.capacity, 0);

  const filteredAttendees = MOCK_ATTENDEES.filter(a => 
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    a.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="max-w-6xl mx-auto flex justify-between items-start">
          <div>
            <div className="flex items-center space-x-2 text-sm text-blue-600 font-semibold mb-2">
              <span>CityConnect Events</span>
              <span>&bull;</span>
              <span>Organizer Portal</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Neon Nights Music Festival</h1>
            <div className="flex items-center space-x-4 mt-2 text-gray-500 text-sm">
              <span className="flex items-center"><Calendar className="w-4 h-4 mr-1" /> Oct 31, 2024</span>
              <span className="flex items-center"><MapPin className="w-4 h-4 mr-1" /> Downtown Warehouse</span>
            </div>
          </div>
          <div className="flex space-x-3">
            <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition flex items-center">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition flex items-center">
              <Plus className="w-4 h-4 mr-2" />
              Edit Event
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-8 py-8">
        
        {/* Navigation Tabs */}
        <div className="flex space-x-1 border-b border-gray-200 mb-8">
          <button 
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'analytics' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Analytics & Sales
          </button>
          <button 
            onClick={() => setActiveTab('tickets')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'tickets' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Ticket Tiers
          </button>
          <button 
            onClick={() => setActiveTab('attendees')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'attendees' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Attendee CRM
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <span className="flex items-center text-green-600 text-sm font-medium">
                    <TrendingUp className="w-4 h-4 mr-1" /> +12%
                  </span>
                </div>
                <h3 className="text-gray-500 text-sm font-medium">Total Revenue</h3>
                <p className="text-3xl font-bold mt-1">${totalRevenue.toLocaleString()}</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                    <Ticket className="w-6 h-6" />
                  </div>
                </div>
                <h3 className="text-gray-500 text-sm font-medium">Tickets Sold</h3>
                <p className="text-3xl font-bold mt-1">{totalSold} <span className="text-gray-400 text-lg font-normal">/ {totalCapacity}</span></p>
                <div className="w-full bg-gray-100 rounded-full h-2 mt-3">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${(totalSold/totalCapacity)*100}%` }}></div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                    <Users className="w-6 h-6" />
                  </div>
                </div>
                <h3 className="text-gray-500 text-sm font-medium">Page Views</h3>
                <p className="text-3xl font-bold mt-1">4,205</p>
                <p className="text-sm text-gray-500 mt-2">12.7% conversion rate</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-80 flex flex-col items-center justify-center text-gray-400">
              <BarChart3 className="w-12 h-12 mb-3 text-gray-300" />
              <p>Detailed sales chart over time would render here.</p>
            </div>
          </div>
        )}

        {activeTab === 'tickets' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Manage Ticket Tiers</h2>
              <button className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition flex items-center">
                <Plus className="w-4 h-4 mr-2" />
                New Tier
              </button>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 font-medium">Tier Name</th>
                    <th className="px-6 py-4 font-medium">Price</th>
                    <th className="px-6 py-4 font-medium">Sold</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {MOCK_TICKET_TIERS.map(tier => (
                    <tr key={tier.id} className="hover:bg-gray-50/50 transition">
                      <td className="px-6 py-4 font-medium">{tier.name}</td>
                      <td className="px-6 py-4">${tier.price}</td>
                      <td className="px-6 py-4">
                        {tier.sold} <span className="text-gray-400">/ {tier.capacity}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${tier.status === 'Sold Out' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {tier.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-1 text-gray-400 hover:text-gray-600 rounded">
                          <MoreHorizontal className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'attendees' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-xl font-bold">Attendee CRM</h2>
              <div className="flex space-x-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text"
                    placeholder="Search attendees..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition flex items-center">
                  <Mail className="w-4 h-4 mr-2" />
                  Message All
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 font-medium">Name</th>
                    <th className="px-6 py-4 font-medium">Ticket Type</th>
                    <th className="px-6 py-4 font-medium">Purchase Date</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredAttendees.length > 0 ? filteredAttendees.map(attendee => (
                    <tr key={attendee.id} className="hover:bg-gray-50/50 transition">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{attendee.name}</div>
                        <div className="text-gray-500 text-xs">{attendee.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-1 rounded bg-gray-100 text-gray-700 text-xs font-medium">
                          {attendee.tier}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{attendee.purchaseDate}</td>
                      <td className="px-6 py-4">
                        <span className={`flex items-center text-xs font-medium ${attendee.status === 'Checked In' ? 'text-green-600' : 'text-amber-600'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${attendee.status === 'Checked In' ? 'bg-green-600' : 'bg-amber-600'}`}></span>
                          {attendee.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end space-x-2">
                          <button className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition" title="Refund Ticket">
                            <CreditCard className="w-4 h-4" />
                          </button>
                          <button className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition" title="More options">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                        No attendees found matching "{searchQuery}"
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
