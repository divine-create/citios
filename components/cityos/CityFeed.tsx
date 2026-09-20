'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, MessageSquare, Share2, ChevronRight, UserPlus, UserCheck, Loader2, X } from 'lucide-react';

const TABS = ['For You', 'Following'] as const;
const TOPICS = ['All', 'Marketplace', 'Events', 'Housing', 'Community'];

import { FallbackImg, Pill, VerifiedBadge } from '@/components/cityos/CityUI';
import InlineComments from '@/components/InlineComments';
import { cn } from '@/lib/utils';
import { sharePost } from '@/lib/actions/post';
import { fetchFeed, togglePostLike, toggleFollow, getFollowedOrganizations, reactToPost, type ReactionType } from '@/app/actions/newsfeed';
import { useCity } from '@/components/cityos/CityProvider';
import { getPostBackground, type PostBackgroundId } from '@/lib/post-background';

export type DBPost = {
  authorId?: string;
  avatarImg?: string;
  id: string;
  author: string;
  role: string;
  isOrg: boolean;
  time: string;
  category: string;
  title: string;
  body: string;
  likes: number;
  comments: number;
  shares: number;
  viewCount?: number;
  isLikedByMe: boolean;
  myReaction?: ReactionType | null;
  orgId: string | null;
  href?: { url: string; label: string };
  image?: string;
  videoUrl?: string;
  eventDate?: string;
  location?: string;
  price?: number;
  postMetadata?: string;
  postBackground?: PostBackgroundId;
};

// ─── Reaction config ────────────────────────────────────────────────────────
const REACTIONS: { type: ReactionType; emoji: string; label: string; color: string }[] = [
  { type: 'LIKE',  emoji: '👍', label: 'Like',  color: 'text-blue-600'   },
  { type: 'LOVE',  emoji: '❤️', label: 'Love',  color: 'text-red-500'    },
  { type: 'HAHA',  emoji: '😂', label: 'Haha',  color: 'text-yellow-500' },
  { type: 'WOW',   emoji: '😮', label: 'Wow',   color: 'text-yellow-500' },
  { type: 'SAD',   emoji: '😢', label: 'Sad',   color: 'text-yellow-500' },
  { type: 'ANGRY', emoji: '😡', label: 'Angry', color: 'text-orange-600' },
];

function reactionEmoji(type?: ReactionType | null) {
  if (!type) return null;
  return REACTIONS.find(r => r.type === type)?.emoji ?? '👍';
}

// ─── Skeleton ───────────────────────────────────────────────────────────────
function PostSkeleton() {
  return (
    <div className="flex flex-col bg-white border-b border-slate-100 pb-4 mb-2 animate-pulse">
      <div className="p-5 pb-4 flex items-start gap-3">
        <div className="w-11 h-11 rounded-full bg-slate-200 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-slate-200 rounded w-32" />
          <div className="h-2.5 bg-slate-200 rounded w-20" />
        </div>
      </div>
      <div className="px-5 space-y-2">
        <div className="h-3 bg-slate-200 rounded w-full" />
        <div className="h-3 bg-slate-200 rounded w-5/6" />
        <div className="h-3 bg-slate-200 rounded w-4/6" />
      </div>
      <div className="mt-4 px-5 flex gap-6">
        <div className="h-7 w-16 bg-slate-200 rounded-lg" />
        <div className="h-7 w-16 bg-slate-200 rounded-lg" />
        <div className="h-7 w-16 bg-slate-200 rounded-lg" />
      </div>
    </div>
  );
}

// ─── Share button ────────────────────────────────────────────────────────────
function ShareButton({ post, shareCount, setShareCount }: { post: DBPost; shareCount: number; setShareCount: React.Dispatch<React.SetStateAction<number>> }) {
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const postUrl = typeof window !== 'undefined' ? `${window.location.origin}/feed/${post.id}` : `/feed/${post.id}`;

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (sharing) return;
    setSharing(true);
    setShareCount(s => s + 1);
    sharePost(post.id).catch(console.error);
    if (typeof navigator !== 'undefined' && navigator.share) {
      try { await navigator.share({ title: post.title || 'CityConnect post', text: post.body.slice(0, 120), url: postUrl }); }
      catch { setShareCount(s => s - 1); }
    } else {
      try { await navigator.clipboard.writeText(postUrl); setCopied(true); setTimeout(() => setCopied(false), 2500); }
      catch { /* silent */ }
    }
    setSharing(false);
  };

  return (
    <button onClick={handleShare} disabled={sharing} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-bold text-slate-500 hover:text-teal-600 active:scale-90 transition-all disabled:opacity-50" title="Share post">
      {copied ? <span className="text-emerald-600 font-bold flex items-center gap-1"><Share2 className="w-4 h-4" /> Copied!</span>
               : <><Share2 className="w-4 h-4" />{shareCount}</>}
    </button>
  );
}

// ─── Reaction picker ─────────────────────────────────────────────────────────
function ReactionButton({ post, liked, likeCount, onReact }: { post: DBPost; liked: boolean; likeCount: number; onReact: (r: ReactionType | null) => void }) {
  const [showPicker, setShowPicker] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const current = post.myReaction;

  const startHold = () => { holdTimer.current = setTimeout(() => setShowPicker(true), 500); };
  const cancelHold = () => { if (holdTimer.current) clearTimeout(holdTimer.current); };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (showPicker) { setShowPicker(false); return; }
    // Quick tap = toggle LIKE
    onReact(current ? null : 'LIKE');
  };

  const handleReact = (e: React.MouseEvent, type: ReactionType) => {
    e.preventDefault(); e.stopPropagation();
    setShowPicker(false);
    onReact(type === current ? null : type);
  };

  return (
    <div className="relative">
      {showPicker && (
        <div className="absolute bottom-full left-0 mb-2 flex items-center gap-1 bg-white rounded-2xl shadow-xl border border-slate-100 px-3 py-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
          {REACTIONS.map(r => (
            <button key={r.type} onClick={(e) => handleReact(e, r.type)} title={r.label}
              className={cn('text-2xl hover:scale-125 active:scale-110 transition-transform', current === r.type && 'scale-125')}>
              {r.emoji}
            </button>
          ))}
        </div>
      )}
      <button
        onClick={handleClick}
        onMouseDown={startHold}
        onMouseUp={cancelHold}
        onMouseLeave={cancelHold}
        onTouchStart={startHold}
        onTouchEnd={cancelHold}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-bold transition-all active:scale-90',
          liked ? 'text-blue-600 bg-blue-50' : 'text-slate-500 hover:text-blue-500'
        )}
        title="Hold to pick a reaction"
      >
        {current ? <span className="text-base leading-none">{reactionEmoji(current)}</span> : <Heart className={cn('w-4 h-4', liked && 'fill-blue-500 text-blue-500')} />}
        {likeCount}
      </button>
    </div>
  );
}

// ─── PostCard ─────────────────────────────────────────────────────────────────
function PostCard({ post, follows, onFollowToggle }: { post: DBPost; follows: string[]; onFollowToggle: (id: string) => void }) {
  const router = useRouter();
  const [liked, setLiked] = useState(post.isLikedByMe);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [shareCount, setShareCount] = useState(post.shares);
  const [isFollowing, setIsFollowing] = useState(post.orgId ? follows.includes(post.orgId) : false);
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(post.comments);
  const [isExpanded, setIsExpanded] = useState(false);
  const [fullImage, setFullImage] = useState<string | null>(null);
  const [myReaction, setMyReaction] = useState<ReactionType | null>(post.myReaction ?? null);

  useEffect(() => { setIsFollowing(post.orgId ? follows.includes(post.orgId) : false); }, [follows, post.orgId]);

  const handleProfileClick = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (post.authorId) router.push(post.isOrg ? `/org/${post.authorId}` : `/profile/${post.authorId}`);
  };

  const handleFollow = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!post.orgId) return;
    setIsFollowing(f => !f);
    onFollowToggle(post.orgId!);
    await toggleFollow(post.orgId!).catch(console.error);
  };

  const handleReact = async (reaction: ReactionType | null) => {
    const wasLiked = liked;
    const prevReaction = myReaction;
    // Optimistic update
    if (reaction === null) {
      setLiked(false);
      setMyReaction(null);
      if (wasLiked) setLikeCount(c => c - 1);
    } else {
      if (!wasLiked) setLikeCount(c => c + 1);
      setLiked(true);
      setMyReaction(reaction);
    }
    try {
      await reactToPost(post.id, reaction);
    } catch {
      // rollback
      setLiked(wasLiked);
      setMyReaction(prevReaction);
      setLikeCount(c => wasLiked === liked ? c : wasLiked ? c + 1 : c - 1);
    }
  };

  const autoBackgrounds = ['auto', 'sunset', 'citrus', 'meadow', 'ocean', 'violet'] as const;
  const autoBackground = autoBackgrounds[(post.id.charCodeAt(post.id.length - 1) || 0) % autoBackgrounds.length];
  const selectedBackground = post.postBackground && post.postBackground !== 'auto'
    ? getPostBackground(post.postBackground)
    : getPostBackground(autoBackground);
  const isShortText = !post.image && !post.videoUrl && post.body.length < 130;
  const isTextOnly = !post.image && !post.videoUrl;
  const hasCustomBackground = post.postBackground && post.postBackground !== 'auto';

  const inner = (
    <div className="flex flex-col bg-white border-b border-slate-100 last:border-b-0 pb-2 mb-2 hover:bg-slate-50/30 transition-colors">
      {/* Header */}
      <div className="p-5 pb-3 flex items-start gap-3">
        <div onClick={handleProfileClick} className="cursor-pointer hover:opacity-80 transition-opacity shrink-0">
          {post.avatarImg ? (
            <img src={post.avatarImg} alt={post.author} className="w-11 h-11 rounded-full object-cover border border-slate-100" />
          ) : (
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-black text-sm border border-slate-100">
              {post.author.slice(0, 1)}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p onClick={handleProfileClick} className="text-[13px] font-black text-ink cursor-pointer hover:underline">{post.author}</p>
            {post.isOrg ? <VerifiedBadge /> : null}
            <Pill tone="slate" className="ml-1">{post.category}</Pill>
            {post.isOrg && post.orgId && (
              <button onClick={handleFollow}
                className={cn('ml-auto flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md transition-colors',
                  isFollowing ? 'bg-slate-100 text-slate-500' : 'bg-teal-50 text-teal-700 hover:bg-teal-100')}>
                {isFollowing ? <UserCheck className="w-3 h-3" /> : <UserPlus className="w-3 h-3" />}
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            )}
          </div>
          <p className="text-[11px] text-slate-400 font-bold mt-0.5 uppercase tracking-wider">{`${post.role} • ${timeAgo(post.time)}`}</p>
        </div>
      </div>

      {/* Body */}
      <div className="px-5">
        {isShortText || (isTextOnly && hasCustomBackground) ? (
          <div className={cn('mt-1 -mx-5 px-8 py-10 text-white flex flex-col justify-center items-center text-center min-h-[180px]', selectedBackground.className)}>
            {post.title && post.title !== 'Post' && !post.body.startsWith(post.title) && (
              <h3 className="text-[16px] font-black leading-snug mb-2 drop-shadow">{post.title}</h3>
            )}
            <p className="text-[22px] font-bold leading-snug drop-shadow whitespace-pre-line">{post.body}</p>
          </div>
        ) : (
          <>
            {post.title && post.title !== 'Post' && !post.body.startsWith(post.title) && (
              <h3 className="text-[15px] font-black text-ink leading-snug mb-1">{post.title}</h3>
            )}
            <p className={cn('text-[14px] text-slate-800 leading-relaxed whitespace-pre-line', !isExpanded && post.body.length > 250 && 'line-clamp-4')}>
              {post.body}
            </p>
            {!isExpanded && post.body.length > 250 && (
              <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsExpanded(true); }} className="text-teal-600 text-sm font-bold mt-1 hover:underline">Read more</button>
            )}
          </>
        )}

        {post.image && (
          <img src={post.image} alt={post.title}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setFullImage(post.image!); }}
            className="mt-3 w-full max-h-[480px] rounded-xl object-cover border border-slate-100 cursor-pointer hover:opacity-95 active:scale-[0.99] transition-all" />
        )}
        {post.videoUrl && (
          <div className="mt-3 text-[13px] font-bold text-teal-700 bg-teal-50 px-3 py-2 rounded-lg inline-flex items-center gap-2">
            🔗 <a href={post.videoUrl} target="_blank" rel="noreferrer" className="hover:underline">Watch Video</a>
          </div>
        )}

        {/* Metadata */}
        {(post.eventDate || post.location || post.price != null) && (
          <div className="mt-3 bg-slate-50 rounded-xl p-3 flex flex-wrap gap-x-4 gap-y-2 text-[12px] text-slate-600 font-medium border border-slate-100">
            {post.eventDate && <div className="flex items-center gap-1.5"><span>📅</span>{new Date(post.eventDate).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</div>}
            {post.location && <div className="flex items-center gap-1.5"><span>📍</span>{post.location}</div>}
            {post.price != null && <div className="flex items-center gap-1.5 font-bold text-emerald-700"><span>💲</span>${post.price.toFixed(2)}</div>}
          </div>
        )}
        {post.href && (
          <Link href={post.href.url} className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-800 hover:bg-teal-900 text-white text-[11px] font-bold transition-colors">
            {post.href.label}<ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* Reaction summary + view count */}
      {(post.likes > 0 || (post.viewCount ?? 0) > 0) && (
        <div className="px-5 mt-2 flex items-center justify-between">
          {post.likes > 0 && <span className="text-[11px] text-slate-400">{post.likes} reaction{post.likes !== 1 ? 's' : ''}</span>}
          {(post.viewCount ?? 0) > 0 && <span className="text-[11px] text-slate-400">👁 {post.viewCount} views</span>}
        </div>
      )}

      {/* Divider */}
      <div className="mx-5 mt-2 border-t border-slate-100" />

      {/* Action buttons */}
      <div className="flex items-center gap-1 px-2 py-1">
        <ReactionButton post={{ ...post, myReaction }} liked={liked} likeCount={likeCount} onReact={handleReact} />
        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowComments(v => !v); }}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-bold text-slate-500 hover:text-teal-600 active:scale-90 transition-all" title="Comments">
          <MessageSquare className="w-4 h-4" />{commentCount}
        </button>
        <ShareButton post={post} shareCount={shareCount} setShareCount={setShareCount} />
        <Link href={`/feed/${post.id}`} onClick={(e) => e.stopPropagation()}
          className="ml-auto text-[11px] font-bold text-slate-400 hover:text-teal-600 px-3 py-2 transition-colors">
          View post →
        </Link>
      </div>

      {showComments && (
        <div onClick={(e) => { e.stopPropagation(); e.preventDefault(); }} className="cursor-default">
          <InlineComments postId={post.id} onCommentAdded={() => setCommentCount(c => c + 1)} />
        </div>
      )}
    </div>
  );

  return (
    <>
      {inner}
      {fullImage && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          onClick={() => setFullImage(null)}>
          <button className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/25 rounded-full text-white transition-colors"
            onClick={() => setFullImage(null)}>
            <X className="w-6 h-6" />
          </button>
          <img src={fullImage} alt="Full size" className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  );
}

function timeAgo(dateString: string) {
  const date = new Date(dateString);
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ─── Main Feed ────────────────────────────────────────────────────────────────
export default function CityFeed({ hideHeader = false }: { hideHeader?: boolean }) {
  const { city } = useCity();
  const cityName = city?.name ?? 'CityOS';
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('For You');
  const [activeTopic, setActiveTopic] = useState('All');
  const [posts, setPosts] = useState<DBPost[]>([]);
  const [follows, setFollows] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadFeed = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);
      const [result, followData] = await Promise.all([
        fetchFeed(activeTab, activeTopic),
        getFollowedOrganizations(),
      ]);
      setPosts(result.posts as DBPost[]);
      setNextCursor(result.nextCursor);
      setFollows(followData);
    } catch (e) {
      console.error(e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [activeTab, activeTopic]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const result = await fetchFeed(activeTab, activeTopic, nextCursor);
      setPosts(prev => [...prev, ...(result.posts as DBPost[])]);
      setNextCursor(result.nextCursor);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMore(false);
    }
  }, [activeTab, activeTopic, nextCursor, loadingMore]);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  // Infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && nextCursor && !loadingMore) loadMore(); },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [nextCursor, loadingMore, loadMore]);

  const onFollowToggle = (orgId: string) => {
    setFollows(prev => prev.includes(orgId) ? prev.filter(id => id !== orgId) : [...prev, orgId]);
  };

  return (
    <div className="max-w-2xl mx-auto w-full animate-in fade-in duration-500">
      {!hideHeader && (
        <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-100 pt-3 px-4 sm:px-0 mb-4">
          <div className="flex items-center gap-6 px-2">
            {TABS.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={cn('pb-3 text-[15px] font-black transition-colors relative', activeTab === tab ? 'text-ink' : 'text-slate-400 hover:text-slate-600')}>
                {tab}
                {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-1 bg-teal-600 rounded-t-full" />}
              </button>
            ))}
          </div>
          <div className="py-3 flex items-center justify-between gap-3 px-2 border-t border-slate-100/50">
            <Link href="/feed/new" className="flex-1 bg-slate-100 hover:bg-slate-200 transition-colors rounded-full px-4 py-2 flex items-center gap-2 cursor-text group">
              <div className="w-7 h-7 rounded-full bg-slate-300 flex items-center justify-center text-white shrink-0 group-hover:bg-teal-500 transition-colors">
                <span className="text-xs font-black">+</span>
              </div>
              <span className="text-[13px] text-slate-500 font-medium">What's going on in {cityName}?</span>
            </Link>
            <select value={activeTopic} onChange={(e) => setActiveTopic(e.target.value)}
              className="bg-transparent text-[13px] font-bold text-slate-600 outline-none cursor-pointer py-2 pl-2">
              {TOPICS.map(t => <option key={t} value={t}>{t === 'All' ? 'All Topics' : t}</option>)}
            </select>
          </div>
        </div>
      )}

      <div className="space-y-0 pb-8">
        {loading ? (
          <>{[...Array(4)].map((_, i) => <PostSkeleton key={i} />)}</>
        ) : error ? (
          <div className="rounded-2xl border border-dashed border-red-200 bg-red-50 p-10 text-center">
            <p className="text-sm font-bold text-red-600">Failed to load feed</p>
            <button onClick={loadFeed} className="mt-3 text-xs font-bold text-red-700 underline">Try again</button>
          </div>
        ) : posts.length ? (
          <>
            {posts.map(post => <PostCard key={post.id} post={post} follows={follows} onFollowToggle={onFollowToggle} />)}
            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="h-4" />
            {loadingMore && (
              <div className="py-6 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-teal-600 opacity-60" />
              </div>
            )}
            {!nextCursor && !loadingMore && posts.length > 5 && (
              <p className="text-center text-[12px] text-slate-400 font-bold py-6">You're all caught up! 🎉</p>
            )}
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center mx-4">
            <p className="text-3xl mb-3">🏙️</p>
            <p className="text-sm font-black text-slate-700">Be the first to post in {cityName}!</p>
            <p className="text-xs text-slate-400 mt-1 mb-4">Share what's happening in your city.</p>
            <Link href="/feed/new" className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-[13px] font-bold rounded-xl transition-colors">
              Create a post
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}