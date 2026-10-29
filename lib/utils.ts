import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNaira(amount: number) { return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount); }

export const AVATAR_GRADIENTS = [
  'from-teal-600 to-emerald-700',
  'from-blue-600 to-indigo-700',
  'from-indigo-600 to-purple-700',
  'from-violet-600 to-fuchsia-700',
  'from-rose-600 to-pink-700',
  'from-amber-500 to-orange-700',
  'from-emerald-600 to-teal-800',
  'from-cyan-600 to-blue-700',
] as const;

export function getTwoLetterInitials(name?: string | null): string {
  if (!name || typeof name !== 'string') return '9L';
  const cleaned = name.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim();
  const words = cleaned.split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    const c1 = Array.from(words[0])[0];
    const c2 = Array.from(words[1])[0];
    if (c1 && c2) return (c1 + c2).toUpperCase();
  }

  if (words.length === 1) {
    const chars = Array.from(words[0]);
    if (chars.length >= 2) {
      return (chars[0] + chars[1]).toUpperCase();
    }
    if (chars.length === 1) {
      return chars[0].toUpperCase();
    }
  }

  const rawClean = name.trim();
  const rawChars = Array.from(rawClean);
  if (rawChars.length >= 2) {
    return (rawChars[0] + rawChars[1]).toUpperCase();
  }
  return (rawChars[0] || '9L').toUpperCase();
}

export function getAvatarGradient(name?: string | null): string {
  if (!name || typeof name !== 'string') return AVATAR_GRADIENTS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[index];
}

