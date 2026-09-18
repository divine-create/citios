'use client';

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { useCity } from '@/components/cityos/CityProvider';

export type CartKind = 'retail' | 'food';

export interface CartLine {
  productId: string;
  qty: number;
  name: string;
  price: number;
  image?: string | null;
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
  setQty: (productId: string, qty: number) => void;
  clear: () => void;
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

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) setLines(JSON.parse(saved));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(KEY, JSON.stringify(lines));
    }
  }, [lines, hydrated]);

  /**
   * Add a line to the bag. The city is stamped from the server-resolved city
   * context — never from the caller. If the bag already belongs to another
   * city, the line is withheld and surfaced as `pendingCityLine` so the user
   * decides; we never silently mix cities or silently discard their bag.
   */
  const add = useCallback((item: CartLine) => {
    const line: CartLine = currentCitySlug ? { ...item, citySlug: currentCitySlug } : { ...item };

    const bagCity = lines.length > 0 ? lines[0].citySlug ?? null : null;
    if (bagCity && line.citySlug && bagCity !== line.citySlug) {
      setPendingCityLine(line);
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
  }, [lines, currentCitySlug]);

  const remove = useCallback((id: string) => {
    setLines((prev) => prev.filter((x) => x.productId !== id));
  }, []);

  const setQty = useCallback((id: string, qty: number) => {
    if (qty <= 0) {
      remove(id);
      return;
    }
    setLines((prev) => prev.map((x) => (x.productId === id ? { ...x, qty } : x)));
  }, [remove]);

  const clear = useCallback(() => setLines([]), []);

  /** Start a new bag in the pending line's city (the old bag is replaced). */
  const confirmPendingCity = useCallback(() => {
    const line = pendingCityLine;
    if (!line) return;
    setLines([line]);
    setLastAddedId(line.productId);
    setPendingCityLine(null);
  }, [pendingCityLine]);

  /** Keep the existing bag; the withheld line is dropped. */
  const cancelPendingCity = useCallback(() => setPendingCityLine(null), []);

  // A bag whose city is gone from the registry is treated as unknown, not foreign.
  const bagCity = lines.length > 0 ? lines[0].citySlug ?? null : null;
  const cartCitySlug = bagCity;
  const isForeignCart = !!bagCity && !!currentCitySlug && bagCity !== currentCitySlug;

  const value = useMemo<CartCtx>(() => {
    const subtotal = lines.reduce((sum, l) => sum + l.price * l.qty, 0);
    const count = lines.reduce((s, l) => s + l.qty, 0);
    const hasRetail = lines.some((l) => l.kind === 'retail');
    const deliveryFee = hasRetail ? 1200 : 0;
    return {
      lines,
      add,
      remove,
      setQty,
      clear,
      count,
      subtotal,
      deliveryFee,
      lastAddedId,
      cartCitySlug,
      isForeignCart,
      pendingCityLine,
      confirmPendingCity,
      cancelPendingCity,
    };
  }, [lines, add, remove, setQty, clear, lastAddedId, cartCitySlug, isForeignCart, pendingCityLine, confirmPendingCity, cancelPendingCity]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
