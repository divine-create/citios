'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Heart, MessageSquare, Share2, MoreHorizontal, Edit3, Trash2, X, Loader2 } from 'lucide-react';
import { VerifiedBadge, Pill } from '@/components/cityos/CityUI';
import InlineComments from '@/components/InlineComments';
import { cn } from '@/lib/utils';
import { reactToPost, togglePostLike, deletePost, updatePost, type ReactionType } from '@/app/actions/newsfeed';
import type { DBPost } from '@/components/cityos/CityFeed';
import { POST_BACKGROUNDS, getPostBackground, type PostBackgroundId } from '@/lib/post-background';

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

  // Edit / Delete state
  const [currentTitle, setCurrentTitle] = useState(post.title);
  const [currentBody, setCurrentBody] = useState(post.body);
  const [currentCategory, setCurrentCategory] = useState(post.category);
  const [currentBackground, setCurrentBackground] = useState<PostBackgroundId>(post.postBackground || 'auto');

  const [showMenu, setShowMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  const [editTitle, setEditTitle] = useState(post.title);
  const [editBody, setEditBody] = useState(post.body);
  const [editCategory, setEditCategory] = useState(post.category);
  const [editBackground, setEditBackground] = useState<PostBackgroundId>(post.postBackground || 'auto');

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

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

  const handleDelete = async () => {
    setIsDeleting(true);
    setPostError(null);
    try {
      await deletePost(post.id);
      router.push('/feed');
    } catch (err) {
      console.error(err);
      setPostError('Failed to delete post. Please try again.');
      setIsDeleting(false);
    }
  };

  const handleEditSave = async () => {
    if (!editBody.trim()) return;
    setIsUpdating(true);
    setPostError(null);
    try {
      await updatePost(post.id, {
        title: editTitle.trim() || undefined,
        body: editBody.trim(),
        category: editCategory,
        postBackground: editBackground,
      });
      setCurrentTitle(editTitle.trim());
      setCurrentBody(editBody.trim());
      setCurrentCategory(editCategory);
      setCurrentBackground(editBackground);
      setShowEditModal(false);
    } catch (err) {
      console.error(err);
      setPostError('Failed to update post. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const autoBackgrounds = ['auto', 'sunset', 'citrus', 'meadow', 'ocean', 'violet'] as const;
  const autoBackground = autoBackgrounds[(post.id.charCodeAt(post.id.length - 1) || 0) % autoBackgrounds.length];
  const selectedBackground = currentBackground && currentBackground !== 'auto'
    ? getPostBackground(currentBackground)
    : getPostBackground(autoBackground);
  const isShortText = !post.image && !post.videoUrl && currentBody.length < 130;
  const isTextOnly = !post.image && !post.videoUrl;
  const hasCustomBackground = currentBackground && currentBackground !== 'auto';

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
        {postError && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-red-50 border border-red-100 text-xs font-bold text-red-600">
            {postError}
          </div>
        )}
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
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link href={post.isOrg ? `/org/${post.authorId}` : `/profile/${post.authorId}`}
                className="text-[14px] font-black text-ink hover:underline">{post.author}</Link>
              {post.isOrg && <VerifiedBadge />}
              {post.isMyPost && (
                <div ref={menuRef} className="relative ml-auto">
                  <button
                    type="button"
                    onClick={() => setShowMenu(m => !m)}
                    className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                    title="Options"
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                  {showMenu && (
                    <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                      <button
                        type="button"
                        onClick={() => {
                          setShowMenu(false);
                          setEditTitle(currentTitle);
                          setEditBody(currentBody);
                          setEditCategory(currentCategory);
                          setEditBackground(currentBackground);
                          setShowEditModal(true);
                        }}
                        className="w-full px-3 py-1.5 text-left text-[12px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                        Edit post
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowMenu(false);
                          setShowDeleteConfirm(true);
                        }}
                        className="w-full px-3 py-1.5 text-left text-[12px] font-bold text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        Delete post
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <Pill tone="slate">{currentCategory}</Pill>
              <span className="text-[11px] text-slate-400 font-bold">{timeAgo(post.time)}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-5 pb-3">
          {isShortText || (isTextOnly && hasCustomBackground) ? (
            <div className={cn('-mx-5 px-8 py-12 text-white flex flex-col justify-center items-center text-center min-h-[220px]', selectedBackground.className)}>
              {currentTitle && currentTitle !== 'Post' && !currentBody.startsWith(currentTitle) && (
                <h1 className="text-[18px] font-black leading-snug mb-3 drop-shadow">{currentTitle}</h1>
              )}
              <p className="text-[26px] font-bold leading-snug drop-shadow whitespace-pre-line">{currentBody}</p>
            </div>
          ) : (
            <>
              {currentTitle && currentTitle !== 'Post' && !currentBody.startsWith(currentTitle) && (
                <h1 className="text-[18px] font-black text-ink leading-snug mb-2">{currentTitle}</h1>
              )}
              <p className="text-[15px] text-slate-800 leading-relaxed whitespace-pre-line">{currentBody}</p>
            </>
          )}
        </div>

        {/* Image */}
        {post.image && (
          <div className="px-5 pb-3">
            <img src={post.image} alt={currentTitle}
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
              if (navigator.share) await navigator.share({ title: currentTitle, text: currentBody.slice(0, 120), url });
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

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          onClick={() => setShowEditModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-black text-slate-800 text-[16px]">Edit post</h3>
              <button onClick={() => setShowEditModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-1">Category</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[13px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-teal-600 cursor-pointer"
                >
                  {['Community', 'Ask the city', 'Offer', 'Event', 'Housing', 'Update'].map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-1">Title (Optional)</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Post headline..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-teal-600 placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-1">Content</label>
                <textarea
                  rows={4}
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  placeholder="What's on your mind?"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-[14px] text-slate-800 outline-none focus:ring-2 focus:ring-teal-600 resize-none leading-relaxed placeholder:text-slate-400 font-medium"
                />
              </div>

              {!post.image && !post.videoUrl && (
                <div>
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-2">Background gradient</label>
                  <div className="flex items-center gap-2">
                    {POST_BACKGROUNDS.map((bg) => (
                      <button
                        key={bg.id}
                        type="button"
                        title={bg.label}
                        onClick={() => setEditBackground(bg.id)}
                        className={cn(
                          'w-7 h-7 rounded-full bg-gradient-to-br ring-offset-2 transition-transform hover:scale-110',
                          bg.className,
                          editBackground === bg.id ? 'ring-2 ring-teal-700 scale-110' : 'ring-1 ring-slate-200'
                        )}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setShowEditModal(false)}
                disabled={isUpdating}
                className="px-4 py-2 rounded-xl text-[13px] font-bold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                disabled={isUpdating || !editBody.trim()}
                className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-[13px] font-bold transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isUpdating && <Loader2 className="w-4 h-4 animate-spin" />}
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl border border-slate-100 p-6 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h4 className="font-black text-slate-800 text-[16px]">Delete post?</h4>
              <p className="text-[13px] text-slate-500">Are you sure you want to delete this post? This action cannot be undone.</p>
            </div>
            <div className="flex items-center gap-2.5 pt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-white bg-red-600 hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
