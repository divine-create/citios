"use client";

import React, { useState } from 'react';
import { ShoppingCart, Search, ScanLine, Wallet, CreditCard, CheckCircle2, Plus, Minus, X } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  color: string;
}

const INVENTORY: Product[] = [
  { id: '1', name: 'Organic Bananas', price: 2.99, category: 'Produce', color: 'bg-yellow-100 border-yellow-200 text-yellow-800' },
  { id: '2', name: 'Hass Avocado', price: 1.50, category: 'Produce', color: 'bg-green-100 border-green-200 text-green-800' },
  { id: '3', name: 'Whole Milk 1G', price: 4.49, category: 'Dairy', color: 'bg-blue-100 border-blue-200 text-blue-800' },
  { id: '4', name: 'Sourdough Loaf', price: 5.99, category: 'Bakery', color: 'bg-amber-100 border-amber-200 text-amber-800' },
  { id: '5', name: 'Farm Eggs (12)', price: 3.99, category: 'Dairy', color: 'bg-blue-50 border-blue-100 text-blue-700' },
  { id: '6', name: 'Local Honey', price: 8.99, category: 'Pantry', color: 'bg-orange-100 border-orange-200 text-orange-800' },
  { id: '7', name: 'Ground Coffee', price: 12.99, category: 'Pantry', color: 'bg-stone-200 border-stone-300 text-stone-800' },
  { id: '8', name: 'Fresh Strawberries', price: 4.99, category: 'Produce', color: 'bg-red-100 border-red-200 text-red-800' },
  { id: '9', name: 'Almond Milk', price: 4.99, category: 'Dairy', color: 'bg-blue-50 border-blue-200 text-blue-800' },
  { id: '10', name: 'French Baguette', price: 3.49, category: 'Bakery', color: 'bg-amber-50 border-amber-200 text-amber-700' },
  { id: '11', name: 'Organic Carrots', price: 2.49, category: 'Produce', color: 'bg-orange-100 border-orange-200 text-orange-800' },
  { id: '12', name: 'Fresh Salmon', price: 15.99, category: 'Meat & Seafood', color: 'bg-rose-100 border-rose-200 text-rose-800' },
];

interface CartItem extends Product {
  quantity: number;
}

export default function RetailPOS() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [checkoutStatus, setCheckoutStatus] = useState<'idle' | 'processing' | 'success'>('idle');

  const filteredInventory = INVENTORY.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addToCart = (product: Product) => {
    if (checkoutStatus === 'success') return;
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = total * 0.08;
  const grandTotal = total + tax;

  const handleCityWalletCheckout = () => {
    setCheckoutStatus('processing');
    setTimeout(() => {
      setCheckoutStatus('success');
      setTimeout(() => {
        setCart([]);
        setCheckoutStatus('idle');
      }, 3000);
    }, 1500);
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      {/* Main Register Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-4 w-1/2">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="text" 
                placeholder="Search products or scan barcode..." 
                className="w-full pl-10 pr-4 py-3 bg-gray-100 border-transparent rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-lg"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="p-3 bg-gray-100 rounded-lg text-gray-600 hover:bg-gray-200 transition-colors">
              <ScanLine className="w-6 h-6" />
            </button>
          </div>
          <div className="flex items-center space-x-2">
             <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                Register Online
             </div>
          </div>
        </header>

        {/* Quick Add Grid */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredInventory.map(item => (
              <button 
                key={item.id}
                onClick={() => addToCart(item)}
                className={`flex flex-col items-start p-4 rounded-xl border-2 transition-all hover:shadow-md active:scale-95 text-left h-32 justify-between ${item.color}`}
              >
                <div className="font-semibold text-lg leading-tight line-clamp-2">{item.name}</div>
                <div className="flex justify-between w-full items-end mt-2">
                  <span className="text-sm opacity-80">{item.category}</span>
                  <span className="font-bold text-lg">${item.price.toFixed(2)}</span>
                </div>
              </button>
            ))}
          </div>
          {filteredInventory.length === 0 && (
             <div className="flex flex-col items-center justify-center h-64 text-gray-400">
               <Search className="w-12 h-12 mb-4 opacity-50" />
               <p className="text-lg">No products found matching "{searchQuery}"</p>
             </div>
          )}
        </main>
      </div>

      {/* Cart / Ledger Sidebar */}
      <div className="w-96 bg-white border-l border-gray-200 flex flex-col shadow-xl z-10">
        <div className="p-5 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800 flex items-center">
            <ShoppingCart className="w-6 h-6 mr-2" />
            Current Ticket
          </h2>
          <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-full">
            {cart.reduce((sum, item) => sum + item.quantity, 0)} Items
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
              <ShoppingCart className="w-16 h-16 opacity-20" />
              <p>Cart is empty</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex flex-col p-3 border border-gray-100 rounded-lg bg-white shadow-sm group">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-800">{item.name}</h3>
                    <p className="text-sm text-gray-500">${item.price.toFixed(2)} / ea</p>
                  </div>
                  <span className="font-bold text-gray-800">${(item.price * item.quantity).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <div className="flex items-center space-x-3 bg-gray-100 rounded-lg p-1">
                    <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-white rounded text-gray-600 shadow-sm transition-colors">
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="font-semibold w-6 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-white rounded text-gray-600 shadow-sm transition-colors">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-gray-200 p-5 bg-gray-50">
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>${total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Tax (8%)</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-2xl font-bold text-gray-800 pt-2 border-t border-gray-200 mt-2">
              <span>Total</span>
              <span>${grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {checkoutStatus === 'success' ? (
            <div className="w-full bg-green-500 text-white rounded-xl p-4 flex flex-col items-center justify-center shadow-lg transform transition-all">
              <CheckCircle2 className="w-10 h-10 mb-2" />
              <span className="font-bold text-lg">Payment Successful!</span>
              <span className="text-sm opacity-80 mt-1">Receipt sent via CityWallet</span>
            </div>
          ) : (
            <div className="space-y-3">
              <button 
                disabled={cart.length === 0 || checkoutStatus === 'processing'}
                onClick={handleCityWalletCheckout}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl p-4 flex items-center justify-center font-bold text-lg shadow-md transition-all active:scale-95"
              >
                {checkoutStatus === 'processing' ? (
                  <span className="flex items-center animate-pulse">
                    Processing...
                  </span>
                ) : (
                  <>
                    <Wallet className="w-6 h-6 mr-2" />
                    CityWallet Tap-to-Pay
                  </>
                )}
              </button>
              <button 
                disabled={cart.length === 0 || checkoutStatus === 'processing'}
                className="w-full bg-white border-2 border-gray-200 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-100 text-gray-800 rounded-xl p-3 flex items-center justify-center font-semibold shadow-sm transition-all active:scale-95"
              >
                <CreditCard className="w-5 h-5 mr-2" />
                Other Payment
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
