export const DEFAULT_RETAIL_UNITS = [
  'ea',
  'pcs',
  'kg',
  'g',
  'lb',
  'pack',
  'box',
  'bottle',
  'carton',
  'bundle',
  'set',
  'crate',
] as const;

export function normalizeRetailUnits(units?: string[] | string | null): string[] {
  const rawList = Array.isArray(units)
    ? units
    : typeof units === 'string'
      ? (() => {
          try {
            return JSON.parse(units || '[]');
          } catch {
            return [];
          }
        })()
      : [];

  const values = (Array.isArray(rawList) ? rawList : [])
    .map((unit) => String(unit ?? '').trim().toLowerCase())
    .filter(Boolean);

  const merged = [...DEFAULT_RETAIL_UNITS.map((unit) => unit.toLowerCase()), ...values];
  const seen = new Set<string>();
  return merged.filter((unit) => {
    if (!unit || seen.has(unit)) return false;
    seen.add(unit);
    return true;
  });
}