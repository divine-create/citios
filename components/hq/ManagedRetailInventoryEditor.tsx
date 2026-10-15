'use client';

import React, { useState } from 'react';
import { ShoppingBag, Plus, Edit2, Trash2, AlertCircle, Package } from 'lucide-react';
import { upsertManagedRetailProduct, deleteManagedRetailProduct } from '@/lib/actions/hq-managed-business';
import MediaLinkOrUploadInput from './MediaLinkOrUploadInput';

interface ManagedRetailInventoryEditorProps {
  organizationId: string;
  initialProducts: Array<{
    id: string;
    name: string;
    price: number;
    category?: string | null;
    description?: string | null;
    stockQuantity: number;
    barcode?: string | null;
    sku?: string | null;
    image?: string | null;
  }>;
}

export default function ManagedRetailInventoryEditor({ organizationId, initialProducts }: ManagedRetailInventoryEditorProps) {
  const [products, setProducts] = useState(initialProducts);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<{
    id?: string;
    name: string;
    price: number;
    category?: string;
    description?: string;
    stockQuantity: number;
    barcode?: string;
    sku?: string;
    imageUrl?: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenAdd = () => {
    setEditingProduct({
      name: '',
      price: 1500,
      category: 'General',
      description: '',
      stockQuantity: 50,
      barcode: '',
      sku: '',
      imageUrl: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: any) => {
    setEditingProduct({
      id: p.id,
      name: p.name,
      price: p.price,
      category: p.category || '',
      description: p.description || '',
      stockQuantity: p.stockQuantity || 0,
      barcode: p.barcode || '',
      sku: p.sku || '',
      imageUrl: p.image || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editingProduct.name.trim()) return;

    setError(null);
    setIsSaving(true);
    try {
      const res = await upsertManagedRetailProduct({
        id: editingProduct.id,
        organizationId,
        name: editingProduct.name.trim(),
        price: Number(editingProduct.price) || 0,
        category: editingProduct.category?.trim() || 'General',
        description: editingProduct.description?.trim() || '',
        stockQuantity: Number(editingProduct.stockQuantity) || 0,
        barcode: editingProduct.barcode?.trim() || '',
        sku: editingProduct.sku?.trim() || '',
        imageUrl: editingProduct.imageUrl?.trim() || '',
      });

      if (res.success) {
        if (editingProduct.id) {
          setProducts(prev => prev.map(p => p.id === editingProduct.id ? { ...p, ...editingProduct, image: editingProduct.imageUrl } : p));
        } else {
          setProducts(prev => [...prev, { id: res.productId!, ...editingProduct, image: editingProduct.imageUrl }]);
        }
        setIsModalOpen(false);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save product');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await deleteManagedRetailProduct(productId, organizationId);
      setProducts(prev => prev.filter(p => p.id !== productId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete product');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-emerald-50/50 border border-emerald-100 rounded-3xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/20">
            <ShoppingBag size={24} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">Store Products & Inventory</h3>
            <p className="text-xs text-slate-500">Manage retail goods, prices in ₦, stock counts, and SKU/barcodes</p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2"
        >
          <Plus size={16} /> Add Product
        </button>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 border border-dashed border-slate-200 rounded-3xl">
          <Package size={36} className="mx-auto text-slate-300 mb-2" />
          <h4 className="text-sm font-bold text-slate-700">No Retail Products Added Yet</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Add groceries, electronics, fashion items, or shelf goods with prices and stock quantity.
          </p>
          <button
            onClick={handleOpenAdd}
            className="mt-4 px-5 py-2 rounded-full bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700"
          >
            + Add First Product
          </button>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-5">Product</th>
                  <th className="py-3.5 px-5">Category</th>
                  <th className="py-3.5 px-5">Price</th>
                  <th className="py-3.5 px-5">Stock Qty</th>
                  <th className="py-3.5 px-5">SKU / Barcode</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        {p.image ? (
                          <img src={p.image} alt={p.name} className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                            <ShoppingBag size={18} />
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-slate-900">{p.name}</p>
                          {p.description && <p className="text-[11px] text-slate-500 line-clamp-1">{p.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-5 text-slate-600">{p.category || 'General'}</td>
                    <td className="py-4 px-5 font-bold text-emerald-600">₦{p.price.toLocaleString()}</td>
                    <td className="py-4 px-5">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        p.stockQuantity > 10 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {p.stockQuantity} in stock
                      </span>
                    </td>
                    <td className="py-4 px-5 font-mono text-slate-500 text-[11px]">{p.sku || p.barcode || '—'}</td>
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              {editingProduct.id ? 'Edit Retail Product' : 'Add Retail Product'}
            </h3>
            <p className="text-xs text-slate-500 mb-5">Configure retail shelf product, pricing, and stock inventory</p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Golden Penny Spaghetti (500g)"
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Price (₦) *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 1500"
                    value={editingProduct.price}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Stock Quantity</label>
                  <input
                    type="number"
                    placeholder="e.g. 50"
                    value={editingProduct.stockQuantity}
                    onChange={(e) => setEditingProduct({ ...editingProduct, stockQuantity: Number(e.target.value) })}
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Pantry, Drinks, Dairy"
                    value={editingProduct.category || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">SKU / Barcode</label>
                  <input
                    type="text"
                    placeholder="e.g. GP-SPAG-500"
                    value={editingProduct.sku || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Product Photo</label>
                <MediaLinkOrUploadInput
                  label="Product Photo"
                  value={editingProduct.imageUrl || ''}
                  onChange={(url) => setEditingProduct({ ...editingProduct, imageUrl: url })}
                  placeholder="Paste product image URL or upload file"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Brief product description or package size..."
                  value={editingProduct.description || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-full"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2 text-xs font-bold bg-emerald-600 text-white rounded-full hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
