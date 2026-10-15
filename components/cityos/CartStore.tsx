'use client';

import { addCartItemAction, removeCartItemAction, updateCartItemQuantityAction, fetchUserCart, clearCartAction } from '@/app/actions/cart';
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { useCity } from '@/components/cityos/CityProvider';

export type CartKind = 'retail' | 'food' | 'service';

export interface CartLine {
  productId: string;
  qty: number;
  name: string;
  price: number;
  image?: string | null;
  isAvailable?: boolean;
  stockQuantity?: number;
  orgId: string;
  orgName: string;
  kind: CartKind;
  /**
   * City the line was added in. The bag is pinned to the city it was built in;
   * absent on bags saved before city pinning existed (treated as unknown).
   */
  citySlug?: string;
}

interface CartCtx {
  lines: CartLine[];
  add: (item: CartLine) => void;
  remove: (productId: string) => void;
  removeOrg: (orgId: string) => void;
  setQty: (productId: string, qty: number) => void;
  clear: () => void;
  syncCart: () => Promise<void>;
  count: number;
  subtotal: number;
  deliveryFee: number;
  lastAddedId: string | null;
  /** City the current bag was built in (null when the bag is empty). */
  cartCitySlug: string | null;
  /** True when the bag belongs to a different city than the one being browsed. */
  isForeignCart: boolean;
  /**
   * A line whose add was withheld because it belongs to another city than the
   * current bag. The UI must resolve it (accept = start a new bag, cancel =
   * keep the existing one) — nothing is added silently.
   */
  pendingCityLine: CartLine | null;
  /** Accept the withheld line, replacing the previous city's bag. */
  confirmPendingCity: () => void;
  /** Discard the withheld line and keep the existing bag. */
  cancelPendingCity: () => void;
  /**
   * Glovo-grade Single-Store Guard:
   * A line whose add was withheld because on-demand food & express delivery
   * requires single-merchant courier routing.
   */
  pendingStoreLine: CartLine | null;
  confirmPendingStore: () => void;
  cancelPendingStore: () => void;
}

const KEY = 'cityos-cart-v2';

const CartContext = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { city } = useCity();
  const currentCitySlug = city?.slug ?? null;

  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  const [pendingCityLine, setPendingCityLine] = useState<CartLine | null>(null);
  const [pendingStoreLine, setPendingStoreLine] = useState<CartLine | null>(null);

  const syncCart = useCallback(async () => {
    try {
      const res = await fetchUserCart();
      if (res && res.lines !== undefined) {
        setLines(res.lines);
        if (res.lines.length === 0) {
          try { localStorage.removeItem(KEY); } catch {}
        }
      }
    } catch (e) {
      console.error('Failed to sync server cart', e);
    }
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetchUserCart();
        if (res && res.lines !== undefined) {
          setLines(res.lines);
          if (res.lines.length === 0) {
            try { localStorage.removeItem(KEY); } catch {}
          }
          setHydrated(true);
          return;
        }
      } catch (e) {
        console.error('Failed to fetch server cart', e);
      }
      try {
        const saved = localStorage.getItem(KEY);
        if (saved) setLines(JSON.parse(saved));
      } catch {}
      setHydrated(true);
    }
    load();
  }, []);

  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(KEY, JSON.stringify(lines));
    }
  }, [lines, hydrated]);

  /**
   * Add a line to the bag.
   * 1. City Guard: Never silently mix cities.
   * 2. Store Guard (Glovo Pattern): Food & on-demand deliveries are isolated to a single merchant.
   */
  const add = useCallback((item: CartLine) => {
    const line: CartLine = currentCitySlug ? { ...item, citySlug: currentCitySlug } : { ...item };

    // 1. Cross-city protection
    const bagCity = lines.length > 0 ? lines[0].citySlug ?? null : null;
    if (bagCity && line.citySlug && bagCity !== line.citySlug) {
      setPendingCityLine(line);
      return;
    }

    // 2. Single-Store Food Delivery Guard
    const hasExistingFood = lines.some((l) => l.kind === 'food');
    const isAddingFood = line.kind === 'food';
    const existingOrgId = lines.length > 0 ? lines[0].orgId : null;

    if (lines.length > 0 && (hasExistingFood || isAddingFood) && existingOrgId && line.orgId && existingOrgId !== line.orgId) {
      setPendingStoreLine(line);
      return;
    }

    setLines((prev) => {
      const ex = prev.find((x) => x.productId === line.productId);
      if (ex) {
        return prev.map((x) => (x.productId === line.productId ? { ...x, qty: x.qty + line.qty } : x));
      }
      return [...prev, line];
    });
    setLastAddedId(line.productId);
    addCartItemAction(line.productId, line.qty, line.kind).catch(() => {});
  }, [lines, currentCitySlug]);

  const remove = useCallback((id: string) => {
    setLines((prev) => prev.filter((x) => x.productId !== id));
    removeCartItemAction(id).catch(() => {});
  }, []);

  const removeOrg = useCallback((orgId: string) => {
    setLines((prev) => prev.filter((x) => x.orgId !== orgId));
  }, []);

  const setQty = useCallback((id: string, qty: number) => {
    if (qty <= 0) {
      remove(id);
      return;
    }
    setLines((prev) => prev.map((x) => (x.productId === id ? { ...x, qty } : x)));
    const line = lines.find((x) => x.productId === id);
    if (line) updateCartItemQuantityAction(id, qty, line.kind).catch(() => {});
  }, [remove, lines]);

  const clear = useCallback(() => {
    setLines([]);
    setPendingCityLine(null);
    setPendingStoreLine(null);
    setLastAddedId(null);
    clearCartAction().catch(() => {});
  }, []);

  /** Start a new bag in the pending line's city (the old bag is replaced). */
  const confirmPendingCity = useCallback(() => {
    const line = pendingCityLine;
    if (!line) return;
    setLines([line]);
    setLastAddedId(line.productId);
    setPendingCityLine(null);
    clearCartAction().then(() => {
      addCartItemAction(line.productId, line.qty, line.kind).catch(() => {});
    }).catch(() => {});
  }, [pendingCityLine]);

  /** Keep the existing bag; the withheld line is dropped. */
  const cancelPendingCity = useCallback(() => setPendingCityLine(null), []);

  /** Glovo single-store confirmation: discard old store basket, start with the new store item. */
  const confirmPendingStore = useCallback(() => {
    const line = pendingStoreLine;
    if (!line) return;
    setLines([line]);
    setLastAddedId(line.productId);
    setPendingStoreLine(null);
    clearCartAction().then(() => {
      addCartItemAction(line.productId, line.qty, line.kind).catch(() => {});
    }).catch(() => {});
  }, [pendingStoreLine]);

  /** Keep existing store basket; cancel adding from the new store. */
  const cancelPendingStore = useCallback(() => setPendingStoreLine(null), []);

  // A bag whose city is gone from the registry is treated as unknown, not foreign.
  const bagCity = lines.length > 0 ? lines[0].citySlug ?? null : null;
  const cartCitySlug = bagCity;
  const isForeignCart = !!bagCity && !!currentCitySlug && bagCity !== currentCitySlug;

  const value = useMemo<CartCtx>(() => {
    const subtotal = lines.reduce((sum, l) => sum + l.price * l.qty, 0);
    const count = lines.reduce((s, l) => s + l.qty, 0);
    const hasFood = lines.some((l) => l.kind === 'food');
    const hasRetail = lines.some((l) => l.kind === 'retail');

    // Glovo-style delivery economics:
    // Free delivery on orders 10,000 NGN or more!
    let deliveryFee = 0;
    if (subtotal > 0 && subtotal < 10000) {
      if (hasFood) deliveryFee = 600; // Hyperlocal motorcycle courier in city
      else if (hasRetail) deliveryFee = 1200; // Standard retail parcel delivery
    }

    return {
      lines,
      add,
      remove,
      removeOrg,
      setQty,
      clear,
      syncCart,
      count,
      subtotal,
      deliveryFee,
      lastAddedId,
      cartCitySlug,
      isForeignCart,
      pendingCityLine,
      confirmPendingCity,
      cancelPendingCity,
      pendingStoreLine,
      confirmPendingStore,
      cancelPendingStore,
    };
  }, [
    lines,
    add,
    remove,
    removeOrg,
    setQty,
    clear,
    syncCart,
    lastAddedId,
    cartCitySlug,
    isForeignCart,
    pendingCityLine,
    confirmPendingCity,
    cancelPendingCity,
    pendingStoreLine,
    confirmPendingStore,
    cancelPendingStore,
  ]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
