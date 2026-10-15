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
} from 'lucide-react';
import ManagedCatalogEditor from './ManagedCatalogEditor';
import ManagedMediaStudio from './ManagedMediaStudio';
import ManagedProxyPostStudio from './ManagedProxyPostStudio';
import { updateHQManagedOrderStatus } from '@/lib/actions/hq-managed-business';
import { toast } from 'sonner';

interface ManagedBusinessStudioProps {
  businessData: any;
}

export default function ManagedBusinessStudio({ businessData }: ManagedBusinessStudioProps) {
  const [activeTab, setActiveTab] = useState<'catalog' | 'media' | 'posts' | 'orders' | 'info'>('catalog');
  const org = businessData.organization;
  const listing = businessData.listing;
  const metadata = businessData.metadata;
  const catalog = businessData.catalog;
  const posts = businessData.posts;
  const orders = businessData.orders;
  const contactPoints = businessData.contactPoints;

  const isClaimed = businessData.locations?.length > 0 && businessData.orders?.some((o: any) => o.isClaimed);

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
        <button
          onClick={() => setActiveTab('catalog')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'catalog'
              ? 'bg-teal-500 text-slate-950 font-black shadow-lg shadow-teal-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Utensils className="w-4 h-4" /> Menu & Pricing ({catalog.menuItems.length})
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
          <Info className="w-4 h-4" /> Details & Outbox
        </button>
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === 'catalog' && (
          <ManagedCatalogEditor
            organizationId={org.id}
            initialItems={catalog.menuItems}
            verticalType={org.type}
          />
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
              {orders.map((o: any) => (
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
                      <span className="text-slate-500 font-mono text-[10px]">{o.id.slice(0, 8)}...</span>
                    </div>
                    <p className="text-slate-400 mt-1">
                      Customer: <strong className="text-white">{o.customerName}</strong> · {o.itemsCount} items
                    </p>
                  </div>

                  <Link
                    href="/hq/orders"
                    className="px-3 py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-lg transition-colors self-start sm:self-auto"
                  >
                    Manage & Dispatch
                  </Link>
                </div>
              ))}

              {orders.length === 0 && (
                <div className="py-12 text-center bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl text-xs text-slate-500">
                  No orders placed for this business yet.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'info' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 text-xs">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-3">
                Establishment Information
              </h3>
              <div>
                <span className="text-slate-500 font-bold uppercase text-[10px] block">Name</span>
                <span className="text-white text-sm font-bold">{org.name}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold uppercase text-[10px] block">Type</span>
                <span className="text-slate-300">{org.type}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold uppercase text-[10px] block">Address</span>
                <span className="text-slate-300">{org.address || 'Unrecorded'}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold uppercase text-[10px] block">Description</span>
                <p className="text-slate-400 leading-relaxed">{org.description || 'No description recorded'}</p>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 text-xs">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-3">
                Merchant Outreach & Claim Link
              </h3>
              <p className="text-slate-400">
                Send this invite link to the physical business owner to let them claim and take autonomous ownership of this pre-populated profile:
              </p>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-[11px] text-teal-400 break-all select-all">
                https://calabar.cityos.ng/claim?orgId={org.id}
              </div>

              <div className="pt-2">
                <span className="text-slate-500 font-bold uppercase text-[10px] block mb-2">
                  Recorded Contact Points
                </span>
                <div className="space-y-2">
                  {contactPoints.map((cp: any) => (
                    <div key={cp.id} className="flex items-center justify-between p-2 bg-slate-950 rounded-lg border border-slate-850">
                      <span className="font-mono text-slate-400 uppercase text-[10px]">{cp.type}</span>
                      <span className="font-mono text-white text-xs">{cp.value}</span>
                    </div>
                  ))}
                  {contactPoints.length === 0 && (
                    <p className="text-slate-500 italic">No contact channels recorded yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
