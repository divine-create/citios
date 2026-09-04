"use client";

import React, { useState } from "react";
import { Building, Calculator, Calendar, CheckCircle, ChevronDown, Clock, CreditCard, DollarSign, Download, FileText, Filter, Plus, Search, ShoppingCart, Tag, Users, Wallet, AlertCircle, TrendingUp, MoreVertical, Activity, ArrowRight } from 'lucide-react';

// Mock Data
const TUITION_DATA = [
  { id: "INV-101", student: "Alice Johnson", grade: "10th", amount: 5000, status: "Paid", date: "2026-08-01" },
  { id: "INV-102", student: "Bob Smith", grade: "9th", amount: 5000, status: "Pending", date: "2026-08-15" },
  { id: "INV-103", student: "Charlie Davis", grade: "11th", amount: 5200, status: "Overdue", date: "2026-07-01" },
  { id: "INV-104", student: "Diana Evans", grade: "12th", amount: 5500, status: "Paid", date: "2026-08-05" },
];

const LUNCH_BALANCES = [
  { id: "ST-001", student: "Alice Johnson", balance: 45.50, status: "Healthy" },
  { id: "ST-002", student: "Bob Smith", balance: 5.00, status: "Low" },
  { id: "ST-003", student: "Charlie Davis", balance: -2.50, status: "Negative" },
  { id: "ST-004", student: "Diana Evans", balance: 20.00, status: "Healthy" },
];

const PAYROLL_DATA = [
  { id: "EMP-01", name: "Sarah Connor", role: "Math Teacher", salary: 4500, status: "Processed" },
  { id: "EMP-02", name: "John Doe", role: "Science Teacher", salary: 4600, status: "Processed" },
  { id: "EMP-03", name: "Jane Smith", role: "Administrator", salary: 5200, status: "Pending" },
  { id: "EMP-04", name: "Mike Johnson", role: "Janitor", salary: 3100, status: "Pending" },
];

export default function FinanceDashboard() {
  const [activeTab, setActiveTab] = useState("tuition");

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Bursar & Finance Portal</h1>
          <p className="text-gray-500 mt-1">Manage tuition, CityWallet balances, and school payroll.</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Generate Report
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-start gap-4">
          <div className="p-3 bg-green-100 text-green-700 rounded-lg">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Tuition Collected</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">$1.2M</h3>
            <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +12% from last month
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-start gap-4">
          <div className="p-3 bg-blue-100 text-blue-700 rounded-lg">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">CityWallet Deposits</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">$45,230</h3>
            <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
              <Activity className="w-3 h-3" /> Active accounts: 842
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-start gap-4">
          <div className="p-3 bg-purple-100 text-purple-700 rounded-lg">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Next Payroll Run</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">$124,500</h3>
            <p className="text-xs text-gray-500 mt-1">Due in 3 days</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("tuition")}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
              activeTab === "tuition"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <FileText className="w-4 h-4" />
            Tuition Management
          </button>
          <button
            onClick={() => setActiveTab("citywallet")}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
              activeTab === "citywallet"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <CreditCard className="w-4 h-4" />
            CityWallet Balances
          </button>
          <button
            onClick={() => setActiveTab("payroll")}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
              activeTab === "payroll"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <Users className="w-4 h-4" />
            Payroll Processing
          </button>
                  <button
            onClick={() => setActiveTab("ecommerce")}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-colors ${
              activeTab === "ecommerce"
                ? "bg-green-50 text-green-700"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <ShoppingCart className="w-5 h-5" />
            <span>School Store</span>
          </button>
        </nav>
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        
        {activeTab === "tuition" && (
          <div>
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h3 className="font-semibold text-gray-800">Recent Invoices</h3>
              <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">View All</button>
            </div>
            <div className="divide-y divide-gray-200">
              {TUITION_DATA.map((item) => (
                <div key={item.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-medium">
                      {item.student.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.student}</p>
                      <p className="text-xs text-gray-500">{item.id} â€¢ Grade {item.grade}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">${item.amount.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">Due {item.date}</p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      item.status === 'Paid' ? 'bg-green-100 text-green-800' :
                      item.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {item.status}
                    </span>
                    <button className="text-gray-400 hover:text-gray-600">
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "citywallet" && (
          <div>
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h3 className="font-semibold text-gray-800">Student Lunch Accounts</h3>
              <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">Send Reminders</button>
            </div>
            <div className="divide-y divide-gray-200">
              {LUNCH_BALANCES.map((item) => (
                <div key={item.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.student}</p>
                      <p className="text-xs text-gray-500">ID: {item.id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className={`text-sm font-medium ${item.balance < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                        ${item.balance.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">Current Balance</p>
                    </div>
                    <div className="w-24">
                      {item.status === 'Healthy' && (
                        <span className="flex items-center gap-1 text-xs font-medium text-green-600">
                          <CheckCircle className="w-3 h-3" /> Healthy
                        </span>
                      )}
                      {item.status === 'Low' && (
                        <span className="flex items-center gap-1 text-xs font-medium text-yellow-600">
                          <AlertCircle className="w-3 h-3" /> Low
                        </span>
                      )}
                      {item.status === 'Negative' && (
                        <span className="flex items-center gap-1 text-xs font-medium text-red-600">
                          <AlertCircle className="w-3 h-3" /> Negative
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "payroll" && (
          <div>
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h3 className="font-semibold text-gray-800">Staff Payroll</h3>
              <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">Approve All Pending</button>
            </div>
            <div className="divide-y divide-gray-200">
              {PAYROLL_DATA.map((item) => (
                <div key={item.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                      {item.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">${item.salary.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">Net Pay</p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      item.status === 'Processed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}






