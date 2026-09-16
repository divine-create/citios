'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Heart, MessageSquare, Share2, PenSquare, ChevronRight } from 'lucide-react';
import { FeedPost, DEMO_POSTS, FEED_FILTERS } from '@/lib/demo/cityos';
import { CityCard, FallbackImg, Pill, ChipButton, VerifiedBadge, DemoBanner } from '@/components/cityos/CityUI';
import { cn } from '@/lib/utils';

const STORE_KEY = 'cityos-demo-created-posts';

function readCreatedPosts(): FeedPost[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as FeedPost[]) : [];
  } catch {
    return [];
  }
}

function saveCreatedPosts(posts: FeedPost[]) {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(posts));
  } catch {
    /* storage unavailable */
  }
}

function PostCard({ post }: { post: FeedPost }) {
  const [liked, setLiked] = useState(false);
  const [shareCount, setShareCount] = useState(post.shares);
  const [commentCount, setCommentCount] = useState(post.comments);

  const inner = (
    <CityCard className="flex flex-col">
      <div className="p-5 pb-4 flex items-start gap-3">
        <FallbackImg
          src={post.avatarImg}
          alt={post.author}
          className="w-11 h-11 rounded-full shrink-0"
          icon={<span className="text-xs font-black">{post.author.slice(0, 1)}</span>}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[13px] font-black text-ink">{post.author}</p>
            {post.isOrg ? <VerifiedBadge /> : null}
            <Pill tone="slate" className="ml-1">{post.category}</Pill>
          </div>
          <p className="text-[11px] text-slate-400 font-bold mt-0.5 uppercase tracking-wider">{`${post.role} · ${post.time}`}</p>
        </div>
      </div>

      <div className="px-5">
        <h3 className="text-[15px] md:text-base font-black text-ink leading-snug">{post.title}</h3>
        <p className="mt-2 text-[13px] text-slate-600 leading-relaxed whitespace-pre-line">{post.body}</p>
        {post.image ? (
          <FallbackImg src={post.image} alt={post.title} className="mt-3 h-44 md:h-56 w-full rounded-xl" />
        ) : null}
        {post.href ? (
          <Link
            href={post.href.url}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-800 hover:bg-teal-900 text-white text-[11px] font-bold transition-colors"
          >
            {post.href.label}
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        ) : null}
      </div>

      <div className="mt-4 flex items-center gap-1 border-t border-slate-100 px-3 py-2">
        <button
          onClick={() => setLiked((l) => !l)}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-bold transition-colors',
            liked ? 'text-orange-600 bg-orange-50' : 'text-slate-500 hover:bg-slate-50',
          )}
        >
          <Heart className={cn('w-4 h-4', liked && 'fill-orange-500 text-orange-500')} />
          {post.likes + (liked ? 1 : 0)}
        </button>
        <button
          onClick={() => setCommentCount((c) => c + 1)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-bold text-slate-500 hover:bg-slate-50 transition-colors"
        >
          <MessageSquare className="w-4 h-4" />
          {commentCount}
        </button>
        <button
          onClick={() => setShareCount((s) => s + 1)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-bold text-slate-500 hover:bg-slate-50 transition-colors"
        >
          <Share2 className="w-4 h-4" />
          {shareCount}
        </button>
        <span className="ml-auto text-[10px] font-bold text-slate-300 uppercase tracking-wider">City Feed</span>
      </div>
    </CityCard>
  );

  return post.href ? <Link href={post.href.url}>{inner}</Link> : inner;
}

export default function CityFeed({ created }: { created: FeedPost[] }) {
  const [filter, setFilter] = useState(FEED_FILTERS[0]);
  const all = readCreatedPosts().length > 0 ? readCreatedPosts() : created;
  const posts = [...all, ...DEMO_POSTS].filter(
    (p) => filter === 'For you' || p.category === filter,
  );

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-ink">City Feed</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Offers, asks and notices from around Calabar</p>
        </div>
        <Link
          href="/feed/new"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-black transition-colors"
        >
          <PenSquare className="w-4 h-4" />
          Post
        </Link>
      </div>

      <DemoBanner />

      <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden -mx-1 px-1">
        {FEED_FILTERS.map((f) => (
          <ChipButton key={f} active={filter === f} onClick={() => setFilter(f)}>
            {f}
          </ChipButton>
        ))}
      </div>

      <div className="space-y-4 pb-8">
        {posts.length ? (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center">
            <p className="text-sm font-bold text-slate-500">Nothing here yet.</p>
            <p className="text-xs text-slate-400 mt-1">Switch the filter or start a post.</p>
          </div>
        )}
      </div>
    </div>
  );
}