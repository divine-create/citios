'use client';

import React from 'react';

import { Badge } from '@/components/ui';
import { LineChart, DollarSign, Receipt, TrendingUp, CreditCard, Wallet, Banknote, CalendarDays, PieChart } from 'lucide-react';
import { formatNaira } from '@/lib/utils';

export function RevenueManager({
  summary
}: {
  summary: any;
}) {
  const { today, week, openTickets } = summary;

  return (
    <div className="space-y-8">
      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Today's Revenue</p>
              <h3 className="text-3xl font-black text-slate-900">{formatNaira(today.revenue)}</h3>
            </div>
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <DollarSign size={24} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm font-medium text-emerald-600">
            <TrendingUp size={16} className="mr-1" />
            <span>Updated real-time</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Today's Orders</p>
              <h3 className="text-3xl font-black text-slate-900">{today.orders}</h3>
            </div>
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
              <Receipt size={24} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm font-medium text-slate-500">
            <span>Completed transactions</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Average Ticket</p>
              <h3 className="text-3xl font-black text-slate-900">{formatNaira(today.averageTicket)}</h3>
            </div>
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
              <PieChart size={24} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm font-medium text-slate-500">
            <span>Per completed order</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Open Tickets</p>
              <h3 className="text-3xl font-black text-slate-900">{openTickets}</h3>
            </div>
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              <LineChart size={24} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm font-medium text-slate-500">
            <span>Orders in progress</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Summary */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
            <CalendarDays size={20} className="text-slate-400" />
            7-Day Financial Summary
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
              <span className="font-bold text-slate-600">Gross Revenue (7 days)</span>
              <span className="font-black text-slate-900">{formatNaira(week.revenue)}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
              <span className="font-bold text-slate-600">Operating Expenses</span>
              <span className="font-black text-rose-600">-{formatNaira(week.expenses)}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <span className="font-bold text-emerald-800">Net Flow</span>
              <span className="font-black text-emerald-700">{formatNaira(week.net)}</span>
            </div>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-4 text-center">
            Net flow represents Gross Revenue minus Recorded Expenses over the trailing 7 days.
          </p>
        </div>

        {/* Revenue by Method */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
            <Wallet size={20} className="text-slate-400" />
            Today's Payment Methods
          </h3>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                <Wallet size={20} />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-slate-900">CityPay Wallet</h4>
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2">
                  <div className="bg-teal-500 h-1.5 rounded-full" style={{ width: `${today.revenue > 0 ? (today.revenueByMethod.WALLET / today.revenue) * 100 : 0}%` }} />
                </div>
              </div>
              <div className="text-right">
                <div className="font-black text-slate-900">{formatNaira(today.revenueByMethod.WALLET)}</div>
                <div className="text-xs text-slate-500 font-bold mt-1">
                  {today.revenue > 0 ? Math.round((today.revenueByMethod.WALLET / today.revenue) * 100) : 0}%
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Banknote size={20} />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-slate-900">Cash</h4>
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2">
                  <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${today.revenue > 0 ? (today.revenueByMethod.CASH / today.revenue) * 100 : 0}%` }} />
                </div>
              </div>
              <div className="text-right">
                <div className="font-black text-slate-900">{formatNaira(today.revenueByMethod.CASH)}</div>
                <div className="text-xs text-slate-500 font-bold mt-1">
                  {today.revenue > 0 ? Math.round((today.revenueByMethod.CASH / today.revenue) * 100) : 0}%
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                <CreditCard size={20} />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-slate-900">Card POS</h4>
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2">
                  <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${today.revenue > 0 ? (today.revenueByMethod.POS / today.revenue) * 100 : 0}%` }} />
                </div>
              </div>
              <div className="text-right">
                <div className="font-black text-slate-900">{formatNaira(today.revenueByMethod.POS)}</div>
                <div className="text-xs text-slate-500 font-bold mt-1">
                  {today.revenue > 0 ? Math.round((today.revenueByMethod.POS / today.revenue) * 100) : 0}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
