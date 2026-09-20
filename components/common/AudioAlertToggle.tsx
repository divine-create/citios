'use client';

import React, { useEffect, useState } from 'react';
import { Volume2, VolumeX, BellRing } from 'lucide-react';
import { isAudioMuted, toggleAudioMute, playOrderChime } from '@/lib/audio';

interface AudioAlertToggleProps {
  className?: string;
  showTestButton?: boolean;
  compact?: boolean;
}

export default function AudioAlertToggle({
  className = '',
  showTestButton = true,
  compact = false,
}: AudioAlertToggleProps) {
  const [muted, setMuted] = useState(false);
  const [justPlayed, setJustPlayed] = useState(false);

  useEffect(() => {
    setMuted(isAudioMuted());

    const handleMuteChanged = (e: any) => {
      setMuted(Boolean(e.detail?.muted));
    };
    window.addEventListener('cityconnect_audio_muted_changed', handleMuteChanged);
    return () => {
      window.removeEventListener('cityconnect_audio_muted_changed', handleMuteChanged);
    };
  }, []);

  const handleToggle = () => {
    const next = toggleAudioMute();
    setMuted(next);
  };

  const handleTest = () => {
    playOrderChime();
    setJustPlayed(true);
    setTimeout(() => setJustPlayed(false), 800);
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleToggle}
        title={muted ? 'Unmute Audio Alerts' : 'Mute Audio Alerts'}
        className={`p-2 rounded-xl transition-colors ${
          muted
            ? 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
            : 'text-brand-600 bg-brand-50 hover:bg-brand-100'
        } ${className}`}
      >
        {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>
    );
  }

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <button
        type="button"
        onClick={handleToggle}
        title={muted ? 'Click to enable order sound alerts' : 'Click to mute order sound alerts'}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${
          muted
            ? 'border-slate-200 text-slate-400 bg-slate-50 hover:text-slate-600 hover:bg-slate-100'
            : 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
        }`}
      >
        {muted ? <VolumeX size={14} /> : <Volume2 size={14} className="text-emerald-600" />}
        <span>{muted ? 'Sound Muted' : 'Sound Alerts Active'}</span>
      </button>

      {showTestButton && !muted && (
        <button
          type="button"
          onClick={handleTest}
          title="Play a test order chime"
          className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all ${
            justPlayed ? 'scale-95 bg-emerald-50 text-emerald-700 border-emerald-300' : ''
          }`}
        >
          <BellRing size={13} className={justPlayed ? 'animate-bounce text-emerald-600' : ''} />
          <span>Test</span>
        </button>
      )}
    </div>
  );
}
