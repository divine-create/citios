"use client";

import React, { useState, useEffect } from "react";
import {
  ClipboardList,
  Search,
  Package,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  History,
  X
} from "lucide-react";
import { getInventory, adjustStock, getLocations } from "@/lib/actions/retail";
import {
  inputCls,
  selectCls,
  btnPrimary,
  btnOutline,
  Modal,
  StockIndicator,
  SearchInput,
  FilterBar,
  Skeleton,
  ErrorState,
  EmptyState,
  PillTabs,
} from "./ShopUI";

type Tab = "OVERVIEW" | "LOW_STOCK" | "OUT_OF_STOCK";

interface InventoryItem {
  productId: string;
  productName: string;
  variantName: string | null;
  parentId: string | null;
  categoryId: string | null;
  categoryName: string | null;
  sku: string | null;
  imageAssetId: string | null;
  price: number;
  unit: string;
  locationId: string;
  locationName: string;
  stockQuantity: number;
  lowStockLevel: number | null;
  stockId: string | null;
}

export default function InventoryTab({ organizationId, locationId }: { organizationId: string; locationId?: string | null }) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<Tab>("OVERVIEW");
  const [search, setSearch] = useState("");
  const [filterLocation, setFilterLocation] = useState<string>(locationId || "ALL");

  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [adjustDelta, setAdjustDelta] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  const load = async () => {
    try {
      const [invData, locData] = await Promise.all([
        getInventory(organizationId),
        getLocations(organizationId)
      ]);
      setItems(invData);
      setLocations(locData);
      setError(null);
    } catch (e: any) {
      setError(e.message || "Failed to load inventory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [organizationId]);

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustItem) return;
    const delta = parseInt(adjustDelta, 10);
    if (!delta || isNaN(delta)) {
      alert("Enter a valid quantity adjustment.");
      return;
    }
    const resultingStock = adjustItem.stockQuantity + delta;
    if (resultingStock < 0) {
      alert(`Adjustment would reduce stock below zero (Current: ${adjustItem.stockQuantity}, Target: ${resultingStock}).`);
      return;
    }

    if (!confirm(`Apply adjustment of ${delta > 0 ? "+" : ""}${delta} to ${adjustItem.productName}? New stock will be ${resultingStock}.`)) {
      return;
    }

    setAdjusting(true);
    try {
      const res = await adjustStock(adjustItem.productId, delta, adjustNote || undefined, adjustItem.locationId);
      if (res && res.error) {
        alert(res.error);
      } else {
        setAdjustItem(null);
        await load();
      }
    } catch (e: any) {
      alert(e.message || "Failed to adjust stock.");
    } finally {
      setAdjusting(false);
    }
  };

  if (loading && items.length === 0) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-10">
        <ErrorState title="Unable to load inventory" message={error} action={<button onClick={load} className={btnPrimary}>Try Again</button>} />
      </div>
    );
  }

  // Derived metrics
  const totalItems = items.length;
  const lowStockCount = items.filter(i => i.lowStockLevel !== null && i.stockQuantity > 0 && i.stockQuantity <= i.lowStockLevel).length;
  const outOfStockCount = items.filter(i => i.stockQuantity <= 0).length;

  const filtered = items.filter((i) => {
    if (filterLocation !== "ALL" && i.locationId !== filterLocation) return false;
    
    if (activeTab === "LOW_STOCK") {
      if (i.lowStockLevel === null || i.stockQuantity <= 0 || i.stockQuantity > i.lowStockLevel) return false;
    } else if (activeTab === "OUT_OF_STOCK") {
      if (i.stockQuantity > 0) return false;
    }

    if (search) {
      const q = search.toLowerCase();
      if (!i.productName.toLowerCase().includes(q) && !(i.sku && i.sku.toLowerCase().includes(q)) && !(i.variantName && i.variantName.toLowerCase().includes(q))) {
        return false;
      }
    }
    return true;
  });

  const getStatus = (item: InventoryItem) => {
    if (item.stockQuantity <= 0) return "OUT_OF_STOCK";
    if (item.lowStockLevel !== null && item.stockQuantity <= item.lowStockLevel) return "LOW_STOCK";
    return "HEALTHY";
  };

  const tabs = [
    { value: "OVERVIEW", label: "Overview" },
    { value: "LOW_STOCK", label: `Low Stock (${lowStockCount})` },
    { value: "OUT_OF_STOCK", label: `Out of Stock (${outOfStockCount})` }
  ];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-ink tracking-tight">Inventory</h2>
          <p className="text-sm text-slate-500 mt-1">Monitor stock levels, identify shortages, and keep every location ready to sell.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Total Records</p>
          <p className="text-2xl font-black text-ink">{totalItems}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Total Units</p>
          <p className="text-2xl font-black text-ink">{items.reduce((sum, i) => sum + i.stockQuantity, 0)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Low Stock</p>
          <p className="text-2xl font-black text-amber-600">{lowStockCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Out of Stock</p>
          <p className="text-2xl font-black text-rose-600">{outOfStockCount}</p>
        </div>
      </div>

      <FilterBar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search product, variant, SKU..." />
        <select value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)} className={inputCls + " w-auto bg-slate-50 border-transparent hover:border-slate-200 focus:bg-white"}>
          <option value="ALL">All Locations</option>
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>{loc.name}</option>
          ))}
        </select>
        <PillTabs tabs={tabs as any} active={activeTab} onChange={(val) => setActiveTab(val as any)} />
      </FilterBar>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={search ? "No matches found" : "Inventory looks good"}
          message={search ? "Try a different search term or filter." : "There are no products matching this view."}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          
          {/* MOBILE CARDS */}
          <div className="block md:hidden divide-y divide-slate-100">
            {filtered.map(i => {
              const status = getStatus(i);
              return (
                <div key={`${i.productId}-${i.locationId}`} className="p-4">
                  <div className="flex gap-4 mb-3">
                    <div className="w-14 h-14 rounded-lg bg-slate-100 flex-shrink-0 border border-slate-200 overflow-hidden">
                      {i.imageAssetId ? <img src={`/api/assets/${i.imageAssetId}`} className="w-full h-full object-cover"/> : <div className="w-full h-full flex justify-center items-center text-slate-300"><Package size={20}/></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-ink truncate">{i.parentId && i.variantName ? `${i.productName} - ${i.variantName}` : i.productName}</p>
                      <p className="text-xs font-semibold text-slate-500 truncate mt-0.5">{i.locationName}</p>
                      <div className="mt-1 flex items-center gap-2">
                         <span className="font-bold text-sm text-slate-900">{i.stockQuantity} {i.unit}</span>
                         {status === "OUT_OF_STOCK" && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">Out of Stock</span>}
                         {status === "LOW_STOCK" && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">Low Stock</span>}
                         {status === "HEALTHY" && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">Healthy</span>}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setAdjustItem(i)} className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-sm transition-colors">Adjust Stock</button>
                </div>
              );
            })}
          </div>

          {/* DESKTOP TABLE */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                  <th className="px-6 py-4 w-12"></th>
                  <th className="px-6 py-4">Product & Variant</th>
                  <th className="px-6 py-4">Location</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Stock</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((i) => {
                  const status = getStatus(i);
                  return (
                    <tr key={`${i.productId}-${i.locationId}`} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 pr-0">
                         <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0">
                            {i.imageAssetId ? <img src={`/api/assets/${i.imageAssetId}`} className="w-full h-full object-cover"/> : <div className="w-full h-full flex justify-center items-center text-slate-300"><Package size={16}/></div>}
                         </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-ink max-w-[250px] truncate">{i.productName}</div>
                        {i.parentId && i.variantName ? (
                           <div className="text-xs font-bold text-brand-600 mt-0.5 bg-brand-50 inline-block px-1.5 py-0.5 rounded">{i.variantName}</div>
                        ) : (
                           <div className="text-xs text-slate-400 font-mono mt-0.5">{i.sku || "No SKU"}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-700">
                        {i.locationName}
                      </td>
                      <td className="px-6 py-4">
                        {status === "OUT_OF_STOCK" && (
                           <div className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 bg-rose-50 px-2 py-1 rounded-md border border-rose-100">
                             <AlertCircle size={14}/> Out of Stock
                           </div>
                        )}
                        {status === "LOW_STOCK" && (
                           <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-md border border-amber-100">
                             <AlertTriangle size={14}/> Low Stock
                           </div>
                        )}
                        {status === "HEALTHY" && (
                           <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                             <CheckCircle2 size={14}/> Healthy
                           </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="font-black text-ink text-base">{i.stockQuantity} <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{i.unit}</span></div>
                        {i.lowStockLevel !== null && <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Min {i.lowStockLevel}</div>}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => setAdjustItem(i)} className="bg-white border border-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-lg text-xs hover:bg-slate-50 transition-colors shadow-sm">Adjust</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {adjustItem && (
        <Modal title="Adjust Stock" onClose={() => setAdjustItem(null)}>
          <form onSubmit={handleAdjust} className="p-6 space-y-6">
            
            <div className="flex gap-4 items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
               <div className="w-12 h-12 rounded-lg bg-white border border-slate-200 overflow-hidden flex-shrink-0">
                  {adjustItem.imageAssetId ? <img src={`/api/assets/${adjustItem.imageAssetId}`} className="w-full h-full object-cover"/> : <div className="w-full h-full flex justify-center items-center text-slate-300"><Package size={16}/></div>}
               </div>
               <div>
                 <p className="font-bold text-ink">{adjustItem.parentId && adjustItem.variantName ? `${adjustItem.productName} - ${adjustItem.variantName}` : adjustItem.productName}</p>
                 <p className="text-sm font-medium text-slate-500">{adjustItem.locationName}</p>
               </div>
            </div>

            <div className="flex justify-between items-center px-2">
              <div className="text-center">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Current Stock</p>
                <p className="text-3xl font-black text-ink">{adjustItem.stockQuantity}</p>
              </div>
              <ChevronRight className="text-slate-300" size={24} />
              <div className="text-center">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Adjustment</p>
                <p className="text-3xl font-black text-brand-600">{adjustDelta ? (parseInt(adjustDelta, 10) > 0 ? `+${parseInt(adjustDelta, 10)}` : parseInt(adjustDelta, 10)) : "0"}</p>
              </div>
              <ChevronRight className="text-slate-300" size={24} />
              <div className="text-center">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">New Stock</p>
                <p className="text-3xl font-black text-emerald-600">{adjustDelta && !isNaN(parseInt(adjustDelta, 10)) ? Math.max(0, adjustItem.stockQuantity + parseInt(adjustDelta, 10)) : adjustItem.stockQuantity}</p>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Adjustment (+ or -)</label>
                <input 
                  type="number" 
                  value={adjustDelta} 
                  onChange={(e) => setAdjustDelta(e.target.value)} 
                  className={inputCls} 
                  placeholder="e.g. 10 or -5" 
                  autoFocus 
                  required 
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Reason (Optional)</label>
                <input 
                  type="text" 
                  value={adjustNote} 
                  onChange={(e) => setAdjustNote(e.target.value)} 
                  className={inputCls} 
                  placeholder="e.g. Received new shipment" 
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button type="button" onClick={() => setAdjustItem(null)} className={btnOutline} disabled={adjusting}>Cancel</button>
              <button type="submit" disabled={adjusting} className={btnPrimary + " min-w-[140px] flex justify-center"}>
                 {adjusting ? <Loader2 className="animate-spin" size={18}/> : "Confirm Adjustment"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
