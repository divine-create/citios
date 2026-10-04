"use client";

import React, { useState, useEffect } from "react";
import {
  Package,
  Search,
  Plus,
  AlertTriangle,
  Upload,
  Loader2,
  Trash2,
  History,
  X,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import {
  createProduct,
  updateProduct,
  deleteProduct,
  getRetailSettings,
  adjustStock,
  getStockMovements,
} from "@/lib/actions/retail";
import { uploadAsset } from "@/lib/actions/microsite";
import { DEFAULT_RETAIL_UNITS, normalizeRetailUnits } from "@/lib/defaultUnits";
import {
  inputCls,
  selectCls,
  StatusPill,
  btnPrimary,
  btnOutline,
  Modal,
  PriceDisplay,
  StockIndicator,
  SearchInput,
  FilterBar,
  Skeleton,
  ErrorState,
  EmptyState,
  SectionCard,
  ActionCard,
} from "./ShopUI";

interface Product {
  id: string;
  name: string;
  sku: string | null;
  categoryId: string | null;
  categoryName: string | null;
  price: number;
  compareAtPrice: number | null;
  cost: number | null;
  stockQuantity: number;
  lowStockLevel: number | null;
  isWeighed: boolean;
  unit: string;
  imageAssetId: string | null;
  parentId?: string | null;
  variantName?: string | null;
}

interface Category {
  id: string;
  name: string;
}

const EMPTY_FORM = {
  name: "",
  sku: "",
  categoryId: "",
  price: "",
  compareAtPrice: "",
  cost: "",
  stockQuantity: "",
  lowStockLevel: "",
  isWeighed: false,
  unit: "ea",
};

export default function InventoryManager({
  organizationId,
  locationId,
  products,
  categories,
  onChanged,
  symbol = "$",
}: {
  organizationId: string;
  locationId?: string | null;
  products: Product[];
  categories: Category[];
  onChanged: () => void;
  symbol?: string;
}) {
  const [view, setView] = useState<"LIST" | "FORM">("LIST");
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [filterStock, setFilterStock] = useState<"ALL" | "LOW" | "OUT">("ALL");

  const [customUnits, setCustomUnits] = useState<string[]>([...DEFAULT_RETAIL_UNITS]);
  const [currencySymbol, setCurrencySymbol] = useState<string>(symbol);

  // Form State
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [imageAssetId, setImageAssetId] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Variant filtering (filter out children from main list, map to parents in detail view)
  const parentProducts = products.filter((p) => !p.parentId);
  const allVariants = products.filter((p) => p.parentId);

  const filtered = parentProducts.filter((p) => {
    if (filterCategory !== "ALL" && p.categoryId !== filterCategory) return false;
    if (filterStock === "LOW" && (p.lowStockLevel === null || p.stockQuantity > p.lowStockLevel)) return false;
    if (filterStock === "OUT" && p.stockQuantity > 0) return false;
    if (search) {
      const q = search.toLowerCase();
      return p.name.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q));
    }
    return true;
  });

  const lowStockCount = parentProducts.filter((p) => p.lowStockLevel !== null && p.stockQuantity <= p.lowStockLevel).length;
  const outOfStockCount = parentProducts.filter((p) => p.stockQuantity <= 0).length;

  useEffect(() => {
    async function loadSettings() {
      const settings = await getRetailSettings(organizationId);
      if (settings?.customUnits) {
        setCustomUnits(normalizeRetailUnits(settings.customUnits));
      }
      if (settings?.currencySymbol) {
        setCurrencySymbol(settings.currencySymbol);
      }
    }
    loadSettings();
  }, [organizationId]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    setError(null);
    try {
      const { base64, mimeType } = await new Promise<{ base64: string; mimeType: string }>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const [, b64] = (reader.result as string).split(",");
          resolve({ base64: b64, mimeType: file.type });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await uploadAsset(organizationId, { fileName: file.name, mimeType, base64Data: base64 });
      if (res.error) throw new Error(res.error);
      if (res.assetId) setImageAssetId(res.assetId);
    } catch (err: any) {
      setError(err.message || "Failed to upload image.");
    } finally {
      setUploadingImage(false);
    }
  };

  const openCreate = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setImageAssetId(null);
    setError(null);
    setView("FORM");
  };

  const openEdit = (p: Product) => {
    setEditId(p.id);
    setForm({
      name: p.name,
      sku: p.sku || "",
      categoryId: p.categoryId || "",
      price: p.price.toString(),
      compareAtPrice: p.compareAtPrice ? p.compareAtPrice.toString() : "",
      cost: p.cost ? p.cost.toString() : "",
      stockQuantity: p.stockQuantity.toString(),
      lowStockLevel: p.lowStockLevel !== null ? p.lowStockLevel.toString() : "",
      isWeighed: p.isWeighed,
      unit: p.unit,
    });
    setImageAssetId(p.imageAssetId || null);
    setError(null);
    setView("FORM");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) {
      setError("Product name is required.");
      return;
    }
    const price = parseFloat(form.price);
    if (isNaN(price) || price < 0) {
      setError("A valid selling price is required.");
      return;
    }

    setIsSaving(true);
    try {
      if (editId) {
        const res = await updateProduct(editId, {
          name: form.name,
          sku: form.sku || null,
          categoryId: form.categoryId || null,
          price,
          compareAtPrice: form.compareAtPrice ? parseFloat(form.compareAtPrice) : null,
          cost: form.cost ? parseFloat(form.cost) : null,
          lowStockLevel: form.lowStockLevel ? parseInt(form.lowStockLevel, 10) : null,
          isWeighed: form.isWeighed,
          unit: form.unit,
          imageAssetId,
        });
        if (res && typeof res === "object" && "error" in res && res.error) {
          setError(res.error);
          return;
        }
      } else {
        const res = await createProduct({
          organizationId,
          name: form.name,
          sku: form.sku || undefined,
          categoryId: form.categoryId || undefined,
          price,
          compareAtPrice: form.compareAtPrice ? parseFloat(form.compareAtPrice) : undefined,
          cost: form.cost ? parseFloat(form.cost) : undefined,
          stockQuantity: form.stockQuantity ? parseInt(form.stockQuantity, 10) : 0,
          lowStockLevel: form.lowStockLevel ? parseInt(form.lowStockLevel, 10) : undefined,
          isWeighed: form.isWeighed,
          unit: form.unit,
          imageAssetId: imageAssetId || undefined,
        });
        if (res && typeof res === "object" && "error" in res && res.error) {
          setError(res.error);
          return;
        }
      }
      setView("LIST");
      onChanged();
    } catch (err: any) {
      setError(err.message || "Failed to save product.");
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this product? Existing orders will not be affected, but the product will be removed from your catalog.")) return;
    const res = await deleteProduct(id);
    if (res.error) {
      alert(res.error);
    } else {
      setView("LIST");
      onChanged();
    }
  };

  if (view === "FORM") {
    const isEdit = !!editId;
    const variants = editId ? allVariants.filter(v => v.parentId === editId) : [];

    return (
      <div className="max-w-[1200px] mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => setView("LIST")} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-black text-ink tracking-tight">{isEdit ? "Edit Product" : "New Product"}</h2>
          </div>
        </div>

        {error && <ErrorState title="Validation Error" message={error} />}

        <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            
            {/* BASIC INFO */}
            <SectionCard title="Basic Information">
              <div className="p-6 space-y-5">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Product Name *</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="e.g. Premium Blend Coffee" autoFocus />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Category</label>
                    <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className={selectCls}>
                      <option value="">No Category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">SKU / Barcode</label>
                    <input type="text" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className={inputCls} placeholder="Optional" />
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* PRICING */}
            <SectionCard title="Pricing">
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Selling Price *</label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-bold">{currencySymbol}</span>
                    <input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className={inputCls + " pl-8"} placeholder="0.00" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase text-slate-500">Compare-at Price (Sale)</label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-bold">{currencySymbol}</span>
                    <input type="number" step="0.01" value={form.compareAtPrice} onChange={(e) => setForm({ ...form, compareAtPrice: e.target.value })} className={inputCls + " pl-8"} placeholder="0.00" />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">To show a markdown, enter a value higher than your selling price.</p>
                </div>
              </div>
            </SectionCard>

            {/* INVENTORY */}
            <SectionCard title="Inventory">
              <div className="p-6">
                {!isEdit ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Initial Stock</label>
                      <input type="number" value={form.stockQuantity} onChange={(e) => setForm({ ...form, stockQuantity: e.target.value })} className={inputCls} placeholder="0" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Low Stock Trigger</label>
                      <input type="number" value={form.lowStockLevel} onChange={(e) => setForm({ ...form, lowStockLevel: e.target.value })} className={inputCls} placeholder="e.g. 5" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Unit</label>
                      <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className={selectCls}>
                        {customUnits.map((u) => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-bold text-ink">Current Available Stock</h4>
                        <p className="text-sm text-slate-500">To adjust stock, enter a change amount (e.g. 5, -2).</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black text-ink">{form.stockQuantity}</div>
                        <div className="text-xs font-bold text-slate-400 uppercase">{form.unit}</div>
                      </div>
                    </div>
                    
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
                      <div className="flex gap-3 items-end">
                        <div className="flex-1">
                          <label className="text-xs font-bold text-slate-500 uppercase">Adjust Amount</label>
                          <input type="number" id="adjustDeltaInput" className={inputCls} placeholder="e.g. 10 or -5" />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs font-bold text-slate-500 uppercase">Note (Optional)</label>
                          <input type="text" id="adjustNoteInput" className={inputCls} placeholder="Reason..." />
                        </div>
                        <button type="button" onClick={async () => {
                          const deltaEl = document.getElementById('adjustDeltaInput') as HTMLInputElement;
                          const noteEl = document.getElementById('adjustNoteInput') as HTMLInputElement;
                          const delta = parseInt(deltaEl.value, 10);
                          if (!delta || isNaN(delta)) return alert('Enter a valid adjustment');
                          const res = await adjustStock(editId!, delta, noteEl.value, locationId);
                          if (res.error) alert(res.error);
                          else {
                             deltaEl.value = '';
                             noteEl.value = '';
                             setForm({...form, stockQuantity: (parseInt(form.stockQuantity) + delta).toString()});
                             onChanged();
                          }
                        }} className="bg-slate-800 text-white font-bold px-4 py-2.5 rounded-lg text-sm hover:bg-slate-900 transition-colors">Apply</button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4 border-t border-slate-100">
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Low Stock Trigger</label>
                        <input type="number" value={form.lowStockLevel} onChange={(e) => setForm({ ...form, lowStockLevel: e.target.value })} className={inputCls} placeholder="e.g. 5" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Unit</label>
                        <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className={selectCls}>
                          {customUnits.map((u) => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-2 mt-6">
                  <input type="checkbox" id="isWeighed" checked={form.isWeighed} onChange={(e) => setForm({ ...form, isWeighed: e.target.checked })} className="w-4 h-4 text-brand-600 rounded" />
                  <label htmlFor="isWeighed" className="text-sm font-bold text-slate-700">Variable Weight Item (e.g. sold per kg)</label>
                </div>
              </div>
            </SectionCard>

            {/* VARIANTS */}
            {isEdit && variants.length > 0 && (
              <SectionCard title="Product Variants">
                <div className="p-4 bg-amber-50 border-b border-amber-100 text-amber-900 text-sm font-medium">
                  Variant management is currently restricted. Variants displayed below will remain attached to this product after saving.
                </div>
                <ul className="divide-y divide-slate-100">
                  {variants.map(v => (
                    <li key={v.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                      <div>
                        <p className="font-bold text-ink">{v.variantName || v.name}</p>
                        <p className="text-xs text-slate-500 mt-1"><StockIndicator stock={v.stockQuantity} lowStockLevel={v.lowStockLevel} /></p>
                      </div>
                      <PriceDisplay amount={v.price} currency={currencySymbol} />
                    </li>
                  ))}
                </ul>
              </SectionCard>
            )}
          </div>

          <div className="space-y-6">
            <SectionCard title="Product Image">
              <div className="p-6">
                {imageAssetId ? (
                  <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-slate-100 mb-4 border border-slate-200">
                    <img src={`/api/assets/${imageAssetId}`} alt="Product" className="object-cover w-full h-full" />
                    <button type="button" onClick={() => setImageAssetId(null)} className="absolute top-2 right-2 bg-white/90 text-slate-700 p-1.5 rounded-lg shadow-sm hover:text-rose-600">
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center bg-slate-50 mb-4">
                    <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500 font-medium">Upload an image</p>
                  </div>
                )}
                
                <label className="block">
                  <span className={btnOutline + " w-full text-center cursor-pointer block"}>
                    {uploadingImage ? "Uploading..." : imageAssetId ? "Change Image" : "Select Image"}
                  </span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
                </label>
              </div>
            </SectionCard>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
              <h4 className="font-bold text-slate-700 mb-4">Marketplace Preview</h4>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <div className="aspect-square bg-slate-100 rounded-lg mb-3 overflow-hidden">
                  {imageAssetId ? (
                     <img src={`/api/assets/${imageAssetId}`} alt="Product" className="object-cover w-full h-full" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300"><Package size={32}/></div>
                  )}
                </div>
                <p className="font-bold text-ink truncate">{form.name || "Product Name"}</p>
                <div className="mt-1">
                  <PriceDisplay amount={parseFloat(form.price) || 0} compareAt={form.compareAtPrice ? parseFloat(form.compareAtPrice) : null} currency={currencySymbol} />
                </div>
              </div>
            </div>

            {isEdit && (
              <div className="pt-4 border-t border-slate-200">
                <button type="button" onClick={() => remove(editId)} className="w-full py-3 rounded-xl font-bold text-rose-600 hover:bg-rose-50 transition-colors border border-transparent hover:border-rose-100">
                  Delete Product
                </button>
              </div>
            )}
          </div>

          <div className="lg:col-span-3 sticky bottom-0 bg-white/80 backdrop-blur-md border-t border-slate-200 p-4 -mx-6 lg:mx-0 lg:rounded-2xl flex justify-end gap-3 z-10 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
            <button type="button" onClick={() => setView("LIST")} className={btnOutline}>Cancel</button>
            <button type="submit" disabled={isSaving} className={btnPrimary + " min-w-[140px] flex items-center justify-center"}>
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : "Save Product"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // -------------------------
  // LIST VIEW
  // -------------------------
  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-ink tracking-tight">Products</h2>
          <p className="text-sm text-slate-500 mt-1">Manage your catalog, variants, and pricing.</p>
        </div>
        <button onClick={openCreate} className={btnPrimary}>
          <Plus size={18} className="mr-1.5" /> Add Product
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Total</p>
          <p className="text-2xl font-black text-ink">{parentProducts.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Variants</p>
          <p className="text-2xl font-black text-ink">{allVariants.length}</p>
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
        <SearchInput value={search} onChange={setSearch} placeholder="Search products..." />
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className={inputCls + " w-auto bg-slate-50 border-transparent hover:border-slate-200 focus:bg-white"}>
          <option value="ALL">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select value={filterStock} onChange={(e) => setFilterStock(e.target.value as any)} className={inputCls + " w-auto bg-slate-50 border-transparent hover:border-slate-200 focus:bg-white"}>
          <option value="ALL">All Inventory</option>
          <option value="LOW">Low Stock</option>
          <option value="OUT">Out of Stock</option>
        </select>
      </FilterBar>

      {filtered.length === 0 ? (
        <EmptyState icon={Package} title={search ? "No products found" : "Your catalog is empty"} message={search ? "Try a different search term or filter." : "Add your first product to start selling."} action={!search && <button onClick={openCreate} className={btnPrimary}>Add Product</button>} />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          
          {/* MOBILE CARDS */}
          <div className="block md:hidden divide-y divide-slate-100">
            {filtered.map(p => {
              const vCount = allVariants.filter(v => v.parentId === p.id).length;
              return (
                <div key={p.id} className="p-4 hover:bg-slate-50 cursor-pointer" onClick={() => openEdit(p)}>
                  <div className="flex gap-4">
                    <div className="w-16 h-16 rounded-lg bg-slate-100 flex-shrink-0 border border-slate-200 overflow-hidden">
                      {p.imageAssetId ? <img src={`/api/assets/${p.imageAssetId}`} className="w-full h-full object-cover"/> : <div className="w-full h-full flex justify-center items-center text-slate-300"><Package size={24}/></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-ink truncate">{p.name}</p>
                      <PriceDisplay amount={p.price} compareAt={p.compareAtPrice} currency={currencySymbol} className="mt-0.5" />
                      <div className="mt-2 flex items-center gap-3 text-xs text-slate-500 font-medium">
                        <StockIndicator stock={p.stockQuantity} lowStockLevel={p.lowStockLevel} />
                        {vCount > 0 && <span>• {vCount} variant{vCount > 1 ? 's' : ''}</span>}
                      </div>
                    </div>
                  </div>
                  <button className="mt-3 w-full py-2 bg-slate-100 text-slate-700 font-bold rounded-lg text-sm">Edit Product</button>
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
                  <th className="px-6 py-4">Product</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4 text-right">Price</th>
                  <th className="px-6 py-4">Inventory</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p) => {
                  const vCount = allVariants.filter(v => v.parentId === p.id).length;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors cursor-pointer group" onClick={() => openEdit(p)}>
                      <td className="px-6 py-4 pr-0">
                         <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0">
                            {p.imageAssetId ? <img src={`/api/assets/${p.imageAssetId}`} className="w-full h-full object-cover"/> : <div className="w-full h-full flex justify-center items-center text-slate-300"><Package size={16}/></div>}
                         </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-ink max-w-[250px] truncate">{p.name}</div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">{p.sku || "No SKU"}</div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusPill tone="slate">{p.categoryName || "Uncategorized"}</StatusPill>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <PriceDisplay amount={p.price} compareAt={p.compareAtPrice} currency={currencySymbol} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <StockIndicator stock={p.stockQuantity} lowStockLevel={p.lowStockLevel} />
                          {vCount > 0 && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{vCount} variant{vCount > 1 ? 's' : ''}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-brand-600 font-bold text-xs group-hover:text-brand-800">Edit</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
