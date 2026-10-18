'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Users, PenSquare, MessageSquare, Heart, MapPin, Loader2, ArrowRight } from 'lucide-react';
import { fetchFeed } from '@/app/actions/newsfeed';
import type { DBPost } from '@/components/cityos/CityFeed';
import { useCity } from '@/components/cityos/CityProvider';

export default function CityCommunityList() {
  const { city } = useCity();
  const cityName = city?.name || 'Calabar';
  const [posts, setPosts] = useState<DBPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      fetchFeed('For You', 'Community', undefined, 20),
      fetchFeed('For You', 'Ask the city', undefined, 20),
    ])
      .then(([commRes, askRes]) => {
        if (!active) return;
        const map = new Map<string, DBPost>();
        for (const p of [...(commRes.posts as DBPost[]), ...(askRes.posts as DBPost[])]) {
          map.set(p.id, p);
        }
        const merged = Array.from(map.values()).sort(
          (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
        );
        setPosts(merged);
      })
      .catch(console.error)
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-teal-950 to-teal-800 text-white p-7 md:p-9 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute -right-12 -top-12 w-56 h-56 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="relative max-w-xl">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 ring-1 ring-white/15 text-[10px] font-black uppercase tracking-widest">
            <Users className="w-3 h-3" /> {cityName} Community Board
          </span>
          <h1 className="mt-3 text-2xl md:text-4xl font-black tracking-tight">Neighbourhoods, on the record</h1>
          <p className="mt-2 text-teal-50/85 text-[13px] font-medium leading-relaxed">
            Share neighbourhood updates, ask {cityName} residents for recommendations, or post local notices for your area.
          </p>
        </div>
        <div className="relative flex flex-wrap gap-2.5 shrink-0">
          <Link
            href="/feed/new?category=Community"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black shadow-lg transition-all"
          >
            <PenSquare className="w-4 h-4" /> Post Community Notice
          </Link>
          <Link
            href="/feed/new?category=Ask%20the%20city"
            className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-black border border-white/15 transition-all"
          >
            Ask {cityName}
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-teal-700" />
        </div>
      ) : posts.length === 0 ? (
        <div className="max-w-lg mx-auto text-center py-12 space-y-4 bg-white rounded-3xl border border-slate-100 p-8">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-teal-50 text-teal-700 flex items-center justify-center">
            <Users className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-black text-ink">Start the first conversation in {cityName}</h2>
          <p className="text-sm text-slate-500">
            Post a neighbourhood notice, ask a local question, or share an update with residents near you.
          </p>
          <Link
            href="/feed/new?category=Community"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-800 text-white text-xs font-black hover:bg-teal-900 transition-colors"
          >
            <PenSquare className="w-4 h-4" /> Create Community Post
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/feed/${post.id}`}
              className="group bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md hover:border-teal-600/30 transition-all flex flex-col justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-100 text-[10px] font-black uppercase tracking-wider">
                    {post.category}
                  </span>
                  <span className="text-[11px] font-bold text-slate-400">
                    {new Date(post.time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                {post.title && post.title !== 'Post' && (
                  <h3 className="text-sm font-black text-ink group-hover:text-teal-800 transition-colors line-clamp-1">
                    {post.title}
                  </h3>
                )}
                <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">{post.body}</p>
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-500">
                <span className="truncate">By {post.author}</span>
                <div className="flex items-center gap-3 shrink-0">
                  {post.location && (
                    <span className="inline-flex items-center gap-1 text-slate-400">
                      <MapPin className="w-3 h-3" /> {post.location}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5" /> {post.likes}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5" /> {post.comments}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-teal-700 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
