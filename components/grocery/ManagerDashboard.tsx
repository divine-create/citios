"use client";

import React, { useState } from 'react';
import { 
  ShoppingBag, 
  Package, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  Truck, 
  AlertCircle,
  Search,
  Filter,
  Edit2,
  Trash2,
  Plus,
  ArrowUpRight,
  Store,
  Megaphone,
  Barcode
} from 'lucide-react';

// Mock Data
const MOCK_ORDERS = [
  { id: 'ORD-001', customer: 'Alice Smith', items: 12, total: 145.20, status: 'pending', time: '10 mins ago' },
  { id: 'ORD-002', customer: 'Bob Jones', items: 5, total: 45.00, status: 'picking', time: '25 mins ago', picker: 'Sarah M.' },
  { id: 'ORD-003', customer: 'Charlie Brown', items: 24, total: 289.50, status: 'ready', time: '1 hour ago' },
  { id: 'ORD-004', customer: 'Diana Prince', items: 8, total: 85.00, status: 'delivered', time: '2 hours ago' },
  { id: 'ORD-005', customer: 'Evan Wright', items: 15, total: 120.75, status: 'pending', time: '2 mins ago' },
  { id: 'ORD-006', customer: 'Fiona Gallagher', items: 3, total: 25.40, status: 'picking', time: '15 mins ago', picker: 'Mike T.' },
];

const MOCK_INVENTORY = [
  { id: 'INV-101', name: 'Organic Bananas (Bunch)', category: 'Produce', price: 2.99, stock: 145, status: 'in_stock', vendor: 'Local Farms' },
  { id: 'INV-102', name: 'Whole Milk 1 Gal', category: 'Dairy', price: 4.50, stock: 32, status: 'low_stock', vendor: 'Dairy Co.' },
  { id: 'INV-103', name: 'Sourdough Bread', category: 'Bakery', price: 5.99, stock: 0, status: 'out_of_stock', vendor: 'City Bakery' },
  { id: 'INV-104', name: 'Free Range Eggs (Dozen)', category: 'Dairy', price: 6.49, stock: 85, status: 'in_stock', vendor: 'Local Farms' },
  { id: 'INV-105', name: 'Avocado', category: 'Produce', price: 1.50, stock: 12, status: 'low_stock', vendor: 'Fresh Imports' },
  { id: 'INV-106', name: 'Ground Beef 80/20 1lb', category: 'Meat', price: 7.99, stock: 45, status: 'in_stock', vendor: 'City Butchers' },
];

const MOCK_ANALYTICS = {
  totalSales: 12450.00,
  salesGrowth: 14.5,
  avgBasket: 85.40,
  basketGrowth: 2.3,
  activeOrders: 24,
  topItems: [
    { name: 'Organic Bananas (Bunch)', sold: 342, revenue: 1022.58 },
    { name: 'Avocado', sold: 285, revenue: 427.50 },
    { name: 'Whole Milk 1 Gal', sold: 198, revenue: 891.00 },
  ]
};

type Tab = 'orders' | 'inventory' | 'analytics' | 'marketplace';

export default function ManagerDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('orders');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <ShoppingBag className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">CityConnect Grocery</h1>
              <p className="text-sm text-gray-500">Store Manager Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
              <AlertCircle className="h-5 w-5" />
            </button>
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold">
              SM
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-6">
        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-gray-200/50 p-1 rounded-lg w-fit mb-8">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'orders' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Clock className="h-4 w-4" />
            Live Orders
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'inventory' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Package className="h-4 w-4" />
            Inventory
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'analytics' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('marketplace')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'marketplace' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Store className="h-4 w-4" />
            CityMall
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'orders' && <OrdersTab />}
        {activeTab === 'inventory' && <InventoryTab />}
        {activeTab === 'analytics' && <AnalyticsTab />}
        {activeTab === 'marketplace' && <MarketplaceTab />}
      </main>
    </div>
  );
}

function OrdersTab() {
  const columns = [
    { id: 'pending', title: 'Pending', icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' },
    { id: 'picking', title: 'Picking', icon: Package, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
    { id: 'ready', title: 'Ready for Driver', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
    { id: 'delivered', title: 'Delivered', icon: Truck, color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' },
  ];

  return (
    <div className="h-[calc(100vh-220px)] flex gap-6 overflow-x-auto pb-4">
      {columns.map(col => (
        <div key={col.id} className={`flex-1 min-w-[300px] flex flex-col rounded-xl border ${col.border} ${col.bg} p-4`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <col.icon className={`h-5 w-5 ${col.color}`} />
              <h3 className={`font-semibold ${col.color}`}>{col.title}</h3>
            </div>
            <span className="bg-white text-gray-600 text-xs font-medium px-2.5 py-1 rounded-full shadow-sm border border-gray-100">
              {MOCK_ORDERS.filter(o => o.status === col.id).length}
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {MOCK_ORDERS.filter(o => o.status === col.id).map(order => (
              <div key={order.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-semibold text-gray-500">{order.id}</span>
                  <span className="text-xs text-gray-400">{order.time}</span>
                </div>
                <h4 className="font-medium text-gray-900 mb-1">{order.customer}</h4>
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>{order.items} items</span>
                  <span className="font-medium">${order.total.toFixed(2)}</span>
                </div>
                {order.picker && (
                  <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-2 text-xs text-gray-500">
                    <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-medium">
                      {order.picker.charAt(0)}
                    </div>
                    Picking: {order.picker}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function InventoryTab() {
  const lowStockCount = MOCK_INVENTORY.filter(i => i.status !== 'in_stock').length;

  return (
    <div className="space-y-6">
      {lowStockCount > 0 && (
        <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-xl shadow-sm">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-orange-500 mr-2" />
            <h3 className="text-orange-800 font-medium">Low Stock Alerts</h3>
          </div>
          <p className="text-sm text-orange-700 mt-1">
            {lowStockCount} items require your attention.
          </p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative flex-1 max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search catalog..." 
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
            />
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium text-sm transition-colors">
              <Barcode className="h-4 w-4" />
              Scan Barcode
            </button>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium text-sm transition-colors">
              <Filter className="h-4 w-4" />
              Filter
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors w-full sm:w-auto justify-center">
              <Plus className="h-4 w-4" />
              Add Item
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-6 py-4 font-medium">Product</th>
                <th className="px-6 py-4 font-medium">Category</th>
                <th className="px-6 py-4 font-medium">Vendor</th>
                <th className="px-6 py-4 font-medium">Price</th>
                <th className="px-6 py-4 font-medium">Stock Level</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {MOCK_INVENTORY.map(item => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{item.name}</div>
                    <div className="text-gray-500 text-xs mt-0.5">{item.id}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{item.category}</td>
                  <td className="px-6 py-4 text-gray-600">{item.vendor}</td>
                  <td className="px-6 py-4 text-gray-900 font-medium">${item.price.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${
                        item.status === 'in_stock' ? 'bg-green-500' :
                        item.status === 'low_stock' ? 'bg-yellow-500' : 'bg-red-500'
                      }`} />
                      <span className={`font-medium ${
                        item.status === 'in_stock' ? 'text-green-700' :
                        item.status === 'low_stock' ? 'text-yellow-700' : 'text-red-700'
                      }`}>
                        {item.stock} units
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-gray-400 hover:text-blue-600 p-1 transition-colors">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button className="text-gray-400 hover:text-red-600 p-1 ml-2 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AnalyticsTab() {
  return (
    <div className="space-y-6">
      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="text-gray-500 text-sm font-medium mb-2">Today's Revenue</div>
          <div className="flex items-end gap-3">
            <div className="text-3xl font-bold text-gray-900">${MOCK_ANALYTICS.totalSales.toLocaleString()}</div>
            <div className="flex items-center text-sm font-medium text-green-600 mb-1">
              <ArrowUpRight className="h-4 w-4 mr-1" />
              {MOCK_ANALYTICS.salesGrowth}%
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="text-gray-500 text-sm font-medium mb-2">Average Basket</div>
          <div className="flex items-end gap-3">
            <div className="text-3xl font-bold text-gray-900">${MOCK_ANALYTICS.avgBasket.toFixed(2)}</div>
            <div className="flex items-center text-sm font-medium text-green-600 mb-1">
              <ArrowUpRight className="h-4 w-4 mr-1" />
              {MOCK_ANALYTICS.basketGrowth}%
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="text-gray-500 text-sm font-medium mb-2">Active Orders (Last 24h)</div>
          <div className="flex items-end gap-3">
            <div className="text-3xl font-bold text-gray-900">{MOCK_ANALYTICS.activeOrders}</div>
          </div>
        </div>
      </div>

      {/* Main Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-200 min-h-[400px] flex flex-col items-center justify-center text-gray-400">
          <TrendingUp className="h-12 w-12 mb-4 text-gray-300" />
          <p className="font-medium">Revenue Trends Chart</p>
          <p className="text-sm mt-1">Data visualization would appear here</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
          <div className="p-6 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Top Selling Items</h3>
          </div>
          <div className="p-6 flex-1 flex flex-col gap-6">
            {MOCK_ANALYTICS.topItems.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 mb-1">{item.name}</div>
                  <div className="text-sm text-gray-500">{item.sold} units sold</div>
                </div>
                <div className="font-semibold text-gray-900">
                  ${item.revenue.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MarketplaceTab() {
  return (
    <div className="space-y-6">
      {/* Revenue Splits */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <Store className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">CityMall Revenue</h3>
          </div>
          <div className="text-3xl font-bold text-gray-900">$8,450.00</div>
          <div className="text-sm text-green-600 mt-1">+12.5% this week</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingBag className="h-5 w-5 text-indigo-600" />
            <h3 className="font-semibold text-gray-900">In-Store Revenue</h3>
          </div>
          <div className="text-3xl font-bold text-gray-900">$4,000.00</div>
          <div className="text-sm text-gray-500 mt-1">-2.1% this week</div>
        </div>
      </div>

      {/* Push Products & Promotions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="font-semibold text-gray-900">CityMall Catalog Management</h3>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors">
            <Megaphone className="h-4 w-4" />
            Run Promotion
          </button>
        </div>
        <div className="p-6">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-6 py-4 font-medium">Product</th>
                <th className="px-6 py-4 font-medium">Marketplace Status</th>
                <th className="px-6 py-4 font-medium">Promo Active</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {MOCK_INVENTORY.map(item => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{item.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Listed
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">None</td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-blue-600 hover:text-blue-800 font-medium text-sm">
                      Manage Listing
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
