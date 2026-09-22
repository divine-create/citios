"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Search, Plus, Minus, CreditCard, Banknote, X, ChevronRight, ShoppingCart, Loader2, User, UserPlus, CheckCircle2, Package, Trash2, ArrowRight } from "lucide-react";
import { getProducts, getCustomers, createOrder, createCustomer, getRetailSettings, getCouponDiscount } from "@/lib/actions/retail";
import ReceiptModal from "./ReceiptModal";
import { inputCls } from "./ShopUI";
import { playCashRegisterChime } from "@/lib/audio";
import AudioAlertToggle from "@/components/common/AudioAlertToggle";

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
  imageAssetId?: string | null;
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

export default function POSTerminal({ organizationId, locationId, products, shiftId, onOrderComplete }: {
  organizationId: string;
  locationId?: string | null;
  products: Product[];
  shiftId: string;
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
  const [symbol, setSymbol] = useState<string>("₦");

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getCustomers(organizationId).then(setCustomers);
    getRetailSettings(organizationId).then((s) => {
      if (s && s.taxRate !== undefined) setTaxRate(s.taxRate);
      if (s && s.currencySymbol) setSymbol(s.currencySymbol);
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
    clearAppliedCoupon();
    setSearchQuery("");
  };

  const updateQuantity = (productId: string, delta: number) => {
    clearAppliedCoupon();
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
    clearAppliedCoupon();
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
  const [couponCode, setCouponCode] = useState<string>("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number; label: string } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isCouponChecking, setIsCouponChecking] = useState(false);

  const clearAppliedCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError(null);
  };

  const applyCoupon = async () => {
    const code = couponCode.trim();
    if (!code) { setCouponError("Enter a coupon code."); return; }
    setIsCouponChecking(true);
    setCouponError(null);
    try {
      const res = await getCouponDiscount(organizationId, code, subtotal);
      if (res && typeof res === 'object' && 'error' in res && res.error) { setCouponError(res.error); return; }
      setAppliedCoupon({ code: code.toUpperCase(), discount: res.discount, label: res.label });
    } finally {
      setIsCouponChecking(false);
    }
  };

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const couponDiscount = appliedCoupon?.discount ?? 0;
  const tax = Math.max(0, (subtotal - discountAmount - couponDiscount) * (taxRate / 100));
  const total = Math.max(0, subtotal - discountAmount - couponDiscount + tax);

  const finalizeSale = async (paymentMethod: "CASH" | "CARD") => {
    setError(null);
    setIsProcessing(true);
    try {
      const res = await createOrder({
          organizationId,
          locationId,
          shiftId,
        customerDataId: selectedCustomer?.id,
        items: cart.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
        paymentMethod,
        discountAmount,
        couponCode: appliedCoupon?.code,
      });
      if (res && typeof res === 'object' && 'error' in res && res.error) {
        setError(res.error);
        return;
      }
      setCompletedOrderId(res.orderId || null);
      playCashRegisterChime();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReceiptClose = () => {
    setCompletedOrderId(null);
    setCart([]);
    setDiscountAmount(0);
    setCouponCode("");
    setShowTender(false);
    setSelectedCustomer(null);
    onOrderComplete();
  };

  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Reusable Cart & Ledger View
  const renderCartLedger = (isMobileDrawer = false) => (
    <div className="flex flex-col h-full bg-white">
      {/* Customer Picker Bar */}
      <div className="p-3.5 sm:p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-2 shrink-0">
        {selectedCustomer ? (
          <button
            onClick={() => setIsCustomerPickerOpen(true)}
            className="flex items-center gap-2 text-xs sm:text-sm font-bold text-brand-800 bg-brand-50 px-3 py-1.5 rounded-full hover:bg-brand-100 transition-colors truncate max-w-full"
          >
            <User size={14} className="shrink-0" />
            <span className="truncate">{selectedCustomer.name}</span>
            <X
              size={14}
              className="text-brand-400 hover:text-brand-800 shrink-0 ml-1"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedCustomer(null);
              }}
            />
          </button>
        ) : (
          <button
            onClick={() => setIsCustomerPickerOpen(true)}
            className="flex items-center gap-1.5 text-xs font-bold text-brand-700 hover:text-brand-800 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-full transition-colors"
          >
            <UserPlus size={14} /> Add Customer
          </button>
        )}

        {cart.length > 0 && (
          <button
            onClick={() => setCart([])}
            className="text-[11px] font-bold text-slate-400 hover:text-red-600 transition-colors px-2 py-1"
          >
            Clear Cart
          </button>
        )}
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-2">
        {cart.length === 0 ? (
          <div className="h-full min-h-[180px] flex flex-col items-center justify-center text-slate-400 p-6 text-center">
            <ShoppingCart size={40} className="mb-3 opacity-20" />
            <p className="font-bold text-slate-600 text-sm">Cart is empty</p>
            <p className="text-xs text-slate-400 mt-0.5">Tap products on the grid or scan a barcode.</p>
          </div>
        ) : (
          cart.map((item) => (
            <div
              key={item.product.id}
              className="bg-white border border-slate-200/90 p-2.5 sm:p-3 rounded-xl flex items-center gap-2.5 shadow-2xs hover:border-slate-300 transition-all"
            >
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-slate-800 text-xs sm:text-sm leading-snug truncate">
                  {item.product.name}
                </h4>
                <p className="text-slate-500 text-[11px] sm:text-xs mt-0.5">
                  {symbol}{item.product.price.toFixed(2)} {item.product.isWeighed ? `/${item.product.unit}` : 'each'}
                </p>
              </div>

              <div className="flex items-center gap-1 bg-slate-50 rounded-lg p-0.5 border border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => updateQuantity(item.product.id, -1)}
                  className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-slate-600 hover:bg-white hover:shadow-xs rounded-md transition-all active:scale-95"
                >
                  <Minus size={14} />
                </button>
                <input
                  type="number"
                  step={item.product.isWeighed ? 'any' : '1'}
                  value={item.quantity}
                  onChange={(e) => setAbsoluteQuantity(item.product.id, parseFloat(e.target.value))}
                  className="w-9 sm:w-11 font-black text-slate-800 text-xs sm:text-sm text-center bg-transparent border-none p-0 focus:ring-0 [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  type="button"
                  onClick={() => updateQuantity(item.product.id, 1)}
                  className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-slate-600 hover:bg-white hover:shadow-xs rounded-md transition-all active:scale-95"
                >
                  <Plus size={14} />
                </button>
              </div>

              <div className="w-14 sm:w-16 text-right font-black text-xs sm:text-sm text-slate-900 shrink-0">
                {symbol}{(item.product.price * item.quantity).toFixed(2)}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Cart Summary & Checkout */}
      <div className="bg-slate-50 p-3.5 sm:p-4 border-t border-slate-200 shrink-0 space-y-3">
        <div className="space-y-1.5 text-xs sm:text-sm">
          <div className="flex justify-between text-slate-500 font-medium">
            <span>Subtotal</span>
            <span>{symbol}{subtotal.toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-emerald-600 font-medium items-center">
            <span>Discount</span>
            <div className="flex items-center gap-1">
              <span>-{symbol}</span>
              <input
                type="number"
                step="0.01"
                min="0"
                max={subtotal}
                value={discountAmount || ''}
                onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                className="w-16 text-right bg-white border border-emerald-200 rounded px-1 py-0.5 text-xs focus:ring-1 focus:ring-emerald-500"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Coupon</span>
            {appliedCoupon ? (
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[11px] font-bold">
                  <CheckCircle2 size={11} /> {appliedCoupon.code} (−{symbol}{appliedCoupon.discount.toFixed(2)})
                </span>
                <button onClick={clearAppliedCoupon} className="text-slate-400 hover:text-red-600 font-bold" type="button">
                  <X size={13} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => { setCouponCode(e.target.value); setCouponError(null); }}
                  onKeyDown={(e) => e.key === 'Enter' && applyCoupon()}
                  disabled={cart.length === 0}
                  className="w-20 sm:w-24 text-right bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs uppercase focus:ring-1 focus:ring-brand-600 disabled:bg-slate-100"
                  placeholder="CODE"
                />
                <button
                  onClick={applyCoupon}
                  disabled={isCouponChecking || cart.length === 0}
                  className="px-2 py-0.5 bg-brand-700 text-white text-[11px] font-bold rounded hover:bg-brand-800 disabled:opacity-50"
                  type="button"
                >
                  {isCouponChecking ? <Loader2 size={10} className="animate-spin" /> : 'Apply'}
                </button>
              </div>
            )}
          </div>
          {couponError && <p className="text-[11px] text-red-600 font-medium text-right">{couponError}</p>}

          <div className="flex justify-between text-slate-500 font-medium">
            <span>Tax ({taxRate}%)</span>
            <span>{symbol}{tax.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-end pt-2 border-t border-slate-200">
            <span className="text-slate-700 font-bold text-sm sm:text-base">Total</span>
            <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{symbol}{total.toFixed(2)}</span>
          </div>
        </div>

        <button
          disabled={cart.length === 0}
          onClick={() => {
            if (isMobileDrawer) setIsMobileCartOpen(false);
            setShowTender(true);
          }}
          className="w-full py-3.5 sm:py-4 bg-gradient-to-r from-brand-500 via-brand-600 to-brand-700 hover:from-brand-600 hover:via-brand-700 hover:to-brand-800 disabled:bg-slate-300 disabled:text-slate-400 text-white rounded-xl font-black text-lg sm:text-xl tracking-wide transition-all shadow-lg shadow-brand-700/25 disabled:shadow-none disabled:from-slate-300 disabled:via-slate-300 disabled:to-slate-300 flex items-center justify-center gap-2 active:scale-[0.99]"
        >
          CHARGE {symbol}{total.toFixed(2)} <ChevronRight size={22} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row h-full w-full bg-slate-100 overflow-hidden relative">
      {/* DESKTOP LEFT PANEL: Static Cart / Ledger */}
      <div className="hidden md:flex w-80 lg:w-[380px] flex-shrink-0 bg-white border-r border-slate-200 flex-col shadow-lg z-10 h-full">
        {renderCartLedger(false)}
      </div>

      {/* CATALOG PANEL: Search, Categories & Touch-Friendly Grid */}
      <div className="flex-1 flex flex-col bg-slate-100 min-w-0 h-full overflow-hidden">
        {/* Search & Top Mobile Cart Pill */}
        <div className="p-3 sm:p-4 bg-white border-b border-slate-200 flex items-center gap-2 shrink-0">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Scan barcode or search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 sm:py-3 bg-slate-100 border-none rounded-xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-brand-600 focus:bg-brand-50/50 font-medium transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Sound Mute/Unmute Toggle */}
          <AudioAlertToggle compact />

          {/* Quick Mobile Cart Header Button */}
          <button
            type="button"
            onClick={() => setIsMobileCartOpen(true)}
            className="md:hidden relative p-2.5 bg-brand-50 hover:bg-brand-100 text-brand-800 rounded-xl flex items-center justify-center shrink-0 transition-colors"
            title="View Cart"
          >
            <ShoppingCart size={20} />
            {cartItemCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-red-600 text-white rounded-full text-[10px] font-black flex items-center justify-center shadow-xs">
                {cartItemCount > 99 ? '99+' : cartItemCount}
              </span>
            )}
          </button>
        </div>

        {/* Categories Bar */}
        <div className="px-3 sm:px-4 py-2 sm:py-2.5 flex gap-1.5 overflow-x-auto hide-scrollbar bg-white border-b border-slate-200 shrink-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-lg font-bold text-xs sm:text-sm whitespace-nowrap transition-colors shrink-0 active:scale-95 ${
                activeCategory === cat
                  ? 'bg-brand-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-3.5 pb-24 md:pb-6">
            {filteredProducts.map((product, i) => {
              const isOut = !product.isWeighed && product.stockQuantity <= 0;
              const isLow = !product.isWeighed && product.stockQuantity > 0 && product.stockQuantity <= 5;

              return (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  disabled={isOut}
                  className={`relative overflow-hidden min-h-[100px] sm:min-h-[120px] rounded-2xl p-3 sm:p-4 flex flex-col justify-between items-start text-left active:scale-95 hover:scale-[1.02] transition-transform shadow-2xs border border-black/5 disabled:opacity-40 disabled:hover:scale-100 ${CATEGORY_COLORS[i % CATEGORY_COLORS.length]}`}
                >
                  <div className="flex justify-between items-start w-full gap-2 z-10">
                    <span className="font-extrabold text-xs sm:text-sm md:text-base leading-snug line-clamp-2 drop-shadow-sm">
                      {product.name}
                    </span>
                    {product.imageAssetId && (
                      <img src={`/api/assets/${product.imageAssetId}`} alt={product.name} className="w-10 h-10 rounded-lg object-cover shrink-0 shadow-sm ring-1 ring-black/5" />
                    )}
                  </div>
                  <div className="flex items-center justify-between w-full mt-2 pt-1 border-t border-black/5">
                    <span className="font-black text-black/75 bg-white/60 px-1.5 sm:px-2 py-0.5 rounded-md text-xs sm:text-sm">
                      {symbol}{product.price.toFixed(2)}
                    </span>
                    {!product.isWeighed && (
                      <span className={`text-[10px] sm:text-xs font-black px-1.5 py-0.5 rounded ${
                        isOut ? 'bg-black/20 text-black/80' : isLow ? 'bg-amber-500/20 text-amber-900' : 'text-black/50'
                      }`}>
                        {isOut ? 'OUT' : isLow ? `${product.stockQuantity} left` : ''}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
            {filteredProducts.length === 0 && (
              <div className="col-span-full text-center text-slate-400 py-16">
                <Package size={36} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm font-semibold">No products found</p>
                <p className="text-xs text-slate-400 mt-1">Try another category or search term.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FLOATING MOBILE CART BAR (Visible on mobile when cart has items) */}
      {cart.length > 0 && (
        <div className="md:hidden fixed bottom-3 left-3 right-3 z-30 animate-in slide-in-from-bottom duration-200">
          <button
            type="button"
            onClick={() => setIsMobileCartOpen(true)}
            className="w-full bg-gradient-to-r from-brand-600 via-brand-700 to-brand-800 text-white px-4 py-3.5 rounded-2xl shadow-xl shadow-brand-900/25 flex items-center justify-between font-bold active:scale-[0.99] transition-transform border border-white/10"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center font-black text-sm text-white">
                {cartItemCount}
              </div>
              <div className="text-left leading-tight">
                <p className="text-[10px] uppercase tracking-wider text-brand-100 font-semibold">Current Sale</p>
                <p className="text-sm font-black">{cart.length} item{cart.length === 1 ? '' : 's'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-black tracking-tight">{symbol}{total.toFixed(2)}</span>
              <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                <ChevronRight size={18} />
              </div>
            </div>
          </button>
        </div>
      )}

      {/* MOBILE CART DRAWER / SHEET */}
      {isMobileCartOpen && (
        <div className="fixed inset-0 z-50 md:hidden animate-in fade-in duration-200">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setIsMobileCartOpen(false)}
          />
          <div className="fixed inset-x-0 bottom-0 max-h-[90vh] h-[90vh] bg-white rounded-t-3xl shadow-2xl z-10 flex flex-col animate-in slide-in-from-bottom duration-300 overflow-hidden">
            {/* Drawer Header */}
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-800 flex items-center justify-center">
                  <ShoppingCart size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm sm:text-base">Current Cart</h3>
                  <p className="text-[11px] text-slate-400">{cartItemCount} item{cartItemCount === 1 ? '' : 's'}</p>
                </div>
              </div>
              <button
                onClick={() => setIsMobileCartOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Cart Body */}
            <div className="flex-1 overflow-hidden">
              {renderCartLedger(true)}
            </div>
          </div>
        </div>
      )}

      {/* RESPONSIVE TENDER MODAL */}
      {showTender && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl flex flex-col md:flex-row overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto md:overflow-visible">
            {/* Amount Due Panel */}
            <div className="w-full md:w-1/2 bg-gradient-to-br from-brand-50 to-white p-6 sm:p-10 flex flex-col justify-center border-b md:border-b-0 md:border-r border-slate-100">
              <p className="text-brand-700 font-bold uppercase tracking-wider text-xs sm:text-sm mb-1 sm:mb-2">Total Due</p>
              <p className="text-4xl sm:text-5xl md:text-6xl font-black text-ink tracking-tight mb-4 sm:mb-8">{symbol}{total.toFixed(2)}</p>

              {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs sm:text-sm rounded-lg border border-red-100">{error}</div>}

              <div className="space-y-2.5 sm:space-y-3">
                <button
                  disabled={isProcessing}
                  onClick={() => finalizeSale('CASH')}
                  className="w-full py-3.5 sm:py-4 bg-white border-2 border-slate-200 hover:border-emerald-500 hover:text-emerald-700 rounded-xl font-bold text-base sm:text-xl transition-colors shadow-xs text-slate-700 disabled:opacity-50 flex items-center justify-center gap-2 active:scale-98"
                >
                  {isProcessing ? <Loader2 size={18} className="animate-spin" /> : null}
                  Exact Cash ({symbol}{total.toFixed(2)})
                </button>
              </div>
            </div>

            {/* Payment Options Panel */}
            <div className="w-full md:w-1/2 p-6 sm:p-10 relative flex flex-col justify-center">
              <button
                onClick={() => setShowTender(false)}
                className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>

              <h3 className="text-xl sm:text-2xl font-bold text-slate-800 mb-5 sm:mb-8">Select Payment</h3>

              <div className="space-y-3 sm:space-y-4">
                <button
                  disabled={isProcessing}
                  onClick={() => finalizeSale('CARD')}
                  className="w-full flex items-center gap-4 sm:gap-6 p-4 sm:p-6 rounded-2xl bg-brand-50 hover:bg-brand-100 text-brand-800 transition-colors border border-brand-200 group disabled:opacity-50 active:scale-98"
                >
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-brand-500 to-brand-700 rounded-2xl flex items-center justify-center text-white shadow-md shadow-brand-700/20 group-hover:scale-105 transition-transform shrink-0">
                    <CreditCard size={26} />
                  </div>
                  <div className="text-left">
                    <div className="text-lg sm:text-2xl font-black text-ink">Credit / Debit Card</div>
                    <div className="text-slate-500 text-xs sm:text-sm font-medium">Card terminal or tap</div>
                  </div>
                </button>

                <button
                  disabled={isProcessing}
                  onClick={() => finalizeSale('CASH')}
                  className="w-full flex items-center gap-4 sm:gap-6 p-4 sm:p-6 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors border border-emerald-200 group disabled:opacity-50 active:scale-98"
                >
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform shrink-0">
                    <Banknote size={26} />
                  </div>
                  <div className="text-left">
                    <div className="text-lg sm:text-2xl font-black">Cash</div>
                    <div className="text-emerald-700/70 text-xs sm:text-sm font-medium">Record custom cash tender</div>
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
      if (res && typeof res === 'object' && 'customer' in res && res.customer) onCreated(res.customer);
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
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className={inputCls} autoFocus />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (optional)" className={inputCls} />
            <div className="flex gap-2 pt-1">
              <button onClick={() => setIsNewMode(false)} className="flex-1 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-lg">Back</button>
              <button onClick={submitNew} disabled={isSaving || !name.trim()} className="flex-1 py-2 bg-brand-700 hover:bg-brand-800 disabled:opacity-50 text-white text-sm font-bold rounded-lg">
                {isSaving ? "Saving..." : "Add & Select"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="p-3 border-b border-slate-100">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customers..." className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 transition-all" autoFocus />
            </div>
            <div className="max-h-64 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="text-center text-sm text-slate-400 py-6">No customers found.</p>
              ) : (
                filtered.map((c) => (
                  <button key={c.id} onClick={() => onSelect(c)} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left">
                    <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-800 flex items-center justify-center text-xs font-bold flex-shrink-0">{c.name.slice(0, 2).toUpperCase()}</div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{c.name}</p>
                      {c.phone && <p className="text-xs text-slate-400">{c.phone}</p>}
                    </div>
                  </button>
                ))
              )}
            </div>
            <div className="p-3 border-t border-slate-100">
              <button onClick={() => { setName(search); setIsNewMode(true); }} className="w-full flex items-center justify-center gap-1.5 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50 rounded-lg transition-colors">
                <UserPlus size={14} /> New Customer
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}


