'use client';

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { WALLET_STORAGE_KEY } from '@/lib/demo/cityos';

export interface WalletTx {
  ref: string;
  note: string;
  amount: number;
  at: string;
}

interface WalletCtx {
  balance: number;
  hydrated: boolean;
  transactions: WalletTx[];
  spend: (amount: number, note: string) => boolean;
  topUp: (amount: number) => void;
  reset: () => void;
}

const WalletContext = createContext<WalletCtx | null>(null);

const DEFAULT_TXS: WalletTx[] = [];

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<WalletTx[]>(DEFAULT_TXS);
  const [hydrated, setHydrated] = useState(false);
  const balanceRef = useRef(0);

  useEffect(() => {
    balanceRef.current = balance;
  }, [balance]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(WALLET_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { balance?: number; transactions?: WalletTx[] };
        if (typeof parsed.balance === 'number' || Array.isArray(parsed.transactions)) {
          window.setTimeout(() => {
            if (typeof parsed.balance === 'number') {
              balanceRef.current = parsed.balance;
              setBalance(parsed.balance);
            }
            if (Array.isArray(parsed.transactions)) setTransactions(parsed.transactions);
          }, 0);
        }
      }
    } catch {
      /* default wallet on storage error */
    }
    window.setTimeout(() => setHydrated(true), 0);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify({ balance, transactions }));
    } catch {
      /* storage unavailable */
    }
  }, [balance, transactions, hydrated]);

  const spend = useCallback((amount: number, note: string): boolean => {
    if (amount <= 0) return true;
    if (balanceRef.current < amount) return false;
    const next = balanceRef.current - amount;
    balanceRef.current = next;
    setBalance(next);
    const ref = `TXN-88${Math.floor(1000 + Math.random() * 9000)}`;
    setTransactions((prev) => [
      { ref, note, amount: -amount, at: 'Just now' },
      ...prev,
    ]);
    return true;
  }, []);

  const topUp = useCallback((amount: number) => {
    const next = balanceRef.current + amount;
    balanceRef.current = next;
    setBalance(next);
    const ref = `TXN-88${Math.floor(1000 + Math.random() * 9000)}`;
    setTransactions((prev) => [
      { ref, note: 'Wallet top-up from GTBank', amount, at: 'Just now' },
      ...prev,
    ]);
  }, []);

  const reset = useCallback(() => {
    balanceRef.current = 0;
    setBalance(0);
    setTransactions(DEFAULT_TXS);
  }, []);

  const value = useMemo<WalletCtx>(
    () => ({ balance, hydrated, transactions, spend, topUp, reset }),
    [balance, hydrated, transactions, spend, topUp, reset],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletCtx {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
}