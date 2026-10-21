'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Heart } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { getMySavedKeys, toggleSavedItem } from '@/app/actions/org';
import { savedKey, type SavedEntityType } from '@/lib/saved-items';
import { cn } from '@/lib/utils';

interface SaveButtonProps {
  kind: SavedEntityType;
  entityId: string;
  /** Skip the lookup when the parent already knows the saved state. */
  initialSaved?: boolean;
  className?: string;
  /** `overlay` = white heart on top of a photo (cards); `default` = standalone pill. */
  variant?: 'default' | 'overlay';
}

// One lookup per page load, shared by every SaveButton, instead of one request per card.
let savedKeysPromise: Promise<Set<string>> | null = null;

function loadSavedKeys(): Promise<Set<string>> {
  if (!savedKeysPromise) {
    savedKeysPromise = getMySavedKeys()
      .then((keys) => new Set(keys))
      .catch(() => {
        savedKeysPromise = null;
        return new Set<string>();
      });
  }
  return savedKeysPromise;
}

export default function SaveButton({ kind, entityId, initialSaved, className, variant = 'default' }: SaveButtonProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isSaved, setIsSaved] = useState(initialSaved ?? false);
  const [loading, setLoading] = useState(false);
  const signedIn = Boolean(session?.user);

  useEffect(() => {
    if (initialSaved !== undefined) return;
    if (status === 'unauthenticated') {
      savedKeysPromise = null; // signed out: drop any cached state from a previous account
      setIsSaved(false);
      return;
    }
    if (status !== 'authenticated') return;
    let cancelled = false;
    loadSavedKeys().then((keys) => {
      if (!cancelled) setIsSaved(keys.has(savedKey(kind, entityId)));
    });
    return () => {
      cancelled = true;
    };
  }, [initialSaved, status, kind, entityId]);

  async function handleToggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!signedIn) {
      router.push(`/login?callbackUrl=${encodeURIComponent(pathname || '/')}`);
      return;
    }
    if (loading) return;
    const previous = isSaved;
    setIsSaved(!previous); // optimistic
    setLoading(true);
    try {
      const saved = await toggleSavedItem(kind, entityId);
      setIsSaved(saved);
      const keys = await loadSavedKeys();
      if (saved) keys.add(savedKey(kind, entityId));
      else keys.delete(savedKey(kind, entityId));
    } catch (err) {
      console.error('Failed to update saved item', err);
      setIsSaved(previous);
    } finally {
      setLoading(false);
    }
  }

  const label = isSaved ? 'Remove from saved' : 'Save';

  if (variant === 'overlay') {
    return (
      <button
        type="button"
        onClick={handleToggle}
        disabled={loading}
        aria-label={label}
        aria-pressed={isSaved}
        className={cn(
          'p-1.5 rounded-full text-white hover:scale-110 active:scale-90 transition-transform duration-150 focus:outline-none',
          className
        )}
      >
        <Heart
          className={cn(
            'w-6 h-6 stroke-[2px] transition-colors duration-200 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]',
            isSaved ? 'fill-[#FF385C] stroke-[#FF385C]' : 'fill-black/25 stroke-white hover:fill-black/40'
          )}
        />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      aria-label={label}
      aria-pressed={isSaved}
      className={cn(
        'p-2 rounded-full transition-colors flex items-center justify-center shrink-0 shadow-sm',
        isSaved ? 'bg-pink-50 text-pink-500 hover:bg-pink-100' : 'bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-600',
        className
      )}
    >
      <Heart className="w-5 h-5" fill={isSaved ? 'currentColor' : 'none'} />
    </button>
  );
}
