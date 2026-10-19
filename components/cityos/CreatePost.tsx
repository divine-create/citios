'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Loader2,
  Globe,
  Users,
  PenSquare,
  Check,
  Image as ImageIcon,
  Video,
  X,
  Calendar,
  MapPin,
  DollarSign,
  ChevronDown,
  Store,
  Phone,
  Palette,
  Sparkles,
  AlertCircle,
  ArrowLeft,
  Eye,
  Edit3,
  ThumbsUp,
  MessageSquare,
  Share2,
  CheckCircle2,
  RotateCcw,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createPost } from '@/app/actions/newsfeed';
import { useCity } from '@/components/cityos/CityProvider';
import { useSession } from 'next-auth/react';
import { POST_BACKGROUNDS, type PostBackgroundId } from '@/lib/post-background';
import { useAccountSwitcher } from '@/components/cityos/AccountSwitcherContext';
import { CANONICAL_CITY_AREAS } from '@/lib/city-areas';

export const POST_CATEGORIES = [
  { id: 'Update', label: 'Update', icon: '📢', desc: 'News, announcements & thoughts' },
  { id: 'Sales', label: 'Sales', icon: '🏷️', desc: 'Products, deals & classifieds' },
  { id: 'Event', label: 'Event', icon: '🎉', desc: 'Meetups, concerts & gatherings' },
  { id: 'Housing', label: 'Housing', icon: '🏠', desc: 'Short-lets, apartments & rentals' },
  { id: 'Question', label: 'Question', icon: '❓', desc: 'Ask neighbors and city experts' },
] as const;

export type PostCategory = typeof POST_CATEGORIES[number]['id'];

const DRAFT_STORAGE_KEY = 'cityos_composer_draft_v2';

function resolveCategory(cat: string | null | undefined): PostCategory {
  if (!cat) return 'Update';
  if (cat === 'Offer') return 'Sales';
  if (cat === 'Community') return 'Update';
  if (cat === 'Ask the city' || cat === 'Ask+the+city') return 'Question';
  const found = POST_CATEGORIES.find((c) => c.id.toLowerCase() === cat.toLowerCase());
  return found ? (found.id as PostCategory) : 'Update';
}

function getQuickEventDate(offsetDays: number, hour: number, minute: number = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, minute, 0, 0);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CreatePost() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const { city } = useCity();
  const cityName = city?.name ?? 'Calabar';
  const citySlug = (city?.slug || 'calabar').toLowerCase();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const initialCat = resolveCategory(searchParams?.get('category'));
  const [category, setCategory] = useState<PostCategory>(initialCat);
  const [audience, setAudience] = useState<'public' | 'following'>('public');
  const [showAudienceMenu, setShowAudienceMenu] = useState(false);
  const [viewMode, setViewMode] = useState<'write' | 'preview'>('write');

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [postBackground, setPostBackground] = useState<PostBackgroundId>('auto');

  // Media
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [videoUrl, setVideoUrl] = useState('');

  // Structured fields
  const [eventDate, setEventDate] = useState('');
  const [location, setLocation] = useState('');
  const [price, setPrice] = useState('');
  const [phone, setPhone] = useState('');

  // Progressive Disclosure tool toggles
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [showPriceInput, setShowPriceInput] = useState(false);
  const [showEventDateInput, setShowEventDateInput] = useState(false);
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [showVideoInput, setShowVideoInput] = useState(false);
  const [showBackgroundPicker, setShowBackgroundPicker] = useState(false);

  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);

  const { myBusinesses, activeBusiness } = useAccountSwitcher();
  const paramOrgId = searchParams?.get('org');
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(paramOrgId || activeBusiness?.id || null);
  const [showAuthorMenu, setShowAuthorMenu] = useState(false);

  // Auto-resize textarea smoothly as user types
  const adjustTextareaHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(120, textareaRef.current.scrollHeight)}px`;
    }
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [body, category, adjustTextareaHeight]);

  // Restore Draft on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.body || parsed.title) {
          setTitle(parsed.title || '');
          setBody(parsed.body || '');
          if (parsed.category) setCategory(parsed.category);
          if (parsed.location) setLocation(parsed.location);
          if (parsed.price) setPrice(parsed.price);
          if (parsed.eventDate) setEventDate(parsed.eventDate);
          if (parsed.phone) setPhone(parsed.phone);
          setHasRestoredDraft(true);
        }
      }
    } catch {}
  }, []);

  // Save Draft to LocalStorage debounced
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        if (body.trim() || title.trim()) {
          localStorage.setItem(
            DRAFT_STORAGE_KEY,
            JSON.stringify({
              title,
              body,
              category,
              location,
              price,
              eventDate,
              phone,
              savedAt: Date.now(),
            })
          );
        }
      } catch {}
    }, 600);
    return () => clearTimeout(t);
  }, [title, body, category, location, price, eventDate, phone]);

  const discardDraft = () => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {}
    setTitle('');
    setBody('');
    setLocation('');
    setPrice('');
    setEventDate('');
    setPhone('');
    clearImage();
    setHasRestoredDraft(false);
  };

  useEffect(() => {
    if (searchParams?.get('category')) {
      const resolved = resolveCategory(searchParams.get('category'));
      setCategory(resolved);
    }
  }, [searchParams]);

  useEffect(() => {
    if (paramOrgId) {
      setSelectedOrgId(paramOrgId);
    } else if (activeBusiness?.id && selectedOrgId === null) {
      setSelectedOrgId(activeBusiness.id);
    }
  }, [paramOrgId, activeBusiness?.id]);

  // Contextually expand relevant tools when category switches
  useEffect(() => {
    if (category === 'Sales') {
      setShowPriceInput(true);
      setShowLocationInput(true);
      setShowPhoneInput(true);
    } else if (category === 'Event') {
      setShowEventDateInput(true);
      setShowLocationInput(true);
      setShowPriceInput(true);
    } else if (category === 'Housing') {
      setShowLocationInput(true);
      setShowPriceInput(true);
      setShowPhoneInput(true);
    } else if (category === 'Question') {
      setShowLocationInput(true);
    }
  }, [category]);

  const selectedBusiness = myBusinesses.find((b) => b.id === selectedOrgId);
  const isBusinessAuthor = Boolean(selectedBusiness);

  const authorName = selectedBusiness ? selectedBusiness.name : (session?.user?.name || 'Resident');
  const authorSubtitle = selectedBusiness
    ? `${selectedBusiness.type || 'Business'} Page`
    : `Resident Account`;

  const needsTitle = category !== 'Update';
  const canPublish =
    body.trim().length > 2 &&
    (!needsTitle || title.trim().length > 2) &&
    (category !== 'Event' || Boolean(eventDate)) &&
    !publishing;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setPublishError('Image is too large. Please select an image under 10MB.');
      return;
    }

    setPublishError(null);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setShowBackgroundPicker(false);
  };

  const clearImage = () => {
    setImageUrl('');
    setImageFile(null);
    setImagePreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const publish = async () => {
    if (!canPublish) return;
    setPublishing(true);
    setPublishError(null);

    try {
      let finalImageUrl = imageUrl;

      // Upload image via /api/upload
      if (imageFile) {
        const formData = new FormData();
        formData.append('file', imageFile);
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok || !uploadData?.url) {
          throw new Error(uploadData?.error || 'Failed to upload image');
        }
        finalImageUrl = uploadData.url;
      }

      await createPost({
        title: needsTitle
          ? title.trim()
          : (body.trim().length > 50 ? body.trim().slice(0, 50) + '...' : body.trim()),
        body: body.trim(),
        category,
        imageUrl: finalImageUrl.trim() || undefined,
        videoUrl: videoUrl.trim() || undefined,
        eventDate: eventDate || undefined,
        location: location.trim() || undefined,
        price: price ? parseFloat(price) : undefined,
        phone: phone.trim() || undefined,
        postBackground: (imagePreview || finalImageUrl) ? undefined : postBackground,
        organizationId: selectedOrgId || undefined,
      });

      // Clear draft on publish
      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {}

      setPublished(true);
      window.setTimeout(() => router.push('/feed'), 700);
    } catch (e) {
      console.error(e);
      setPublishing(false);
      setPublishError('Failed to publish post: ' + (e instanceof Error ? e.message : String(e)));
    }
  };

  // Keyboard shortcut: Cmd+Enter or Ctrl+Enter to publish
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      if (canPublish) {
        publish();
      }
    }
  };

  if (!session?.user) {
    const callbackUrl = '/feed/new' + (category ? `?category=${encodeURIComponent(category)}` : '');
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-3xl border border-slate-200/80 shadow-xl p-8 text-center animate-in fade-in duration-300">
        <div className="w-16 h-16 bg-gradient-to-br from-teal-700 to-teal-900 rounded-2xl flex items-center justify-center text-white mx-auto mb-5 shadow-xl shadow-teal-950/10">
          <PenSquare className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900 mb-2">Sign in to Post to 9jaLive</h2>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed max-w-sm mx-auto">
          Join your local city community to post announcements, offers, discussions, events, or questions for {cityName}.
        </p>
        <div className="space-y-3">
          <a
            href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className="w-full py-3 px-4 bg-teal-800 hover:bg-teal-900 text-white font-black text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
          >
            Sign in to 9jaLive
          </a>
          <a
            href={`/register?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors flex items-center justify-center border border-slate-200"
          >
            Create New Account
          </a>
          <button
            onClick={() => router.back()}
            className="w-full py-2 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-wider mt-2"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const activeName = session.user.name || 'Resident';
  const activeInitials = activeName?.slice(0, 1) || 'U';
  const activeBackground = POST_BACKGROUNDS.find((b) => b.id === postBackground) || POST_BACKGROUNDS[0];

  // Quick neighborhood suggestions for Calabar / current city
  const neighborhoodSuggestions =
    CANONICAL_CITY_AREAS[citySlug]?.slice(0, 7) || [
      { id: 'marian', shortName: 'Marian Road' },
      { id: 'state-housing', shortName: 'State Housing' },
      { id: 'etta-agbor', shortName: 'Etta Agbor' },
      { id: 'federal-housing', shortName: 'Federal Housing' },
      { id: 'unical', shortName: 'Unical Campus' },
      { id: 'calabar-south', shortName: 'Calabar South' },
      { id: 'watt-market', shortName: 'Watt Market' },
    ];

  // Contextual Placeholders
  const getTitlePlaceholder = () => {
    switch (category) {
      case 'Sales':
        return 'What are you selling? (e.g. iPhone 14 Pro, Dining Table, Inverter)';
      case 'Event':
        return 'Event Title (e.g. Live Music Night, Calabar Tech Meetup)';
      case 'Housing':
        return 'Property Title (e.g. Furnished 2-Bedroom Apartment in Marian)';
      case 'Question':
        return 'What is your question for the city?';
      default:
        return 'Post Title (optional)';
    }
  };

  const getBodyPlaceholder = () => {
    switch (category) {
      case 'Sales':
        return 'Describe the item, condition, specifications, warranty, or delivery details...';
      case 'Event':
        return 'Add event details, schedule, special performers, dress code, or what to bring...';
      case 'Housing':
        return 'Describe the apartment, bedrooms, power supply, amenities, security, and lease terms...';
      case 'Question':
        return 'Add context or details so neighbors and local experts can help you best...';
      default:
        return `What's happening in ${cityName}? Share news, announcements, or thoughts...`;
    }
  };

  // Character counter progress
  const charCount = body.length;
  const maxCharLimit = 1000;
  const charPercent = Math.min(100, (charCount / maxCharLimit) * 100);

  return (
    <div
      onKeyDown={handleKeyDown}
      className="max-w-2xl mx-auto space-y-3.5 animate-in fade-in duration-300 pb-20 sm:pb-12"
    >
      {/* Top Header Row with Write / Preview Tabs */}
      <div className="flex items-center justify-between px-1">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* View Mode Segmented Switcher */}
        <div className="flex items-center bg-slate-200/80 p-0.5 rounded-full border border-slate-300/60 shadow-xs">
          <button
            type="button"
            onClick={() => setViewMode('write')}
            className={cn(
              'flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black transition-all',
              viewMode === 'write'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            )}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Write</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('preview')}
            className={cn(
              'flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black transition-all',
              viewMode === 'preview'
                ? 'bg-teal-800 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            )}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Live Preview</span>
          </button>
        </div>
      </div>

      {/* Restored Draft Banner */}
      {hasRestoredDraft && (
        <div className="p-2.5 px-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-amber-700" />
            <span>Restored an unsaved draft from your device.</span>
          </div>
          <button
            type="button"
            onClick={discardDraft}
            className="text-[11px] font-black uppercase text-amber-800 hover:text-red-700 underline transition-colors"
          >
            Discard
          </button>
        </div>
      )}

      {/* Main Composer Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        {/* 1. Unified Identity & Audience Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between relative bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-10 h-10 rounded-full text-white flex items-center justify-center text-sm font-black shadow-sm shrink-0 bg-gradient-to-br',
                isBusinessAuthor ? 'from-amber-600 to-teal-800' : 'from-teal-800 to-emerald-700'
              )}
            >
              {isBusinessAuthor ? <Store className="w-5 h-5" /> : activeInitials}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowAuthorMenu((o) => !o)}
                className="flex items-center gap-1.5 px-2 py-1 -ml-2 rounded-xl hover:bg-slate-200/60 transition-colors text-left group"
              >
                <div>
                  <div className="flex items-center gap-1">
                    <p className="text-[13px] font-black text-slate-900 group-hover:text-teal-800 transition-colors">
                      {authorName}
                    </p>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-transform" />
                  </div>
                  <p className="text-[10px] font-bold text-slate-500">{authorSubtitle}</p>
                </div>
              </button>

              {/* Author Dropdown */}
              {showAuthorMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowAuthorMenu(false)} />
                  <div className="absolute left-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <p className="px-4 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Post identity
                    </p>

                    {/* Personal Account */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOrgId(null);
                        setShowAuthorMenu(false);
                      }}
                      className={cn(
                        'w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-slate-50 transition-colors',
                        !selectedOrgId && 'bg-teal-50 text-teal-900 font-bold'
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-teal-800 text-white flex items-center justify-center text-xs font-bold shrink-0">
                          {activeInitials}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-slate-900 truncate">
                            {session.user.name || 'Resident'}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">Personal Account</p>
                        </div>
                      </div>
                      {!selectedOrgId && <Check className="w-4 h-4 text-teal-700 shrink-0" />}
                    </button>

                    {/* Business Pages */}
                    {myBusinesses.map((biz) => {
                      const isSelected = selectedOrgId === biz.id;
                      return (
                        <button
                          key={biz.id}
                          type="button"
                          onClick={() => {
                            setSelectedOrgId(biz.id);
                            setShowAuthorMenu(false);
                          }}
                          className={cn(
                            'w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-slate-50 transition-colors',
                            isSelected && 'bg-teal-50 text-teal-900 font-bold'
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-teal-700 text-white flex items-center justify-center text-xs font-bold shrink-0">
                              <Store className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-black text-slate-900 truncate">{biz.name}</p>
                              <p className="text-[10px] text-slate-400 font-medium truncate">
                                {biz.type} Page
                              </p>
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-teal-700 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Audience Pill */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowAudienceMenu((o) => !o)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 hover:border-slate-300 text-xs font-bold text-slate-700 shadow-xs transition-colors"
            >
              {audience === 'public' ? (
                <>
                  <Globe className="w-3.5 h-3.5 text-teal-600" />
                  <span>Public</span>
                </>
              ) : (
                <>
                  <Users className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Following</span>
                </>
              )}
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showAudienceMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowAudienceMenu(false)} />
                <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    type="button"
                    onClick={() => {
                      setAudience('public');
                      setShowAudienceMenu(false);
                    }}
                    className={cn(
                      'w-full flex items-center gap-2 px-3.5 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors',
                      audience === 'public' && 'bg-teal-50 text-teal-900'
                    )}
                  >
                    <Globe className="w-4 h-4 text-teal-600" />
                    <div>
                      <p className="font-black text-slate-900">Public</p>
                      <p className="text-[10px] text-slate-400 font-normal">Visible to all of {cityName}</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAudience('following');
                      setShowAudienceMenu(false);
                    }}
                    className={cn(
                      'w-full flex items-center gap-2 px-3.5 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors',
                      audience === 'following' && 'bg-teal-50 text-teal-900'
                    )}
                  >
                    <Users className="w-4 h-4 text-indigo-600" />
                    <div>
                      <p className="font-black text-slate-900">Followers only</p>
                      <p className="text-[10px] text-slate-400 font-normal">Only people following you</p>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 2. Category Selector Pills */}
        <div className="px-4 sm:px-5 pt-3.5 pb-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {POST_CATEGORIES.map((cat) => {
            const isActive = category === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={cn(
                  'px-3.5 py-2 rounded-2xl text-xs font-black shrink-0 transition-all flex items-center gap-1.5 cursor-pointer',
                  isActive
                    ? 'bg-teal-800 text-white shadow-sm shadow-teal-900/10 scale-[1.02]'
                    : 'bg-slate-100/80 hover:bg-slate-200/80 text-slate-600'
                )}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* 3. Context Banner */}
        {category !== 'Housing' && (
          <div className="px-4 sm:px-5 py-2 text-[11px] font-bold border-b border-slate-100 flex items-center gap-2 bg-gradient-to-r from-teal-50/60 to-transparent text-teal-900">
            <Sparkles className="w-3.5 h-3.5 text-teal-700 shrink-0" />
            <span className="truncate">
              {category === 'Event' && `🎉 Auto-Bridge: Published to Feed AND official ${cityName} Events Calendar.`}
              {category === 'Sales' && (isBusinessAuthor
                ? `🛍️ Auto-Bridge: Published to Feed AND your CityMart Storefront catalog.`
                : `🏷️ Marketplace: Published to Feed under Marketplace category.`)}
              {category === 'Update' && `📢 Broadcast: Instant news and updates shared with all residents.`}
              {category === 'Question' && `❓ Resident Inquiry: Broadcast to neighbors, leaders, and verified services.`}
            </span>
          </div>
        )}

        {/* 4. Canvas Writing Area OR Live Preview Card */}
        {viewMode === 'preview' ? (
          /* ================= LIVE FEED PREVIEW MODE ================= */
          <div className="p-4 sm:p-6 bg-slate-100/70 space-y-3">
            <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-1">
              <Eye className="w-3.5 h-3.5 text-teal-700" />
              <span>Live Feed Card Preview (How residents will see this)</span>
            </div>

            {/* Mocked Feed Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Header */}
              <div className="p-4 pb-3 flex items-center gap-3">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full text-white flex items-center justify-center text-sm font-black shadow-sm shrink-0 bg-gradient-to-br',
                    isBusinessAuthor ? 'from-amber-600 to-teal-800' : 'from-teal-800 to-emerald-700'
                  )}
                >
                  {isBusinessAuthor ? <Store className="w-5 h-5" /> : activeInitials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-[13px] font-black text-slate-900">{authorName}</p>
                    {isBusinessAuthor && <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />}
                    <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                      {category}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-bold mt-0.5 uppercase tracking-wider">
                    {authorSubtitle} • Just now
                  </p>
                </div>
              </div>

              {/* Body Content with Gradient Support */}
              {category === 'Update' && !imagePreview && !imageUrl && postBackground !== 'auto' ? (
                <div className={cn('px-6 py-8 text-white text-center font-bold', activeBackground.className)}>
                  {title && <h3 className="text-base font-black mb-1 drop-shadow">{title}</h3>}
                  <p className="text-xl font-bold leading-snug drop-shadow whitespace-pre-line">
                    {body || 'Your update text will appear here...'}
                  </p>
                </div>
              ) : (
                <div className="px-4 pb-2 space-y-2">
                  {title && <h3 className="text-[15px] font-black text-slate-900 leading-snug">{title}</h3>}
                  <p className="text-[13px] text-slate-700 leading-relaxed whitespace-pre-line">
                    {body || 'Type your content to see it previewed here...'}
                  </p>
                </div>
              )}

              {/* Image Preview */}
              {(imagePreview || imageUrl) && (
                <div className="mt-2 max-h-72 overflow-hidden bg-slate-900 flex justify-center">
                  <img
                    src={imagePreview || imageUrl}
                    alt="Preview"
                    className="max-h-72 w-full object-cover"
                  />
                </div>
              )}

              {/* Contextual Badges Strip */}
              {(location || price || eventDate || phone) && (
                <div className="m-4 mt-3 bg-slate-50 rounded-xl p-3 flex flex-wrap gap-x-4 gap-y-2 text-[12px] text-slate-600 font-medium border border-slate-200/80">
                  {eventDate && (
                    <div className="flex items-center gap-1.5 text-teal-900 font-bold">
                      <span>📅</span>
                      <span>{new Date(eventDate).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                    </div>
                  )}
                  {location && (
                    <div className="flex items-center gap-1.5">
                      <span>📍</span>
                      <span>{location}</span>
                    </div>
                  )}
                  {price && (
                    <div className="flex items-center gap-1.5 font-black text-emerald-700">
                      <span>🏷️</span>
                      <span>₦{Number(price).toLocaleString()}</span>
                    </div>
                  )}
                  {phone && (
                    <div className="flex items-center gap-1.5 text-sky-800 font-bold">
                      <span>💬</span>
                      <span>WhatsApp: {phone}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Mock Interaction Footer */}
              <div className="px-4 py-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-400">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5 hover:text-teal-600 cursor-pointer">
                    <ThumbsUp className="w-3.5 h-3.5" /> Like
                  </span>
                  <span className="flex items-center gap-1.5 hover:text-teal-600 cursor-pointer">
                    <MessageSquare className="w-3.5 h-3.5" /> Comment
                  </span>
                  <span className="flex items-center gap-1.5 hover:text-teal-600 cursor-pointer">
                    <Share2 className="w-3.5 h-3.5" /> Share
                  </span>
                </div>
                <span className="text-[11px] text-teal-700">View post →</span>
              </div>
            </div>
          </div>
        ) : (
          /* ================= WRITE MODE ================= */
          <div className="p-4 sm:p-5 space-y-3">
            {/* Title Input (Required for Sales, Event, Housing, Question) */}
            {needsTitle && (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={getTitlePlaceholder()}
                className="w-full bg-transparent text-base sm:text-lg font-black text-slate-900 placeholder:text-slate-300 outline-none pb-2 border-b border-slate-100 focus:border-teal-600 transition-colors"
              />
            )}

            {/* Main Body Text Area (Auto-resizing) */}
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={getBodyPlaceholder()}
                rows={4}
                className="w-full bg-transparent text-[14px] text-slate-800 placeholder:text-slate-400 outline-none resize-none leading-relaxed"
              />

              {/* Character Progress Ring Indicator */}
              <div className="absolute right-1 bottom-1 flex items-center gap-1.5 text-[10px] font-bold text-slate-400 select-none pointer-events-none">
                <svg className="w-4 h-4 -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-slate-200"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className={cn(
                      charCount > 800 ? 'text-amber-500' : 'text-teal-600',
                      charCount >= maxCharLimit && 'text-red-500'
                    )}
                    strokeDasharray={`${charPercent}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <span>{charCount}</span>
              </div>
            </div>

            {/* Gradient Card Style Selector */}
            {category === 'Update' && !imagePreview && !imageUrl && showBackgroundPicker && (
              <div className="pt-2 pb-3 border-t border-slate-100 flex items-center gap-3 animate-in fade-in">
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Card Theme</span>
                <div className="flex items-center gap-2">
                  {POST_BACKGROUNDS.map((bg) => (
                    <button
                      key={bg.id}
                      type="button"
                      title={bg.label}
                      onClick={() => setPostBackground(bg.id)}
                      className={cn(
                        'w-6 h-6 rounded-full bg-gradient-to-br transition-transform hover:scale-110',
                        bg.className,
                        postBackground === bg.id ? 'ring-2 ring-teal-700 scale-110' : 'ring-1 ring-slate-200'
                      )}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Image Thumbnail Preview with Instant Remove */}
            {(imagePreview || imageUrl) && (
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 max-h-60 bg-slate-950 flex items-center justify-center group animate-in fade-in">
                <img
                  src={imagePreview || imageUrl}
                  alt="Upload preview"
                  className="max-h-60 w-full object-contain"
                />
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute top-3 right-3 p-1.5 rounded-full bg-black/70 hover:bg-red-600 text-white transition-colors shadow-md"
                  title="Remove photo"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Active Attachment Chips Bar */}
            <div className="flex items-center gap-2 flex-wrap pt-1">
              {location && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold animate-in fade-in">
                  <MapPin className="w-3 h-3 text-slate-500" />
                  <span className="truncate max-w-[180px]">{location}</span>
                  <button type="button" onClick={() => setLocation('')} className="hover:text-red-600">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {price && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-black animate-in fade-in">
                  <DollarSign className="w-3 h-3 text-emerald-600" />
                  <span>₦{Number(price).toLocaleString()}</span>
                  <button type="button" onClick={() => setPrice('')} className="hover:text-red-600">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {eventDate && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200 text-xs font-bold animate-in fade-in">
                  <Calendar className="w-3 h-3 text-teal-600" />
                  <span>{new Date(eventDate).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                  <button type="button" onClick={() => setEventDate('')} className="hover:text-red-600">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {phone && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-sky-50 text-sky-800 border border-sky-200 text-xs font-bold animate-in fade-in">
                  <Phone className="w-3 h-3 text-sky-600" />
                  <span>{phone}</span>
                  <button type="button" onClick={() => setPhone('')} className="hover:text-red-600">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {videoUrl && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-50 text-purple-800 border border-purple-200 text-xs font-bold animate-in fade-in">
                  <Video className="w-3 h-3 text-purple-600" />
                  <span className="truncate max-w-[140px]">Video attached</span>
                  <button type="button" onClick={() => setVideoUrl('')} className="hover:text-red-600">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>

            {/* Expanded Drawer Inputs with Quick Presets */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              {/* Location Drawer + Neighborhood Quick Tap Chips */}
              {showLocationInput && (
                <div className="space-y-2 animate-in fade-in">
                  <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3.5 py-2.5 border border-slate-200 focus-within:border-teal-600 focus-within:bg-white transition-all">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      placeholder="Area / Neighborhood (e.g. Marian Rd, State Housing, Etta Agbor)"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full bg-transparent text-[13px] outline-none text-slate-800 placeholder:text-slate-400 font-medium"
                    />
                  </div>

                  {/* Quick Neighborhood Suggestions */}
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                    <span className="text-[10px] font-black uppercase text-slate-400 shrink-0">Popular:</span>
                    {neighborhoodSuggestions.map((area) => (
                      <button
                        key={area.id}
                        type="button"
                        onClick={() => setLocation(area.shortName)}
                        className={cn(
                          'px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 transition-colors',
                          location === area.shortName
                            ? 'bg-teal-800 text-white'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                        )}
                      >
                        {area.shortName}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Price Drawer + Quick Price Chips */}
              {showPriceInput && (
                <div className="space-y-2 animate-in fade-in">
                  <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3.5 py-2.5 border border-slate-200 focus-within:border-teal-600 focus-within:bg-white transition-all">
                    <span className="text-slate-400 font-bold text-xs">₦</span>
                    <input
                      type="number"
                      placeholder={
                        category === 'Event'
                          ? 'Ticket Price in ₦ (0 for Free)'
                          : category === 'Housing'
                          ? 'Rent / Night Rate in ₦'
                          : 'Item Price in ₦'
                      }
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full bg-transparent text-[13px] outline-none text-slate-800 placeholder:text-slate-400 font-medium"
                    />
                  </div>

                  {/* Quick Price Presets */}
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                    <span className="text-[10px] font-black uppercase text-slate-400 shrink-0">Presets:</span>
                    {['0', '1000', '5000', '25000', '50000', '150000'].map((pVal) => (
                      <button
                        key={pVal}
                        type="button"
                        onClick={() => setPrice(pVal)}
                        className={cn(
                          'px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 transition-colors',
                          price === pVal
                            ? 'bg-emerald-700 text-white'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                        )}
                      >
                        {pVal === '0' ? 'Free' : `₦${Number(pVal).toLocaleString()}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Event Date Drawer + Quick Shortcuts */}
              {showEventDateInput && (
                <div className="space-y-2 animate-in fade-in">
                  <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3.5 py-2.5 border border-slate-200 focus-within:border-teal-600 focus-within:bg-white transition-all">
                    <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                    <input
                      type="datetime-local"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="w-full bg-transparent text-[13px] outline-none text-slate-800 font-medium"
                    />
                  </div>

                  {/* Quick Date Presets */}
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                    <span className="text-[10px] font-black uppercase text-slate-400 shrink-0">Quick Date:</span>
                    <button
                      type="button"
                      onClick={() => setEventDate(getQuickEventDate(0, 18, 0))}
                      className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 shrink-0"
                    >
                      Tonight 6 PM
                    </button>
                    <button
                      type="button"
                      onClick={() => setEventDate(getQuickEventDate(1, 17, 0))}
                      className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 shrink-0"
                    >
                      Tomorrow 5 PM
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const today = new Date();
                        const daysToSat = (6 - today.getDay() + 7) % 7 || 7;
                        setEventDate(getQuickEventDate(daysToSat, 16, 0));
                      }}
                      className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 shrink-0"
                    >
                      This Saturday 4 PM
                    </button>
                  </div>
                </div>
              )}

              {/* Phone & Video Drawers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {showPhoneInput && (
                  <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3.5 py-2.5 border border-slate-200 focus-within:border-teal-600 focus-within:bg-white transition-all animate-in fade-in">
                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                    <input
                      type="tel"
                      placeholder="WhatsApp contact phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-transparent text-[13px] outline-none text-slate-800 placeholder:text-slate-400 font-medium"
                    />
                  </div>
                )}

                {showVideoInput && (
                  <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3.5 py-2.5 border border-slate-200 focus-within:border-teal-600 focus-within:bg-white transition-all animate-in fade-in">
                    <Video className="w-4 h-4 text-slate-400 shrink-0" />
                    <input
                      type="url"
                      placeholder="Video Link (YouTube, Vimeo, MP4)"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      className="w-full bg-transparent text-[13px] outline-none text-slate-800 placeholder:text-slate-400 font-medium"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Publish Error Notification */}
        {publishError && (
          <div className="mx-4 sm:mx-5 mb-3 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{publishError}</span>
          </div>
        )}

        {/* 5. Bottom Interactive Toolbar & Publish Button */}
        <div className="px-3 sm:px-5 py-3 bg-slate-50 border-t border-slate-100 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5">
          {/* Action Tools */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0">
            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'p-2 rounded-xl text-slate-600 hover:text-teal-700 hover:bg-slate-200/60 transition-colors',
                (imagePreview || imageUrl) && 'text-teal-700 bg-teal-100/60'
              )}
              title="Add photo or flyer"
            >
              <ImageIcon className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => setShowLocationInput((v) => !v)}
              className={cn(
                'p-2 rounded-xl text-slate-600 hover:text-teal-700 hover:bg-slate-200/60 transition-colors',
                (showLocationInput || location) && 'text-teal-700 bg-teal-100/60'
              )}
              title="Add neighborhood location"
            >
              <MapPin className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => setShowPriceInput((v) => !v)}
              className={cn(
                'p-2 rounded-xl text-slate-600 hover:text-teal-700 hover:bg-slate-200/60 transition-colors',
                (showPriceInput || price) && 'text-teal-700 bg-teal-100/60'
              )}
              title="Add price or rate"
            >
              <DollarSign className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => setShowEventDateInput((v) => !v)}
              className={cn(
                'p-2 rounded-xl text-slate-600 hover:text-teal-700 hover:bg-slate-200/60 transition-colors',
                (showEventDateInput || eventDate) && 'text-teal-700 bg-teal-100/60'
              )}
              title="Add event date and time"
            >
              <Calendar className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => setShowPhoneInput((v) => !v)}
              className={cn(
                'p-2 rounded-xl text-slate-600 hover:text-teal-700 hover:bg-slate-200/60 transition-colors',
                (showPhoneInput || phone) && 'text-teal-700 bg-teal-100/60'
              )}
              title="Add WhatsApp / Contact Phone"
            >
              <Phone className="w-5 h-5" />
            </button>

            {category === 'Update' && !imagePreview && (
              <button
                type="button"
                onClick={() => setShowBackgroundPicker((v) => !v)}
                className={cn(
                  'p-2 rounded-xl text-slate-600 hover:text-teal-700 hover:bg-slate-200/60 transition-colors',
                  showBackgroundPicker && 'text-teal-700 bg-teal-100/60'
                )}
                title="Change card theme"
              >
                <Palette className="w-5 h-5" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowVideoInput((v) => !v)}
              className={cn(
                'p-2 rounded-xl text-slate-600 hover:text-teal-700 hover:bg-slate-200/60 transition-colors',
                (showVideoInput || videoUrl) && 'text-teal-700 bg-teal-100/60'
              )}
              title="Attach video URL"
            >
              <Video className="w-5 h-5" />
            </button>
          </div>

          {/* Right Action: Keyboard Hint + Publish Button */}
          <div className="flex items-center gap-3 ml-auto shrink-0">
            <span className="hidden md:inline-flex text-[11px] font-bold text-slate-400">
              ⌘ + Enter
            </span>

            <button
              type="button"
              onClick={publish}
              disabled={!canPublish}
              className={cn(
                'inline-flex items-center justify-center gap-1.5 px-5 py-2.5 sm:px-6 sm:py-2.5 rounded-2xl text-xs font-black transition-all shadow-sm',
                canPublish
                  ? 'bg-teal-800 hover:bg-teal-900 text-white shadow-teal-950/20 active:scale-95'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed',
                published && 'bg-emerald-600 text-white'
              )}
            >
              {published ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Published!</span>
                </>
              ) : publishing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Publishing...</span>
                </>
              ) : (
                <>
                  <PenSquare className="w-4 h-4" />
                  <span className="hidden sm:inline">Publish to City</span>
                  <span className="sm:hidden">Publish</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}