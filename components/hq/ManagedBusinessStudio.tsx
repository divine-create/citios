'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Utensils,
  Image,
  Video,
  MessageSquare,
  ShoppingBag,
  Info,
  ExternalLink,
  MapPin,
  Phone,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Hotel,
  Package,
  Sparkles,
} from 'lucide-react';
import ManagedCatalogEditor from './ManagedCatalogEditor';
import ManagedMediaStudio from './ManagedMediaStudio';
import ManagedProxyPostStudio from './ManagedProxyPostStudio';
import ManagedRoomsEditor from './ManagedRoomsEditor';
import ManagedRetailInventoryEditor from './ManagedRetailInventoryEditor';
import ManagedBulkMenuParser from './ManagedBulkMenuParser';
import ManagedStorefrontPlacement from './ManagedStorefrontPlacement';

interface ManagedBusinessStudioProps {
  businessData: any;
}

export default function ManagedBusinessStudio({ businessData }: ManagedBusinessStudioProps) {
  const org = businessData.organization;
  const listing = businessData.listing;
  const metadata = businessData.metadata;
  const catalog = businessData.catalog;
  const posts = businessData.posts;
  const orders = businessData.orders;
  const contactPoints = businessData.contactPoints;

  // Initial tab depending on business type
  const initialTab = org.type === 'HOTEL' ? 'rooms' : org.type === 'RETAIL' ? 'inventory' : 'catalog';
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Navigation & Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/hq/managed"
            className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-black text-white tracking-tight">{org.name}</h1>
              <span className="px-2.5 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300">
                {org.type}
              </span>
              {listing?.isActive ? (
                <span className="px-2 py-0.5 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20 text-xs font-bold">
                  Live on Explore
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold">
                  Staging Mode
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1 font-mono">
              <MapPin className="w-3.5 h-3.5 text-slate-500" /> {org.address || 'Calabar'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={`/org/${org.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-teal-400 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
          >
            View Public Storefront <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto scrollbar-none">
        {/* Restaurant Tabs */}
        {org.type === 'RESTAURANT' && (
          <>
            <button
              onClick={() => setActiveTab('catalog')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'catalog'
                  ? 'bg-teal-500 text-slate-950 font-black shadow-lg shadow-teal-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Utensils className="w-4 h-4" /> Menu & Pricing ({catalog.menuItems?.length || 0})
            </button>

            <button
              onClick={() => setActiveTab('bulk-menu')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'bulk-menu'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-400" /> Bulk Menu Parser
            </button>
          </>
        )}

        {/* Hotel Tabs */}
        {org.type === 'HOTEL' && (
          <button
            onClick={() => setActiveTab('rooms')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'rooms'
                ? 'bg-blue-500 text-white font-black shadow-lg shadow-blue-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Hotel className="w-4 h-4" /> Rooms & Rates ({catalog.hotelRooms?.length || 0})
          </button>
        )}

        {/* Retail Tabs */}
        {org.type === 'RETAIL' && (
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'inventory'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-lg shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Package className="w-4 h-4" /> Products & Stock ({catalog.retailProducts?.length || 0})
          </button>
        )}

        {/* Common Tabs across all businesses */}
        <button
          onClick={() => setActiveTab('storefront')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'storefront'
              ? 'bg-orange-500 text-slate-950 font-black shadow-lg shadow-orange-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Sparkles className="w-4 h-4 text-orange-400" /> Storefront & Badging
        </button>

        <button
          onClick={() => setActiveTab('media')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'media'
              ? 'bg-teal-500 text-slate-950 font-black shadow-lg shadow-teal-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Image className="w-4 h-4" /> Media & Videos
        </button>

        <button
          onClick={() => setActiveTab('posts')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'posts'
              ? 'bg-teal-500 text-slate-950 font-black shadow-lg shadow-teal-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <MessageSquare className="w-4 h-4" /> Proxy Broadcasts ({posts.length})
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'orders'
              ? 'bg-teal-500 text-slate-950 font-black shadow-lg shadow-teal-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <ShoppingBag className="w-4 h-4" /> Managed Orders ({orders.length})
        </button>

        <button
          onClick={() => setActiveTab('info')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'info'
              ? 'bg-teal-500 text-slate-950 font-black shadow-lg shadow-teal-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Info className="w-4 h-4" /> Details & Claim
        </button>
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === 'catalog' && (
          <ManagedCatalogEditor
            organizationId={org.id}
            initialItems={catalog.menuItems || []}
            verticalType={org.type}
          />
        )}

        {activeTab === 'bulk-menu' && (
          <ManagedBulkMenuParser
            organizationId={org.id}
            businessType={org.type}
            onSuccess={() => window.location.reload()}
          />
        )}

        {activeTab === 'rooms' && (
          <ManagedRoomsEditor
            organizationId={org.id}
            initialRooms={catalog.hotelRooms || []}
          />
        )}

        {activeTab === 'inventory' && (
          <ManagedRetailInventoryEditor
            organizationId={org.id}
            initialProducts={catalog.retailProducts || []}
          />
        )}

        {activeTab === 'storefront' && (
          <ManagedStorefrontPlacement businessData={businessData} />
        )}

        {activeTab === 'media' && (
          <ManagedMediaStudio
            organizationId={org.id}
            initialLogo={org.logoAssetId}
            initialCover={listing?.coverAssetId}
            initialMetadata={metadata}
          />
        )}

        {activeTab === 'posts' && (
          <ManagedProxyPostStudio
            organizationId={org.id}
            businessName={org.name}
            initialPosts={posts}
          />
        )}

        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <div>
                <h3 className="text-base font-bold text-white">Resident Orders for {org.name}</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Orders placed by residents. Because this business is managed by HQ, platform admins coordinate preparation and courier dispatch.
                </p>
              </div>
              <Link
                href="/hq/orders"
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-teal-400 font-bold text-xs rounded-xl transition-colors"
              >
                View Full Orders Console &rarr;
              </Link>
            </div>

            <div className="space-y-3">
              {orders.length === 0 ? (
                <div className="text-center py-12 bg-slate-900/50 border border-slate-800 rounded-2xl text-slate-500 text-xs">
                  No orders placed for this establishment yet.
                </div>
              ) : (
                orders.map((o: any) => (
                  <div
                    key={o.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-white font-bold">₦{o.totalAmount.toLocaleString()}</span>
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold uppercase text-[10px]">
                          {o.status}
                        </span>
                        <span className="text-slate-500 text-[11px]">({o.itemsCount} items)</span>
                      </div>
                      <p className="text-slate-400 mt-1">Customer: {o.customerName}</p>
                    </div>

                    <Link
                      href="/hq/orders"
                      className="px-3 py-1.5 bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded-lg font-bold text-center hover:bg-teal-500/20 transition-colors"
                    >
                      Manage in Dispatch Console
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'info' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 text-xs">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Business Verification & Tenancy</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-500 font-mono text-[10px] block">SYSTEM UUID</span>
                <span className="text-white font-mono font-bold">{org.id}</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-500 font-mono text-[10px] block">VERTICAL TYPE</span>
                <span className="text-teal-400 font-bold">{org.type}</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-500 font-mono text-[10px] block">CONTACT POINTS REGISTERED</span>
                <span className="text-white font-bold">{contactPoints.length} numbers/emails</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-500 font-mono text-[10px] block">CLAIM STATUS</span>
                <span className="text-amber-400 font-bold">Unclaimed (Managed by 9jaLive HQ)</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
