'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Globe, Users, PenSquare, Check, ImagePlus } from 'lucide-react';
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
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  const canPublish = title.trim().length > 2 && body.trim().length > 2 && !publishing;

  const publish = async () => {
    if (!canPublish) return;
    setPublishing(true);
    
    try {
      await createPost({
        title: title.trim(),
        body: body.trim(),
        category,
        organizationId: selectedOrgId || undefined,
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

  const myOrgs = session.user.memberships || [];
  const activeName = selectedOrgId 
    ? (myOrgs.find((m: any) => m.organizationId === selectedOrgId) as any)?.organization?.name || 'Your Organization'
    : session.user.name || 'Resident';
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
            {myOrgs.length > 0 && (
              <select 
                value={selectedOrgId || ''} 
                onChange={(e) => setSelectedOrgId(e.target.value || null)}
                className="text-xs font-medium border border-slate-200 rounded-lg p-2 text-slate-600 bg-slate-50 outline-none"
              >
                <option value="">Post as myself</option>
                {myOrgs.map((m: any) => (
                  <option key={m.organizationId} value={m.organizationId}>
                    Post as {m.organization?.name || 'Organization'}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex gap-2 flex-wrap">
            {POST_CATEGORIES.map((c) => (
              <ChipButton key={c} active={category === c} onClick={() => setCategory(c)}>
                {c}
              </ChipButton>
            ))}
          </div>

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Headline  what is this about?"
            className="w-full bg-transparent text-lg font-black text-ink placeholder:text-slate-300 outline-none border-b border-slate-200 focus:border-teal-600 pb-3 transition-colors"
          />

          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Add the details  location, time, links, what happens next..."
            rows={5}
            className="w-full bg-slate-50 rounded-xl p-4 text-[13px] text-slate-700 font-medium placeholder:text-slate-400 outline-none focus:ring-2 ring-teal-200 resize-none leading-relaxed"
          />

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