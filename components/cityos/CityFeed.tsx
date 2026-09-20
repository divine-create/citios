'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, MessageSquare, Share2, PenSquare, ChevronRight, UserPlus, UserCheck, Loader2 } from 'lucide-react';
// Feed tab chrome (UI filters only, not content).
const TABS = ['For You', 'Following'] as const;
const TOPICS = ['All', 'Marketplace', 'Events', 'Housing', 'Community'];
import { CityCard, FallbackImg, Pill, ChipButton, VerifiedBadge } from '@/components/cityos/CityUI';
import InlineComments from '@/components/InlineComments';
import { cn } from '@/lib/utils';
import { sharePost } from '@/lib/actions/post';
import { fetchFeed, togglePostLike, toggleFollow, getFollowedOrganizations } from '@/app/actions/newsfeed';
import { useCity } from '@/components/cityos/CityProvider';

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
  isLikedByMe: boolean;
  orgId: string | null;
  href?: { url: string; label: string };
  image?: string;
  videoUrl?: string;
  eventDate?: string;
  location?: string;
  price?: number;
  postMetadata?: string;
};


function ShareButton({
  post,
  shareCount,
  setShareCount,
}: {
  post: DBPost;
  shareCount: number;
  setShareCount: React.Dispatch<React.SetStateAction<number>>;
}) {
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);

  const postUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/feed?post=${post.id}`
    : `/feed?post=${post.id}`;

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (sharing) return;
    setSharing(true);

    // Optimistically increment
    setShareCount((s) => s + 1);
    sharePost(post.id).catch(console.error);

    // Try native share (works on Android/iOS and some desktops)
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: post.title || 'CityConnect post',
          text: post.body.slice(0, 120),
          url: postUrl,
        });
      } catch {
        // User cancelled — revert the optimistic increment
        setShareCount((s) => s - 1);
      }
    } else {
      // Desktop fallback: copy link
      try {
        await navigator.clipboard.writeText(postUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch {
        // clipboard API not available — silent fail
      }
    }
    setSharing(false);
  };

  return (
    <button
      onClick={handleShare}
      disabled={sharing}
      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-bold transition-colors text-slate-500 hover:text-teal-600 active:scale-90 transition-transform disabled:opacity-50"
      title="Share post"
    >
      {copied ? (
        <span className="text-emerald-600 font-bold flex items-center gap-1">
          <Share2 className="w-4 h-4" /> Copied!
        </span>
      ) : (
        <>
          <Share2 className="w-4 h-4" />
          {shareCount}
        </>
      )}
    </button>
  );
}

function PostCard({ post, follows, onFollowToggle }: { post: DBPost & { href?: { url: string; label?: string } }, follows: string[], onFollowToggle: (id: string) => void }) {
  const router = useRouter();
  const handleProfileClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (post.authorId) {
      router.push(post.isOrg ? `/org/${post.authorId}` : `/profile/${post.authorId}`);
    }
  };
  const [liked, setLiked] = useState(post.isLikedByMe);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [shareCount, setShareCount] = useState(post.shares);
  const [isFollowing, setIsFollowing] = useState(post.orgId ? follows.includes(post.orgId) : false);
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(post.comments);
  const [isExpanded, setIsExpanded] = useState(false);
  const cityTimezone = useCity().city?.timezone ?? undefined;

  useEffect(() => {
    setIsFollowing(post.orgId ? follows.includes(post.orgId) : false);
  }, [follows, post.orgId]);

  const handleLike = async () => {
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount((c) => (newLiked ? c + 1 : c - 1));
    await togglePostLike(post.id).catch(console.error);
  };

  const handleFollow = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!post.orgId) return;
    const newFollowing = !isFollowing;
    setIsFollowing(newFollowing);
    onFollowToggle(post.orgId);
    await toggleFollow(post.orgId).catch(console.error);
  };

  const inner = (
    <div className="flex flex-col bg-white border-b border-slate-100 last:border-b-0 pb-2 mb-2 transition-colors hover:bg-slate-50/30">
      <div className="p-5 pb-4 flex items-start gap-3">
        <div onClick={handleProfileClick} className="cursor-pointer hover:opacity-80 transition-opacity">
          <FallbackImg
            src={post.avatarImg}
            alt={post.author}
            className="w-11 h-11 rounded-full shrink-0 border border-slate-100"
            icon={<span className="text-xs font-black">{post.author.slice(0, 1)}</span>}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p onClick={handleProfileClick} className="text-[13px] font-black text-ink cursor-pointer hover:underline">{post.author}</p>
            {post.isOrg ? <VerifiedBadge /> : null}
            <Pill tone="slate" className="ml-1">{post.category}</Pill>
            {post.isOrg && post.orgId && (
              <button 
                onClick={handleFollow}
                className={cn(
                  "ml-auto flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md transition-colors",
                  isFollowing ? "bg-slate-100 text-slate-500" : "bg-teal-50 text-teal-700 hover:bg-teal-100"
                )}
              >
                {isFollowing ? <UserCheck className="w-3 h-3" /> : <UserPlus className="w-3 h-3" />}
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            )}
          </div>
          <p className="text-[11px] text-slate-400 font-bold mt-0.5 uppercase tracking-wider">{`${post.role} • ${timeAgo(post.time)}`}</p>
        </div>
      </div>

      <div className="px-5">
        
          {post.title && post.title !== 'Post' && !post.body.startsWith(post.title) && (
            <h3 className="text-[15px] font-black text-ink leading-snug mb-1">{post.title}</h3>
          )}
          <p className={cn("text-[14px] text-slate-800 leading-relaxed whitespace-pre-line", !isExpanded && post.body.length > 250 && "line-clamp-4")}>
            {post.body}
          </p>
          {!isExpanded && post.body.length > 250 && (
            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsExpanded(true); }} className="text-teal-600 text-sm font-bold mt-1 hover:underline">Read more</button>
          )}

        {post.image ? (
          <FallbackImg src={post.image} alt={post.title} className="mt-3 aspect-square max-h-[400px] w-full rounded-xl object-cover border border-slate-100" />
        ) : null}
        {post.videoUrl ? (
          <div className="mt-3 text-[13px] font-bold text-teal-700 bg-teal-50 px-3 py-2 rounded-lg inline-flex items-center gap-2">
            🔗 <a href={post.videoUrl} target="_blank" rel="noreferrer" className="hover:underline">Watch Video</a>
          </div>
        ) : null}
        
        {/* Specific Metadata */}
        {(post.eventDate || post.location || post.price != null) && (
          <div className="mt-3 bg-slate-50 rounded-xl p-3 flex flex-wrap gap-x-4 gap-y-2 text-[12px] text-slate-600 font-medium border border-slate-100">
            {post.eventDate && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">📅</span> 
                {new Date(post.eventDate).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
              </div>
            )}
            {post.location && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">📍</span> {post.location}
              </div>
            )}
            {post.price != null && (
              <div className="flex items-center gap-1.5 font-bold text-emerald-700">
                <span className="text-emerald-500/70">💲</span> $\{post.price.toFixed(2)}
              </div>
            )}
          </div>
        )}
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

      <div className="mt-2 flex flex-col">
        <div className="flex items-center gap-4 px-3 py-1">
        <button
          onClick={handleLike}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-bold transition-colors',
            liked ? 'text-orange-600 bg-orange-50' : 'text-slate-500 hover:text-orange-500 active:scale-90 transition-transform',
          )}
        >
          <Heart className={cn('w-4 h-4', liked && 'fill-orange-500 text-orange-500')} />
          {likeCount}
        </button>
        <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowComments(!showComments);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-bold text-slate-500 hover:text-teal-600 active:scale-90 transition-transform transition-colors"
            title="View or add comments"
          >
            <MessageSquare className="w-4 h-4" />
            {commentCount}
          </button>
        <ShareButton post={post} shareCount={shareCount} setShareCount={setShareCount} />
        </div>
        {showComments && (
          <div onClick={(e) => { e.stopPropagation(); e.preventDefault(); }} className="cursor-default">
            <InlineComments postId={post.id} onCommentAdded={() => setCommentCount(c => c + 1)} />
          </div>
        )}
      </div>
    </div>
  );

  return post.href ? <Link href={post.href.url}>{inner}</Link> : inner;
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

export default function CityFeed({ hideHeader = false }: { hideHeader?: boolean }) {
  const { city } = useCity();
  const cityName = city?.name ?? 'CityOS';
  const cityTimezone = city?.timezone ?? undefined;
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('For You');
  const [activeTopic, setActiveTopic] = useState('All');
  const [posts, setPosts] = useState<DBPost[]>([]);
  const [follows, setFollows] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadFeed = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);
      const [feedData, followData] = await Promise.all([
        fetchFeed(activeTab, activeTopic),
        getFollowedOrganizations()
      ]);
      setPosts(feedData);
      setFollows(followData);
    } catch (e) {
      console.error(e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [activeTab, activeTopic]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const onFollowToggle = (orgId: string) => {
    setFollows(prev => prev.includes(orgId) ? prev.filter(id => id !== orgId) : [...prev, orgId]);
  };

  return (
    <div className="max-w-2xl mx-auto w-full animate-in fade-in duration-500">
    {!hideHeader && (
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-100 pt-3 px-4 sm:px-0 mb-4">
        {/* Top Tabs */}
        <div className="flex items-center gap-6 px-2">
           {TABS.map(tab => (
             <button 
               key={tab} 
               onClick={() => setActiveTab(tab)}
               className={cn("pb-3 text-[15px] font-black transition-colors relative", activeTab === tab ? "text-ink" : "text-slate-400 hover:text-slate-600")}
             >
               {tab}
               {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-1 bg-teal-600 rounded-t-full" />}
             </button>
           ))}
        </div>
        
        {/* Topic Filter & Compose Input */}
        <div className="py-3 flex items-center justify-between gap-3 px-2 border-t border-slate-100/50">
            {/* Quick Compose Fake Input */}
            <Link href="/feed/new" className="flex-1 bg-slate-100 hover:bg-slate-200 transition-colors rounded-full px-4 py-2 flex items-center gap-2 cursor-text group">
               <div className="w-7 h-7 rounded-full bg-slate-300 flex items-center justify-center text-white shrink-0 group-hover:bg-teal-500 transition-colors">
                  <span className="text-xs font-black">U</span>
               </div>
               <span className="text-[13px] text-slate-500 font-medium">What's going on in {cityName}?</span>
            </Link>

            {/* Filter Dropdown */}
            <select 
               value={activeTopic} 
               onChange={(e) => setActiveTopic(e.target.value)}
               className="bg-transparent text-[13px] font-bold text-slate-600 outline-none cursor-pointer py-2 pl-2"
            >
               {TOPICS.map(t => <option key={t} value={t}>{t === 'All' ? 'All Topics' : t}</option>)}
            </select>
        </div>
      </div>
    )}

    <div className="space-y-0 pb-8">
        {loading ? (
          <div className="py-12 flex justify-center text-teal-800">
             <Loader2 className="w-8 h-8 animate-spin opacity-50" />
          </div>
        ) : error ? (
           <div className="rounded-2xl border border-dashed border-red-200 bg-red-50 p-10 text-center">
            <p className="text-sm font-bold text-red-600">Failed to load feed</p>
            <button onClick={loadFeed} className="mt-3 text-xs font-bold text-red-700 underline">Try again</button>
          </div>
        ) : posts.length ? (
          posts.map((post) => <PostCard key={post.id} post={post} follows={follows} onFollowToggle={onFollowToggle} />)
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