'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, MapPin, Star, Plus, Minus, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMoney } from '@/components/cityos/CityProvider';
import { FallbackImg, Money } from '@/components/cityos/CityUI';

// --- PRIMITIVES ---

export function MarketBadge({ children, variant = 'default', className }: { children: React.ReactNode, variant?: 'default'|'success'|'warning'|'danger'|'outline', className?: string }) {
  const styles = {
    default: 'bg-slate-100 text-slate-800',
    success: 'bg-emerald-100 text-emerald-800',
    warning: 'bg-amber-100 text-amber-800',
    danger: 'bg-rose-100 text-rose-800',
    outline: 'border border-slate-200 text-slate-600',
  };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider', styles[variant], className)}>
      {children}
    </span>
  );
}

// --- PRODUCT COMPONENTS ---

export interface ProductCardProps {
  id: string;
  name: string;
  image?: string;
  price: number;
  compareAtPrice?: number | null;
  shopName?: string;
  inStock?: boolean;
  href?: string;
  className?: string;
}

export function ProductCard({ id, name, image, price, compareAtPrice, shopName, inStock = true, href, className }: ProductCardProps) {
  const { fmt } = useMoney();
  const discount = compareAtPrice && compareAtPrice > price ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100) : 0;
  
  const content = (
    <div className={cn('group flex flex-col h-full bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-xl hover:border-slate-200 transition-all active:scale-[0.98] duration-200', className)}>
      <div className="relative aspect-square bg-slate-50 overflow-hidden">
        <FallbackImg src={image} alt={name} className="w-full h-full group-hover:scale-105 transition-transform duration-500" />
        {discount > 0 && (
          <div className="absolute top-2 left-2">
            <MarketBadge variant="danger">-{discount}%</MarketBadge>
          </div>
        )}
        {!inStock && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
            <MarketBadge variant="outline" className="bg-white/90">Out of Stock</MarketBadge>
          </div>
        )}
      </div>
      
      <div className="p-3 flex flex-col flex-grow">
        {shopName && <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 line-clamp-1">{shopName}</div>}
        <h3 className="text-sm font-semibold text-slate-800 leading-tight mb-2 line-clamp-2">{name}</h3>
        
        <div className="mt-auto flex items-baseline gap-1.5 flex-wrap">
          <span className="text-sm font-black text-slate-900">{fmt(price)}</span>
          {compareAtPrice && compareAtPrice > price && (
            <span className="text-xs font-semibold text-slate-400 line-through">{fmt(compareAtPrice)}</span>
          )}
        </div>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href} className="block h-full outline-none focus-visible:ring-2 focus-visible:ring-ink rounded-2xl">{content}</Link>;
  }
  return content;
}

export function ProductGrid({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4', className)}>
      {children}
    </div>
  );
}

export function ProductRail({ children, className, title, action }: { children: React.ReactNode, className?: string, title?: string, action?: React.ReactNode }) {
  return (
    <div className={cn('py-4', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between px-4 md:px-0 mb-3">
          {title && <h2 className="text-lg font-black text-slate-800">{title}</h2>}
          {action}
        </div>
      )}
      {/* Horizontal scroll area with safe padding for mobile edges */}
      <div className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar pb-4 -mx-4 px-4 md:mx-0 md:px-0 gap-3 md:gap-4">
        {React.Children.map(children, (child) => (
          <div className="w-[140px] md:w-[180px] shrink-0 snap-start">
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}

// --- SHOP & CATEGORY CARDS ---

export function CategoryCard({ name, image, href, className }: { name: string, image?: string, href: string, className?: string }) {
  return (
    <Link href={href} className={cn('group relative block aspect-square rounded-2xl overflow-hidden active:scale-95 transition-transform bg-slate-100', className)}>
      <FallbackImg src={image} alt={name} className="w-full h-full brightness-90 group-hover:scale-105 group-hover:brightness-75 transition-all duration-500" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-3">
        <span className="text-white font-bold text-sm leading-tight">{name}</span>
      </div>
    </Link>
  );
}

export function ShopCard({ id, name, type, image, rating, href, className }: { id: string, name: string, type?: string, image?: string, rating?: number, href: string, className?: string }) {
  return (
    <Link href={href} className={cn('group flex items-center gap-3 p-3 bg-white rounded-2xl border border-slate-100 hover:border-slate-200 hover:shadow-md transition-all', className)}>
      <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-slate-50">
        <FallbackImg src={image} alt={name} className="w-full h-full" />
      </div>
      <div className="flex-grow min-w-0">
        <h3 className="font-bold text-slate-800 truncate text-sm">{name}</h3>
        <div className="flex items-center gap-2 mt-0.5">
          {type && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{type}</span>}
          {rating && (
            <span className="flex items-center text-xs font-bold text-amber-500">
              <Star className="w-3 h-3 fill-amber-500 mr-0.5" />
              {rating.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

// --- INTERACTIVE SELECTORS ---

export function QuantitySelector({ 
  value, 
  onChange, 
  max = 99, 
  min = 1,
  disabled = false
}: { 
  value: number, 
  onChange: (val: number) => void, 
  max?: number, 
  min?: number,
  disabled?: boolean
}) {
  return (
    <div className={cn("inline-flex items-center bg-slate-50 rounded-xl border border-slate-200 p-1", disabled && "opacity-50 pointer-events-none")}>
      <button 
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-slate-200 hover:text-slate-900 rounded-lg disabled:opacity-30 transition-colors"
      >
        <Minus className="w-4 h-4" />
      </button>
      <span className="w-8 text-center text-sm font-black text-slate-800">{value}</span>
      <button 
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-slate-200 hover:text-slate-900 rounded-lg disabled:opacity-30 transition-colors"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}

export function VariantSelector({
  options,
  selectedId,
  onChange,
  disabled = false
}: {
  options: { id: string; name: string; available: boolean; price?: number }[];
  selectedId?: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const { fmt } = useMoney();
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const isSelected = selectedId === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            disabled={disabled || !opt.available}
            onClick={() => onChange(opt.id)}
            className={cn(
              "px-4 py-2 text-sm font-semibold rounded-xl border transition-all",
              isSelected 
                ? "bg-ink border-ink text-white shadow-md ring-2 ring-ink ring-offset-1" 
                : "bg-white border-slate-200 text-slate-700 hover:border-slate-300",
              (!opt.available && !isSelected) && "opacity-40 bg-slate-50 line-through"
            )}
          >
            {opt.name}
            {opt.price !== undefined && <span className={cn("ml-1.5 opacity-70", isSelected ? "text-white" : "")}>{fmt(opt.price)}</span>}
          </button>
        );
      })}
    </div>
  );
}

// --- SEARCH & UI ---

export function MarketSearch({ 
  value, 
  onChange, 
  onSubmit, 
  placeholder = "Search marketplace..." 
}: { 
  value: string, 
  onChange: (val: string) => void, 
  onSubmit?: () => void,
  placeholder?: string 
}) {
  return (
    <form 
      onSubmit={(e) => { e.preventDefault(); onSubmit?.(); }} 
      className="relative flex items-center w-full"
    >
      <Search className="absolute left-4 text-slate-400 w-5 h-5" />
      <input 
        type="text" 
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-slate-100 hover:bg-slate-200 focus:bg-white text-slate-900 placeholder:text-slate-500 rounded-2xl pl-12 pr-4 py-3.5 text-base font-semibold border-2 border-transparent focus:border-ink outline-none transition-all"
      />
    </form>
  );
}

export function ErrorState({ title, message, retry }: { title?: string, message: string, retry?: () => void }) {
  return (
    <div className="p-6 bg-rose-50 border border-rose-100 rounded-2xl flex flex-col items-center text-center">
      <AlertCircle className="w-10 h-10 text-rose-500 mb-3" />
      <h3 className="font-bold text-rose-900 mb-1">{title ?? 'Something went wrong'}</h3>
      <p className="text-sm text-rose-700/80 mb-4">{message}</p>
      {retry && (
        <button onClick={retry} className="px-4 py-2 bg-rose-600 text-white text-sm font-bold rounded-xl hover:bg-rose-700 transition-colors">
          Try Again
        </button>
      )}
    </div>
  );
}
