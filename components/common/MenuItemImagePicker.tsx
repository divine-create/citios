'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, Sparkles, Trash2, Image as ImageIcon, Loader2, RefreshCw, Link2, Check } from 'lucide-react';
import { Button } from '@/components/ui';
import { findLibraryItemByImageUrl } from '@/lib/menu-library';
import { uploadAsset } from '@/lib/actions/microsite';
import { toast } from 'sonner';

interface MenuItemImagePickerProps {
  value: string;
  onChange: (url: string) => void;
  onOpenLibrary: () => void;
  organizationId?: string;
  label?: string;
  description?: string;
  disabled?: boolean;
  theme?: 'light' | 'dark';
}

export default function MenuItemImagePicker({
  value,
  onChange,
  onOpenLibrary,
  organizationId,
  label = 'Item Photo',
  description,
  disabled = false,
  theme = 'light',
}: MenuItemImagePickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showManualUrl, setShowManualUrl] = useState(false);
  const [manualUrlInput, setManualUrlInput] = useState('');

  const libraryItem = findLibraryItemByImageUrl(value);
  const isLibraryImage = Boolean(libraryItem || (value && value.startsWith('/images/menu/')));

  const isDark = theme === 'dark';

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please choose a valid image file (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size must be less than 10MB.');
      return;
    }

    setUploading(true);
    try {
      // 1. First attempt: standard /api/upload
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.url) {
          onChange(data.url);
          toast.success('Photo uploaded successfully!');
          setUploading(false);
          // reset input
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }
      }

      // 2. Fallback: uploadAsset if organizationId is available
      if (organizationId) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const base64Data = reader.result as string;
            const assetRes = await uploadAsset(organizationId, {
              fileName: file.name,
              mimeType: file.type,
              base64Data,
            });
            if (assetRes.success && assetRes.publicUrl) {
              onChange(assetRes.publicUrl);
              toast.success('Photo uploaded successfully!');
            } else {
              toast.error(assetRes.error || 'Failed to upload photo.');
            }
          } catch (err: any) {
            toast.error(err?.message || 'Failed to process image.');
          } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
          }
        };
        reader.readAsDataURL(file);
        return;
      }

      throw new Error('Upload failed. Please try another image.');
    } catch (err: any) {
      console.error('Image upload error:', err);
      toast.error(err?.message || 'Failed to upload image.');
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          {label}
        </label>
        {value && !showManualUrl && (
          <button
            type="button"
            onClick={() => {
              setManualUrlInput(value);
              setShowManualUrl(true);
            }}
            className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1"
          >
            <Link2 size={12} /> View/Edit Link
          </button>
        )}
      </div>

      {description && <p className="text-[11px] text-slate-500">{description}</p>}

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        disabled={disabled || uploading}
      />

      {/* Case 1: Image is selected (NO RAW LINK DISPLAYED BY DEFAULT) */}
      {value ? (
        <div className={`p-3 rounded-2xl shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border ${
          isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative group shrink-0">
              <img
                src={value}
                alt="Menu item preview"
                className={`w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover shadow-xs ${
                  isDark ? 'ring-1 ring-white/10 bg-slate-950' : 'ring-1 ring-black/10 bg-slate-50'
                }`}
              />
              {uploading && (
                <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center text-white">
                  <Loader2 size={18} className="animate-spin" />
                </div>
              )}
            </div>

            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                {isLibraryImage ? (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                    isDark ? 'bg-amber-950/60 text-amber-300 border-amber-800' : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}>
                    <Sparkles className="w-3 h-3 text-amber-500" /> Menu Library Asset
                  </span>
                ) : (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                    isDark ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}>
                    <UploadCloud className="w-3 h-3 text-emerald-500" /> Custom Photo
                  </span>
                )}
              </div>

              {libraryItem ? (
                <div>
                  <p className={`text-xs font-bold truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>{libraryItem.name}</p>
                  <p className={`text-[10px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{libraryItem.category}</p>
                </div>
              ) : (
                <p className={`text-xs font-medium truncate ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Ready to display on storefront & POS
                </p>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end flex-wrap">
            <Button
              type="button"
              variant={isDark ? "secondary" : "outline"}
              size="sm"
              leftIcon={<Sparkles size={14} className="text-orange-500" />}
              onClick={onOpenLibrary}
              disabled={disabled || uploading}
            >
              Pick from Library
            </Button>

            <Button
              type="button"
              variant={isDark ? "secondary" : "outline"}
              size="sm"
              leftIcon={uploading ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || uploading}
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={isDark ? "text-rose-400 hover:text-rose-300 hover:bg-rose-950/40" : "text-rose-600 hover:text-rose-700 hover:bg-rose-50"}
              leftIcon={<Trash2 size={14} />}
              onClick={() => {
                onChange('');
                setShowManualUrl(false);
              }}
              disabled={disabled || uploading}
            >
              Remove
            </Button>
          </div>
        </div>
      ) : (
        /* Case 2: No image selected yet */
        <div className={`border-2 border-dashed rounded-2xl p-4 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
          isDark
            ? 'border-slate-800 bg-slate-950/60 hover:border-slate-700 text-white'
            : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isDark ? 'bg-slate-900 text-slate-400' : 'bg-slate-100 text-slate-400'
            }`}>
              <ImageIcon size={20} />
            </div>
            <div>
              <p className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Add Dish or Beverage Photo</p>
              <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Pick from our 50-dish library or upload your own file</p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
            <Button
              type="button"
              variant={isDark ? "secondary" : "outline"}
              size="sm"
              leftIcon={<Sparkles size={14} className="text-orange-500" />}
              onClick={onOpenLibrary}
              disabled={disabled || uploading}
            >
              Pick from Library
            </Button>

            <Button
              type="button"
              size="sm"
              leftIcon={uploading ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || uploading}
            >
              {uploading ? 'Uploading...' : 'Upload Photo'}
            </Button>
          </div>
        </div>
      )}

      {/* Optional Collapsible Manual Link URL (Only shown if user explicitly clicked "View/Edit Link" or "Paste URL") */}
      {showManualUrl ? (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-slate-600">Direct Image URL</label>
            <button
              type="button"
              onClick={() => setShowManualUrl(false)}
              className="text-[11px] text-slate-500 hover:text-slate-800"
            >
              Hide URL
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualUrlInput}
              onChange={(e) => setManualUrlInput(e.target.value)}
              placeholder="https://..."
              className="flex-1 h-9 px-3 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <Button
              type="button"
              size="sm"
              onClick={() => {
                onChange(manualUrlInput.trim());
                setShowManualUrl(false);
              }}
            >
              Apply
            </Button>
          </div>
        </div>
      ) : (
        !value && (
          <div className="text-right">
            <button
              type="button"
              onClick={() => {
                setManualUrlInput('');
                setShowManualUrl(true);
              }}
              className="text-[10px] text-slate-400 hover:text-slate-600 underline transition-colors"
            >
              Or enter custom link URL
            </button>
          </div>
        )
      )}
    </div>
  );
}
