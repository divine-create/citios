'use client';

import React, { useState } from 'react';
import { MessageSquare, Plus, Trash2, Video, DollarSign, Calendar, Sparkles, Loader2, Send } from 'lucide-react';
import MediaLinkOrUploadInput from './MediaLinkOrUploadInput';
import { createManagedBusinessPost, deleteManagedBusinessPost } from '@/lib/actions/hq-managed-business';
import { toast } from 'sonner';

interface PostData {
  id: string;
  title: string;
  content: string;
  category: string;
  imageUrl: string | null;
  videoUrl: string | null;
  price: number | null;
  createdAt: any;
}

interface ManagedProxyPostStudioProps {
  organizationId: string;
  businessName: string;
  initialPosts: PostData[];
}

export default function ManagedProxyPostStudio({
  organizationId,
  businessName,
  initialPosts,
}: ManagedProxyPostStudioProps) {
  const [posts, setPosts] = useState<PostData[]>(initialPosts);
  const [isComposing, setIsComposing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('DAILY_SPECIAL');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [price, setPrice] = useState<string>('');

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error('Title and content are required.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await createManagedBusinessPost({
        organizationId,
        title: title.trim(),
        content: content.trim(),
        category,
        imageUrl: imageUrl.trim() || undefined,
        videoUrl: videoUrl.trim() || undefined,
        price: price ? Number(price) : undefined,
      });

      if (res.success) {
        toast.success(`Published post for ${businessName}!`);
        setPosts([
          {
            id: res.postId || String(Date.now()),
            title,
            content,
            category,
            imageUrl: imageUrl || null,
            videoUrl: videoUrl || null,
            price: price ? Number(price) : null,
            createdAt: new Date().toISOString(),
          },
          ...posts,
        ]);
        // Reset form
        setTitle('');
        setContent('');
        setImageUrl('');
        setVideoUrl('');
        setPrice('');
        setIsComposing(false);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to publish post');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    try {
      const res = await deleteManagedBusinessPost(postId, organizationId);
      if (res.success) {
        toast.success('Post removed');
        setPosts((prev) => prev.filter((p) => p.id !== postId));
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete post');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-teal-400" />
            <h2 className="text-lg font-bold text-white">Proxy Social Updates & Announcements</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Publish daily specials, menu drops, and weekend promotions on behalf of {businessName} to populate resident feeds.
          </p>
        </div>

        {!isComposing && (
          <button
            onClick={() => setIsComposing(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs rounded-xl transition-all shadow-lg shadow-teal-500/20 shrink-0"
          >
            <Plus className="w-4 h-4" /> Compose Post
          </button>
        )}
      </div>

      {/* Composer Card */}
      {isComposing && (
        <form
          onSubmit={handleCreatePost}
          className="bg-slate-900 border border-teal-500/30 rounded-2xl p-6 space-y-4 shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-400" /> New Broadcast for {businessName}
            </h3>
            <button
              type="button"
              onClick={() => setIsComposing(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">
                Post Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Fresh Seafood Okro Soup Ready for Lunch!"
                className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-teal-500"
              >
                <option value="DAILY_SPECIAL">Daily Special</option>
                <option value="EVENT">Event / Nightlife</option>
                <option value="PROMO">Discount / Deal</option>
                <option value="ANNOUNCEMENT">Announcement</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">
              Post Body / Content *
            </label>
            <textarea
              required
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Describe the promotion, ingredients, arrival time, or happy hour schedule..."
              className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl p-3 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MediaLinkOrUploadInput
              label="Post Photo Attachment"
              value={imageUrl}
              onChange={setImageUrl}
              placeholder="https://example.com/dish-photo.jpg"
              description="Add a mouth-watering dish or venue photo."
            />

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">
                  Featured Price (Optional ₦)
                </label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="3500"
                  className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-teal-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">
                  Video Link (Optional MP4 / Reel)
                </label>
                <input
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://example.com/video.mp4"
                  className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-teal-500 font-mono"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsComposing(false)}
              className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs rounded-xl transition-all disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Publish Broadcast
            </button>
          </div>
        </form>
      )}

      {/* Posts List */}
      <div className="space-y-4">
        {posts.map((post) => (
          <div
            key={post.id}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row gap-5 justify-between items-start"
          >
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 font-black text-[10px] uppercase">
                  {post.category}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {new Date(post.createdAt?.toString() || Date.now()).toLocaleDateString()}
                </span>
                {post.price && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono font-bold text-xs">
                    ₦{post.price.toLocaleString()}
                  </span>
                )}
              </div>

              <h4 className="text-base font-bold text-white">{post.title}</h4>
              <p className="text-xs text-slate-300 leading-relaxed">{post.content}</p>
            </div>

            {post.imageUrl && (
              <img
                src={post.imageUrl}
                alt={post.title}
                className="w-24 h-24 rounded-xl object-cover border border-slate-800 bg-slate-950 shrink-0"
              />
            )}

            <button
              onClick={() => handleDeletePost(post.id)}
              className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
              title="Delete post"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}

        {posts.length === 0 && (
          <div className="py-12 text-center bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl">
            <MessageSquare className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-xs font-bold text-white">No broadcast posts yet</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Click "Compose Post" above to broadcast daily specials and attract residents.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
