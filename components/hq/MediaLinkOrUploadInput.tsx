'use client';

import React, { useState } from 'react';
import { Link2, Upload, X, Check, Loader2, Image as ImageIcon } from 'lucide-react';

interface MediaLinkOrUploadInputProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
  description?: string;
}

export default function MediaLinkOrUploadInput({
  label,
  value,
  onChange,
  placeholder = 'https://example.com/image.jpg',
  description,
}: MediaLinkOrUploadInputProps) {
  const [mode, setMode] = useState<'link' | 'upload'>('link');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Upload failed');
      }

      onChange(data.url);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">{label}</label>
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setMode('link')}
            className={`px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors ${
              mode === 'link' ? 'bg-teal-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Link2 className="w-3 h-3" /> Link URL
          </button>
          <button
            type="button"
            onClick={() => setMode('upload')}
            className={`px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors ${
              mode === 'upload' ? 'bg-teal-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Upload className="w-3 h-3" /> Upload File
          </button>
        </div>
      </div>

      {description && <p className="text-[11px] text-slate-400">{description}</p>}

      {mode === 'link' ? (
        <div className="relative">
          <input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-teal-500 placeholder:text-slate-600 font-mono"
          />
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-red-400"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <label className="cursor-pointer flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-750 rounded-xl text-xs font-bold text-white transition-colors">
              {uploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-400" /> Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5 text-teal-400" /> Choose File
                </>
              )}
              <input
                type="file"
                accept="image/*,video/mp4,video/webm"
                className="hidden"
                disabled={uploading}
                onChange={handleFileUpload}
              />
            </label>
            {value && <span className="text-[11px] font-mono text-teal-400 truncate max-w-xs">{value}</span>}
          </div>
          {uploadError && <p className="text-xs text-red-400 font-medium">{uploadError}</p>}
        </div>
      )}

      {/* Live Preview */}
      {value && (
        <div className="mt-2 relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950/60 p-2 flex items-center gap-3">
          {value.endsWith('.mp4') || value.endsWith('.webm') ? (
            <video src={value} className="w-16 h-16 object-cover rounded-lg border border-slate-800" controls />
          ) : (
            <img
              src={value}
              alt="Preview"
              className="w-16 h-16 object-cover rounded-lg border border-slate-800 bg-slate-900"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://placehold.co/100x100?text=Invalid+Image';
              }}
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400" /> Active Media Asset
            </p>
            <p className="text-[10px] text-slate-400 font-mono truncate mt-0.5">{value}</p>
          </div>
          <button
            type="button"
            onClick={() => onChange('')}
            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            title="Remove asset"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
