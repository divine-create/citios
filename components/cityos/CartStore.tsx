'use client';

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';

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
}

const KEY = 'cityos-cart-v2';

const CartContext = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);

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

  const add = useCallback((item: CartLine) => {
    setLines((prev) => {
      const ex = prev.find((x) => x.productId === item.productId);
      if (ex) {
        return prev.map((x) => (x.productId === item.productId ? { ...x, qty: x.qty + item.qty } : x));
      }
      return [...prev, item];
    });
    setLastAddedId(item.productId);
  }, []);

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

  const value = useMemo<CartCtx>(() => {
    const subtotal = lines.reduce((sum, l) => sum + l.price * l.qty, 0);
    const count = lines.reduce((s, l) => s + l.qty, 0);
    const hasFood = lines.some((l) => l.kind === 'food');
    const hasRetail = lines.some((l) => l.kind === 'retail');
    const deliveryFee = hasRetail ? 1200 : 0;
    return { lines, add, remove, setQty, clear, count, subtotal, deliveryFee, lastAddedId };
  }, [lines, add, remove, setQty, clear, lastAddedId]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
