"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Search, Package, Users, ShoppingCart, User as UserIcon, Loader2, X, CornerDownLeft } from "lucide-react";
import { searchShopOS } from "@/lib/actions/retail";

type ResultIcon = "PRODUCT" | "CUSTOMER" | "ORDER" | "STAFF";

interface SearchResult {
  id: string;
  name: string;
  subtitle: string;
  icon: ResultIcon;
}

interface Results {
  products: SearchResult[];
  customers: SearchResult[];
  orders: SearchResult[];
  staff: SearchResult[];
}

const EMPTY_RESULTS: Results = { products: [], customers: [], orders: [], staff: [] };

const ICONS: Record<ResultIcon, React.ComponentType<{ size?: number; className?: string }>> = {
  PRODUCT: Package,
  CUSTOMER: Users,
  ORDER: ShoppingCart,
  STAFF: UserIcon,
};

const TARGETS: Record<ResultIcon, string> = {
  PRODUCT: "Products & Inventory",
  CUSTOMER: "Customers",
  ORDER: "Sales & Returns",
  STAFF: "Staff",
};

const GROUP_LABELS: { key: keyof Results; label: string }[] = [
  { key: "products", label: "Products" },
  { key: "customers", label: "Customers" },
  { key: "orders", label: "Orders" },
  { key: "staff", label: "Staff" },
];

export default function GlobalSearch({ organizationId, onClose, onNavigate }: {
  organizationId: string;
  onClose: () => void;
  onNavigate: (tab: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Results>(EMPTY_RESULTS);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const q = query.trim();
      if (!q) {
        setResults(EMPTY_RESULTS);
        setLoading(false);
        setSearched(false);
        return;
      }
      setLoading(true);
      try {
        const res = await searchShopOS(organizationId, q);
        setResults(res);
      } finally {
        setLoading(false);
        setSearched(true);
        setActiveIndex(-1);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, organizationId]);

  const flat = useCallback(
    () => [...results.products, ...results.customers, ...results.orders, ...results.staff],
    [results]
  );

  const go = (r: SearchResult) => {
    onNavigate(TARGETS[r.icon]);
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flat().length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      const all = flat();
      if (all[activeIndex]) go(all[activeIndex]);
    }
  };

  const all = flat();
  const total = results.products.length + results.customers.length + results.orders.length + results.staff.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[10vh]">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
          <Search size={18} className="text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products, customers, orders, staff..."
            className="flex-1 border-none outline-none text-slate-800 placeholder:text-slate-400 text-base"
          />
          {loading ? (
            <Loader2 size={18} className="animate-spin text-blue-500" />
          ) : (
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
          )}
        </div>

        <div className="max-h-[55vh] overflow-y-auto">
          {!query.trim() ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              <p className="font-semibold text-slate-500 mb-1">Search the whole store</p>
              <p>Type to find products, customers, orders or staff. Press <Kbd>Esc</Kbd> to close.</p>
            </div>
          ) : total === 0 && !loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              No results for <span className="font-semibold text-slate-600">&quot;{query}&quot;</span>
            </div>
          ) : (
            <div className="py-2">
              {GROUP_LABELS.map(({ key, label }) => {
                const group = results[key];
                if (group.length === 0) return null;
                return (
                  <div key={key}>
                    <p className="px-5 pt-3 pb-1 text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                    {group.map((r) => {
                      const idx = all.indexOf(r);
                      const Icon = ICONS[r.icon];
                      return (
                        <button
                          key={`${key}-${r.id}`}
                          onMouseEnter={() => setActiveIndex(idx)}
                          onClick={() => go(r)}
                          className={`w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors ${activeIndex === idx ? "bg-blue-50" : "hover:bg-slate-50"}`}
                        >
                          <span className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${activeIndex === idx ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500"}`}>
                            <Icon size={15} />
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm font-semibold text-slate-800 truncate">{r.name}</span>
                            <span className="block text-xs text-slate-400 truncate">{r.subtitle}</span>
                          </span>
                          <CornerDownLeft size={14} className="text-slate-300 flex-shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-xs font-mono border border-slate-200">{children}</kbd>;
}