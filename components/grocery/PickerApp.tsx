"use client";

import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  MapPin, 
  Package, 
  Search, 
  AlertTriangle, 
  ArrowRight,
  ShoppingCart,
  Phone,
  MessageSquare
} from 'lucide-react';

// Mock Data
const MOCK_ORDER = {
  id: "ORD-9824",
  customer: "Eleanor Shellstrop",
  status: "picking",
  timeElapsed: "12 mins",
  totalItems: 8,
  items: [
    { id: "1", name: "Organic Bananas", size: "1 bunch", aisle: "Produce - A1", image: "🍌", picked: false },
    { id: "2", name: "Avocado", size: "3 ct", aisle: "Produce - A1", image: "🥑", picked: false },
    { id: "3", name: "Whole Milk", size: "1 Gallon", aisle: "Dairy - B4", image: "🥛", picked: false },
    { id: "4", name: "Cheddar Cheese", size: "8 oz", aisle: "Dairy - B4", image: "🧀", picked: false },
    { id: "5", name: "Sourdough Bread", size: "1 loaf", aisle: "Bakery - C2", image: "🍞", picked: false },
    { id: "6", name: "Coffee Beans", size: "12 oz", aisle: "Aisle 4", image: "☕", picked: false },
    { id: "7", name: "Frozen Pizza", size: "1 box", aisle: "Frozen - F1", image: "🍕", picked: false },
    { id: "8", name: "Ice Cream", size: "1 pint", aisle: "Frozen - F2", image: "🍨", picked: false },
  ]
};

const REPLACEMENTS = [
  { id: "r1", name: "Almond Milk (Unsweetened)", size: "64 oz", price: "$3.99" },
  { id: "r2", name: "Oat Milk", size: "64 oz", price: "$4.49" },
  { id: "r3", name: "2% Reduced Fat Milk", size: "1 Gallon", price: "$3.49" }
];

export default function PickerApp() {
  const [items, setItems] = useState(MOCK_ORDER.items);
  const [replacementModalOpen, setReplacementModalOpen] = useState(false);
  const [selectedItemForReplacement, setSelectedItemForReplacement] = useState<any>(null);

  const togglePicked = (id: string) => {
    setItems(items.map(item => item.id === id ? { ...item, picked: !item.picked } : item));
  };

  const openReplacementModal = (item: any) => {
    setSelectedItemForReplacement(item);
    setReplacementModalOpen(true);
  };

  const handleReplace = (replacementId: string) => {
    setItems(items.map(item => {
      if (item.id === selectedItemForReplacement.id) {
        return { ...item, name: `Replaced: ${item.name}`, picked: true };
      }
      return item;
    }));
    setReplacementModalOpen(false);
    setSelectedItemForReplacement(null);
  };

  // Group by Aisle
  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.aisle]) acc[item.aisle] = [];
    acc[item.aisle].push(item);
    return acc;
  }, {} as Record<string, typeof items>);

  const progress = Math.round((items.filter(i => i.picked).length / items.length) * 100);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans max-w-md mx-auto shadow-xl relative">
      {/* Header */}
      <header className="bg-blue-600 text-white p-4 pb-6 rounded-b-2xl shadow-md z-10">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <ShoppingCart className="w-6 h-6" />
              Order {MOCK_ORDER.id}
            </h1>
            <p className="text-blue-100 text-sm">{MOCK_ORDER.customer}</p>
          </div>
          <div className="flex gap-3">
            <button className="p-2 bg-blue-500 rounded-full hover:bg-blue-400 transition-colors">
              <MessageSquare className="w-5 h-5" />
            </button>
            <button className="p-2 bg-blue-500 rounded-full hover:bg-blue-400 transition-colors">
              <Phone className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="bg-blue-700/50 rounded-full h-3 w-full overflow-hidden mb-2">
          <div 
            className="bg-green-400 h-full transition-all duration-500 ease-out" 
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-blue-100 font-medium">
          <span>{items.filter(i => i.picked).length} of {items.length} items picked</span>
          <span>{MOCK_ORDER.timeElapsed} elapsed</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">
        {Object.entries(groupedItems).map(([aisle, aisleItems]) => (
          <div key={aisle} className="space-y-3">
            <div className="flex items-center gap-2 sticky top-0 bg-gray-50 py-2 z-10">
              <MapPin className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-bold text-gray-800">{aisle}</h2>
            </div>
            
            <div className="space-y-3">
              {aisleItems.map(item => (
                <div 
                  key={item.id} 
                  className={`bg-white p-4 rounded-xl shadow-sm border-l-4 transition-all ${
                    item.picked ? 'border-green-500 opacity-60' : 'border-blue-500'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => togglePicked(item.id)}
                      className="flex-shrink-0"
                    >
                      {item.picked ? (
                        <CheckCircle2 className="w-8 h-8 text-green-500" />
                      ) : (
                        <Circle className="w-8 h-8 text-gray-300 hover:text-blue-400 transition-colors" />
                      )}
                    </button>
                    
                    <div className="flex-1 flex items-center gap-3">
                      <div className="text-2xl bg-gray-100 p-2 rounded-lg">{item.image}</div>
                      <div>
                        <h3 className={`font-semibold ${item.picked ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                          {item.name}
                        </h3>
                        <p className="text-sm text-gray-500">{item.size}</p>
                      </div>
                    </div>
                    
                    {!item.picked && (
                      <button 
                        onClick={() => openReplacementModal(item)}
                        className="text-xs font-medium text-orange-500 bg-orange-50 px-3 py-2 rounded-lg hover:bg-orange-100 transition-colors flex flex-col items-center"
                      >
                        <AlertTriangle className="w-4 h-4 mb-1" />
                        OOS
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>

      {/* Floating Action Button */}
      {progress === 100 && (
        <div className="absolute bottom-6 left-0 right-0 px-4">
          <button className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-2xl shadow-lg flex justify-center items-center gap-2 transition-transform transform hover:scale-[1.02]">
            <Package className="w-6 h-6" />
            Complete Order
          </button>
        </div>
      )}

      {/* Replacement Modal */}
      {replacementModalOpen && selectedItemForReplacement && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-200">
            <div className="p-6 border-b">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Item Out of Stock</h3>
                  <p className="text-gray-500 text-sm mt-1">Select a replacement for {selectedItemForReplacement.name}</p>
                </div>
                <button 
                  onClick={() => setReplacementModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search store inventory..." 
                  className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                />
              </div>
            </div>
            
            <div className="p-4 bg-gray-50 max-h-64 overflow-y-auto space-y-3">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-2">Suggested Replacements</h4>
              {REPLACEMENTS.map(rep => (
                <button 
                  key={rep.id}
                  onClick={() => handleReplace(rep.id)}
                  className="w-full bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between hover:border-blue-300 hover:bg-blue-50 transition-all text-left"
                >
                  <div>
                    <h5 className="font-semibold text-gray-900">{rep.name}</h5>
                    <p className="text-sm text-gray-500">{rep.size} • {rep.price}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-blue-500" />
                </button>
              ))}
            </div>
            
            <div className="p-4 bg-white border-t">
              <button 
                onClick={() => setReplacementModalOpen(false)}
                className="w-full py-3 text-red-600 font-semibold hover:bg-red-50 rounded-xl transition-colors"
              >
                Refund Item (No Replacement)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
