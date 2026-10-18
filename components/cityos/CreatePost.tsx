'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Loader2, Globe, Users, PenSquare, Check, Image as ImageIcon, Video, X, Calendar, MapPin, DollarSign, Tag, ChevronDown, Store, UtensilsCrossed, Wrench, GraduationCap, Building2, Ticket, Stethoscope, Building, AlertCircle } from 'lucide-react';
import { ChipButton } from '@/components/cityos/CityUI';
import { cn } from '@/lib/utils';
import { createPost } from '@/app/actions/newsfeed';
import { useCity } from '@/components/cityos/CityProvider';
import { useSession } from 'next-auth/react';
import { POST_BACKGROUNDS, type PostBackgroundId } from '@/lib/post-background';
import { useAccountSwitcher } from '@/components/cityos/AccountSwitcherContext';

const POST_CATEGORIES = ['Community', 'Ask the city', 'Offer', 'Event', 'Housing', 'Update'];

export default function CreatePost() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const cityName = useCity().city?.name ?? 'CityOS';
  
  const initialCat = searchParams?.get('category');
  const [category, setCategory] = useState(
    initialCat && POST_CATEGORIES.includes(initialCat) ? initialCat : POST_CATEGORIES[0]
  );
  const [audience, setAudience] = useState<'public' | 'following'>('public');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [postBackground, setPostBackground] = useState<PostBackgroundId>('auto');
  
  // Media fields
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [videoUrl, setVideoUrl] = useState('');
  
  // Specific fields
  const [eventDate, setEventDate] = useState('');
  const [location, setLocation] = useState('');
  const [price, setPrice] = useState('');

  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  const { myBusinesses, activeBusiness } = useAccountSwitcher();
  const paramOrgId = searchParams?.get('org');
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(paramOrgId || activeBusiness?.id || null);
  const [showAuthorMenu, setShowAuthorMenu] = useState(false);

  useEffect(() => {
    if (initialCat && POST_CATEGORIES.includes(initialCat)) {
      setCategory(initialCat);
    }
  }, [initialCat]);

  useEffect(() => {
    if (paramOrgId) {
      setSelectedOrgId(paramOrgId);
    } else if (activeBusiness?.id && selectedOrgId === null) {
      setSelectedOrgId(activeBusiness.id);
    }
  }, [paramOrgId, activeBusiness?.id]);

  const selectedBusiness = myBusinesses.find((b) => b.id === selectedOrgId);
  const isBusinessAuthor = Boolean(selectedBusiness);

  const authorName = selectedBusiness ? selectedBusiness.name : (session?.user?.name || 'Resident');
  const authorSubtitle = selectedBusiness
    ? `${selectedBusiness.type} Page · Public`
    : `Personal Resident · Public`;

  const needsTitle = category !== 'Community' && category !== 'Update';
  const canPublish = body.trim().length > 2 && (!needsTitle || title.trim().length > 2) && !publishing;

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
  };

  const publish = async () => {
    if (!canPublish) return;
    setPublishing(true);
    setPublishError(null);
    
    try {
      let finalImageUrl = imageUrl;
      
      // Upload image via /api/upload (handles S3 when configured, or local/data-URI fallback)
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
        title: needsTitle ? title.trim() : (body.trim().length > 50 ? body.trim().slice(0, 50) + '...' : body.trim()),
        body: body.trim(),
        category,
        imageUrl: finalImageUrl.trim() || undefined,
        videoUrl: videoUrl.trim() || undefined,
        eventDate: eventDate || undefined,
        location: location.trim() || undefined,
        price: price ? parseFloat(price) : undefined,
        postBackground,
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

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-xl font-black text-ink">Post to the city</h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Share an offer, ask, event or notice with {cityName} and beyond.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 bg-white rounded-2xl border border-slate-100 shadow-[0_1px_2px_rgba(6,95,70,0.06)] p-5 md:p-6 space-y-5">
          
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 relative">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'w-10 h-10 rounded-full text-white flex items-center justify-center text-sm font-black shadow-sm bg-gradient-to-br',
                  isBusinessAuthor ? 'from-amber-600 to-teal-700' : 'from-teal-700 to-teal-500'
                )}
              >
                {isBusinessAuthor ? <Store className="w-5 h-5" /> : activeInitials}
              </div>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowAuthorMenu((o) => !o)}
                  className="flex items-center gap-1.5 px-2 py-1 -ml-2 rounded-xl hover:bg-slate-100 transition-colors text-left group"
                >
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="text-[13px] font-black text-ink">{authorName}</p>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-transform" />
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Globe className="w-3 h-3 text-slate-400" />
                      <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider">
                        {authorSubtitle}
                      </span>
                    </div>
                  </div>
                </button>

                {showAuthorMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowAuthorMenu(false)} />
                    <div className="absolute left-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                      <p className="px-4 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Post as
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
                          !selectedOrgId && 'bg-teal-50/70 text-teal-900'
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-teal-800 text-white flex items-center justify-center text-xs font-bold shrink-0">
                            {activeInitials}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-black text-ink truncate">{session?.user?.name || 'Resident'}</p>
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
                              isSelected && 'bg-teal-50/70 text-teal-900'
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-7 h-7 rounded-lg bg-teal-700 text-white flex items-center justify-center text-xs font-bold shrink-0">
                                <Store className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-black text-ink truncate">{biz.name}</p>
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
          </div>

          <div className="flex gap-2 flex-wrap">
            {POST_CATEGORIES.map((c) => (
              <ChipButton key={c} active={category === c} onClick={() => setCategory(c)}>
                {c}
              </ChipButton>
            ))}
          </div>

          
            {needsTitle && (
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`${category} Title ✍️`}
                className="w-full bg-transparent text-lg font-black text-ink placeholder:text-slate-300 outline-none border-b border-slate-200 focus:border-teal-600 pb-3 transition-colors"
              />
            )}


          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={needsTitle ? "Add the details ✨ location, time, links, what happens next..." : "What's on your mind? ✍️"}
            rows={5}
            className="w-full bg-slate-50 rounded-xl p-4 text-[13px] text-slate-700 font-medium placeholder:text-slate-400 outline-none focus:ring-2 ring-teal-200 resize-none leading-relaxed"
          />

          <div className="flex items-center gap-3">
            <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Text background</span>
            <div className="flex items-center gap-2" role="group" aria-label="Choose a text post background">
              {POST_BACKGROUNDS.map((background) => (
                <button
                  key={background.id}
                  type="button"
                  aria-label={background.label}
                  aria-pressed={postBackground === background.id}
                  title={background.label}
                  onClick={() => setPostBackground(background.id)}
                  className={cn(
                    'w-7 h-7 rounded-full bg-gradient-to-br ring-offset-2 transition-transform hover:scale-110',
                    background.className,
                    postBackground === background.id ? 'ring-2 ring-teal-700 scale-110' : 'ring-1 ring-slate-200',
                  )}
                />
              ))}
            </div>
          </div>

          
          {(imagePreview || imageUrl) && (
            <div className="relative rounded-xl overflow-hidden border border-slate-100 max-h-48 flex justify-center bg-slate-900 mt-2">
              <img src={imagePreview || imageUrl} alt="Upload preview" className="object-contain max-h-48" />
            </div>
          )}
          {/* Dynamic Fields Based on Category */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {category === 'Event' && (
                <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-200 focus-within:border-teal-600 transition-colors">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                  <input 
                    type="datetime-local" 
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full bg-transparent text-[13px] outline-none text-slate-700" 
                  />
                </div>
              )}

              {(category === 'Event' || category === 'Offer' || category === 'Housing' || category === 'Community') && (
                <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-200 focus-within:border-teal-600 transition-colors">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                  <input 
                    type="text" 
                    placeholder="Area / Location (e.g. Marian Rd, State Housing)"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-transparent text-[13px] outline-none text-slate-700 placeholder:text-slate-400" 
                  />
                </div>
              )}

              {(category === 'Offer' || category === 'Housing' || category === 'Event') && (
                <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-200 focus-within:border-teal-600 transition-colors">
                  <DollarSign className="w-4 h-4 text-slate-400 shrink-0" />
                  <input 
                    type="number" 
                    placeholder={category === 'Event' ? 'Ticket Price in ₦ (0 for Free)' : 'Price in ₦ (optional)'}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full bg-transparent text-[13px] outline-none text-slate-700 placeholder:text-slate-400" 
                  />
                </div>
              )}
            </div>
            
            {/* Universal Media Links */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-200 hover:border-teal-600 transition-colors relative overflow-hidden group">
                <ImageIcon className="w-4 h-4 text-slate-400 group-hover:text-teal-600 shrink-0" />
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  title="Upload an image"
                />
                <span className="text-[13px] text-slate-700 truncate select-none pointer-events-none">
                  {(imagePreview || imageUrl) ? 'Image Selected (Click to change)' : 'Upload Image File'}
                </span>
                {(imagePreview || imageUrl) && (
                  <button 
                    type="button" 
                    onClick={(e) => { e.preventDefault(); setImageUrl(''); setImageFile(null); setImagePreview(''); }} 
                    className="absolute right-3 z-10 text-[10px] font-bold text-red-500 hover:text-red-700"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-200 focus-within:border-teal-600 transition-colors">
                <Video className="w-4 h-4 text-slate-400 shrink-0" />
                <input 
                  type="url" 
                  placeholder="Video URL (optional)"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className="w-full bg-transparent text-[13px] outline-none text-slate-700 placeholder:text-slate-400" 
                />
              </div>
            </div>
          </div>

          {publishError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{publishError}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAudience('public')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5 transition-colors',
                  audience === 'public' ? 'bg-teal-800 text-white' : 'bg-slate-100 text-slate-500',
                )}
              >
                <Globe className="w-3.5 h-3.5" />
                Public
              </button>
              <button
                type="button"
                onClick={() => setAudience('following')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5 transition-colors',
                  audience === 'following' ? 'bg-teal-800 text-white' : 'bg-slate-100 text-slate-500',
                )}
              >
                <Users className="w-3.5 h-3.5" />
                Following
              </button>
            </div>
            <button
              type="button"
              onClick={publish}
              disabled={!canPublish}
              className={cn(
                'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all',
                canPublish
                  ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-sm shadow-orange-200'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed',
                published && 'bg-emerald-600 hover:bg-emerald-600',
              )}
            >
              {published ? (
                <>
                  <Check className="w-4 h-4" /> Published
                </>
              ) : (
                <>
                  <PenSquare className="w-4 h-4" />
                  {publishing ? 'Publishing...' : 'Publish post'}
                </>
              )}
            </button>
          </div>
        </div>

        <div className="lg:w-64 shrink-0">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 text-[12px] text-slate-500 leading-relaxed space-y-3">
            <p className="text-[10px] font-black text-ink uppercase tracking-widest">Post it well</p>
            <ul className="space-y-2">
              <li>- Keep headings short - the feed stocks them bold.</li>
              <li>- Add an area so neighbours know where.</li>
              <li>- Offers and events show action buttons automatically.</li>
              <li>- Emergency or safety notices are reviewed by the city team.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}