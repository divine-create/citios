'use client';

import React, { useState } from 'react';
import { 
  ShoppingBag, Check, ArrowRight, ArrowLeft, AlertCircle, 
  MapPin, Phone, MessageSquare, Globe, Plus, Trash2, Sparkles, Tag, Package
} from 'lucide-react';
import { createHQManagedBusiness, CreateHQManagedBusinessPayload } from '@/lib/actions/hq-managed-business';
import MediaLinkOrUploadInput from '../MediaLinkOrUploadInput';

interface RetailCreationWizardProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const RETAIL_CATEGORIES = [
  'Supermarket & Daily Groceries',
  'Pharmacy, Vitamins & Health Care',
  'Fashion Boutique, Apparel & Shoes',
  'Electronics, Gadgets & Laptops',
  'Cosmetics, Skincare & Fragrances',
  'Wines, Spirits & Cold Drinks Depot',
  'Home Appliances, Furniture & Hardware',
];

export default function RetailCreationWizard({ onSuccess, onCancel }: RetailCreationWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Store Details
  const [name, setName] = useState('');
  const [retailCategory, setRetailCategory] = useState('Supermarket & Daily Groceries');
  const [inStore, setInStore] = useState(true);
  const [delivery, setDelivery] = useState(true);
  const [clickAndCollect, setClickAndCollect] = useState(true);
  const [description, setDescription] = useState('');

  // Location & Contacts
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [website, setWebsite] = useState('');
  const [latitude, setLatitude] = useState<number>(4.9757);
  const [longitude, setLongitude] = useState<number>(8.3417);

  // Media
  const [logoUrl, setLogoUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  // Shelf Inventory
  const [bulkText, setBulkText] = useState('');
  const [products, setProducts] = useState<Array<{
    name: string;
    category: string;
    price: number;
    stockQuantity: number;
    sku?: string;
    description?: string;
  }>>([
    { name: 'Golden Penny Pure Soya Oil (5L)', category: 'Groceries', price: 14500, stockQuantity: 25, sku: 'GP-OIL-5L' },
    { name: 'Dangote Refined Sugar (1kg)', category: 'Groceries', price: 2100, stockQuantity: 60, sku: 'DNG-SUG-1KG' },
    { name: 'Milo Chocolate Drink Refill (800g)', category: 'Breakfast', price: 4200, stockQuantity: 40, sku: 'MILO-800G' },
  ]);

  // Single Product Adder
  const [newProdName, setNewProdName] = useState('');
  const [newProdCat, setNewProdCat] = useState('Groceries');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdStock, setNewProdStock] = useState('50');
  const [newProdSku, setNewProdSku] = useState('');

  const handleParseBulkInventory = () => {
    if (!bulkText.trim()) return;
    const lines = bulkText.split('\n').map(l => l.trim()).filter(Boolean);
    const parsed: typeof products = [];

    for (const line of lines) {
      const parts = line.split(/[-–:]/).map(p => p.trim());
      if (parts.length >= 2) {
        const pName = parts[0];
        const priceNum = parts[1].replace(/,/g, '').match(/\d+/);
        const price = priceNum ? Number(priceNum[0]) : 0;
        const stockNum = parts[2] ? parts[2].match(/\d+/) : null;
        const stock = stockNum ? Number(stockNum[0]) : 50;
        const sku = parts[3] || `SKU-${Math.floor(Math.random() * 89999 + 10000)}`;

        parsed.push({
          name: pName,
          category: retailCategory,
          price,
          stockQuantity: stock,
          sku,
        });
      }
    }

    if (parsed.length > 0) {
      setProducts(prev => [...prev, ...parsed]);
      setBulkText('');
    }
  };

  const handleAddSingleProduct = () => {
    if (!newProdName.trim()) return;
    const price = Number(newProdPrice) || 0;
    const stock = Number(newProdStock) || 50;
    setProducts(prev => [
      ...prev,
      {
        name: newProdName.trim(),
        category: newProdCat,
        price,
        stockQuantity: stock,
        sku: newProdSku.trim() || undefined,
      }
    ]);
    setNewProdName('');
    setNewProdPrice('');
    setNewProdSku('');
  };

  const handleRemoveProduct = (index: number) => {
    setProducts(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async () => {
    setError(null);
    if (!name.trim()) {
      setError('Store name is required.');
      setStep(1);
      return;
    }
    if (!address.trim()) {
      setError('Store physical address is required.');
      setStep(2);
      return;
    }

    try {
      setIsSubmitting(true);
      const diningOptions: string[] = [];
      if (inStore) diningOptions.push('In-Store Walk-in');
      if (delivery) diningOptions.push('CityOS Delivery');
      if (clickAndCollect) diningOptions.push('Click & Collect');

      const payload: CreateHQManagedBusinessPayload = {
        name: name.trim(),
        type: 'RETAIL',
        storeCategory: retailCategory,
        description: description.trim() || `${name} offers full retail shelf selections in Calabar. Specializing in ${retailCategory}.`,
        address: address.trim(),
        latitude,
        longitude,
        phone: phone.trim(),
        whatsapp: whatsapp.trim(),
        website: website.trim(),
        logoUrl: logoUrl.trim(),
        coverUrl: coverUrl.trim(),
        videos: videoUrl.trim() ? [videoUrl.trim()] : [],
        diningOptions,
        initialItems: products.map(p => ({
          name: p.name,
          category: p.category,
          price: p.price,
          stockQuantity: p.stockQuantity,
          sku: p.sku,
        })),
      };

      const res = await createHQManagedBusiness(payload);
      if (res.success) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to onboard retail store');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      {/* Progress */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-emerald-100 text-xs">
        {[
          { s: 1, title: '1. Store Profile' },
          { s: 2, title: '2. Location & Manager' },
          { s: 3, title: '3. Storefront Visuals' },
          { s: 4, title: '4. Shelf Inventory' },
        ].map(({ s, title }) => (
          <button
            key={s}
            onClick={() => setStep(s as any)}
            className={`font-bold pb-1 flex items-center gap-1.5 transition-all ${
              step === s 
                ? 'text-emerald-600 border-b-2 border-emerald-600' 
                : step > s 
                ? 'text-emerald-700' 
                : 'text-slate-400'
            }`}
          >
            {step > s ? <Check size={14} /> : null}
            {title}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: Store Profile */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Supermarket / Retail Store Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Spar Supermarket Calabar, Next Level Electronics, HealthPlus Pharmacy"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-sm font-bold px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Retail Category & Merchandising Focus
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {RETAIL_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setRetailCategory(cat)}
                  className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${
                    retailCategory === cat
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100">
            <span className="block text-[11px] font-bold text-emerald-900 uppercase tracking-wider mb-2">
              Resident Fulfillment Channels
            </span>
            <div className="flex flex-wrap gap-4 text-xs text-slate-700 font-medium">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={inStore} onChange={(e) => setInStore(e.target.checked)} className="rounded text-emerald-600 focus:ring-emerald-500" />
                <span>In-Store Walk-in</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={delivery} onChange={(e) => setDelivery(e.target.checked)} className="rounded text-emerald-600 focus:ring-emerald-500" />
                <span>CityOS Courier Delivery</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={clickAndCollect} onChange={(e) => setClickAndCollect(e.target.checked)} className="rounded text-emerald-600 focus:ring-emerald-500" />
                <span>Click & Collect (Curbside)</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Store Highlights & Policy Notice
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Calabar's favorite neighborhood supermarket stocking daily groceries, fresh produce, cold beverages, and household essentials..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs p-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      )}

      {/* STEP 2: Location & Contacts */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Store Address / Mall Branch *
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                placeholder="e.g. Calabar Mall, Cultural Centre Complex, Calabar"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full text-sm pl-10 pr-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Cashier / Front Desk Phone
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="tel"
                  placeholder="e.g. 08035551234"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full text-xs pl-10 pr-4 py-3 rounded-2xl border border-slate-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>WhatsApp Order & Stock Line *</span>
                <span className="text-[10px] text-emerald-600 font-bold">Concierge Alerts</span>
              </label>
              <div className="relative">
                <MessageSquare className="w-4 h-4 text-emerald-500 absolute left-3.5 top-3.5" />
                <input
                  type="tel"
                  placeholder="e.g. 08123456789"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full text-xs pl-10 pr-4 py-3 rounded-2xl border border-emerald-200 bg-emerald-50/20 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Official Website / Online Catalogue
            </label>
            <div className="relative">
              <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="url"
                placeholder="e.g. https://sparnigeria.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full text-xs pl-10 pr-4 py-3 rounded-2xl border border-slate-200"
              />
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Storefront Visuals */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Store Brand Logo
            </label>
            <MediaLinkOrUploadInput
              label="Store Logo"
              value={logoUrl}
              onChange={setLogoUrl}
              placeholder="Paste logo URL from their website or upload image"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Hero Storefront & Merchandising Cover Banner
            </label>
            <MediaLinkOrUploadInput
              label="Storefront Banner"
              value={coverUrl}
              onChange={setCoverUrl}
              placeholder="Paste high-res storefront photo URL or upload banner"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Store Tour or Promo Video (YouTube / Vimeo)
            </label>
            <input
              type="url"
              placeholder="e.g. https://www.youtube.com/watch?v=sampleStoreTour"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="w-full text-xs px-4 py-3 rounded-2xl border border-slate-200"
            />
          </div>
        </div>
      )}

      {/* STEP 4: Shelf Inventory Seeding */}
      {step === 4 && (
        <div className="space-y-6">
          {/* Bulk Text Parser */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} className="text-emerald-600" />
                Fast Bulk Shelf Inventory Parser
              </span>
              <span className="text-[10px] text-emerald-700 font-mono">Format: Product - Price(₦) - Stock - SKU</span>
            </div>
            <textarea
              rows={3}
              placeholder={`Golden Penny Spaghetti (500g) - 1200 - 100 - GP-SPAG-500
Peak Full Cream Powdered Milk (400g) - 3800 - 45 - PEAK-400G
Indomie Instant Noodles Onion (Pack of 40) - 8500 - 30 - INDO-ON-40
Oral-B Complete Toothpaste (140g) - 1100 - 80 - ORALB-140G`}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              className="w-full text-xs font-mono p-3 rounded-xl border border-slate-200 bg-white"
            />
            <button
              type="button"
              onClick={handleParseBulkInventory}
              className="mt-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Plus size={14} /> Parse Lines into Shelf Inventory
            </button>
          </div>

          {/* Add Single Product */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              + Add Individual Product
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <input
                type="text"
                placeholder="Product Name"
                value={newProdName}
                onChange={(e) => setNewProdName(e.target.value)}
                className="text-xs p-2.5 rounded-xl border border-slate-200 bg-white sm:col-span-2"
              />
              <input
                type="number"
                placeholder="Price (₦)"
                value={newProdPrice}
                onChange={(e) => setNewProdPrice(e.target.value)}
                className="text-xs p-2.5 rounded-xl border border-slate-200 bg-white"
              />
              <input
                type="number"
                placeholder="Stock Qty (e.g. 50)"
                value={newProdStock}
                onChange={(e) => setNewProdStock(e.target.value)}
                className="text-xs p-2.5 rounded-xl border border-slate-200 bg-white"
              />
            </div>
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                placeholder="SKU / Barcode (optional)"
                value={newProdSku}
                onChange={(e) => setNewProdSku(e.target.value)}
                className="flex-1 text-xs p-2.5 rounded-xl border border-slate-200 bg-white"
              />
              <button
                type="button"
                onClick={handleAddSingleProduct}
                className="text-xs bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl transition-all"
              >
                Add Product
              </button>
            </div>
          </div>

          {/* Inventory Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Configured Shelf Products ({products.length} items)
              </span>
              <span className="text-[11px] text-slate-500">Auto-created with CityOS Retail Stock</span>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
              {products.map((prod, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 shadow-sm text-xs"
                >
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-bold text-slate-900">{prod.name}</span>
                      <p className="text-[11px] text-slate-500">
                        Stock: {prod.stockQuantity} units {prod.sku ? `• SKU: ${prod.sku}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-emerald-600">₦{prod.price.toLocaleString()}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveProduct(idx)}
                      className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                      title="Remove product"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer Navigation */}
      <div className="flex items-center justify-between pt-6 mt-6 border-t border-slate-100">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => setStep((step - 1) as any)}
            className="px-5 py-2.5 rounded-full text-xs font-bold text-slate-600 hover:bg-slate-100 flex items-center gap-1.5"
          >
            <ArrowLeft size={14} /> Back
          </button>
        ) : (
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 rounded-full text-xs font-bold text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
        )}

        {step < 4 ? (
          <button
            type="button"
            onClick={() => setStep((step + 1) as any)}
            className="px-6 py-2.5 rounded-full bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-all flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
          >
            Continue <ArrowRight size={14} />
          </button>
        ) : (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="px-8 py-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition-all flex items-center gap-2"
          >
            {isSubmitting ? 'Onboarding Retail Store...' : 'Complete & Launch Store'}
          </button>
        )}
      </div>
    </div>
  );
}
