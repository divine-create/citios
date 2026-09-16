"use client";

import React, { useState, useEffect } from "react";
import { Globe, X, Loader2, Wallet, ExternalLink, Store as StoreIcon } from "lucide-react";
import { getShopStorefront, updateShopStorefront, getShopWalletBalance, toggleWalletSettlement } from "@/lib/actions/retail";

export default function OnlineStoreTab({ organizationId, onChanged }: { organizationId: string; onChanged: () => void }) {
  const [loading, setLoading] = useState(true);
  const [storeName, setStoreName] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [receiptMessage, setReceiptMessage] = useState("");
  const [slug, setSlug] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [symbol, setSymbol] = useState("$");
  const [walletEnabled, setWalletEnabled] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [walletCurrency, setWalletCurrency] = useState("USD");
  const [savingMeta, setSavingMeta] = useState(false);
  const [togglingPublish, setTogglingPublish] = useState(false);
  const [togglingWallet, setTogglingWallet] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [sf, w] = await Promise.all([getShopStorefront(organizationId), getShopWalletBalance(organizationId)]);
    setStoreName(sf.settings?.storeName ?? "");
    setStoreAddress(sf.settings?.storeAddress ?? "");
    setReceiptMessage(sf.settings?.receiptMessage ?? "");
    setSlug(sf.site?.slug ?? null);
    setStatus(sf.site?.status ?? null);
    setPublishedAt(sf.site?.publishedAt ?? null);
    setSymbol(sf.settings?.currencySymbol ?? "$");
    setWalletEnabled(!!w.enabled);
    setWalletBalance(w.wallet?.balance ?? null);
    setWalletCurrency(w.wallet?.currency ?? "USD");
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  const saveMeta = async () => {
    setError(null);
    setNotice(null);
    setSavingMeta(true);
    try {
      const res = await updateShopStorefront(organizationId, { storeName, storeAddress, receiptMessage });
      if ((res as any)?.error) { setError((res as any).error); return; }
      setNotice("Store details saved.");
      onChanged();
    } finally {
      setSavingMeta(false);
    }
  };

  const togglePublish = async () => {
    setError(null);
    setNotice(null);
    setTogglingPublish(true);
    try {
      const isPublished = status === "published";
      if (isPublished) {
        await updateShopStorefront(organizationId, { published: false });
      } else {
        const res = await updateShopStorefront(organizationId, { published: true });
        if ((res as any)?.error) { setError((res as any).error); return; }
      }
      setNotice(isPublished ? "Storefront unpublished." : "Storefront published!");
      load();
      onChanged();
    } finally {
      setTogglingPublish(false);
    }
  };

  const toggleWallet = async () => {
    setError(null);
    setNotice(null);
    setTogglingWallet(true);
    try {
      const res = await toggleWalletSettlement(organizationId, !walletEnabled);
      if ((res as any)?.error) { setError((res as any).error); return; }
      setWalletEnabled(!walletEnabled);
      setNotice(!walletEnabled ? "Sale settlements enabled. New sales credit your CityPay wallet." : "Sale settlements disabled.");
      load();
      onChanged();
    } finally {
      setTogglingWallet(false);
    }
  };

  if (loading) {
    return <div className="p-10 text-center text-slate-400 flex items-center justify-center gap-2"><Loader2 className="animate-spin" size={20} /> Loading…</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-slate-800 mb-1">Online Store</h2>
      <p className="text-sm text-slate-500 mb-6">
        Your customer-facing storefront lives at <span className="font-semibold text-slate-700">{slug ? `${slug}.cityconnect.app` : "your slug"}</span>. Nothing is public until you publish.
      </p>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">{error}</div>}
      {notice && <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 text-sm rounded-lg border border-emerald-100">{notice}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><Globe size={20} /></div>
            <h3 className="font-bold text-slate-800">Store Details</h3>
          </div>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Store name</label>
              <input value={storeName} onChange={(e) => setStoreName(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg" placeholder="Your store name" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Address</label>
              <textarea value={storeAddress} onChange={(e) => setStoreAddress(e.target.value)} rows={2} className="w-full p-2 border border-slate-200 rounded-lg" placeholder="Street, city, region" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Receipt message</label>
              <input value={receiptMessage} onChange={(e) => setReceiptMessage(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg" placeholder="Thanks for shopping with us!" />
            </div>
            <button onClick={saveMeta} disabled={savingMeta} className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-lg transition-colors">
              {savingMeta ? <Loader2 size={16} className="animate-spin inline" /> : "Save store details"}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center"><StoreIcon size={20} /></div>
              <div>
                <h3 className="font-bold text-slate-800">Storefront Status</h3>
                {slug && (
                  <a
                    href={`/site/${slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    {slug}.cityconnect.app <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>
            <div className="round flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 mt-3">
              <div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                  {status === "published" ? "Published" : "Draft"}
                </span>
                {status === "published" && publishedAt && (
                  <span className="block text-xs text-slate-400 mt-1">Since {new Date(publishedAt).toLocaleDateString()}</span>
                )}
              </div>
              <button onClick={togglePublish} disabled={togglingPublish} className={`px-4 py-2 text-white font-bold rounded-lg transition-colors disabled:opacity-50 ${status === "published" ? "bg-slate-700 hover:bg-slate-800" : "bg-emerald-600 hover:bg-emerald-700"}`}>
                {togglingPublish ? <Loader2 size={16} className="animate-spin" /> : (status === "published" ? "Unpublish" : "Publish")}
              </button>
            </div>
            {status !== "published" && (
              <p className="text-xs text-slate-400 mt-3">While in draft, only you can view this site.</p>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center"><Wallet size={20} /></div>
              <h3 className="font-bold text-slate-800">CityPay Settlements</h3>
            </div>
            <p className="text-sm text-slate-500 mb-3">
              When enabled, each completed sale is credited to this store&apos;s CityPay wallet.
            </p>
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
              <div>
                <p className="text-xs text-slate-500">Wallet balance</p>
                <p className="text-xl font-black text-slate-800">
                  {walletEnabled ? `${symbol}${(walletBalance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${walletCurrency}` : "Settlements off"}
                </p>
              </div>
              <button onClick={toggleWallet} disabled={togglingWallet} className={`px-4 py-2 text-white font-bold rounded-lg transition-colors disabled:opacity-50 ${walletEnabled ? "bg-slate-700 hover:bg-slate-800" : "bg-purple-600 hover:bg-purple-700"}`}>
                {togglingWallet ? <Loader2 size={16} className="animate-spin" /> : (walletEnabled ? "Disable" : "Enable")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}