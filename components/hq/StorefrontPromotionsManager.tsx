'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Tag,
  Plus,
  Trash2,
  Save,
  Check,
  AlertCircle,
  Loader2,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Eye,
  Utensils,
  ShoppingBag,
} from 'lucide-react';
import { StorefrontCampaign, saveStorefrontPromotions } from '@/lib/actions/storefront-management';
import { FallbackImg } from '@/components/cityos/CityUI';
import { cn } from '@/lib/utils';

interface StorefrontPromotionsManagerProps {
  initialFoodCampaigns: StorefrontCampaign[];
  initialMarketCampaigns: StorefrontCampaign[];
  citySlug: string;
}

export default function StorefrontPromotionsManager({
  initialFoodCampaigns,
  initialMarketCampaigns,
  citySlug,
}: StorefrontPromotionsManagerProps) {
  const [activeVertical, setActiveVertical] = useState<'FOOD' | 'MARKET'>('FOOD');
  const [foodCampaigns, setFoodCampaigns] = useState<StorefrontCampaign[]>(initialFoodCampaigns);
  const [marketCampaigns, setMarketCampaigns] = useState<StorefrontCampaign[]>(initialMarketCampaigns);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const currentList = activeVertical === 'FOOD' ? foodCampaigns : marketCampaigns;
  const setList = activeVertical === 'FOOD' ? setFoodCampaigns : setMarketCampaigns;

  const handleAddCampaign = () => {
    const newCamp: StorefrontCampaign = {
      id: `custom-${Date.now()}`,
      title: activeVertical === 'FOOD' ? 'New Food Promotion 🌶️' : 'New Supermarket Deal 🛒',
      subtitle: 'Exclusive discounts and express delivery across Calabar.',
      badge: 'Special Offer',
      code: 'CHOWDEAL',
      imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1200&auto=format&fit=crop&q=80',
      targetUrl: activeVertical === 'FOOD' ? '/food' : '/market',
      vertical: activeVertical,
      priority: currentList.length + 1,
      bgColor: 'from-orange-600 via-rose-600 to-amber-700',
      isActive: true,
    };
    setList([...currentList, newCamp]);
  };

  const handleUpdate = (id: string, field: keyof StorefrontCampaign, value: any) => {
    setList((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const handleDelete = (id: string) => {
    setList((prev) => prev.filter((c) => c.id !== id));
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentList.length) return;
    const updated = [...currentList];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setList(updated);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      await saveStorefrontPromotions({
        citySlug,
        vertical: activeVertical,
        campaigns: currentList,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e: any) {
      setSaveError(e.message || 'Failed to save campaigns');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Tag className="w-6 h-6 text-orange-400" /> Hero Deals & Promotional Banners
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage the swipeable hero deals carousels displayed on the front page of Food (/food) and Shops (/market).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleAddCampaign}
            className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 text-xs font-black transition-all flex items-center gap-1.5 shadow-md shadow-orange-500/20"
          >
            <Plus className="w-4 h-4" /> Add Promo Slide
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition-all flex items-center gap-1.5 shadow-md shadow-emerald-500/20 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save & Publish
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          Promotions published! The front pages will show the updated carousel slides immediately.
        </div>
      )}

      {saveError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400" />
          {saveError}
        </div>
      )}

      {/* Vertical Selector Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveVertical('FOOD')}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all',
            activeVertical === 'FOOD'
              ? 'bg-orange-500 text-slate-950 font-black shadow-md shadow-orange-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          )}
        >
          <Utensils className="w-4 h-4" />
          Food Delivery Promos (/food) ({foodCampaigns.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveVertical('MARKET')}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all',
            activeVertical === 'MARKET'
              ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          )}
        >
          <ShoppingBag className="w-4 h-4" />
          Supermarket & Market Promos (/market) ({marketCampaigns.length})
        </button>
      </div>

      {/* Campaigns List */}
      <div className="space-y-4">
        {currentList.map((campaign, idx) => (
          <div
            key={campaign.id}
            className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 text-xs font-black flex items-center justify-center">
                  {idx + 1}
                </span>
                <span className="text-xs font-black text-white uppercase tracking-wider">
                  {campaign.badge || 'Campaign'}
                </span>
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                    campaign.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'
                  )}
                >
                  {campaign.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={() => handleMove(idx, 'up')}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white disabled:opacity-30"
                  title="Move up"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={idx === currentList.length - 1}
                  onClick={() => handleMove(idx, 'down')}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white disabled:opacity-30"
                  title="Move down"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdate(campaign.id, 'isActive', !campaign.isActive)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-bold"
                >
                  {campaign.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(campaign.id)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 transition-colors"
                  title="Delete slide"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Headline Title
                </label>
                <input
                  type="text"
                  value={campaign.title}
                  onChange={(e) => handleUpdate(campaign.id, 'title', e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Badge Label
                </label>
                <input
                  type="text"
                  value={campaign.badge}
                  onChange={(e) => handleUpdate(campaign.id, 'badge', e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Promo Code (Optional)
                </label>
                <input
                  type="text"
                  value={campaign.code || ''}
                  onChange={(e) => handleUpdate(campaign.id, 'code', e.target.value.toUpperCase())}
                  placeholder="e.g. CHOWCALABAR"
                  className="w-full text-xs p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-amber-300 font-mono font-bold focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="lg:col-span-2">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Subtitle Description
                </label>
                <input
                  type="text"
                  value={campaign.subtitle}
                  onChange={(e) => handleUpdate(campaign.id, 'subtitle', e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Target Link URL
                </label>
                <input
                  type="text"
                  value={campaign.targetUrl}
                  onChange={(e) => handleUpdate(campaign.id, 'targetUrl', e.target.value)}
                  placeholder="e.g. /food?filter=soups"
                  className="w-full text-xs p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="lg:col-span-3">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Hero Image URL
                </label>
                <div className="flex gap-3 items-center">
                  <input
                    type="text"
                    value={campaign.imageUrl}
                    onChange={(e) => handleUpdate(campaign.id, 'imageUrl', e.target.value)}
                    className="flex-1 text-xs p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-orange-500"
                  />
                  <div className="w-16 h-10 rounded-lg overflow-hidden bg-slate-800 shrink-0 border border-slate-700">
                    <FallbackImg
                      src={campaign.imageUrl}
                      alt="preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
