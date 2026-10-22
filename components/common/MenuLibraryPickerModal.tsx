'use client';

import React, { useState } from 'react';
import { X, Search, Utensils, Check } from 'lucide-react';
import {
  MENU_LIBRARY,
  MENU_LIBRARY_CATEGORIES,
  getMenuLibraryItems,
  MenuItemLibraryEntry,
  MenuLibraryCategory,
} from '@/lib/menu-library';
import { formatNaira } from '@/lib/utils';

interface MenuLibraryPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: MenuItemLibraryEntry) => void;
  title?: string;
  subtitle?: string;
  selectedImageUrl?: string;
}

export default function MenuLibraryPickerModal({
  isOpen,
  onClose,
  onSelect,
  title = 'Menu & Food Library',
  subtitle = 'Pick from 50 standardized Nigerian dishes, grills, soups, and beverages with high quality photos',
  selectedImageUrl,
}: MenuLibraryPickerModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (!isOpen) return null;

  const items = getMenuLibraryItems(selectedCategory, searchQuery);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base">{title}</h3>
              <p className="text-xs text-slate-500">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Category filter */}
        <div className="px-6 py-3 border-b border-slate-100 space-y-3 bg-white shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by dish name, ingredient (e.g. jollof, afang, turkey, 5alive, sprite)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-colors"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {MENU_LIBRARY_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`text-[11px] px-3 py-1 rounded-full font-bold whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Items Grid */}
        <div className="p-6 overflow-y-auto flex-1 min-h-[360px]">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
            {items.map((item) => {
              const isSelected = selectedImageUrl === item.imageUrl;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelect(item);
                    onClose();
                  }}
                  className={`text-left rounded-xl border p-2 flex flex-col gap-2 transition-all group relative ${
                    isSelected
                      ? 'border-orange-500 ring-2 ring-orange-500/20 bg-orange-50/20'
                      : 'border-slate-200 hover:border-orange-400 hover:shadow-md bg-white'
                  }`}
                >
                  <div className="relative w-full aspect-4/3 rounded-lg overflow-hidden bg-slate-100">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 bg-orange-600 text-white p-1 rounded-full shadow">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900 line-clamp-1 group-hover:text-orange-600 transition-colors">
                        {item.name}
                      </p>
                      <p className="text-[10px] text-slate-500 line-clamp-1">{item.category}</p>
                    </div>
                    <p className="text-xs font-black text-slate-900 mt-1">
                      {formatNaira(item.price)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {items.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-sm font-bold text-slate-700">No matching menu items found</p>
              <p className="text-xs text-slate-400 mt-1">Try another search term or select "All" categories.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50 text-[11px] text-slate-500 font-medium">
          <span>Showing {items.length} items from CityOS Menu Library</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
