"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Search, Plus, Minus, CreditCard, Banknote, X, ChevronRight, ShoppingCart, Loader2, User, UserPlus, CheckCircle2, Package, Trash2, ArrowRight } from "lucide-react";
import { getProducts, getCustomers, createOrder, createCustomer, getRetailSettings } from "@/lib/actions/retail";
import ReceiptModal from "./ReceiptModal";

const CATEGORY_COLORS = [
  "bg-blue-100 text-blue-900",
  "bg-emerald-100 text-emerald-900",
  "bg-purple-100 text-purple-900",
  "bg-orange-100 text-orange-900",
  "bg-pink-100 text-pink-900",
  "bg-cyan-100 text-cyan-900",
];

interface Product {
  id: string;
  name: string;
  categoryName: string | null;
  price: number;
  stockQuantity: number;
  isWeighed: boolean;
  unit: string;
}

interface Customer {
  id: string;
  name: string;
  phone: string | null;
}

interface CartItem {
  product: Product;
  quantity: number;
}

const COLORS = [
  "bg-red-100 text-red-800",
  "bg-blue-100 text-blue-800",
  "bg-emerald-100 text-emerald-800",
  "bg-amber-100 text-amber-800",
  "bg-purple-100 text-purple-800",
  "bg-pink-100 text-pink-800",
  "bg-cyan-100 text-cyan-800",
];

export default function POSTerminal({ organizationId, products, shiftId, cashierId, onOrderComplete }: {
  organizationId: string;
  products: Product[];
  shiftId: string;
  cashierId: string;
  onOrderComplete: () => void;
}) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showTender, setShowTender] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isCustomerPickerOpen, setIsCustomerPickerOpen] = useState(false);
  const [completedOrderId, setCompletedOrderId] = useState<string | null>(null);
  const [taxRate, setTaxRate] = useState<number>(8); // default fallback of 8%

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getCustomers(organizationId).then(setCustomers);
    getRetailSettings(organizationId).then((s) => {
      if (s && s.taxRate !== undefined) setTaxRate(s.taxRate);
    });
  }, [organizationId]);

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.categoryName ?? "Uncategorized"));
    return ["All", ...Array.from(set)];
  }, [products]);

  useEffect(() => {
    if (!showTender) {
      searchInputRef.current?.focus();
    }
  }, [cart, showTender]);

  const filteredProducts = products.filter(
    (p) =>
      (activeCategory === "All" || (p.categoryName ?? "Uncategorized") === activeCategory) &&
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) => (item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
      }
      return [...prev, { product, quantity: 1 }];
    });
    setSearchQuery("");
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQ = Math.max(0, item.quantity + delta);
            return { ...item, quantity: newQ };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const setAbsoluteQuantity = (productId: string, quantity: number) => {
    if (isNaN(quantity) || quantity < 0) return;
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            return { ...item, quantity };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const [discountAmount, setDiscountAmount] = useState<number>(0);

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const tax = Math.max(0, (subtotal - discountAmount) * (taxRate / 100));
  const total = Math.max(0, subtotal - discountAmount + tax);

  const finalizeSale = async (paymentMethod: "CASH" | "CARD") => {
    setError(null);
    setIsProcessing(true);
    try {
      const res = await createOrder({
        organizationId,
        shiftId,
        cashierId,
        customerDataId: selectedCustomer?.id,
        items: cart.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
        paymentMethod,
        discountAmount,
      });
      if ((res as any)?.error) {
        setError((res as any).error);
        return;
      }
      setCompletedOrderId((res as any).orderId);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReceiptClose = () => {
    setCompletedOrderId(null);
    setCart([]);
    setDiscountAmount(0);
    setShowTender(false);
    setSelectedCustomer(null);
    onOrderComplete();
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-slate-100 overflow-hidden">
      {/* LEFT PANEL: The Cart / Ledger */}
      <div className="w-[400px] flex-shrink-0 bg-white border-r border-slate-200 flex flex-col shadow-xl z-10">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-2">
          {selectedCustomer ? (
            <button onClick={() => setIsCustomerPickerOpen(true)} className="flex items-center gap-2 text-sm font-bold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors">
              <User size={14} /> {selectedCustomer.name}
              <X size={14} className="text-blue-400 hover:text-blue-700" onClick={(e) => { e.stopPropagation(); setSelectedCustomer(null); }} />
            </button>
          ) : (
            <button onClick={() => setIsCustomerPickerOpen(true)} className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-full transition-colors">
              <UserPlus size={14} /> Add Customer
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <ShoppingCart size={48} className="mb-4 opacity-20" />
              <p className="font-medium text-slate-500">Cart is empty</p>
              <p className="text-sm mt-1">Scan an item or tap the grid.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cart.map((item) => (
                <div key={item.product.id} className="bg-white border border-slate-200 p-3 rounded-lg flex items-center gap-3">
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-800 leading-tight">{item.product.name}</h4>
                    <p className="text-slate-500 text-sm mt-0.5">${item.product.price.toFixed(2)} {item.product.isWeighed ? `/${item.product.unit}` : "each"}</p>
                  </div>

                  <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-1 border border-slate-200">
                    <button onClick={() => updateQuantity(item.product.id, -1)} className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-white hover:shadow-sm rounded-md transition-all">
                      <Minus size={16} />
                    </button>
                    <input 
                      type="number"
                      step={item.product.isWeighed ? "any" : "1"}
                      value={item.quantity}
                      onChange={(e) => setAbsoluteQuantity(item.product.id, parseFloat(e.target.value))}
                      className="w-12 font-bold text-slate-800 text-center bg-transparent border-none p-0 focus:ring-0 [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button onClick={() => updateQuantity(item.product.id, 1)} className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-white hover:shadow-sm rounded-md transition-all">
                      <Plus size={16} />
                    </button>
                  </div>

                  <div className="w-16 text-right font-black text-slate-900">
                    ${(item.product.price * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-slate-50 p-4 border-t border-slate-200">
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-slate-500 text-sm font-medium">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-emerald-600 text-sm font-medium items-center">
                <span>Discount</span>
                <div className="flex items-center gap-1">
                  <span>-$</span>
                  <input 
                    type="number"
                    step="0.01"
                    min="0"
                    max={subtotal}
                    value={discountAmount || ''}
                    onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                    className="w-16 text-right bg-white border border-emerald-200 rounded p-0.5 focus:ring-1 focus:ring-emerald-500"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="flex justify-between text-slate-500 text-sm font-medium">
                <span>Tax ({taxRate}%)</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-end pt-2 border-t border-slate-200">
                <span className="text-slate-700 font-bold text-lg">Total</span>
                <span className="text-4xl font-black text-slate-900 tracking-tight">${total.toFixed(2)}</span>
              </div>
            </div>

          <button
            disabled={cart.length === 0}
            onClick={() => setShowTender(true)}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 disabled:text-slate-500 text-white rounded-xl font-black text-2xl tracking-wide transition-colors shadow-lg shadow-emerald-500/30 disabled:shadow-none flex items-center justify-center gap-2"
          >
            PAY <ChevronRight size={28} />
          </button>
        </div>
      </div>

      {/* RIGHT PANEL: Search & Quick Grid */}
      <div className="flex-1 flex flex-col bg-slate-100">
        <div className="p-4 bg-white border-b border-slate-200">
          <div className="relative">
            <Search size={24} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Scan barcode or search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-slate-100 border-none rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-blue-50 font-medium transition-colors"
            />
          </div>
        </div>

        <div className="px-4 py-3 flex gap-2 overflow-x-auto hide-scrollbar bg-white border-b border-slate-200">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2.5 rounded-lg font-bold text-sm whitespace-nowrap transition-colors ${
                activeCategory === cat ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredProducts.map((product, i) => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                disabled={!product.isWeighed && product.stockQuantity <= 0}
                className={`h-32 rounded-2xl p-4 flex flex-col justify-between items-start text-left hover:scale-95 transition-transform shadow-sm border border-black/5 disabled:opacity-40 disabled:hover:scale-100 ${CATEGORY_COLORS[i % CATEGORY_COLORS.length]}`}
              >
                <span className="font-extrabold text-lg leading-tight">{product.name}</span>
                <div className="flex items-center justify-between w-full">
                  <span className="font-bold text-black/60 bg-white/40 px-2 py-1 rounded-md text-sm">${product.price.toFixed(2)}</span>
                  {!product.isWeighed && product.stockQuantity <= 5 && (
                    <span className="text-xs font-bold text-black/50">{product.stockQuantity <= 0 ? "OUT" : `${product.stockQuantity} left`}</span>
                  )}
                </div>
              </button>
            ))}
            {filteredProducts.length === 0 && (
              <p className="col-span-full text-center text-slate-400 py-12">No products found.</p>
            )}
          </div>
        </div>
      </div>

      {/* TENDER MODAL */}
      {showTender && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl flex overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-1/2 bg-slate-50 p-10 flex flex-col justify-center border-r border-slate-200">
              <p className="text-slate-500 font-bold uppercase tracking-wider mb-2">Total Due</p>
              <p className="text-6xl font-black text-slate-900 tracking-tighter mb-8">${total.toFixed(2)}</p>

              {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">{error}</div>}

              <div className="space-y-3">
                <button
                  disabled={isProcessing}
                  onClick={() => finalizeSale("CASH")}
                  className="w-full py-4 bg-white border-2 border-slate-200 hover:border-emerald-500 hover:text-emerald-700 rounded-xl font-bold text-xl transition-colors shadow-sm text-slate-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isProcessing ? <Loader2 size={20} className="animate-spin" /> : null}
                  Exact Cash (${total.toFixed(2)})
                </button>
              </div>
            </div>

            <div className="w-1/2 p-10 relative">
              <button onClick={() => setShowTender(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                <X size={24} />
              </button>

              <h3 className="text-2xl font-bold text-slate-800 mb-8 mt-4">Select Payment</h3>

              <div className="space-y-4">
                <button
                  disabled={isProcessing}
                  onClick={() => finalizeSale("CARD")}
                  className="w-full flex items-center gap-6 p-6 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors border border-blue-200 group disabled:opacity-50"
                >
                  <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                    <CreditCard size={32} />
                  </div>
                  <div className="text-left">
                    <div className="text-2xl font-black">Credit / Debit Card</div>
                    <div className="text-blue-600/70 font-medium">Send to terminal</div>
                  </div>
                </button>

                <button
                  disabled={isProcessing}
                  onClick={() => finalizeSale("CASH")}
                  className="w-full flex items-center gap-6 p-6 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors border border-emerald-200 group disabled:opacity-50"
                >
                  <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                    <Banknote size={32} />
                  </div>
                  <div className="text-left">
                    <div className="text-2xl font-black">Cash</div>
                    <div className="text-emerald-700/70 font-medium">Record cash payment</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isCustomerPickerOpen && (
        <CustomerPicker
          organizationId={organizationId}
          customers={customers}
          onSelect={(c) => { setSelectedCustomer(c); setIsCustomerPickerOpen(false); }}
          onCreated={(c) => { setCustomers((prev) => [...prev, c]); setSelectedCustomer(c); setIsCustomerPickerOpen(false); }}
          onClose={() => setIsCustomerPickerOpen(false)}
        />
      )}

      {completedOrderId && (
        <ReceiptModal orderId={completedOrderId} onClose={handleReceiptClose} />
      )}
    </div>
  );
}

function CustomerPicker({ organizationId, customers, onSelect, onCreated, onClose }: {
  organizationId: string;
  customers: Customer[];
  onSelect: (c: Customer) => void;
  onCreated: (c: Customer) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [isNewMode, setIsNewMode] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const filtered = customers.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || (c.phone ?? "").includes(search));

  const submitNew = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      const res = await createCustomer({ organizationId, name, phone: phone || undefined });
      if ((res as any)?.customer) onCreated((res as any).customer);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800">{isNewMode ? "New Customer" : "Attach Customer"}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        {isNewMode ? (
          <div className="p-5 space-y-3">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="w-full p-2.5 border border-slate-200 rounded-lg" autoFocus />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (optional)" className="w-full p-2.5 border border-slate-200 rounded-lg" />
            <div className="flex gap-2 pt-1">
              <button onClick={() => setIsNewMode(false)} className="flex-1 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-lg">Back</button>
              <button onClick={submitNew} disabled={isSaving || !name.trim()} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold rounded-lg">
                {isSaving ? "Saving..." : "Add & Select"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="p-3 border-b border-slate-100">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customers..." className="w-full p-2 border border-slate-200 rounded-lg text-sm" autoFocus />
            </div>
            <div className="max-h-64 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="text-center text-sm text-slate-400 py-6">No customers found.</p>
              ) : (
                filtered.map((c) => (
                  <button key={c.id} onClick={() => onSelect(c)} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">{c.name.slice(0, 2).toUpperCase()}</div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{c.name}</p>
                      {c.phone && <p className="text-xs text-slate-400">{c.phone}</p>}
                    </div>
                  </button>
                ))
              )}
            </div>
            <div className="p-3 border-t border-slate-100">
              <button onClick={() => { setName(search); setIsNewMode(true); }} className="w-full flex items-center justify-center gap-1.5 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                <UserPlus size={14} /> New Customer
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
