'use client';

import React, { useState } from 'react';
import { Plus, Minus, Search, Clock, Star, ChevronRight, MapPin } from 'lucide-react';

const mockStorefronts = [
  {
    id: 'store-1',
    name: 'Whole Foods Market',
    eta: 'Delivery by 2:00 PM',
    rating: 4.8,
    deliveryFee: '$3.99',
    imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800',
    tags: ['Organic', 'Groceries']
  },
  {
    id: 'store-2',
    name: 'Trader Joe\'s',
    eta: 'Delivery by 3:30 PM',
    rating: 4.9,
    deliveryFee: '$4.99',
    imageUrl: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&q=80&w=800',
    tags: ['Groceries', 'Snacks']
  },
  {
    id: 'store-3',
    name: 'Costco Wholesale',
    eta: 'Delivery by 5:00 PM',
    rating: 4.7,
    deliveryFee: '$5.99',
    imageUrl: 'https://images.unsplash.com/photo-1534723452862-4c874018d66d?auto=format&fit=crop&q=80&w=800',
    tags: ['Bulk', 'Groceries', 'Electronics']
  }
];

const mockCategories = [
  { id: 'cat-1', name: 'Produce', emoji: '🍎' },
  { id: 'cat-2', name: 'Dairy & Eggs', emoji: '🥚' },
  { id: 'cat-3', name: 'Bakery', emoji: '🥖' },
  { id: 'cat-4', name: 'Meat & Seafood', emoji: '🥩' },
  { id: 'cat-5', name: 'Snacks', emoji: '🍿' },
  { id: 'cat-6', name: 'Beverages', emoji: '🥤' }
];

const mockItems = [
  { id: 'item-1', name: 'Organic Bananas', price: 1.99, categoryId: 'cat-1', imageUrl: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&q=80&w=300', unit: 'per lb' },
  { id: 'item-2', name: 'Avocado', price: 1.50, categoryId: 'cat-1', imageUrl: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&q=80&w=300', unit: 'each' },
  { id: 'item-3', name: 'Whole Milk', price: 3.49, categoryId: 'cat-2', imageUrl: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&q=80&w=300', unit: '1 gallon' },
  { id: 'item-4', name: 'Sourdough Bread', price: 4.99, categoryId: 'cat-3', imageUrl: 'https://images.unsplash.com/photo-1585478259715-876a6a81fa08?auto=format&fit=crop&q=80&w=300', unit: 'loaf' },
  { id: 'item-5', name: 'Free Range Eggs', price: 5.99, categoryId: 'cat-2', imageUrl: 'https://images.unsplash.com/photo-1587486913049-53fc88980cfc?auto=format&fit=crop&q=80&w=300', unit: '1 dozen' },
  { id: 'item-6', name: 'Potato Chips', price: 3.99, categoryId: 'cat-5', imageUrl: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&q=80&w=300', unit: '8 oz bag' }
];

export default function GroceryStorefrontView() {
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({});

  const addToCart = (itemId: string) => {
    setCart(prev => ({ ...prev, [itemId]: (prev[itemId] || 0) + 1 }));
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => {
      const newCart = { ...prev };
      if (newCart[itemId] > 1) {
        newCart[itemId]--;
      } else {
        delete newCart[itemId];
      }
      return newCart;
    });
  };

  const getCartTotal = () => {
    return Object.entries(cart).reduce((total, [itemId, quantity]) => {
      const item = mockItems.find(i => i.id === itemId);
      return total + (item ? item.price * quantity : 0);
    }, 0);
  };

  const getCartCount = () => {
    return Object.values(cart).reduce((sum, count) => sum + count, 0);
  };

  const renderStorefronts = () => (
    <div className="space-y-6 pb-24">
      <div className="flex items-center space-x-2 bg-gray-100 p-3 rounded-full">
        <Search className="w-5 h-5 text-gray-500" />
        <input 
          type="text" 
          placeholder="Search for stores, items, or recipes..." 
          className="bg-transparent border-none outline-none w-full"
        />
      </div>

      <div className="flex items-center text-sm font-medium text-gray-700">
        <MapPin className="w-4 h-4 mr-1 text-green-600" />
        <span>Delivering to 123 Main St</span>
      </div>

      <h2 className="text-xl font-bold mt-6 mb-4">Popular Near You</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockStorefronts.map(store => (
          <div 
            key={store.id} 
            className="rounded-xl border overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group"
            onClick={() => setSelectedStore(store.id)}
          >
            <div className="relative h-48 w-full">
              <img 
                src={store.imageUrl} 
                alt={store.name} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute top-3 left-3 bg-white px-2 py-1 rounded-full text-xs font-bold flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                {store.eta}
              </div>
            </div>
            <div className="p-4 bg-white">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-bold">{store.name}</h3>
                <div className="flex items-center bg-gray-100 px-2 py-1 rounded text-sm">
                  <Star className="w-3 h-3 text-yellow-500 mr-1 fill-current" />
                  {store.rating}
                </div>
              </div>
              <div className="text-gray-500 text-sm mb-3">
                {store.deliveryFee} delivery fee
              </div>
              <div className="flex gap-2">
                {store.tags.map(tag => (
                  <span key={tag} className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAisles = () => {
    const store = mockStorefronts.find(s => s.id === selectedStore);
    if (!store) return null;

    return (
      <div className="pb-24">
        <button 
          onClick={() => setSelectedStore(null)}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ChevronRight className="w-5 h-5 rotate-180 mr-1" />
          Back to stores
        </button>

        <div className="flex items-center space-x-4 mb-6">
          <img src={store.imageUrl} alt={store.name} className="w-16 h-16 rounded-full object-cover border" />
          <div>
            <h1 className="text-2xl font-bold">{store.name}</h1>
            <div className="flex items-center text-sm text-gray-500 mt-1">
              <Clock className="w-4 h-4 mr-1" />
              {store.eta} • {store.deliveryFee} fee
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-bold mb-4">Categories</h2>
          <div className="flex overflow-x-auto pb-4 space-x-4 no-scrollbar">
            {mockCategories.map(cat => (
              <div key={cat.id} className="flex flex-col items-center flex-shrink-0 cursor-pointer">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-2xl mb-2 hover:bg-gray-200 transition-colors">
                  {cat.emoji}
                </div>
                <span className="text-sm font-medium">{cat.name}</span>
              </div>
            ))}
          </div>
        </div>

        {mockCategories.map(cat => {
          const catItems = mockItems.filter(i => i.categoryId === cat.id);
          if (catItems.length === 0) return null;
          
          return (
            <div key={cat.id} className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">{cat.name}</h2>
                <button className="text-green-600 font-medium text-sm">See all</button>
              </div>
              <div className="flex overflow-x-auto pb-4 space-x-4 no-scrollbar">
                {catItems.map(item => (
                  <div key={item.id} className="w-40 flex-shrink-0 border rounded-lg p-3 relative bg-white group hover:shadow-md transition-shadow">
                    <div className="h-32 mb-3 relative rounded-md overflow-hidden bg-gray-100">
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                      
                      <div className="absolute bottom-2 right-2 flex flex-col items-center">
                        {cart[item.id] ? (
                          <div className="flex items-center bg-white shadow-lg rounded-full border border-gray-200 overflow-hidden">
                            <button 
                              onClick={(e) => { e.stopPropagation(); removeFromCart(item.id); }}
                              className="p-1.5 hover:bg-gray-100 text-gray-600"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="px-2 font-semibold text-sm">{cart[item.id]}</span>
                            <button 
                              onClick={(e) => { e.stopPropagation(); addToCart(item.id); }}
                              className="p-1.5 hover:bg-gray-100 text-green-600"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={(e) => { e.stopPropagation(); addToCart(item.id); }}
                            className="bg-white text-green-600 p-2 rounded-full shadow-lg border border-gray-200 hover:bg-green-50 transition-colors"
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="font-bold text-lg">${item.price.toFixed(2)}</div>
                    <div className="text-sm font-medium mt-1 leading-tight">{item.name}</div>
                    <div className="text-xs text-gray-500 mt-1">{item.unit}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const totalQuantity = getCartCount();

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 relative min-h-screen">
      {!selectedStore ? renderStorefronts() : renderAisles()}

      {totalQuantity > 0 && (
        <div className="fixed bottom-6 left-0 right-0 px-4 flex justify-center z-50 pointer-events-none">
          <div className="bg-green-600 text-white p-4 rounded-xl shadow-2xl flex items-center justify-between max-w-md w-full pointer-events-auto cursor-pointer hover:bg-green-700 transition-colors">
            <div className="flex items-center">
              <div className="bg-green-800 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mr-3">
                {totalQuantity}
              </div>
              <span className="font-semibold text-lg">View Cart</span>
            </div>
            <span className="font-bold text-lg">${getCartTotal().toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
