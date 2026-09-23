'use client';

import { useState } from 'react';
import { Heart } from 'lucide-react';
import { toggleSavedItem } from '@/app/actions/org';
import { cn } from '@/lib/utils';
import { useSession } from 'next-auth/react';

interface SaveButtonProps {
  kind: 'PRODUCT' | 'RESTAURANT' | 'HOTEL' | 'SCHOOL' | 'JOB' | 'EVENT';
  entityId: string;
  cityId?: string;
  initialSaved?: boolean;
  className?: string;
}

export default function SaveButton({ kind, entityId, cityId, initialSaved = false, className }: SaveButtonProps) {
  const { data: session } = useSession();
  const [isSaved, setIsSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);

  async function handleToggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!session?.user) {
      alert('Please sign in to save items.');
      return;
    }
    setLoading(true);
    try {
      const res = await toggleSavedItem(kind, entityId);
      setIsSaved(res);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={cn(
        "p-2 rounded-full transition-colors flex items-center justify-center shrink-0 shadow-sm",
        isSaved ? "bg-pink-50 text-pink-500 hover:bg-pink-100" : "bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-600",
        className
      )}
      aria-label={isSaved ? "Remove from saved" : "Save"}
    >
      <Heart className="w-5 h-5" fill={isSaved ? "currentColor" : "none"} />
    </button>
  );
}


