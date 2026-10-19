'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
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
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createPost } from '@/app/actions/newsfeed';
import { useCity } from '@/components/cityos/CityProvider';
import { useSession } from 'next-auth/react';
import { POST_BACKGROUNDS, type PostBackgroundId } from '@/lib/post-background';
import { useAccountSwitcher } from '@/components/cityos/AccountSwitcherContext';

export const POST_CATEGORIES = [
  { id: 'Update', label: 'Update', icon: '📢', desc: 'News, announcements & thoughts' },
  { id: 'Sales', label: 'Sales', icon: '🏷️', desc: 'Products, deals & classifieds' },
  { id: 'Event', label: 'Event', icon: '🎉', desc: 'Meetups, concerts & gatherings' },
  { id: 'Housing', label: 'Housing', icon: '🏠', desc: 'Short-lets, apartments & rentals' },
  { id: 'Question', label: 'Question', icon: '❓', desc: 'Ask neighbors and city experts' },
] as const;

export type PostCategory = typeof POST_CATEGORIES[number]['id'];

function resolveCategory(cat: string | null | undefined): PostCategory {
  if (!cat) return 'Update';
  if (cat === 'Offer') return 'Sales';
  if (cat === 'Community') return 'Update';
  if (cat === 'Ask the city' || cat === 'Ask+the+city') return 'Question';
  const found = POST_CATEGORIES.find((c) => c.id.toLowerCase() === cat.toLowerCase());
  return found ? (found.id as PostCategory) : 'Update';
}

export default function CreatePost() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const cityName = useCity().city?.name ?? 'Calabar';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialCat = resolveCategory(searchParams?.get('category'));
  const [category, setCategory] = useState<PostCategory>(initialCat);
  const [audience, setAudience] = useState<'public' | 'following'>('public');
  const [showAudienceMenu, setShowAudienceMenu] = useState(false);

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

  const { myBusinesses, activeBusiness } = useAccountSwitcher();
  const paramOrgId = searchParams?.get('org');
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(paramOrgId || activeBusiness?.id || null);
  const [showAuthorMenu, setShowAuthorMenu] = useState(false);

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

      setPublished(true);
      window.setTimeout(() => router.push('/feed'), 700);
    } catch (e) {
      console.error(e);
      setPublishing(false);
      setPublishError('Failed to publish post: ' + (e instanceof Error ? e.message : String(e)));
    }
  };

  if (!session?.user) {
    const callbackUrl = '/feed/new' + (category ? `?category=${encodeURIComponent(category)}` : '');
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-3xl border border-slate-200/80 shadow-xl p-8 text-center animate-in fade-in duration-300">
        <div className="w-16 h-16 bg-gradient-to-br from-teal-700 to-teal-900 rounded-2xl flex items-center justify-center text-white mx-auto mb-5 shadow-xl shadow-teal-950/10">
          <PenSquare className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900 mb-2">Sign in to Post to CityOS</h2>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed max-w-sm mx-auto">
          Join your local city community to post announcements, offers, discussions, events, or questions for {cityName}.
        </p>
        <div className="space-y-3">
          <a
            href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className="w-full py-3 px-4 bg-teal-800 hover:bg-teal-900 text-white font-black text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
          >
            Sign in to CityConnect
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

  return (
    <div className="max-w-2xl mx-auto space-y-4 animate-in fade-in duration-300 pb-16">
      {/* Top Header Row */}
      <div className="flex items-center justify-between px-1">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <span className="text-[11px] font-black uppercase tracking-widest text-teal-800 bg-teal-50 px-3 py-1 rounded-full border border-teal-100">
          📍 {cityName} Feed
        </span>
      </div>

      {/* Main Composer Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        {/* 1. Unified Identity & Audience Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between relative bg-slate-50/50">
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

        {/* 3. Auto-Bridge Context Banner */}
        <div className="px-4 sm:px-5 py-2 text-[11px] font-bold border-b border-slate-100 flex items-center gap-2 bg-gradient-to-r from-teal-50/60 to-transparent text-teal-900">
          <Sparkles className="w-3.5 h-3.5 text-teal-700 shrink-0" />
          <span>
            {category === 'Event' && `🎉 Auto-Bridge: Will appear on the City Feed AND in the official ${cityName} Events Calendar.`}
            {category === 'Housing' && `🏠 Auto-Bridge: Will appear on the City Feed AND in the official ${cityName} CityStay Directory.`}
            {category === 'Sales' && (isBusinessAuthor
              ? `🛍️ Auto-Bridge: Will appear on the City Feed AND in your official CityMart Store catalog.`
              : `🏷️ Marketplace: Will appear on the City Feed under the Marketplace category.`)}
            {category === 'Update' && `📢 Broadcast: Instant news and updates shared with all residents.`}
            {category === 'Question' && `❓ Resident Inquiry: Broadcast to neighbors, leaders, and verified services.`}
          </span>
        </div>

        {/* 4. Canvas Writing Area */}
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

          {/* Main Body Text Area */}
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={getBodyPlaceholder()}
            rows={category === 'Update' ? 4 : 5}
            className="w-full bg-transparent text-[14px] text-slate-800 placeholder:text-slate-400 outline-none resize-none leading-relaxed"
          />

          {/* Gradient Card Style Selector (for short text updates without an image) */}
          {category === 'Update' && !imagePreview && !imageUrl && showBackgroundPicker && (
            <div className="pt-2 pb-3 border-t border-slate-100 flex items-center gap-3">
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

          {/* Image Thumbnail Preview with Remove Button */}
          {(imagePreview || imageUrl) && (
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 max-h-56 bg-slate-950 flex items-center justify-center group">
              <img
                src={imagePreview || imageUrl}
                alt="Upload preview"
                className="max-h-56 w-full object-contain"
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
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                <MapPin className="w-3 h-3 text-slate-500" />
                <span className="truncate max-w-[180px]">{location}</span>
                <button type="button" onClick={() => setLocation('')} className="hover:text-red-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {price && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-black">
                <DollarSign className="w-3 h-3 text-emerald-600" />
                <span>₦{Number(price).toLocaleString()}</span>
                <button type="button" onClick={() => setPrice('')} className="hover:text-red-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {eventDate && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200 text-xs font-bold">
                <Calendar className="w-3 h-3 text-teal-600" />
                <span>{new Date(eventDate).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                <button type="button" onClick={() => setEventDate('')} className="hover:text-red-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {phone && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-sky-50 text-sky-800 border border-sky-200 text-xs font-bold">
                <Phone className="w-3 h-3 text-sky-600" />
                <span>{phone}</span>
                <button type="button" onClick={() => setPhone('')} className="hover:text-red-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {videoUrl && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-50 text-purple-800 border border-purple-200 text-xs font-bold">
                <Video className="w-3 h-3 text-purple-600" />
                <span className="truncate max-w-[140px]">Video attached</span>
                <button type="button" onClick={() => setVideoUrl('')} className="hover:text-red-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>

          {/* Expanded Drawer Inputs (Revealed contextually) */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100">
            {showLocationInput && (
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
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {showPriceInput && (
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
              )}

              {showEventDateInput && (
                <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3.5 py-2.5 border border-slate-200 focus-within:border-teal-600 focus-within:bg-white transition-all">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="datetime-local"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full bg-transparent text-[13px] outline-none text-slate-800 font-medium"
                  />
                </div>
              )}

              {showPhoneInput && (
                <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3.5 py-2.5 border border-slate-200 focus-within:border-teal-600 focus-within:bg-white transition-all">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="tel"
                    placeholder="Contact WhatsApp / Phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-transparent text-[13px] outline-none text-slate-800 placeholder:text-slate-400 font-medium"
                  />
                </div>
              )}

              {showVideoInput && (
                <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3.5 py-2.5 border border-slate-200 focus-within:border-teal-600 focus-within:bg-white transition-all">
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

        {/* Publish Error Notification */}
        {publishError && (
          <div className="mx-4 sm:mx-5 mb-3 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
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

          {/* Publish Action Button */}
          <button
            type="button"
            onClick={publish}
            disabled={!canPublish}
            className={cn(
              'ml-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 sm:px-6 sm:py-2.5 rounded-2xl text-xs font-black transition-all shadow-sm shrink-0',
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
  );
}