export const POST_BACKGROUNDS = [
  { id: 'auto', label: 'Auto', className: 'bg-gradient-to-br from-purple-600 to-indigo-600' },
  { id: 'sunset', label: 'Sunset', className: 'bg-gradient-to-br from-pink-500 to-rose-600' },
  { id: 'citrus', label: 'Citrus', className: 'bg-gradient-to-br from-amber-400 to-orange-500' },
  { id: 'meadow', label: 'Meadow', className: 'bg-gradient-to-br from-emerald-500 to-teal-600' },
  { id: 'ocean', label: 'Ocean', className: 'bg-gradient-to-br from-cyan-500 to-blue-600' },
  { id: 'violet', label: 'Violet', className: 'bg-gradient-to-br from-violet-500 to-purple-600' },
] as const;

export type PostBackgroundId = typeof POST_BACKGROUNDS[number]['id'];

export type PostMetadata = {
  background?: PostBackgroundId;
};

export function getPostBackground(id?: unknown) {
  return POST_BACKGROUNDS.find((background) => background.id === id) ?? POST_BACKGROUNDS[0];
}

export function parsePostMetadata(value?: unknown): PostMetadata {
  if (typeof value !== 'string' || !value) return {};

  try {
    const parsed = JSON.parse(value) as PostMetadata;
    return { background: getPostBackground(parsed.background).id };
  } catch {
    return {};
  }
}

export function serializePostMetadata(background?: unknown) {
  const selected = getPostBackground(background).id;
  return JSON.stringify({ background: selected });
}