"use client";

import React, { useState } from "react";
import { 
  TrendingUp, 
  Users, 
  CalendarDays, 
  DollarSign, 
  Percent, 
  Settings2,
  Calendar,
  Save,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  Activity
} from "lucide-react";

const MOCK_REVENUE_DATA = [
  { month: "Jan", revenue: 45000, occupancy: 65 },
  { month: "Feb", revenue: 52000, occupancy: 72 },
  { month: "Mar", revenue: 48000, occupancy: 68 },
  { month: "Apr", revenue: 61000, occupancy: 82 },
  { month: "May", revenue: 75000, occupancy: 89 },
  { month: "Jun", revenue: 85000, occupancy: 94 },
  { month: "Jul", revenue: 92000, occupancy: 98 },
];

export function ManagerDashboard() {
  const [baseRate, setBaseRate] = useState(150);
  const [weekendSurge, setWeekendSurge] = useState(20);
  const [holidaySurge, setHolidaySurge] = useState(50);
  
  const currentMonthRevenue = MOCK_REVENUE_DATA[MOCK_REVENUE_DATA.length - 1].revenue;
  const previousMonthRevenue = MOCK_REVENUE_DATA[MOCK_REVENUE_DATA.length - 2].revenue;
  const revenueGrowth = ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100;

  const currentOccupancy = MOCK_REVENUE_DATA[MOCK_REVENUE_DATA.length - 1].occupancy;

  const handleSaveRates = () => {
    // Mock save action
    alert("Rates updated successfully!");
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 bg-slate-50 min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <Building2 className="w-8 h-8 text-blue-600" />
            General Manager Portal
          </h1>
          <p className="text-slate-500 mt-1">
            Overview of property performance, revenue insights, and rate management.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
          <Calendar className="w-5 h-5 text-slate-400" />
          <span className="text-sm font-medium text-slate-700">Today, Aug 29</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
            <DollarSign className="w-16 h-16 text-blue-600" />
          </div>
          <p className="text-sm font-semibold text-slate-500 mb-2">Total Revenue (MTD)</p>
          <div className="flex items-end gap-4">
            <h2 className="text-4xl font-bold text-slate-900">${currentMonthRevenue.toLocaleString()}</h2>
            <div className={`flex items-center gap-1 text-sm font-medium mb-1 ${revenueGrowth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {revenueGrowth >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              {Math.abs(revenueGrowth).toFixed(1)}%
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
            <Users className="w-16 h-16 text-indigo-600" />
          </div>
          <p className="text-sm font-semibold text-slate-500 mb-2">Current Occupancy</p>
          <div className="flex items-end gap-4">
            <h2 className="text-4xl font-bold text-slate-900">{currentOccupancy}%</h2>
            <div className="flex items-center gap-1 text-sm font-medium mb-1 text-emerald-600">
              <ArrowUpRight className="w-4 h-4" />
              4.2%
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
            <Activity className="w-16 h-16 text-violet-600" />
          </div>
          <p className="text-sm font-semibold text-slate-500 mb-2">RevPAR</p>
          <div className="flex items-end gap-4">
            <h2 className="text-4xl font-bold text-slate-900">${(currentMonthRevenue / (30 * 50)).toFixed(0)}</h2>
            <div className="flex items-center gap-1 text-sm font-medium mb-1 text-emerald-600">
              <ArrowUpRight className="w-4 h-4" />
              8.5%
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Charts / Insights */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Revenue Insights (Mock Chart) */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  Revenue Insights
                </h3>
                <p className="text-sm text-slate-500">Monthly revenue vs occupancy trends</p>
              </div>
            </div>
            
            <div className="h-64 flex items-end justify-between gap-2 px-2">
              {MOCK_REVENUE_DATA.map((data, idx) => {
                const maxRev = 100000;
                const height = (data.revenue / maxRev) * 100;
                
                return (
                  <div key={idx} className="w-full flex flex-col items-center gap-2 group">
                    <div className="relative w-full flex justify-center h-full items-end">
                      {/* Tooltip */}
                      <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-xs py-1 px-2 rounded whitespace-nowrap z-10 pointer-events-none">
                        ${data.revenue.toLocaleString()}
                        <br/>
                        {data.occupancy}% Occ
                      </div>
                      <div 
                        className="w-full max-w-[3rem] bg-blue-100 group-hover:bg-blue-200 transition-colors rounded-t-lg relative overflow-hidden flex items-end"
                        style={{ height: `${height}%` }}
                      >
                        <div 
                          className="w-full bg-blue-500 group-hover:bg-blue-600 transition-colors"
                          style={{ height: `${data.occupancy}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs font-medium text-slate-500">{data.month}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-center gap-6 mt-6 border-t border-slate-100 pt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-100" />
                <span className="text-xs text-slate-600">Gross Revenue</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-xs text-slate-600">Occupancy Contribution</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic Rate Manager */}
        <div className="lg:col-span-1 space-y-8">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm h-full">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-indigo-600" />
                Dynamic Rate Manager
              </h3>
              <p className="text-sm text-slate-500">Configure base rates and multipliers to optimize yield.</p>
            </div>

            <div className="space-y-6">
              
              {/* Base Rate */}
              <div>
                <label className="flex items-center justify-between text-sm font-semibold text-slate-700 mb-2">
                  <span>Standard Base Rate</span>
                  <span className="text-slate-400 font-normal">Per night</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="number"
                    value={baseRate}
                    onChange={(e) => setBaseRate(Number(e.target.value))}
                    className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
                  />
                </div>
              </div>

              {/* Weekend Surge */}
              <div className="pt-4 border-t border-slate-100">
                <label className="flex items-center justify-between text-sm font-semibold text-slate-700 mb-2">
                  <span>Weekend Surge</span>
                  <span className="text-slate-400 font-normal">Fri - Sun</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Percent className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="number"
                    value={weekendSurge}
                    onChange={(e) => setWeekendSurge(Number(e.target.value))}
                    className="block w-full pl-10 pr-16 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-slate-400 sm:text-sm">= ${(baseRate * (1 + weekendSurge / 100)).toFixed(0)}</span>
                  </div>
                </div>
              </div>

              {/* Holiday Surge */}
              <div className="pt-4 border-t border-slate-100">
                <label className="flex items-center justify-between text-sm font-semibold text-slate-700 mb-2">
                  <span>Holiday Surge</span>
                  <span className="text-slate-400 font-normal">Peak dates</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Percent className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="number"
                    value={holidaySurge}
                    onChange={(e) => setHolidaySurge(Number(e.target.value))}
                    className="block w-full pl-10 pr-16 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-slate-400 sm:text-sm">= ${(baseRate * (1 + holidaySurge / 100)).toFixed(0)}</span>
                  </div>
                </div>
              </div>

            </div>

            <div className="mt-8 pt-6 border-t border-slate-100">
              <button 
                onClick={handleSaveRates}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <Save className="w-5 h-5" />
                Save Rate Configuration
              </button>
            </div>
            
            <div className="mt-4 bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
              <CalendarDays className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-800 leading-relaxed">
                Changes apply to all future unbound reservations. Existing bookings will retain their original rate.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
