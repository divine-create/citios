'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  Zap,
  Star,
  Bike,
  Clock,
  Sparkles,
  Check,
  Save,
  Loader2,
  Tag,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { updateStorefrontPlacement, StorefrontPlacement } from '@/lib/actions/storefront-management';
import { FOOD_CATEGORY_BUBBLES, MARKET_CATEGORY_BUBBLES } from '@/components/cityos/delivery/ChowdeckCategoryBubbles';
import { cn } from '@/lib/utils';

interface ManagedStorefrontPlacementProps {
  businessData: any;
}

export default function ManagedStorefrontPlacement({ businessData }: ManagedStorefrontPlacementProps) {
  const org = businessData.organization;
  const metadata = businessData.metadata || {};

  const isRetail = org.type === 'RETAIL';
  const availableTags = isRetail
    ? MARKET_CATEGORY_BUBBLES.filter((b) => b.id !== 'All').map((b) => b.label)
    : FOOD_CATEGORY_BUBBLES.filter((b) => b.id !== 'all' && b.id !== 'fast').map((b) => b.label);

  const [isFeatured, setIsFeatured] = useState<boolean>(Boolean(metadata.isFeatured));
  const [isFastCourier, setIsFastCourier] = useState<boolean>(Boolean(metadata.isFastCourier));
  const [isVerified, setIsVerified] = useState<boolean>(Boolean(metadata.isVerified));
  const [deliveryEta, setDeliveryEta] = useState<string>(metadata.deliveryEta || '');
  const [deliveryFee, setDeliveryFee] = useState<number>(typeof metadata.deliveryFee === 'number' ? metadata.deliveryFee : 0);
  const [freeDeliveryOver, setFreeDeliveryOver] = useState<number>(typeof metadata.freeDeliveryOver === 'number' ? metadata.freeDeliveryOver : 0);
  const [rating, setRating] = useState<number>(typeof metadata.rating === 'number' ? metadata.rating : 5.0);
  const [reviewCount, setReviewCount] = useState<number>(typeof metadata.reviewCount === 'number' ? metadata.reviewCount : 0);
  const [badge, setBadge] = useState<string>(metadata.badge || '');
  const [isOpen, setIsOpen] = useState<boolean>(typeof metadata.isOpen === 'boolean' ? metadata.isOpen : true);

  // Selected Cuisines or Aisles
  const initialTags: string[] = isRetail
    ? Array.isArray(metadata.aisles) ? metadata.aisles : []
    : Array.isArray(metadata.cuisines) ? metadata.cuisines : [];

  const [selectedTags, setSelectedTags] = useState<string[]>(initialTags);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const payload: StorefrontPlacement = {
        organizationId: org.id,
        isFeatured,
        isFastCourier,
        isVerified,
        deliveryEta,
        deliveryFee: Number(deliveryFee),
        freeDeliveryOver: Number(freeDeliveryOver),
        rating: Number(rating),
        reviewCount: Number(reviewCount),
        badge: badge.trim() || undefined,
        isOpen,
      };

      if (isRetail) {
        payload.aisles = selectedTags;
      } else {
        payload.cuisines = selectedTags;
      }

      await updateStorefrontPlacement(payload);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to update storefront placement');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8">
      <div>
        <h2 className="text-xl font-black text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-orange-400" />
          Chowdeck & Glovo Storefront Badging & Placement
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Configure how {org.name} appears on the consumer front page ({isRetail ? '/market' : '/food'}), including delivery ETAs, verified badges, and category tags.
        </p>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          Storefront settings saved! Changes are live on {isRetail ? '/market' : '/food'}.
        </div>
      )}

      {saveError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400" />
          {saveError}
        </div>
      )}

      {/* Toggles Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Featured Toggle */}
        <div
          onClick={() => setIsFeatured(!isFeatured)}
          className={cn(
            'p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between gap-3',
            isFeatured
              ? 'bg-orange-500/10 border-orange-500 text-orange-400'
              : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider">🔥 Trending / Featured</span>
            <span className={cn('w-3 h-3 rounded-full', isFeatured ? 'bg-orange-500 animate-pulse' : 'bg-slate-700')} />
          </div>
          <p className="text-[11px] text-slate-400">
            Showcases business in the "Trending in Calabar" horizontal rail.
          </p>
        </div>

        {/* Fast Courier / Express Toggle */}
        <div
          onClick={() => setIsFastCourier(!isFastCourier)}
          className={cn(
            'p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between gap-3',
            isFastCourier
              ? 'bg-blue-500/10 border-blue-500 text-blue-400'
              : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider">⚡ Under 25 Mins (Fast)</span>
            <span className={cn('w-3 h-3 rounded-full', isFastCourier ? 'bg-blue-500 animate-pulse' : 'bg-slate-700')} />
          </div>
          <p className="text-[11px] text-slate-400">
            Places business in the "⚡ Fastest Delivery" express courier rail.
          </p>
        </div>

        {/* Verified Badge Toggle */}
        <div
          onClick={() => setIsVerified(!isVerified)}
          className={cn(
            'p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between gap-3',
            isVerified
              ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
              : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider">Verified Checkmark ✓</span>
            <span className={cn('w-3 h-3 rounded-full', isVerified ? 'bg-emerald-500' : 'bg-slate-700')} />
          </div>
          <p className="text-[11px] text-slate-400">
            Displays the green verified partner shield next to store name.
          </p>
        </div>

        {/* Operating Status Toggle */}
        <div
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between gap-3',
            isOpen
              ? 'bg-teal-500/10 border-teal-500 text-teal-400'
              : 'bg-rose-500/10 border-rose-500 text-rose-400'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider">Store Status</span>
            <span className={cn('w-3 h-3 rounded-full', isOpen ? 'bg-teal-500' : 'bg-rose-500')} />
          </div>
          <p className="text-[11px]">
            {isOpen ? '🟢 Open for Orders' : '🔴 Closed / Pre-Orders Only'}
          </p>
        </div>
      </div>

      {/* Delivery Economics & Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
            Delivery ETA
          </label>
          <div className="relative">
            <Clock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              required
              value={deliveryEta}
              onChange={(e) => setDeliveryEta(e.target.value)}
              placeholder="e.g. 15 - 25 min"
              className="w-full text-xs pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:border-orange-500 font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
            Delivery Fee (₦)
          </label>
          <div className="relative">
            <span className="text-xs font-bold text-slate-500 absolute left-3 top-2.5">₦</span>
            <input
              type="number"
              required
              value={deliveryFee}
              onChange={(e) => setDeliveryFee(Number(e.target.value))}
              placeholder="e.g. 450"
              className="w-full text-xs pl-8 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:border-orange-500 font-mono font-bold"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
            Star Rating (1 - 5)
          </label>
          <div className="relative">
            <Star className="w-4 h-4 text-amber-400 absolute left-3 top-3" />
            <input
              type="number"
              step="0.1"
              min="1"
              max="5"
              required
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="w-full text-xs pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono font-bold focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
            Review Count
          </label>
          <input
            type="number"
            min="0"
            required
            value={reviewCount}
            onChange={(e) => setReviewCount(Number(e.target.value))}
            className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono font-bold focus:outline-none focus:border-orange-500"
          />
        </div>
      </div>

      {/* Custom Promo Sticker */}
      <div>
        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
          Custom Promo Sticker (Optional)
        </label>
        <div className="relative">
          <Tag className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            value={badge}
            onChange={(e) => setBadge(e.target.value)}
            placeholder="e.g. Free Delivery Over ₦5k, 10% OFF, Verified Kitchen"
            className="w-full text-xs pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:border-orange-500"
          />
        </div>
      </div>

      {/* Category Bubble Tagging */}
      <div className="space-y-3 pt-2">
        <label className="block text-xs font-black text-slate-300 uppercase tracking-wider">
          {isRetail ? 'Associate with Supermarket Aisles' : 'Associate with Cuisine Category Bubbles'}
        </label>
        <p className="text-xs text-slate-500">
          Click tags to activate. When residents tap this bubble on the front page, {org.name} will be displayed.
        </p>

        <div className="flex flex-wrap gap-2">
          {availableTags.map((tag) => {
            const isSelected = selectedTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={cn(
                  'px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border flex items-center gap-1.5',
                  isSelected
                    ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                )}
              >
                {isSelected && <Check className="w-3.5 h-3.5" />}
                <span>{tag}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Submit Button */}
      <div className="pt-4 border-t border-slate-800 flex items-center justify-end">
        <button
          type="submit"
          disabled={isSaving}
          className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 text-xs font-black shadow-lg shadow-orange-500/20 disabled:opacity-50 transition-all flex items-center gap-2 cursor-pointer"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving Placement...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Storefront Settings</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
