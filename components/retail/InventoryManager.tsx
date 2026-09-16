"use client";

import React, { useState, useEffect } from "react";
import { Plus, Search, Edit2, Trash2, ArrowUpDown, Package, AlertTriangle, X, Upload, Loader2, FolderTree, History, ArrowUpFromLine } from "lucide-react";
import { createProduct, updateProduct, deleteProduct, createCategory, updateCategory, deleteCategory, getRetailSettings, adjustStock, getStockMovements } from "@/lib/actions/retail";
import { uploadAsset } from "@/lib/actions/microsite";

interface Product {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  categoryId: string | null;
  categoryName: string | null;
  price: number;
  cost: number | null;
  stockQuantity: number;
  lowStockLevel: number | null;
  isWeighed: boolean;
  unit: string;
  imageAssetId: string | null;
}

function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const [, base64] = result.split(",");
      resolve({ base64, mimeType: file.type });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface Category {
  id: string;
  name: string;
  description?: string | null;
}

const EMPTY_FORM = { name: "", sku: "", barcode: "", categoryId: "", price: "", cost: "", stockQuantity: "", lowStockLevel: "", isWeighed: false, unit: "ea" };

export default function InventoryManager({ organizationId, products, categories, onChanged, symbol = "$" }: {
  organizationId: string;
  products: Product[];
  categories: Category[];
  onChanged: () => void;
  symbol?: string;
}) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"PRODUCTS" | "CATEGORIES">("PRODUCTS");
  const [customUnits, setCustomUnits] = useState<string[]>(['ea', 'lb', 'kg', 'pack', 'box']);
  const [currencySymbol, setCurrencySymbol] = useState<string>(symbol);

  useEffect(() => {
    async function loadSettings() {
      const settings = await getRetailSettings(organizationId);
      if (settings?.customUnits) {
        setCustomUnits(JSON.parse(settings.customUnits));
      }
      if (settings?.currencySymbol) {
        setCurrencySymbol(settings.currencySymbol);
      }
    }
    loadSettings();
  }, [organizationId]);

  // Product State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [imageAssetId, setImageAssetId] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

// Category State
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editCatId, setEditCatId] = useState<string | null>(null);
  const [catName, setCatName] = useState("");
  const [catDesc, setCatDesc] = useState("");

  // Stock ledger state (Phase 3)
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [movements, setMovements] = useState<any[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);
  const [adjustDelta, setAdjustDelta] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [isAdjusting, setIsAdjusting] = useState(false);

  const openHistory = async (p: Product) => {
    setHistoryProduct(p);
    setMovements([]);
    setLoadingMovements(true);
    try {
      const rows = await getStockMovements(organizationId, p.id);
      setMovements(rows);
    } finally {
      setLoadingMovements(false);
    }
  };

  const openAdjust = (p: Product) => {
    setAdjustProduct(p);
    setAdjustDelta("");
    setAdjustNote("");
    setAdjustError(null);
  };

  const submitAdjust = async () => {
    if (!adjustProduct) return;
    setAdjustError(null);
    const delta = parseFloat(adjustDelta);
    if (isNaN(delta) || delta === 0) { setAdjustError("Enter a quantity change (+ receives, − removes)."); return; }
    setIsAdjusting(true);
    try {
      const res = await adjustStock(adjustProduct.id, delta, adjustNote.trim() || undefined);
      if ((res as any)?.error) { setAdjustError((res as any).error); return; }
      setAdjustProduct(null);
      onChanged();
    } finally {
      setIsAdjusting(false);
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (p.barcode ?? "").includes(search)
  );

  const openAdd = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setImageAssetId(null);
    setError(null);
    setIsModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditId(p.id);
    setForm({
      name: p.name,
      sku: p.sku ?? "",
      barcode: p.barcode ?? "",
      categoryId: p.categoryId ?? "",
      price: String(p.price),
      cost: p.cost != null ? String(p.cost) : "",
      stockQuantity: String(p.stockQuantity),
      lowStockLevel: p.lowStockLevel != null ? String(p.lowStockLevel) : "",
      isWeighed: p.isWeighed,
      unit: p.unit,
    });
    setImageAssetId(p.imageAssetId);
    setError(null);
    setIsModalOpen(true);
  };

  const handleImageUpload = async (file: File) => {
    setUploadingImage(true);
    try {
      const { base64, mimeType } = await fileToBase64(file);
      const res = await uploadAsset(organizationId, { fileName: file.name, mimeType, base64Data: base64 });
      if ((res as any)?.assetId) setImageAssetId((res as any).assetId);
    } finally {
      setUploadingImage(false);
    }
  };

  const submit = async () => {
    setError(null);
    const price = parseFloat(form.price);
    if (!form.name.trim()) { setError("Product name is required."); return; }
    if (isNaN(price) || price < 0) { setError("A valid price is required."); return; }

    setIsSaving(true);
    try {
      if (editId) {
        const res = await updateProduct(editId, {
          name: form.name,
          sku: form.sku || null,
          barcode: form.barcode || null,
          categoryId: form.categoryId || null,
          price,
          cost: form.cost ? parseFloat(form.cost) : null,
          lowStockLevel: form.lowStockLevel ? parseInt(form.lowStockLevel, 10) : null,
          isWeighed: form.isWeighed,
          unit: form.unit,
          imageAssetId,
        });
        if ((res as any)?.error) { setError((res as any).error); return; }
      } else {
        const res = await createProduct({
          organizationId,
          name: form.name,
          sku: form.sku || undefined,
          barcode: form.barcode || undefined,
          categoryId: form.categoryId || undefined,
          price,
          cost: form.cost ? parseFloat(form.cost) : undefined,
          stockQuantity: form.stockQuantity ? parseInt(form.stockQuantity, 10) : 0,
          lowStockLevel: form.lowStockLevel ? parseInt(form.lowStockLevel, 10) : undefined,
          isWeighed: form.isWeighed,
          unit: form.unit,
          imageAssetId: imageAssetId || undefined,
        });
        if ((res as any)?.error) { setError((res as any).error); return; }
      }
      setIsModalOpen(false);
      onChanged();
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    const res = await deleteProduct(id);
    if ((res as any)?.error) { alert((res as any).error); return; }
    onChanged();
  };

  const openCatAdd = () => {
    setEditCatId(null);
    setCatName("");
    setCatDesc("");
    setError(null);
    setIsCatModalOpen(true);
  };

  const openCatEdit = (cat: Category) => {
    setEditCatId(cat.id);
    setCatName(cat.name);
    setCatDesc(cat.description || "");
    setError(null);
    setIsCatModalOpen(true);
  };

  const submitCat = async () => {
    setError(null);
    if (!catName.trim()) { setError("Category name is required"); return; }
    setIsSaving(true);
    try {
      if (editCatId) {
        const res = await updateCategory(editCatId, { name: catName, description: catDesc || undefined });
        if ((res as any)?.error) { setError((res as any).error); return; }
      } else {
        const res = await createCategory({ organizationId, name: catName, description: catDesc || undefined });
        if ((res as any)?.error) { setError((res as any).error); return; }
      }
      setIsCatModalOpen(false);
      onChanged();
    } finally {
      setIsSaving(false);
    }
  };

  const removeCat = async (id: string) => {
    if (!confirm("Delete this category? Products using it must be reassigned first.")) return;
    const res = await deleteCategory(id);
    if ((res as any)?.error) { alert((res as any).error); return; }
    onChanged();
  };

  const totalValue = products.reduce((sum, p) => sum + (p.cost ?? 0) * p.stockQuantity, 0);
  const lowStockCount = products.filter((p) => p.lowStockLevel != null && p.stockQuantity <= (p.lowStockLevel as number)).length;

  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Products & Inventory</h2>
          <div className="flex gap-4 mt-3">
            <button
              onClick={() => setActiveTab("PRODUCTS")}
              className={`text-sm font-bold pb-2 border-b-2 transition-colors ${activeTab === 'PRODUCTS' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Products
            </button>
            <button
              onClick={() => setActiveTab("CATEGORIES")}
              className={`text-sm font-bold pb-2 border-b-2 transition-colors ${activeTab === 'CATEGORIES' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Categories
            </button>
          </div>
        </div>
        <button
          onClick={activeTab === 'PRODUCTS' ? openAdd : openCatAdd}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-bold transition-colors shadow-sm mt-2"
        >
          <Plus size={18} /> {activeTab === 'PRODUCTS' ? 'Add Product' : 'Add Category'}
        </button>
      </div>

      {activeTab === 'PRODUCTS' && (
        <>
          {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 flex-shrink-0">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
            <Package size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Products</p>
            <p className="text-2xl font-bold text-slate-800">{products.length}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
            <ArrowUpDown size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Inventory Value</p>
            <p className="text-2xl font-bold text-slate-800">{currencySymbol}{totalValue.toFixed(2)}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-red-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Low Stock Alerts</p>
            <p className="text-2xl font-bold text-red-600">{lowStockCount} Items</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white border border-slate-200 rounded-t-xl p-4 flex gap-4 items-center flex-shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, SKU, or barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow"
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white border-x border-b border-slate-200 rounded-b-xl overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Price / Cost</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Stock</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((item) => {
                const isLowStock = item.lowStockLevel != null && item.stockQuantity <= item.lowStockLevel;
                return (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {item.imageAssetId ? (
                          <img src={`/api/assets/${item.imageAssetId}`} alt="" className="w-10 h-10 object-cover rounded-lg border border-slate-200 flex-shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-300 flex-shrink-0"><Package size={16} /></div>
                        )}
                        <div>
                          <div className="font-bold text-slate-800">{item.name}</div>
                          <div className="text-xs text-slate-500 mt-0.5">SKU: {item.sku ?? "—"} | UPC: {item.barcode ?? "—"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                        {item.categoryName ?? "Uncategorized"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
<div className="font-bold text-slate-800">{currencySymbol}{item.price.toFixed(2)}{item.isWeighed ? `/${item.unit}` : ""}</div>
                      <div className="text-xs text-slate-500 mt-0.5">Cost: {item.cost != null ? `${currencySymbol}${item.cost.toFixed(2)}` : "—"}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className={`font-bold inline-flex items-center gap-1.5 ${isLowStock ? "text-red-600" : "text-slate-800"}`}>
                        {isLowStock && <AlertTriangle size={14} />}
                        {item.stockQuantity}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">Min: {item.lowStockLevel ?? "—"}</div>
                    </td>
<td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button title="Stock history" onClick={() => openHistory(item)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                          <History size={16} />
                        </button>
                        <button title="Adjust stock" onClick={() => openAdjust(item)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors">
                          <ArrowUpFromLine size={16} />
                        </button>
                        <button onClick={() => openEdit(item)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => remove(item.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredProducts.length === 0 && (
            <div className="p-12 text-center text-slate-400">
              <Package size={48} className="mx-auto mb-4 opacity-20" />
              <p>{products.length === 0 ? "No products yet — add your first one." : `No products found matching "${search}"`}</p>
            </div>
          )}
        </div>
      </div>
      </>
      )}

      {activeTab === 'CATEGORIES' && (
        <div className="bg-white border border-slate-200 rounded-xl flex-1 flex flex-col overflow-hidden shadow-sm">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase sticky top-0 shadow-sm">
                <tr>
                  <th className="px-6 py-4">Category Name</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4">Products</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {categories.map((cat) => {
                  const prodCount = products.filter(p => p.categoryId === cat.id).length;
                  return (
                    <tr key={cat.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-800">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center"><FolderTree size={14} /></div>
                          {cat.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500">{cat.description || "-"}</td>
                      <td className="px-6 py-4 text-slate-500">{prodCount}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openCatEdit(cat)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => removeCat(cat.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {categories.length === 0 && (
              <div className="p-12 text-center text-slate-400">
                <FolderTree size={48} className="mx-auto mb-4 opacity-20" />
                <p>No categories yet - add your first one.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ADD/EDIT PRODUCT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-800">{editId ? "Edit Product" : "Add New Product"}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4 bg-slate-50 max-h-[70vh] overflow-y-auto">
              {error && (
                <div className="col-span-2 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">{error}</div>
              )}
              <div className="col-span-2 space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Product Name</label>
                <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full p-2 border border-slate-200 rounded-lg" placeholder="e.g. Organic Bananas" />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Photo</label>
                <div className="flex items-center gap-3">
                  {imageAssetId ? (
                    <img src={`/api/assets/${imageAssetId}`} alt="" className="w-14 h-14 object-cover rounded-lg border border-slate-200" />
                  ) : (
                    <div className="w-14 h-14 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-slate-300"><Upload size={18} /></div>
                  )}
                  <label className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors bg-white">
                    {uploadingImage ? <Loader2 size={14} className="animate-spin inline" /> : (imageAssetId ? "Replace" : "Upload")}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])} />
                  </label>
                  {imageAssetId && <button onClick={() => setImageAssetId(null)} className="text-xs font-semibold text-slate-400 hover:text-red-600">Remove</button>}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Category</label>
                <select value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))} className="w-full p-2 border border-slate-200 rounded-lg bg-white">
                  <option value="">Uncategorized</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Unit (e.g. ea, kg, box, pallet)</label>
                <input 
                  type="text" 
                  list="unit-suggestions"
                  value={form.unit} 
                  onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} 
                  className="w-full p-2 border border-slate-200 rounded-lg" 
                  placeholder="ea"
                />
                <datalist id="unit-suggestions">
                  {customUnits.map(unit => (
                    <option key={unit} value={unit} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">SKU</label>
                <input type="text" value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} className="w-full p-2 border border-slate-200 rounded-lg" placeholder="PRD-001" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Barcode (UPC)</label>
                <input type="text" value={form.barcode} onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))} className="w-full p-2 border border-slate-200 rounded-lg" placeholder="Scan or type..." />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Selling Price ({currencySymbol})</label>
                <input type="number" step="0.01" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} className="w-full p-2 border border-slate-200 rounded-lg" placeholder="0.00" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Cost Price ({currencySymbol})</label>
                <input type="number" step="0.01" value={form.cost} onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))} className="w-full p-2 border border-slate-200 rounded-lg" placeholder="0.00" />
              </div>
              {!editId && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Initial Stock</label>
                  <input type="number" value={form.stockQuantity} onChange={(e) => setForm((f) => ({ ...f, stockQuantity: e.target.value }))} className="w-full p-2 border border-slate-200 rounded-lg" placeholder="0" />
                </div>
              )}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Low Stock Alert Level</label>
                <input type="number" value={form.lowStockLevel} onChange={(e) => setForm((f) => ({ ...f, lowStockLevel: e.target.value }))} className="w-full p-2 border border-slate-200 rounded-lg" placeholder="0" />
              </div>
              <div className="col-span-2 flex items-center gap-2 pt-2">
                <input type="checkbox" id="isWeighed" checked={form.isWeighed} onChange={(e) => setForm((f) => ({ ...f, isWeighed: e.target.checked }))} />
                <label htmlFor="isWeighed" className="text-sm text-slate-700">Sold by weight (price per {form.unit === "ea" ? "lb" : form.unit})</label>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-white">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 font-semibold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
                Cancel
              </button>
              <button onClick={submit} disabled={isSaving} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-lg transition-colors">
                {isSaving ? "Saving..." : "Save Product"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CATEGORY MODAL */}
      {isCatModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-800">{editCatId ? "Edit Category" : "Add Category"}</h3>
              <button onClick={() => setIsCatModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4 bg-slate-50">
              {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">{error}</div>}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Category Name</label>
                <input type="text" value={catName} onChange={(e) => setCatName(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg" placeholder="e.g. Produce" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Description (Optional)</label>
                <textarea value={catDesc} onChange={(e) => setCatDesc(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg" placeholder="Fresh fruits and vegetables..." rows={3} />
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-white">
              <button onClick={() => setIsCatModalOpen(false)} className="px-4 py-2 font-semibold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
                Cancel
              </button>
              <button onClick={submitCat} disabled={isSaving} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-lg transition-colors">
                {isSaving ? "Saving..." : "Save Category"}
              </button>
            </div>
          </div>
        </div>
      )}
{/* STOCK HISTORY MODAL */}
      {historyProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-800">Stock History — {historyProduct.name}</h3>
              <button onClick={() => setHistoryProduct(null)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 bg-slate-50 max-h-[70vh] overflow-y-auto">
              <p className="text-sm text-slate-500 mb-4">
                Current stock: <span className="font-bold text-slate-800">{historyProduct.stockQuantity} {historyProduct.unit}</span>
              </p>
              {loadingMovements ? (
                <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 size={16} className="animate-spin" /> Loading movements…</div>
              ) : movements.length === 0 ? (
                <p className="text-sm text-slate-400">No stock movements recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {movements.map((m) => {
                    const reasonStyles: Record<string, string> = {
                      SALE: "bg-blue-100 text-blue-700",
                      REFUND: "bg-slate-200 text-slate-700",
                      ADJUSTMENT: "bg-amber-100 text-amber-700",
                      RECEIVED: "bg-emerald-100 text-emerald-700",
                    };
                    return (
                      <div key={m.id} className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-4 py-3 text-sm">
                        <div className="flex items-center gap-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${reasonStyles[m.reason] ?? "bg-slate-100 text-slate-600"}`}>
                            {m.reason}
                          </span>
                          <span className={`font-bold ${m.delta > 0 ? "text-emerald-600" : "text-red-600"}`}>
                            {m.delta > 0 ? `+${m.delta}` : m.delta}
                          </span>
                          <span className="text-slate-400 text-xs">
                            {m.beforeQty} → {m.afterQty}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-slate-500">{m.note || m.reason}</div>
                          <div className="text-xs text-slate-400">{new Date(m.createdAt).toLocaleString()}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-end bg-white">
              <button onClick={() => setHistoryProduct(null)} className="px-4 py-2 font-semibold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADJUST STOCK MODAL */}
      {adjustProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-800">Adjust Stock — {adjustProduct.name}</h3>
              <button onClick={() => setAdjustProduct(null)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4 bg-slate-50">
              {adjustError && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">{adjustError}</div>}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Change (+ receive / − remove)</label>
                <input
                  type="number"
                  step="any"
                  value={adjustDelta}
                  onChange={(e) => setAdjustDelta(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                  placeholder="e.g. 10 or -2"
                />
              </div>
              <div className="text-sm text-slate-500">
                Resulting stock:{" "}
                <span className={`font-bold ${(adjustProduct.stockQuantity + (parseFloat(adjustDelta) || 0)) < 0 ? "text-red-600" : "text-slate-800"}`}>
                  {adjustProduct.stockQuantity + (parseFloat(adjustDelta) || 0)} {adjustProduct.unit}
                </span>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Reason / Note (Optional)</label>
                <textarea
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                  placeholder="e.g. Damaged goods written off, stocktake correction, received from supplier…"
                  rows={2}
                />
              </div>
              <p className="text-xs text-slate-400">Every adjustment is written to the stock ledger with who made it and why.</p>
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-white">
              <button onClick={() => setAdjustProduct(null)} className="px-4 py-2 font-semibold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
                Cancel
              </button>
              <button onClick={submitAdjust} disabled={isAdjusting} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-lg transition-colors">
                {isAdjusting ? "Saving..." : "Adjust Stock"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

