"use client";

import React, { useState } from 'react';
import { 
  MapPin, 
  Package, 
  Truck, 
  Clock, 
  CheckCircle2, 
  Search,
  User,
  Navigation
} from 'lucide-react';

// Mock Data
const MOCK_DRIVERS = [
  { id: 'D-102', name: 'Marcus Johnson', eta: '2 mins', vehicle: 'White Toyota Prius', status: 'arriving' },
  { id: 'D-105', name: 'Sarah Chen', eta: '5 mins', vehicle: 'Silver Honda CRV', status: 'en_route' },
  { id: 'D-108', name: 'David Smith', eta: 'Arrived', vehicle: 'Blue Ford Transit', status: 'arrived' },
];

const MOCK_ORDERS = [
  { id: 'ORD-9921', customer: 'Alice Cooper', items: 12, status: 'ready', bags: 3 },
  { id: 'ORD-9922', customer: 'Bob Marley', items: 5, status: 'ready', bags: 1 },
  { id: 'ORD-9923', customer: 'Charlie Brown', items: 24, status: 'picking', bags: 0 },
];

const MOCK_ACTIVE_DELIVERIES = [
  { id: 'DEL-881', driver: 'Jessica W.', orderId: 'ORD-9910', status: 'on_the_way', progress: 65, destination: '124 Main St' },
  { id: 'DEL-882', driver: 'Tom H.', orderId: 'ORD-9911', status: 'near_dropoff', progress: 90, destination: '456 Oak Ave' },
];

export default function DispatchHub() {
  const [searchTerm, setSearchTerm] = useState('');
  
  return (
    <div className="flex flex-col h-full bg-slate-50 min-h-screen font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between sticky top-0 z-10 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dispatch & Logistics Hub</h1>
          <p className="text-slate-500 text-sm mt-1">Coordinate completed orders with CityRide drivers.</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search orders or drivers..." 
              className="pl-9 pr-4 py-2 bg-slate-100 border-transparent rounded-full text-sm focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 outline-none transition-all w-full md:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm shrink-0">
            Manual Dispatch
          </button>
        </div>
      </header>

      <div className="flex-1 p-6 grid grid-cols-1 xl:grid-cols-3 gap-6 max-w-screen-2xl mx-auto w-full">
        
        {/* Left Column: Driver Handoff */}
        <div className="xl:col-span-1 flex flex-col gap-6">
          
          {/* Ready Orders */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                <Package className="h-5 w-5 text-indigo-500" />
                Staged Orders
              </h2>
              <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-full">
                {MOCK_ORDERS.filter(o => o.status === 'ready').length} Ready
              </span>
            </div>
            <div className="divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[350px]">
              {MOCK_ORDERS.map(order => (
                <div key={order.id} className="p-4 hover:bg-slate-50 transition-colors cursor-pointer group">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium text-slate-900">{order.id}</span>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                      order.status === 'ready' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {order.status === 'ready' ? 'Ready for Pickup' : 'Picking...'}
                    </span>
                  </div>
                  <div className="text-sm text-slate-500 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" /> {order.customer}
                    </div>
                    {order.status === 'ready' && (
                      <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{order.bags} bags</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Arriving Drivers */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden flex-1">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                <Truck className="h-5 w-5 text-blue-500" />
                Arriving Drivers
              </h2>
            </div>
            <div className="divide-y divide-slate-100 p-2">
              {MOCK_DRIVERS.map(driver => (
                <div key={driver.id} className="p-3 rounded-lg border border-transparent hover:border-blue-100 hover:bg-blue-50/50 transition-all cursor-pointer mb-1 last:mb-0">
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm shadow-sm">
                        {driver.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-slate-900">{driver.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{driver.id} • {driver.vehicle}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {driver.status === 'arrived' ? (
                        <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-md">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Arrived
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-blue-600 text-sm font-semibold bg-blue-50 px-2 py-1 rounded-md">
                          <Clock className="h-3.5 w-3.5" /> {driver.eta}
                        </span>
                      )}
                    </div>
                  </div>
                  {driver.status === 'arrived' && (
                    <div className="mt-3 pt-3 border-t border-blue-50 flex gap-2">
                      <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium py-2 rounded-md transition-colors flex items-center justify-center gap-1.5 shadow-sm">
                        <Package className="h-3.5 w-3.5" /> Assign Order
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Live Tracking Map Placeholder & Active Deliveries */}
        <div className="xl:col-span-2 flex flex-col gap-6">
          
          {/* Map Placeholder */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[400px] xl:h-[500px] relative">
            <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur-sm p-3.5 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-emerald-500" />
                Live Fleet Tracking
              </h3>
              <p className="text-xs text-slate-500 mt-1">12 drivers active in your zone</p>
            </div>
            
            <div className="flex-1 bg-slate-50 w-full relative overflow-hidden flex items-center justify-center border-t border-slate-100">
              {/* Abstract map pattern */}
              <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 text-slate-200 pointer-events-none">
                <defs>
                  <pattern id="grid-large" width="80" height="80" patternUnits="userSpaceOnUse">
                    <path d="M 80 0 L 0 0 0 80" fill="none" stroke="currentColor" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid-large)" />
                {/* Random paths representing roads */}
                <path d="M -100 200 Q 150 150 300 300 T 800 100" fill="none" stroke="#e2e8f0" strokeWidth="12" strokeLinecap="round" />
                <path d="M 100 -50 L 250 150 L 250 400" fill="none" stroke="#e2e8f0" strokeWidth="8" strokeLinecap="round" />
                <path d="M 500 500 L 600 250 L 900 200" fill="none" stroke="#e2e8f0" strokeWidth="10" strokeLinecap="round" />
              </svg>
              
              {/* Map UI Elements */}
              <div className="text-center z-10 relative bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-slate-200/50 max-w-sm mx-4">
                <div className="bg-emerald-50 p-4 rounded-full inline-flex items-center justify-center mb-4 ring-8 ring-emerald-50/50">
                  <Navigation className="h-8 w-8 text-emerald-500" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">Live Map View</h3>
                <p className="text-sm text-slate-500 mt-2">
                  Map integration would render here with live driver coordinates via CityRide Logistics API.
                </p>
              </div>

              {/* Fake Map Markers */}
              <div className="absolute top-[25%] left-[30%] flex flex-col items-center">
                <div className="bg-blue-600 text-white p-2 rounded-full shadow-lg ring-4 ring-blue-600/20">
                  <Truck className="h-4 w-4" />
                </div>
                <div className="bg-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm mt-1.5 border border-slate-100">D-105</div>
              </div>
              <div className="absolute top-[55%] right-[25%] flex flex-col items-center">
                <div className="bg-emerald-500 text-white p-2 rounded-full shadow-lg ring-4 ring-emerald-500/20">
                  <Truck className="h-4 w-4" />
                </div>
                <div className="bg-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm mt-1.5 border border-slate-100">D-881</div>
              </div>
              <div className="absolute bottom-[20%] left-[45%] flex flex-col items-center z-20">
                <div className="bg-indigo-600 p-2.5 rounded-full shadow-xl ring-4 ring-indigo-600/30">
                  <Package className="h-6 w-6 text-white" />
                </div>
                <div className="bg-slate-900 text-white text-xs font-bold px-2.5 py-1 rounded shadow mt-2">Staging Hub</div>
              </div>
            </div>
          </div>

          {/* Active Deliveries */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                <Navigation className="h-5 w-5 text-emerald-500" />
                Active Deliveries
              </h2>
              <button className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors">View All</button>
            </div>
            <div className="p-5 grid gap-5 grid-cols-1 md:grid-cols-2">
              {MOCK_ACTIVE_DELIVERIES.map(delivery => (
                <div key={delivery.id} className="border border-slate-100 bg-slate-50/50 rounded-xl p-4 shadow-sm hover:shadow-md hover:bg-white hover:border-slate-200 transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-xs font-bold text-slate-500">{delivery.id}</span>
                      <h4 className="font-semibold text-slate-900 mt-0.5">Order {delivery.orderId}</h4>
                    </div>
                    <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full">
                      On the way
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3 mb-5">
                    <div className="h-10 w-10 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-sm">
                      <Truck className="h-5 w-5 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{delivery.driver}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" /> {delivery.destination}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-600 mb-1">
                      <span className="font-medium">Delivery Progress</span>
                      <span className="font-bold">{delivery.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-2 rounded-full transition-all duration-1000 ease-out" 
                        style={{ width: `${delivery.progress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
