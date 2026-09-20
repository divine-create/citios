export function normalizeSkuSeed(value: string): string {
  const cleaned = (value || 'ITEM')
    .trim()
    .toUpperCase()
    .replace(/^SKU-+/i, '')
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');

  return cleaned.slice(0, 24) || 'ITEM';
}

export function generateSku(seed = 'ITEM'): string {
  const prefix = normalizeSkuSeed(seed);
  const suffix = `${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  return `SKU-${prefix}-${suffix}`.replace(/-+/g, '-').replace(/^-+|-+$/g, '');
}

export function generateUniqueSku(existing: Iterable<string> = [], seed = 'ITEM'): string {
  const existingSet = new Set(
    Array.from(existing)
      .map((sku) => sku?.trim())
      .filter((sku): sku is string => Boolean(sku))
  );

  let sku = generateSku(seed);
  let attempt = 1;

  while (existingSet.has(sku)) {
    sku = generateSku(`${seed}-${attempt}`);
    attempt += 1;
  }

  return sku;
}
