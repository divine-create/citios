'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Heart, MessageSquare, Share2, Eye } from 'lucide-react';
import { VerifiedBadge, Pill } from '@/components/cityos/CityUI';
import InlineComments from '@/components/InlineComments';
import { cn } from '@/lib/utils';
import { reactToPost, togglePostLike, type ReactionType } from '@/app/actions/newsfeed';
import type { DBPost } from '@/components/cityos/CityFeed';
import { useRef } from 'react';
import { getPostBackground } from '@/lib/post-background';

const REACTIONS: { type: ReactionType; emoji: string; label: string }[] = [
  { type: 'LIKE',  emoji: '👍', label: 'Like'  },
  { type: 'LOVE',  emoji: '❤️', label: 'Love'  },
  { type: 'HAHA',  emoji: '😂', label: 'Haha'  },
  { type: 'WOW',   emoji: '😮', label: 'Wow'   },
  { type: 'SAD',   emoji: '😢', label: 'Sad'   },
  { type: 'ANGRY', emoji: '😡', label: 'Angry' },
];

function reactionEmoji(type?: ReactionType | null) {
  return REACTIONS.find(r => r.type === type)?.emoji ?? '👍';
}

function timeAgo(dateString: string) {
  const date = new Date(dateString);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString(undefined, { dateStyle: 'medium' });
}

export default function PostDetailClient({ post }: { post: DBPost }) {
  const router = useRouter();
  const [liked, setLiked] = useState(post.isLikedByMe);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [commentCount, setCommentCount] = useState(post.comments);
  const [myReaction, setMyReaction] = useState<ReactionType | null>(post.myReaction ?? null);
  const [showPicker, setShowPicker] = useState(false);
  const [fullImage, setFullImage] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleReact = async (reaction: ReactionType | null) => {
    setShowPicker(false);
    const wasLiked = liked;
    const prevReaction = myReaction;
    if (reaction === null) {
      setLiked(false); setMyReaction(null);
      if (wasLiked) setLikeCount(c => c - 1);
    } else {
      if (!wasLiked) setLikeCount(c => c + 1);
      setLiked(true); setMyReaction(reaction);
    }
    try {
      await reactToPost(post.id, reaction);
    } catch {
      setLiked(wasLiked); setMyReaction(prevReaction);
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

  return (
    <div className="max-w-2xl mx-auto w-full">
      {/* Back nav */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </button>
        <p className="font-black text-[15px] text-ink">Post</p>
      </div>

      <div className="bg-white">
        {/* Author */}
        <div className="p-5 pb-3 flex items-start gap-3">
          <Link href={post.isOrg ? `/org/${post.authorId}` : `/profile/${post.authorId}`} className="shrink-0">
            {post.avatarImg ? (
              <img src={post.avatarImg} alt={post.author} className="w-12 h-12 rounded-full object-cover border border-slate-100" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-black border border-slate-100">
                {post.author.slice(0, 1)}
              </div>
            )}
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Link href={post.isOrg ? `/org/${post.authorId}` : `/profile/${post.authorId}`}
                className="text-[14px] font-black text-ink hover:underline">{post.author}</Link>
              {post.isOrg && <VerifiedBadge />}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <Pill tone="slate">{post.category}</Pill>
              <span className="text-[11px] text-slate-400 font-bold">{timeAgo(post.time)}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-5 pb-3">
          {isShortText || (isTextOnly && hasCustomBackground) ? (
            <div className={cn('-mx-5 px-8 py-12 text-white flex flex-col justify-center items-center text-center min-h-[220px]', selectedBackground.className)}>
              {post.title && post.title !== 'Post' && !post.body.startsWith(post.title) && (
                <h1 className="text-[18px] font-black leading-snug mb-3 drop-shadow">{post.title}</h1>
              )}
              <p className="text-[26px] font-bold leading-snug drop-shadow whitespace-pre-line">{post.body}</p>
            </div>
          ) : (
            <>
              {post.title && post.title !== 'Post' && !post.body.startsWith(post.title) && (
                <h1 className="text-[18px] font-black text-ink leading-snug mb-2">{post.title}</h1>
              )}
              <p className="text-[15px] text-slate-800 leading-relaxed whitespace-pre-line">{post.body}</p>
            </>
          )}
        </div>

        {/* Image */}
        {post.image && (
          <div className="px-5 pb-3">
            <img src={post.image} alt={post.title}
              onClick={() => setFullImage(true)}
              className="w-full max-h-[500px] rounded-xl object-cover border border-slate-100 cursor-pointer hover:opacity-95 transition-all" />
          </div>
        )}

        {/* Metadata chips */}
        {(post.eventDate || post.location || post.price != null) && (
          <div className="mx-5 mb-3 bg-slate-50 rounded-xl p-3 flex flex-wrap gap-x-4 gap-y-2 text-[12px] text-slate-600 font-medium border border-slate-100">
            {post.eventDate && <div className="flex items-center gap-1.5">📅 {new Date(post.eventDate).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</div>}
            {post.location && <div className="flex items-center gap-1.5">📍 {post.location}</div>}
            {post.price != null && <div className="flex items-center gap-1.5 font-bold text-emerald-700">💲 ${post.price.toFixed(2)}</div>}
          </div>
        )}

        {/* Reaction stats */}
        <div className="px-5 py-2 flex items-center justify-between border-t border-slate-100">
          <div className="flex items-center gap-3">
            <span className="text-[13px] text-slate-500 font-bold">{likeCount} reaction{likeCount !== 1 ? 's' : ''}</span>
            <span className="text-[13px] text-slate-500 font-bold">{commentCount} comment{commentCount !== 1 ? 's' : ''}</span>
          </div>
          {(post.viewCount ?? 0) > 0 && (
            <span className="flex items-center gap-1 text-[12px] text-slate-400"><Eye className="w-3.5 h-3.5" /> {post.viewCount} views</span>
          )}
        </div>

        {/* Action bar */}
        <div className="px-3 py-1 border-t border-slate-100 flex items-center gap-1 relative">
          {showPicker && (
            <div className="absolute bottom-full left-3 mb-2 flex items-center gap-1 bg-white rounded-2xl shadow-xl border border-slate-100 px-3 py-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
              {REACTIONS.map(r => (
                <button key={r.type} onClick={() => handleReact(myReaction === r.type ? null : r.type)} title={r.label}
                  className={cn('text-2xl hover:scale-125 transition-transform', myReaction === r.type && 'scale-125')}>
                  {r.emoji}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => handleReact(myReaction ? null : 'LIKE')}
            onMouseDown={() => { holdTimer.current = setTimeout(() => setShowPicker(true), 500); }}
            onMouseUp={() => { if (holdTimer.current) clearTimeout(holdTimer.current); }}
            onMouseLeave={() => { if (holdTimer.current) clearTimeout(holdTimer.current); }}
            className={cn('inline-flex items-center gap-2 px-4 py-2.5 flex-1 justify-center rounded-lg text-[13px] font-bold transition-all',
              liked ? 'text-blue-600 bg-blue-50' : 'text-slate-500 hover:bg-slate-50')}>
            {myReaction ? <span className="text-lg">{reactionEmoji(myReaction)}</span> : <Heart className={cn('w-4 h-4', liked && 'fill-blue-500')} />}
            {myReaction ? REACTIONS.find(r => r.type === myReaction)?.label ?? 'Like' : 'Like'}
          </button>
          <button
            onClick={() => document.getElementById('comments-section')?.scrollIntoView({ behavior: 'smooth' })}
            className="inline-flex items-center gap-2 px-4 py-2.5 flex-1 justify-center rounded-lg text-[13px] font-bold text-slate-500 hover:bg-slate-50 transition-all">
            <MessageSquare className="w-4 h-4" />Comment
          </button>
          <button
            onClick={async () => {
              const url = window.location.href;
              if (navigator.share) await navigator.share({ title: post.title, text: post.body.slice(0, 120), url });
              else { await navigator.clipboard.writeText(url); }
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 flex-1 justify-center rounded-lg text-[13px] font-bold text-slate-500 hover:bg-slate-50 transition-all">
            <Share2 className="w-4 h-4" />Share
          </button>
        </div>

        {/* Comments section */}
        <div id="comments-section" className="border-t border-slate-100">
          <InlineComments postId={post.id} onCommentAdded={() => setCommentCount(c => c + 1)} />
        </div>
      </div>

      {/* Full image lightbox */}
      {fullImage && post.image && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4" onClick={() => setFullImage(false)}>
          <button className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/25 rounded-full text-white" onClick={() => setFullImage(false)}>✕</button>
          <img src={post.image} alt="Full size" className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
