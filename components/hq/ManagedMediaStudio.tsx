'use client';

import React, { useState } from 'react';
import { Image, Video, Plus, Trash2, Globe, Save, Loader2, Sparkles, Check, ExternalLink } from 'lucide-react';
import MediaLinkOrUploadInput from './MediaLinkOrUploadInput';
import { saveManagedBusinessMedia } from '@/lib/actions/hq-managed-business';
import { toast } from 'sonner';

interface ManagedMediaStudioProps {
  organizationId: string;
  initialLogo: string | null;
  initialCover: string | null;
  initialMetadata: {
    images?: string[];
    videos?: string[];
    featuredVideo?: string;
    website?: string;
    source?: string;
  };
}

export default function ManagedMediaStudio({
  organizationId,
  initialLogo,
  initialCover,
  initialMetadata,
}: ManagedMediaStudioProps) {
  const [logoUrl, setLogoUrl] = useState(initialLogo || '');
  const [coverUrl, setCoverUrl] = useState(initialCover || initialMetadata?.images?.[0] || '');
  const [galleryImages, setGalleryImages] = useState<string[]>(initialMetadata?.images || []);
  const [videos, setVideos] = useState<string[]>(initialMetadata?.videos || []);
  const [featuredVideo, setFeaturedVideo] = useState(initialMetadata?.featuredVideo || '');
  const [website, setWebsite] = useState(initialMetadata?.website || '');
  const [saving, setSaving] = useState(false);

  // New item draft states
  const [newGalleryUrl, setNewGalleryUrl] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');

  const handleAddGalleryImage = (url: string) => {
    if (!url.trim()) return;
    if (galleryImages.includes(url)) {
      toast.error('Image already in gallery');
      return;
    }
    setGalleryImages([...galleryImages, url.trim()]);
    setNewGalleryUrl('');
  };

  const handleRemoveGalleryImage = (index: number) => {
    setGalleryImages(galleryImages.filter((_, i) => i !== index));
  };

  const handleAddVideo = () => {
    if (!newVideoUrl.trim()) return;
    if (videos.includes(newVideoUrl)) {
      toast.error('Video already added');
      return;
    }
    setVideos([...videos, newVideoUrl.trim()]);
    setNewVideoUrl('');
  };

  const handleRemoveVideo = (index: number) => {
    setVideos(videos.filter((_, i) => i !== index));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const res = await saveManagedBusinessMedia({
        organizationId,
        logoUrl: logoUrl.trim() || undefined,
        coverUrl: coverUrl.trim() || undefined,
        images: galleryImages,
        videos,
        featuredVideo: featuredVideo.trim() || undefined,
        website: website.trim() || undefined,
      });

      if (res.success) {
        toast.success('Media gallery & video links updated successfully!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save media changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div>
          <div className="flex items-center gap-2">
            <Image className="w-5 h-5 text-teal-400" />
            <h2 className="text-lg font-bold text-white">Media & Video Showcase Studio</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Configure official brand logos, high-res covers, storefront photos, and video showcase links.
          </p>
        </div>

        <button
          onClick={handleSaveAll}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs rounded-xl transition-all shadow-lg shadow-teal-500/20 disabled:opacity-50 shrink-0"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Media Assets
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Brand Logo & Cover Banner */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
            <Image className="w-4 h-4 text-teal-400" /> Primary Brand Assets
          </h3>

          <MediaLinkOrUploadInput
            label="Square Brand Logo"
            value={logoUrl}
            onChange={setLogoUrl}
            placeholder="https://example.com/logo.png"
            description="Official brand icon for listings, avatar badges, and order receipts."
          />

          <MediaLinkOrUploadInput
            label="Wide Cover Banner (Storefront)"
            value={coverUrl}
            onChange={setCoverUrl}
            placeholder="https://example.com/cover.jpg"
            description="Wide high-res photo displayed on the top of the restaurant/shop storefront."
          />

          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-teal-400" /> Official Website Link
            </label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://www.crunchiesonline.com"
              className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-teal-500 font-mono"
            />
          </div>
        </div>

        {/* Video Links & Video Showcase */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
            <Video className="w-4 h-4 text-purple-400" /> Video Tours & Promo Reels
          </h3>

          <MediaLinkOrUploadInput
            label="Featured Video Tour (MP4 or Direct Video)"
            value={featuredVideo}
            onChange={setFeaturedVideo}
            placeholder="https://example.com/store-tour.mp4"
            description="Highlight video clip showing the food prep, dining hall, or hotel room tour."
          />

          {/* Additional Video Links (YouTube / Reels) */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Additional Video Embeds / Links
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={newVideoUrl}
                onChange={(e) => setNewVideoUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=... or TikTok/Reel link"
                className="flex-1 bg-slate-950 border border-slate-800 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-purple-500 font-mono"
              />
              <button
                type="button"
                onClick={handleAddVideo}
                className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl flex items-center gap-1 shrink-0 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Video
              </button>
            </div>

            <div className="space-y-2 mt-3">
              {videos.map((vid, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono"
                >
                  <span className="text-slate-300 truncate max-w-sm">{vid}</span>
                  <div className="flex items-center gap-2">
                    <a
                      href={vid}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-slate-400 hover:text-white"
                      title="Open link"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => handleRemoveVideo(idx)}
                      className="p-1 text-slate-500 hover:text-red-400"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {videos.length === 0 && (
                <p className="text-[11px] text-slate-500 italic">No additional video links added yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Photo Gallery */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Image className="w-4 h-4 text-teal-400" /> Photo Gallery ({galleryImages.length} Photos)
          </h3>
          <span className="text-xs text-slate-400">Photos appear in carousel rails on the business profile</span>
        </div>

        <div className="max-w-xl">
          <MediaLinkOrUploadInput
            label="Add Photo to Gallery (Link or Upload)"
            value={newGalleryUrl}
            onChange={handleAddGalleryImage}
            placeholder="https://example.com/gallery-photo.jpg"
            description="Add dishes, dining room photos, reception desk, or physical storefront pictures."
          />
        </div>

        {/* Gallery Thumbnails */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 pt-2">
          {galleryImages.map((img, idx) => (
            <div
              key={idx}
              className="relative aspect-square rounded-xl overflow-hidden bg-slate-950 border border-slate-800 group shadow-md"
            >
              <img
                src={img}
                alt={`Gallery ${idx + 1}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://placehold.co/200x200?text=Invalid';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2 flex items-end justify-between">
                <span className="text-[10px] text-white font-mono">#{idx + 1}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveGalleryImage(idx)}
                  className="p-1 rounded bg-red-600/80 text-white hover:bg-red-600 transition-colors"
                  title="Remove photo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          {galleryImages.length === 0 && (
            <div className="col-span-full py-10 text-center text-slate-500 text-xs italic">
              No gallery photos added yet. Use the input above to link or upload photos.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
