'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Globe, Users, PenSquare, Check, Image as ImageIcon, Video, Calendar, MapPin, DollarSign } from 'lucide-react';
import { ChipButton } from '@/components/cityos/CityUI';
import { cn } from '@/lib/utils';
import { createPost } from '@/app/actions/newsfeed';
import { useCity } from '@/components/cityos/CityProvider';
import { useSession } from 'next-auth/react';

const POST_CATEGORIES = ['Community', 'Ask the city', 'Offer', 'Event', 'Housing', 'Update'];

export default function CreatePost() {
  const router = useRouter();
  const { data: session } = useSession();
  const cityName = useCity().city?.name ?? 'CityOS';
  
  const [category, setCategory] = useState(POST_CATEGORIES[0]);
  const [audience, setAudience] = useState<'public' | 'following'>('public');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  
  // Media fields
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  
  // Specific fields
  const [eventDate, setEventDate] = useState('');
  const [location, setLocation] = useState('');
  const [price, setPrice] = useState('');

  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);

  const needsTitle = category !== 'Community' && category !== 'Update';
  const canPublish = body.trim().length > 2 && (!needsTitle || title.trim().length > 2) && !publishing;

  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 4 * 1024 * 1024) {
      alert("Image is too large. Please select an image under 4MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setImageUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const publish = async () => {
    if (!canPublish) return;
    setPublishing(true);
    
    try {
      await createPost({
        title: needsTitle ? title.trim() : (body.trim().length > 50 ? body.trim().slice(0, 50) + '...' : body.trim()),
        body: body.trim(),
        category,
        imageUrl: imageUrl.trim() || undefined,
        videoUrl: videoUrl.trim() || undefined,
        eventDate: eventDate || undefined,
        location: location.trim() || undefined,
        price: price ? parseFloat(price) : undefined,
      });
      setPublished(true);
      window.setTimeout(() => router.push('/feed'), 700);
    } catch (e) {
      console.error(e);
      setPublishing(false);
      alert('Failed to publish post');
    }
  };

  if (!session?.user) {
    return <div className="p-10 text-center text-slate-500">Sign in to post to the city.</div>;
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
          
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-700 to-teal-500 text-white flex items-center justify-center text-sm font-black">
                {activeInitials}
              </div>
              <div>
                <p className="text-[13px] font-black text-ink">{activeName}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  {audience === 'public' ? <Globe className="w-3 h-3 text-slate-400" /> : <Users className="w-3 h-3 text-slate-400" />}
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {audience === 'public' ? `Public — everyone in ${cityName}` : 'Following only'}
                  </span>
                </div>
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

          
          {imageUrl && (
            <div className="relative rounded-xl overflow-hidden border border-slate-100 max-h-48 flex justify-center bg-slate-900 mt-2">
              <img src={imageUrl} alt="Upload preview" className="object-contain max-h-48" />
            </div>
          )}
          {/* Dynamic Fields Based on Category */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            {category === 'Event' && (
              <div className="flex gap-4">
                <div className="flex-1 flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-200 focus-within:border-teal-600 transition-colors">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <input 
                    type="datetime-local" 
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full bg-transparent text-[13px] outline-none text-slate-700" 
                  />
                </div>
                <div className="flex-1 flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-200 focus-within:border-teal-600 transition-colors">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-transparent text-[13px] outline-none text-slate-700 placeholder:text-slate-400" 
                  />
                </div>
              </div>
            )}

            {category === 'Offer' && (
              <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-200 focus-within:border-teal-600 transition-colors max-w-[200px]">
                <DollarSign className="w-4 h-4 text-slate-400" />
                <input 
                  type="number" 
                  placeholder="Price"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full bg-transparent text-[13px] outline-none text-slate-700 placeholder:text-slate-400" 
                />
              </div>
            )}
            
            {/* Universal Media Links */}
            <div className="flex gap-4">
              <div className="flex-1 flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-200 hover:border-teal-600 transition-colors relative overflow-hidden group">
                <ImageIcon className="w-4 h-4 text-slate-400 group-hover:text-teal-600" />
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  title="Upload an image"
                />
                <span className="text-[13px] text-slate-700 truncate select-none pointer-events-none">
                  {imageUrl ? 'Image Selected (Click to change)' : 'Upload Image'}
                </span>
                {imageUrl && (
                  <button 
                    type="button" 
                    onClick={(e) => { e.preventDefault(); setImageUrl(''); }} 
                    className="absolute right-3 z-10 text-[10px] font-bold text-red-500 hover:text-red-700"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="flex-1 flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-200 focus-within:border-teal-600 transition-colors">
                <Video className="w-4 h-4 text-slate-400" />
                <input 
                  type="url" 
                  placeholder="Video URL"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className="w-full bg-transparent text-[13px] outline-none text-slate-700 placeholder:text-slate-400" 
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div className="flex gap-2">
              <button
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