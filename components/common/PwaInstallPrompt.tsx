'use client';

import React, { useEffect, useState } from 'react';
import { Download, X, Share, PlusSquare, Smartphone } from 'lucide-react';

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if app is already running as standalone PWA
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) return;

    // Check if user dismissed the prompt recently (within 5 days)
    const dismissedAt = localStorage.getItem('cityconnect_pwa_dismissed');
    if (dismissedAt) {
      const days = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (days < 5) return;
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    // Handler for Chrome/Edge/Android beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // On iOS Safari, show prompt after a short initial delay if not in standalone
    if (isIosDevice) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 4000);
      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
        clearTimeout(timer);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowIosGuide(false);
    try {
      localStorage.setItem('cityconnect_pwa_dismissed', Date.now().toString());
    } catch {}
  };

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosGuide(true);
      return;
    }

    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-50 animate-in slide-in-from-bottom duration-300">
      <div className="bg-slate-900/95 backdrop-blur-md text-white rounded-2xl p-4 shadow-2xl border border-white/10 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center font-black text-white text-base shadow-inner">
              CC
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-white leading-tight">Install CityConnect</h4>
              <p className="text-[11px] text-slate-300 font-medium">Faster access & real-time order alerts</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-slate-400 hover:text-white p-1 transition-colors"
            title="Dismiss"
          >
            <X size={16} />
          </button>
        </div>

        {showIosGuide ? (
          <div className="bg-white/10 rounded-xl p-3 text-xs space-y-2 text-slate-200 border border-white/5 animate-in fade-in">
            <p className="font-bold text-white flex items-center gap-1.5">
              <Share size={14} className="text-brand-400" /> Install on iOS Safari:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-300">
              <li>Tap the <span className="font-bold text-white">Share</span> button at the bottom of Safari.</li>
              <li>Scroll down and tap <span className="font-bold text-white">Add to Home Screen</span>.</li>
            </ol>
            <button
              onClick={() => setShowIosGuide(false)}
              className="w-full mt-1 py-1.5 text-center text-[11px] font-bold text-brand-300 hover:text-brand-200"
            >
              Got it
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleInstallClick}
              className="flex-1 bg-brand-600 hover:bg-brand-500 active:scale-95 text-white font-bold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-brand-600/30"
            >
              {isIos ? <PlusSquare size={15} /> : <Download size={15} />}
              <span>{isIos ? 'How to Install' : 'Install App'}</span>
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              Later
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
